// All Supabase calls the admin panel makes, in one place.
// Every function throws on error; views catch and surface the message.

import { supabase } from "../lib/supabaseClient";

function client() {
  if (!supabase) throw new Error("Supabase isn't configured — check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env");
  return supabase;
}

/* ------------------------------------------------------------------ auth --- */

export async function getSession() {
  const { data } = await client().auth.getSession();
  return data.session ?? null;
}

export async function sendOtp(email) {
  // shouldCreateUser:false — admins must already exist; never provision here.
  const { error } = await client().auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
}

export async function verifyOtp(email, token) {
  const { data, error } = await client().auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "email",
  });
  if (error) throw error;
  return data.session;
}

export async function getRole() {
  const {
    data: { user },
  } = await client().auth.getUser();
  if (!user) return null;
  const { data, error } = await client().from("profiles").select("role").eq("id", user.id).single();
  if (error) return null;
  return data?.role ?? null;
}

export async function logLoginAttempt(success) {
  // Best-effort. The table may not exist until admin_panel.sql is run, and a
  // rejected non-admin still has a live session long enough to insert one row.
  try {
    const {
      data: { user },
    } = await client().auth.getUser();
    await client().from("admin_login_logs").insert({ admin_id: user?.id ?? null, success });
  } catch {
    /* ignore */
  }
}

export async function signOut() {
  await client().auth.signOut();
}

export async function getUserEmail() {
  const {
    data: { user },
  } = await client().auth.getUser();
  return user?.email ?? null;
}

export async function getMyId() {
  const {
    data: { user },
  } = await client().auth.getUser();
  return user?.id ?? null;
}

export async function getMyProfile() {
  const {
    data: { user },
  } = await client().auth.getUser();
  if (!user) return null;
  const { data, error } = await client().from("profiles").select("*").eq("id", user.id).single();
  if (error) throw error;
  return { ...data, email: data?.email ?? user.email };
}

export async function updateMyProfile(patch) {
  const {
    data: { user },
  } = await client().auth.getUser();
  if (!user) throw new Error("No session.");
  const { error } = await client().from("profiles").update(patch).eq("id", user.id);
  if (error) throw error;
}

/* -------------------------------------------------------------- dashboard --- */

export async function fetchDashboard() {
  const { data, error } = await client().rpc("admin_dashboard");
  if (!error) return data;

  // RPC not installed yet → fall back to a limited, client-computed view so the
  // dashboard still renders something instead of dead-ending.
  const notInstalled = /function|does not exist|could not find|schema cache/i.test(error.message || "");
  if (!notInstalled) throw error;
  try {
    const fb = await dashboardFallback();
    return { ...fb, _fallback: true };
  } catch (e) {
    const err = new Error(
      "Run supabase/admin_panel.sql in the Supabase SQL editor to enable the dashboard (and the rest of the panel).",
    );
    err.cause = e;
    throw err;
  }
}

