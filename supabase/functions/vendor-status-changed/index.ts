// Supabase Edge Function: vendor-status-changed
//
// Deploy:  Dashboard → Edge Functions → Create function → name it exactly
//          "vendor-status-changed" → paste this file → Deploy.
//          Then: Settings → Edge Functions → uncheck "Verify JWT" for it.
//
// Called directly by the admin panel (src/admin/api.js → notifyVendorStatus):
//   Authorization: Bearer <admin session JWT>
//   body: { direct: true, event, shopId, ... }
//   event ∈ approved | rejected | suspended | deleted | restored
//
// Security:
//   - The caller's JWT must belong to profiles.role = 'admin'.
//   - Only `event` and `shopId` are used from the request. Name, owner and
//     reason are re-read from the database, and the event must match the
//     shop's real state (e.g. "approved" only if the shop IS approved), so the
//     endpoint can't be used to email arbitrary users or send false notices.
//
// Legacy Database Webhook path (shops UPDATE) is OFF by default because the
// panel already calls this directly — having both sends every email twice.
// Only enable it (ENABLE_WEBHOOK_PATH=true + WEBHOOK_SECRET) if you stop
// calling it from the panel.
//
// Does: emails the vendor (cc ADMIN_EMAIL) a message matched to the event and
//       inserts a public.notifications row.
//
// Secrets:
//   RESEND_API_KEY        required
//   FROM_EMAIL            required   a Resend-verified sender, e.g. noreply@breakq.app
//   ADMIN_EMAIL           optional   cc'd on every vendor status email
//   APP_NAME             optional   defaults to "BreakQ"
//   ENABLE_WEBHOOK_PATH   optional   "true" to accept the legacy webhook
//   WEBHOOK_SECRET        required only when ENABLE_WEBHOOK_PATH=true
//   SUPABASE_URL         auto-injected
//   SUPABASE_SERVICE_ROLE_KEY  auto-injected (falls back to SERVICE_ROLE_KEY)

const env = (...names: string[]) => {
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v) return v;
  }
  return "";
};

const RESEND_API_KEY = env("RESEND_API_KEY");
const FROM_EMAIL = env("FROM_EMAIL") || "noreply@breakq.app";
const APP_NAME = env("APP_NAME") || "BreakQ";
const ADMIN_EMAIL = env("ADMIN_EMAIL") || "bjain5329@gmail.com";
const ENABLE_WEBHOOK_PATH = env("ENABLE_WEBHOOK_PATH") === "true";
const WEBHOOK_SECRET = env("WEBHOOK_SECRET");
const SUPABASE_URL = env("SUPABASE_URL");
const SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY", "SERVICE_ROLE_KEY");

const GREEN = "#059669";
const RED = "#DC2626";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const reply = (body: string, status = 200) =>
  new Response(body, { status, headers: CORS });

const EVENTS = ["approved", "rejected", "suspended", "deleted", "restored"] as const;
type StatusEvent = (typeof EVENTS)[number];

interface ShopRow {
  id: string;
  name?: string;
  owner_name?: string | null;
  owner_id?: string | null;
  status?: string | null;
  is_deleted?: boolean | null;
  rejection_reason?: string | null;
  suspension_reason?: string | null;
}

interface Payload {
  direct?: boolean;
  event?: string;
  shopId?: string;
  type?: string;
  table?: string;
  record?: ShopRow;
  old_record?: ShopRow;
}

const svc = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` };

function esc(v: unknown): string {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** Verify the caller's Supabase access token belongs to an admin. */
async function callerIsAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return false;

  const ur = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${jwt}` },
  });
  if (!ur.ok) return false;
  const uid = (await ur.json())?.id;
  if (!uid) return false;

  const pr = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=role`,
    { headers: svc },
  );
  if (!pr.ok) return false;
  const rows = await pr.json();
  return rows?.[0]?.role === "admin";
}

/** The shop as it really is in the database. */
async function loadShop(id: string): Promise<ShopRow | null> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/shops?id=eq.${encodeURIComponent(id)}&select=*`,
    { headers: svc },
  );
  if (!r.ok) {
    console.error("loadShop:", r.status, await r.text());
    return null;
  }
  const rows = (await r.json()) as ShopRow[];
  return rows[0] ?? null;
}

