// Supabase Edge Function: vendor-registered
//
// Deploy:  Dashboard → Edge Functions → Create function → name it exactly
//          "vendor-registered" → paste this file → Deploy.
//          Then: Settings → Edge Functions → uncheck "Verify JWT" for it
//          (Database Webhooks don't send a user JWT).
//
// Trigger: Database → Webhooks → new webhook
//          table = public.shops, events = INSERT, type = HTTP Request,
//          method = POST, URL = the function URL,
//          HTTP header  x-webhook-secret: <same value as the WEBHOOK_SECRET secret>
//
// Does:
//   1. Looks up the vendor's email (shops.owner_id -> auth admin API)
//   2. Emails ADMIN_EMAIL: "new vendor, review at ADMIN_PANEL_URL"
//   3. Emails the vendor: "registration received, under review"
//   4. Inserts a public.notifications row so the vendor sees it in-app
//
// Secrets (Dashboard → Edge Functions → Manage secrets):
//   RESEND_API_KEY        required
//   ADMIN_EMAIL           required   e.g. ops@breakq.app
//   FROM_EMAIL            required   a Resend-verified sender, e.g. noreply@breakq.app
//   ADMIN_PANEL_URL       required   https://breakq.app/admin
//   WEBHOOK_SECRET        recommended  any long random string; also set as the
//                                     x-webhook-secret header on the webhook
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
const ADMIN_EMAIL = env("ADMIN_EMAIL");
const FROM_EMAIL = env("FROM_EMAIL") || "onboarding@resend.dev";
const APP_NAME = env("APP_NAME") || "BreakQ";
const ADMIN_PANEL_URL = env("ADMIN_PANEL_URL") || "https://breakq.app/admin";
const WEBHOOK_SECRET = env("WEBHOOK_SECRET");
const SUPABASE_URL = env("SUPABASE_URL");
const SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY", "SERVICE_ROLE_KEY");

const PURPLE = "#7001FE";

interface ShopRow {
  id: string;
  name?: string;
  owner_name?: string | null;
  owner_id?: string | null;
  phone?: string | null;
  address?: string | null;
  primary_category?: string | null;
  status?: string | null;
}

interface WebhookPayload {
  type?: string; // "INSERT" | "UPDATE" | "DELETE"
  table?: string;
  record?: ShopRow;
  old_record?: ShopRow;
}

/** Escape user-supplied text before putting it in email HTML. */
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

function shell(body: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
      <div style="background:${PURPLE};color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;font-size:20px;font-weight:700">${APP_NAME}</div>
      <div style="background:#fff;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;padding:24px">${body}</div>
    </div>`;
}

function vendorEmailBody(shop: ShopRow): string {
  return shell(`
    <h2 style="margin:0 0 12px;color:${PURPLE}">Registration received</h2>
    <p>Hi ${esc(shop.owner_name || "there")},</p>
    <p>We've received your registration for <b>${esc(shop.name)}</b>. Our team will review your
       details and get back to you within 24 to 48 hours.</p>
    <p>You can keep the ${APP_NAME} app open — you'll see the update the moment your shop is approved.</p>
    <p style="color:#6B7280;font-size:12px;margin-top:24px">
       Shop: ${esc(shop.name)}<br>Phone: ${esc(shop.phone || "—")}<br>Address: ${esc(shop.address || "—")}</p>`);
}

function adminEmailBody(shop: ShopRow, vendorEmail: string | null): string {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#6B7280">${k}</td><td>${v}</td></tr>`;
  return shell(`
    <h2 style="margin:0 0 12px;color:${PURPLE}">New vendor registration</h2>
    <p>A new shop is waiting for your review.</p>
    <table style="border-collapse:collapse;margin:16px 0;font-size:14px">
      ${row("Shop", `<b>${esc(shop.name)}</b>`)}
      ${row("Owner", esc(shop.owner_name || "—"))}
      ${row("Email", esc(vendorEmail || "—"))}
      ${row("Phone", esc(shop.phone || "—"))}
      ${row("Address", esc(shop.address || "—"))}
      ${row("Category", esc(shop.primary_category || "—"))}
    </table>
    <p><a href="${esc(ADMIN_PANEL_URL)}" style="display:inline-block;background:${PURPLE};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Review in Admin Panel</a></p>`);
}

Deno.serve(async (req) => {
  // Reject anything that isn't the configured webhook.
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!WEBHOOK_SECRET) console.warn("WEBHOOK_SECRET not set — endpoint is unauthenticated");

  try {
    const p = (await req.json()) as WebhookPayload;
    if (p.table !== "shops" || p.type !== "INSERT" || !p.record) {
      return new Response("Ignored", { status: 200 });
    }
    const shop = p.record;
    // Only greet true new registrations (skip rows an admin inserts already-approved).
    if (shop.status && shop.status !== "pending") {
      return new Response("Not a pending registration", { status: 200 });
    }

    const vendorEmail = shop.owner_id ? await lookupOwnerEmail(shop.owner_id) : null;

    await Promise.allSettled([
      ADMIN_EMAIL
        ? sendMail(ADMIN_EMAIL, `[${APP_NAME}] New vendor: ${shop.name ?? shop.id}`, adminEmailBody(shop, vendorEmail))
        : Promise.resolve(),
      vendorEmail
        ? sendMail(vendorEmail, `Your ${APP_NAME} registration is being reviewed`, vendorEmailBody(shop))
        : Promise.resolve(),
      shop.owner_id
        ? logNotification(
            shop.owner_id,
            "Registration received",
            "Your shop is being reviewed. You'll be notified within 24-48 hours.",
          )
        : Promise.resolve(),
    ]);

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(`Error: ${e}`, { status: 500 });
  }
});