async function dashboardFallback() {
  const sb = client();
  const now = Date.now();
  const DAY = 86400000;
  const iso = (ms) => new Date(now - ms).toISOString();

  const count = async (from, to) => {
    let q = sb.from("orders").select("id", { count: "exact", head: true }).gte("created_at", from);
    if (to) q = q.lt("created_at", to);
    const { count: c, error } = await q;
    if (error) throw error;
    return c ?? 0;
  };

  const [o24, o30, oPrev] = await Promise.all([
    count(iso(DAY)),
    count(iso(30 * DAY)),
    count(iso(60 * DAY), iso(30 * DAY)),
  ]);

  const { data: rows, error: rErr } = await sb
    .from("orders")
    .select("created_at,total_amount,commission_rupees,platform_fee_rupees")
    .gte("created_at", iso(30 * DAY))
    .limit(5000);
  if (rErr) throw rErr;

  const list = rows || [];
  const byDay = new Map();
  const byHour = new Array(24).fill(0);
  let comm = 0;
  let fee = 0;
  let rev = 0;
  let rev7 = 0;
  let revToday = 0;
  const todayStr = new Date(now).toISOString().slice(0, 10);

  for (const r of list) {
    const d = new Date(r.created_at);
    const key = d.toISOString().slice(0, 10);
    const pr = (Number(r.commission_rupees) || 0) + (Number(r.platform_fee_rupees) || 0);
    const cur = byDay.get(key) || { d: key, orders: 0, revenue: 0, platform_revenue: 0 };
    cur.orders += 1;
    cur.revenue += Number(r.total_amount) || 0;
    cur.platform_revenue += pr;
    byDay.set(key, cur);
    byHour[d.getHours()] += 1;
    comm += Number(r.commission_rupees) || 0;
    fee += Number(r.platform_fee_rupees) || 0;
    rev += pr;
    if (d.getTime() > now - 7 * DAY) rev7 += pr;
    if (key === todayStr) revToday += pr;
  }

  const daily = [...byDay.values()].sort((a, b) => a.d.localeCompare(b.d));
  let bh = 0;
  for (let h = 1; h < 24; h += 1) if (byHour[h] > byHour[bh]) bh = h;
  const hourly = byHour.map((c, h) => ({ hour: h, orders: c }));

  // prior 30 days (days -60..-30) for the comparison line
  let dailyPrev = [];
  try {
    const { data: prevRows } = await sb
      .from("orders")
      .select("created_at,total_amount,commission_rupees,platform_fee_rupees")
      .gte("created_at", iso(60 * DAY))
      .lt("created_at", iso(30 * DAY))
      .limit(5000);
    const pm = new Map();
    for (const r of prevRows || []) {
      const key = new Date(r.created_at).toISOString().slice(0, 10);
      const pr = (Number(r.commission_rupees) || 0) + (Number(r.platform_fee_rupees) || 0);
      const cur = pm.get(key) || { d: key, orders: 0, revenue: 0, platform_revenue: 0 };
      cur.orders += 1;
      cur.revenue += Number(r.total_amount) || 0;
      cur.platform_revenue += pr;
      pm.set(key, cur);
    }
    dailyPrev = [...pm.values()].sort((a, b) => a.d.localeCompare(b.d));
  } catch {
    /* ignore */
  }

  let topRated = [];
  try {
    const { data: shops } = await sb
      .from("shops")
      .select("name,avg_rating,rating_count")
      .gte("rating_count", 5)
      .order("avg_rating", { ascending: false })
      .limit(5);
    topRated = shops || [];
  } catch {
    /* ignore */
  }

  // users: total + daily signups over the last 180 days + a baseline count
  let usersTotal = null;
  let usersBeforeWindow = 0;
  let userSignups = [];
  try {
    const { count } = await sb.from("profiles").select("id", { count: "exact", head: true });
    usersTotal = count ?? null;
  } catch {
    /* ignore */
  }
  try {
    const { count } = await sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .lte("created_at", iso(180 * DAY));
    usersBeforeWindow = count ?? 0;
  } catch {
    /* ignore */
  }
  try {
    const { data: prows } = await sb
      .from("profiles")
      .select("created_at")
      .gte("created_at", iso(180 * DAY))
      .limit(20000);
    const m = new Map();
    for (const r of prows || []) {
      const key = new Date(r.created_at).toISOString().slice(0, 10);
      m.set(key, (m.get(key) || 0) + 1);
    }
    userSignups = [...m.entries()].map(([d, count]) => ({ d, count })).sort((a, b) => a.d.localeCompare(b.d));
  } catch {
    /* ignore */
  }

  return {
    generated_at: new Date(now).toISOString(),
    orders_24h: o24,
    orders_30d: o30,
    orders_prev_30d: oPrev,
    platform_revenue_today: revToday,
    platform_revenue_7d: rev7,
    platform_revenue_30d: rev,
    commission_30d: comm,
    platform_fee_30d: fee,
    busy_hour: list.length ? { hour: bh, orders: byHour[bh] } : null,
    top_product: null,
    top_category: null,
    top_rated_shops: topRated,
    most_searched_product: null,
    most_searched_category: null,
    daily_series: daily,
    daily_series_prev: dailyPrev,
    hourly,
    users_total: usersTotal,
    users_before_window: usersBeforeWindow,
    user_signups: userSignups,
    top_area: null,
    has_locality: false,
    shops_total: null,
    shops_pending: null,
  };
}