/** Does the shop's current state actually match the event being announced? */
function eventMatches(event: StatusEvent, s: ShopRow): boolean {
  const deleted = !!s.is_deleted;
  switch (event) {
    case "approved":
      return s.status === "approved" && !deleted;
    case "rejected":
      return s.status === "rejected";
    case "suspended":
      return s.status === "suspended";
    case "deleted":
      return deleted;
    case "restored":
      return !deleted && s.status === "approved";
  }
}

async function lookupOwnerEmail(ownerId: string): Promise<string | null> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(ownerId)}`, {
    headers: svc,
  });
  if (!r.ok) {
    console.error("lookupOwnerEmail:", r.status, await r.text());
    return null;
  }
  const u = await r.json();
  return u?.email ?? null;
}

async function sendMail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("sendMail skipped — RESEND_API_KEY not set");
    return;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      ...(ADMIN_EMAIL && ADMIN_EMAIL !== to ? { cc: ADMIN_EMAIL } : {}),
      subject,
      html,
    }),
  });
  if (!r.ok) console.error("resend:", r.status, await r.text());
}

async function logNotification(userId: string, title: string, message: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
    method: "POST",
    headers: { ...svc, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId, title, message, is_read: false }),
  });
  if (!r.ok) console.warn("notifications insert:", r.status, await r.text());
}

function shell(body: string, accent: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
      <div style="background:${accent};color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;font-size:20px;font-weight:700">${esc(APP_NAME)}</div>
      <div style="background:#fff;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;padding:24px">${body}</div>
    </div>`;
}

function reasonBlock(reason: string | null | undefined): string {
  const r = (reason ?? "").trim();
  return r
    ? `<p style="background:#FEF2F2;padding:12px 16px;border-radius:8px;border-left:3px solid ${RED}"><b>Reason:</b> ${esc(r)}</p>`
    : "";
}

function approvedBody(shop: ShopRow): string {
  return shell(
    `
    <h2 style="margin:0 0 12px;color:${GREEN}">Your shop is approved 🎉</h2>
    <p>Hi ${esc(shop.owner_name || "there")},</p>
    <p><b>${esc(shop.name)}</b> is now live on ${esc(APP_NAME)}. Customers in your area can find your shop,
       browse your products, and place pickup orders.</p>
    <p>Open the ${esc(APP_NAME)} app to add products, set stock levels, and start receiving orders.</p>`,
    GREEN,
  );
}

function rejectedBody(shop: ShopRow): string {
  return shell(
    `
    <h2 style="margin:0 0 12px;color:${RED}">Registration not approved</h2>
    <p>Hi ${esc(shop.owner_name || "there")},</p>
    <p>We couldn't approve <b>${esc(shop.name)}</b> at this time.</p>
    ${reasonBlock(shop.rejection_reason)}
    <p>You can update your registration details in the ${esc(APP_NAME)} app and submit again, or reply to
       this email if you have questions.</p>`,
    RED,
  );
}

function suspendedBody(shop: ShopRow): string {
  return shell(
    `
    <h2 style="margin:0 0 12px;color:${RED}">Your shop is suspended</h2>
    <p>Hi ${esc(shop.owner_name || "there")},</p>
    <p><b>${esc(shop.name)}</b> has been temporarily suspended and is not visible to customers.</p>
    ${reasonBlock(shop.suspension_reason)}
    <p>Please reply to this email so we can help resolve the issue.</p>`,
    RED,
  );
}

function deletedBody(shop: ShopRow): string {
  return shell(
    `
    <h2 style="margin:0 0 12px;color:${RED}">Your shop has been removed</h2>
    <p>Hi ${esc(shop.owner_name || "there")},</p>
    <p><b>${esc(shop.name)}</b> has been removed from ${esc(APP_NAME)} and is no longer visible to customers.</p>
    <p>Your data and order history are retained. Reply to this email if you think this was a mistake.</p>`,
    RED,
  );
}

