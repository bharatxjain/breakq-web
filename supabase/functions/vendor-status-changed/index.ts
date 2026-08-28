// Supabase Edge Function: vendor-status-changed
//
// Deploy:  Dashboard → Edge Functions → Create function → name it exactly
//          "vendor-status-changed" → paste this file → Deploy.
//          Then: Settings → Edge Functions → uncheck "Verify JWT" for it.
//
// Trigger: Database → Webhooks → new webhook
//          table = public.shops, events = UPDATE, type = HTTP Request,
//          method = POST, URL = the function URL,
//          HTTP header  x-webhook-secret: <same value as the WEBHOOK_SECRET secret>
//
// Does: when shops.status changes, emails the vendor a message matched to the
//       new status (approved / rejected / suspended) and inserts a
//       public.notifications row.
//
// Secrets:
//   RESEND_API_KEY        required
//   FROM_EMAIL            required   a Resend-verified sender, e.g. noreply@breakq.app
//   WEBHOOK_SECRET        recommended  (also set as the x-webhook-secret header)
//   APP_NAME             optional   defaults to "BreakQ"
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
const FROM_EMAIL = env("FROM_EMAIL") || "onboarding@resend.dev";
const APP_NAME = env("APP_NAME") || "BreakQ";
const WEBHOOK_SECRET = env("WEBHOOK_SECRET");
const SUPABASE_URL = env("SUPABASE_URL");
const SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY", "SERVICE_ROLE_KEY");

const PURPLE = "#7001FE";
const GREEN = "#059669";
const RED = "#DC2626";

interface ShopRow {
  id: string;
  name?: string;
  owner_name?: string | null;
  owner_id?: string | null;
  status?: string | null;
  rejection_reason?: string | null;
}

interface WebhookPayload {
  type?: string;
  table?: string;
  record?: ShopRow;
  old_record?: ShopRow;
}

function esc(v: unknown): string {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function lookupOwnerEmail(ownerId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${ownerId}`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
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
    body: JSON.stringify({ from: `${APP_NAME} <${FROM_EMAIL}>`, to, subject, html }),
  });
  if (!r.ok) console.error("resend:", r.status, await r.text());
}

async function logNotification(userId: string, title: string, message: string) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ user_id: userId, title, message, is_read: false }),
  });
  if (!r.ok) console.warn("notifications insert:", r.status, await r.text());
}

function shell(body: string, accent: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
      <div style="background:${accent};color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;font-size:20px;font-weight:700">${APP_NAME}</div>
      <div style="background:#fff;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;padding:24px">${body}</div>
    </div>`;
}

function approvedBody(shop: ShopRow): string {
  return shell(
    `
    <h2 style="margin:0 0 12px;color:${GREEN}">Your shop is approved 🎉</h2>
    <p>Hi ${esc(shop.owner_name || "there")},</p>
    <p><b>${esc(shop.name)}</b> is now live on ${APP_NAME}. Customers in your area can find your shop,
       browse your products, and place pickup orders.</p>
    <p>Open the ${APP_NAME} app to add products, set stock levels, and start receiving orders.</p>`,
    GREEN,
  );
}

function rejectedBody(shop: ShopRow): string {
  const reason = (shop.rejection_reason ?? "").trim();
  return shell(
    `
    <h2 style="margin:0 0 12px;color:${RED}">Registration not approved</h2>
    <p>Hi ${esc(shop.owner_name || "there")},</p>
    <p>We couldn't approve <b>${esc(shop.name)}</b> at this time.</p>
    ${
      reason
        ? `<p style="background:#FEF2F2;padding:12px 16px;border-radius:8px;border-left:3px solid ${RED}"><b>Reason:</b> ${esc(reason)}</p>`
        : ""
    }
    <p>You can update your registration details in the ${APP_NAME} app and submit again, or reply to
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
    <p>Please reply to this email so we can help resolve the issue.</p>`,
    RED,
  );
}

Deno.serve(async (req) => {
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!WEBHOOK_SECRET) console.warn("WEBHOOK_SECRET not set — endpoint is unauthenticated");

  try {
    const p = (await req.json()) as WebhookPayload;
    if (p.table !== "shops" || p.type !== "UPDATE" || !p.record || !p.old_record) {
      return new Response("Ignored", { status: 200 });
    }

    const newStatus = p.record.status;
    const oldStatus = p.old_record.status;
    if (!newStatus || newStatus === oldStatus) {
      return new Response("No status change", { status: 200 });
    }

    const shop = p.record;
    let subject: string;
    let html: string;
    let title: string;
    let message: string;

    switch (newStatus) {
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
        message = `${shop.name} is temporarily hidden from customers.`;
        break;
      default:
        return new Response(`Status ${newStatus} not messaged`, { status: 200 });
    }

    const vendorEmail = shop.owner_id ? await lookupOwnerEmail(shop.owner_id) : null;

    await Promise.allSettled([
      vendorEmail ? sendMail(vendorEmail, subject, html) : Promise.resolve(),
      shop.owner_id ? logNotification(shop.owner_id, title, message) : Promise.resolve(),
    ]);

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(`Error: ${e}`, { status: 500 });
  }
});