/* ---------------------------------------------------------------- vendors --- */

export async function fetchShops(status) {
  let q = client().from("shops").select("*").order("created_at", { ascending: false }).limit(500);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function approveShop(id) {
  const { error } = await client().from("shops").update({ status: "approved" }).eq("id", id);
  if (error) throw error;
}

export async function rejectShop(id, reason) {
  const { error } = await client()
    .from("shops")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", id);
  if (error) throw error;
}

export async function enableCommission(id) {
  const { error } = await client()
    .from("shops")
    .update({ commission_enabled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function softDeleteShop(id) {
  const { error } = await client()
    .from("shops")
    .update({ is_deleted: true, accepting_orders: false })
    .eq("id", id);
  if (error) throw error;
}

export async function restoreShop(id) {
  const { error } = await client().from("shops").update({ is_deleted: false }).eq("id", id);
  if (error) throw error;
}

export async function searchShops(term) {
  const { data, error } = await client()
    .from("shops")
    .select("id, name, status")
    .ilike("name", `%${term}%`)
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

/* --------------------------------------------------------- subscriptions --- */

export async function fetchTiers() {
  const { data, error } = await client()
    .from("subscription_tiers")
    .select("*")
    .order("price_rupees", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

const TIER_FIELDS = [
  "display_name",
  "price_rupees",
  "item_cap",
  "commission_percent",
  "can_promote",
  "has_basic_analytics",
  "has_full_analytics",
  "has_priority_placement",
  "has_top_boost",
  "hide_breakq_branding",
  "has_whatsapp_alerts",
  "has_multi_staff",
  "has_competitor_pricing",
  "is_limited_time",
  "offer_ends_at",
  "tagline",
];

function pick(obj, fields) {
  const out = {};
  for (const f of fields) if (obj[f] !== undefined) out[f] = obj[f];
  return out;
}

export async function saveTier(tier) {
  const payload = pick(tier, TIER_FIELDS);
  let res;
  if (tier.id) {
    res = await client().from("subscription_tiers").update(payload).eq("id", tier.id);
  } else {
    res = await client().from("subscription_tiers").insert(payload);
  }
  if (res.error) throw res.error;
}

export async function fetchSubscribers() {
  const { data, error } = await client()
    .from("vendor_subscriptions")
    .select(
      "id, status, started_at, expires_at, amount_paid_rupees, shop_id, tier_id, shops(name), subscription_tiers(display_name)",
    )
    .order("started_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function overrideTier(shopId, tierId, commissionPct, amount) {
  const { error } = await client().rpc("admin_override_tier", {
    p_shop_id: shopId,
    p_tier_id: tierId,
    p_commission_pct: commissionPct,
    p_amount: amount,
  });
  if (error) throw error;
}

/* -------------------------------------------------------------- payments --- */

export async function fetchPayments() {
  const { data, error } = await client()
    .from("subscription_payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function updatePaymentStatus(id, status) {
  // status is the ONLY field the panel is allowed to change here.
  const { error } = await client().from("subscription_payments").update({ status }).eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------ promotions --- */

export async function fetchPromotions() {
  const { data, error } = await client()
    .from("promoted_placements")
    .select("*, shops(name)")
    .order("active_from", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function createPromotion(p) {
  const { error } = await client().from("promoted_placements").insert({
    shop_id: p.shop_id,
    daily_budget_rupees: Number(p.daily_budget_rupees),
    active_from: p.active_from,
    active_to: p.active_to,
    is_active: true,
    total_charged_rupees: 0,
  });
  if (error) throw error;
}

export async function deactivatePromotion(id) {
  const { error } = await client().from("promoted_placements").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}

/* --------------------------------------------------------------- coupons --- */

export async function fetchCoupons() {
  const { data, error } = await client()
    .from("promo_codes")
    .select("*")
    .order("valid_from", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function saveCoupon(coupon, isNew) {
  let res;
  if (isNew) {
    res = await client().from("promo_codes").insert(coupon);
  } else {
    const { code, ...rest } = coupon;
    res = await client().from("promo_codes").update(rest).eq("code", code);
  }
  if (res.error) throw res.error;
}

export async function deleteCoupon(code) {
  const { error } = await client().from("promo_codes").delete().eq("code", code);
  if (error) throw error;
}

export async function couponUsage(code) {
  const { count, error } = await client()
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("promo_code", code)
    .neq("status", "Cancelled");
  if (error) throw error;
  return count ?? 0;
}

/* ------------------------------------------------------------ categories --- */

export async function fetchCategories() {
  const { data, error } = await client().from("categories").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveCategory(cat, isNew) {
  const payload = { name: cat.name, icon_name: cat.icon_name };
  const res = isNew
    ? await client().from("categories").insert(payload)
    : await client().from("categories").update(payload).eq("id", cat.id);
  if (res.error) throw res.error;
}

export async function deleteCategory(id) {
  const { error } = await client().from("categories").delete().eq("id", id);
  if (error) throw error;
}

// Live tally of the category names actually in use on shops (shops.primary_category).
export async function fetchShopCategoryUsage() {
  const { data, error } = await client().from("shops").select("primary_category").limit(5000);
  if (error) throw error;
  const counts = new Map();
  for (const row of data || []) {
    const c = (row.primary_category || "").trim();
    if (!c) continue;
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  return [...counts.entries()].map(([name, shops]) => ({ name, shops })).sort((a, b) => b.shops - a.shops);
}

// The standard BreakQ shop categories (mirrors the Become-a-Partner form).
export const DEFAULT_CATEGORIES = [
  { name: "Kirana", icon_name: "kirana" },
  { name: "Dairy", icon_name: "dairy" },
  { name: "Grocery", icon_name: "grocery" },
  { name: "Medical", icon_name: "medical" },
  { name: "Bakery", icon_name: "bakery" },
  { name: "Electrical", icon_name: "electrical" },
  { name: "Stationery", icon_name: "stationery" },
  { name: "Fashion", icon_name: "fashion" },
  { name: "Mobiles", icon_name: "mobiles" },
];

export async function seedCategories() {
  const existing = await fetchCategories();
  const have = new Set(existing.map((c) => c.name.toLowerCase()));
  const toAdd = DEFAULT_CATEGORIES.filter((c) => !have.has(c.name.toLowerCase()));
  if (toAdd.length === 0) return 0;
  const { error } = await client().from("categories").insert(toAdd);
  if (error) throw error;
  return toAdd.length;
}

/* --------------------------------------------------- users (read-only) --- */

export async function fetchUsers({ page = 0, pageSize = 50, search = "" } = {}) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let q = client()
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (search.trim()) q = q.ilike("email", `%${search.trim()}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

/* ---------------------------------------------------------------- health --- */

export async function probeSchema() {
  const out = {};
  const probe = async (key, fn) => {
    try {
      const { error } = await fn();
      out[key] = !error;
    } catch {
      out[key] = false;
    }
  };
  await probe("shops_is_deleted", () => client().from("shops").select("is_deleted").limit(1));
  await probe("shops_locality", () => client().from("shops").select("locality").limit(1));
  await probe("admin_login_logs", () => client().from("admin_login_logs").select("id").limit(1));
  await probe("admin_dashboard_rpc", () => client().rpc("admin_dashboard"));
  return out;
}