function restoredBody(shop: ShopRow): string {
  return shell(
    `
    <h2 style="margin:0 0 12px;color:${GREEN}">Your shop is active again</h2>
    <p>Hi ${esc(shop.owner_name || "there")},</p>
    <p><b>${esc(shop.name)}</b> has been restored and is visible to customers again.</p>
    <p>Open the ${esc(APP_NAME)} app to keep managing your products and orders.</p>`,
    GREEN,
  );
}

/** Send the vendor email + in-app notification for one status event. */
async function handleStatus(event: StatusEvent, shop: ShopRow): Promise<Response> {
  let subject: string;
  let html: string;
  let title: string;
  let message: string;

  switch (event) {
    case "approved":
      subject = `Your ${APP_NAME} shop is approved`;
      html = approvedBody(shop);
      title = "Your shop is approved 🎉";
      message = `${shop.name} is now live on ${APP_NAME}. Start adding products.`;
      break;
    case "rejected":
      subject = `Your ${APP_NAME} registration was not approved`;
      html = rejectedBody(shop);
      title = "Registration not approved";
      message = shop.rejection_reason || "Please review the email we sent for details.";
      break;
    case "suspended":
      subject = `Your ${APP_NAME} shop has been suspended`;
      html = suspendedBody(shop);
      title = "Shop suspended";
      message = shop.suspension_reason
        ? `${shop.name} is temporarily hidden from customers. Reason: ${shop.suspension_reason}`
        : `${shop.name} is temporarily hidden from customers.`;
      break;
    case "deleted":
      subject = `Your ${APP_NAME} shop has been removed`;
      html = deletedBody(shop);
      title = "Shop removed";
      message = `${shop.name} has been removed from ${APP_NAME}.`;
      break;
    case "restored":
      subject = `Your ${APP_NAME} shop is active again`;
      html = restoredBody(shop);
      title = "Shop restored";
      message = `${shop.name} is live on ${APP_NAME} again.`;
      break;
  }

  const vendorEmail = shop.owner_id ? await lookupOwnerEmail(shop.owner_id) : null;

  await Promise.allSettled([
    vendorEmail ? sendMail(vendorEmail, subject, html) : Promise.resolve(),
    shop.owner_id ? logNotification(shop.owner_id, title, message) : Promise.resolve(),
  ]);

  return reply("OK", 200);
}

const isEvent = (e: unknown): e is StatusEvent =>
  typeof e === "string" && (EVENTS as readonly string[]).includes(e);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return reply("ok", 200);
  if (req.method !== "POST") return reply("POST only", 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return reply("Not configured", 500);

  try {
    const p = (await req.json()) as Payload;

    // ---- direct call from the admin panel ----
    if (p.direct) {
      if (!(await callerIsAdmin(req))) return reply("Forbidden", 403);
      if (!isEvent(p.event)) return reply("Unknown event", 400);
      if (!p.shopId) return reply("shopId required", 400);

      const shop = await loadShop(p.shopId);
      if (!shop) return reply("Shop not found", 404);
      if (!eventMatches(p.event, shop)) {
        return reply(`Shop state doesn't match "${p.event}" — not sent`, 409);
      }
      return await handleStatus(p.event, shop);
    }

    // ---- legacy Database Webhook path (off unless explicitly enabled) ----
    if (!ENABLE_WEBHOOK_PATH || !WEBHOOK_SECRET) return reply("Forbidden", 403);
    if (!safeEqual(req.headers.get("x-webhook-secret") || "", WEBHOOK_SECRET)) {
      return reply("Unauthorized", 401);
    }
    if (p.table !== "shops" || p.type !== "UPDATE" || !p.record?.id || !p.old_record) {
      return reply("Ignored", 200);
    }
    const newStatus = p.record.status;
    if (!newStatus || newStatus === p.old_record.status || !isEvent(newStatus)) {
      return reply("No status change to message", 200);
    }
    const shop = await loadShop(p.record.id);
    if (!shop || !eventMatches(newStatus, shop)) return reply("Stale event", 200);
    return await handleStatus(newStatus, shop);
  } catch (e) {
    console.error(e);
    return reply("Error", 500);
  }
});
