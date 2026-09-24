// All Supabase calls the admin panel makes, in one place.
// Every function throws on error; views catch and surface the message.

import { supabase } from "../lib/supabaseClient";

function client() {
  if (!supabase)
    throw new Error(
      "Supabase isn't configured - check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env",
    );
  return supabase;
}

/* ------------------------------------------------------------------ auth --- */

export async function getSession() {
  const { data } = await client().auth.getSession();
  return data.session ?? null;
}

// A network-level failure (QUIC/HTTP3 hiccup, VPN, flaky wifi) never reaches
// Supabase at all, so it surfaces as a bare "Failed to fetch" TypeError
// instead of a Supabase AuthError - reword it into something actionable.
function rethrowNetworkFriendly(e) {
  if (e instanceof TypeError) {
    throw new Error(
      "Network error while reaching Supabase. Check your connection (or try disabling any VPN/antivirus HTTPS scanning) and try again.",
    );
  }
  throw e;
}

export async function sendOtp(email) {
  // shouldCreateUser:false - admins must already exist; never provision here.
  try {
    const { error } = await client().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    if (error) throw error;
  } catch (e) {
    rethrowNetworkFriendly(e);
  }
}

export async function verifyOtp(email, token) {
  try {
    const { data, error } = await client().auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: "email",
    });
    if (error) throw error;
    return data.session;
  } catch (e) {
    rethrowNetworkFriendly(e);
  }
}

export async function getRole() {
  const {
    data: { user },
  } = await client().auth.getUser();
  if (!user) return null;
  const { data, error } = await client()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
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
    await client()
      .from("admin_login_logs")
      .insert({ admin_id: user?.id ?? null, success });
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
  const { data, error } = await client()
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return { ...data, email: data?.email ?? user.email };
}

export async function updateMyProfile(patch) {
  const {
    data: { user },
  } = await client().auth.getUser();
  if (!user) throw new Error("No session.");
  const { error } = await client()
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
  if (error) throw error;
}

/* -------------------------------------------------------------- dashboard --- */

export async function fetchDashboard() {
  const { data, error } = await client().rpc("admin_dashboard");
  if (!error) return data;

  // RPC not installed yet → fall back to a limited, client-computed view so the
  // dashboard still renders something instead of dead-ending.
  const notInstalled =
    /function|does not exist|could not find|schema cache/i.test(
      error.message || "",
    );
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
    let q = sb
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", from);
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
    const pr =
      (Number(r.commission_rupees) || 0) + (Number(r.platform_fee_rupees) || 0);
    const cur = byDay.get(key) || {
      d: key,
      orders: 0,
      revenue: 0,
      platform_revenue: 0,
    };
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
      const pr =
        (Number(r.commission_rupees) || 0) +
        (Number(r.platform_fee_rupees) || 0);
      const cur = pm.get(key) || {
        d: key,
        orders: 0,
        revenue: 0,
        platform_revenue: 0,
      };
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
      .gt("rating_count", 0)
      .order("avg_rating", { ascending: false, nullsFirst: false })
      .order("rating_count", { ascending: false })
      .limit(5);
    topRated = shops || [];
  } catch {
    /* ignore */
  }

  // users: total + daily signups over the last 180 days + a baseline count
  let usersTotal = null;
  let customersTotal = null;
  let usersBeforeWindow = 0;
  let userSignups = [];
  try {
    const { count } = await sb
      .from("profiles")
      .select("id", { count: "exact", head: true });
    usersTotal = count ?? null;
  } catch {
    /* ignore */
  }
  try {
    const { count } = await sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer");
    customersTotal = count ?? null;
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
    userSignups = [...m.entries()]
      .map(([d, count]) => ({ d, count }))
      .sort((a, b) => a.d.localeCompare(b.d));
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
    customers_total: customersTotal,
    users_before_window: usersBeforeWindow,
    user_signups: userSignups,
    top_area: null,
    has_locality: false,
    shops_total: null,
    shops_pending: null,
  };
}

/* -------------------------------------------------------------- analytics --- */
// The four functions below are added by supabase/admin_analytics.sql. Until that
// runs the RPC is absent - we return { _missing: true } so each view can show a
// one-line "needs setup" hint instead of an error wall.

function looksMissing(error) {
  return /function|does not exist|could not find|schema cache|not authorized/i.test(
    error?.message || "",
  );
}

async function rpcOrMissing(name, args) {
  const { data, error } = await client().rpc(name, args);
  if (!error) return data ?? {};
  if (looksMissing(error)) return { _missing: true };
  throw error;
}

export const fetchAnalytics = () => rpcOrMissing("admin_analytics");
export const fetchSearchAnalytics = () =>
  rpcOrMissing("admin_search_analytics");
export const fetchRatingsAnalytics = () =>
  rpcOrMissing("admin_ratings_analytics");
export const fetchGeoAnalytics = () => rpcOrMissing("admin_geo_analytics");

function extractPincode(address) {
  const match = String(address || "").match(/\b(\d{6})\b/);
  return match?.[1] || "";
}

function firstLocality(address) {
  const a = address?.address || {};
  return (
    a.neighbourhood ||
    a.suburb ||
    a.village ||
    a.town ||
    a.city_district ||
    a.city ||
    a.county ||
    ""
  );
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Resolve shops missing locality data. Coordinates are preferred; India Post
// is used when the address has a PIN but reverse geocoding produces no area.
export async function resolveShopLocalities() {
  const sb = client();
  const { data: shops, error } = await sb
    .from("shops")
    .select("id,address,lat,lng,locality,locality_source")
    .eq("is_deleted", false)
    .is("locality", null)
    .limit(100);
  if (error) throw error;

  let resolved = 0;
  for (const shop of shops || []) {
    let locality = "";
    let source = "";

    if (
      Number.isFinite(Number(shop.lat)) &&
      Number.isFinite(Number(shop.lng))
    ) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${shop.lat}&lon=${shop.lng}`,
        );
        if (response.ok) locality = firstLocality(await response.json());
        if (locality) source = "geocoded";
      } catch {
        /* fall through to PIN lookup */
      }
      await wait(1100);
    }

    if (!locality) {
      const pincode = extractPincode(shop.address);
      if (pincode) {
        try {
          const response = await fetch(
            `https://api.postalpincode.in/pincode/${pincode}`,
          );
          const result = response.ok ? await response.json() : [];
          const postOffice = result?.[0]?.PostOffice?.[0];
          locality =
            postOffice?.Name || postOffice?.Block || postOffice?.District || "";
          if (locality) source = "pincode";
        } catch {
          /* leave this shop for a later retry */
        }
      }
    }

    if (locality) {
      const { error: updateError } = await sb
        .from("shops")
        .update({ locality, locality_source: source })
        .eq("id", shop.id);
      if (updateError) throw updateError;
      resolved += 1;
    }
  }

  return { scanned: shops?.length || 0, resolved };
}
export const fetchShopMetrics = (shopId) =>
  rpcOrMissing("admin_shop_metrics", { p_shop_id: shopId });
export const fetchUserRoleCounts = () => rpcOrMissing("admin_user_role_counts");
export const fetchCouponStats = () => rpcOrMissing("admin_coupon_stats");

/* ---------------------------------------------------------------- vendors --- */

export async function fetchShops(status) {
  let q = client()
    .from("shops")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// Searchable / filterable / paginated directory. Filters that map to a shops
// column run server-side; `tier` is resolved via active subscriptions first.
export async function fetchShopsPaged({
  page = 0,
  pageSize = 25,
  search = "",
  locality = "",
  tierId = "",
  status = "",
  state = "any", // any | active | deleted
  localitySource = "any", // any | geocoded | manual | none
  ratingMin = "",
  ratingMax = "",
} = {}) {
  const sb = client();

  // tier filter → the shop_ids that currently hold an active subscription on it
  let tierShopIds = null;
  if (tierId) {
    const { data, error } = await sb
      .from("vendor_subscriptions")
      .select("shop_id")
      .eq("status", "active")
      .eq("tier_id", tierId)
      .limit(5000);
    if (error) throw error;
    tierShopIds = (data ?? []).map((r) => r.shop_id);
    if (tierShopIds.length === 0) return { rows: [], total: 0 };
  }

  const from = page * pageSize;
  let q = sb
    .from("shops")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (search.trim()) {
    const t = search.trim().replace(/[%,]/g, "");
    q = q.or(
      `name.ilike.%${t}%,owner_name.ilike.%${t}%,id.ilike.%${t}%,phone.ilike.%${t}%`,
    );
  }
  if (locality.trim()) q = q.ilike("locality", `%${locality.trim()}%`);
  if (status) q = q.eq("status", status);
  if (state === "active") q = q.eq("is_deleted", false);
  if (state === "deleted") q = q.eq("is_deleted", true);
  if (localitySource === "none") q = q.is("locality_source", null);
  else if (localitySource !== "any")
    q = q.eq("locality_source", localitySource);
  if (ratingMin !== "") q = q.gte("avg_rating", Number(ratingMin));
  if (ratingMax !== "") q = q.lte("avg_rating", Number(ratingMax));
  if (tierShopIds) q = q.in("id", tierShopIds);

  const { data, error, count } = await q;
  if (error) throw error;
  const rows = data ?? [];

  // attach the current tier + last-activity for the visible page
  if (rows.length) {
    const ids = rows.map((s) => s.id);
    const { data: subs } = await sb
      .from("vendor_subscriptions")
      .select("shop_id, subscription_tiers(display_name, price_rupees)")
      .eq("status", "active")
      .in("shop_id", ids);
    const byShop = new Map(
      (subs ?? []).map((s) => [s.shop_id, s.subscription_tiers]),
    );

    let lastActive = new Map();
    try {
      const { data: la } = await sb.rpc("admin_shops_last_active", {
        p_ids: ids,
      });
      lastActive = new Map((la ?? []).map((x) => [x.shop_id, x.last_active]));
    } catch {
      /* RPC not installed - column just shows "-" */
    }

    for (const s of rows) {
      s._tier = byShop.get(s.id) || null;
      s._last_active = lastActive.get(s.id) || null;
    }
  }

  return { rows, total: count ?? 0 };
}

// Fire-and-forget: ask the edge function to email the vendor + log an in-app
// notification for a status change. Never blocks or fails the admin action -
// a mailer outage must not stop a vendor being verified/rejected/deleted.
function notifyVendorStatus(shop, event, reason) {
  try {
    client()
      .functions.invoke("vendor-status-changed", {
        body: {
          direct: true,
          event,
          shopId: shop.id,
          shopName: shop.name,
          ownerName: shop.owner_name ?? null,
          ownerId: shop.owner_id ?? null,
          reason: reason ?? null,
        },
      })
      .catch((e) => console.warn("notifyVendorStatus:", e?.message || e));
  } catch (e) {
    console.warn("notifyVendorStatus:", e?.message || e);
  }
}

export async function approveShop(id) {
  const { data, error } = await client()
    .from("shops")
    .update({ status: "approved" })
    .eq("id", id)
    .select("id, name, owner_name, owner_id")
    .single();
  if (error) throw error;
  notifyVendorStatus(data, "approved");
}

export async function rejectShop(id, reason) {
  const { data, error } = await client()
    .from("shops")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", id)
    .select("id, name, owner_name, owner_id")
    .single();
  if (error) throw error;
  notifyVendorStatus(data, "rejected", reason);
}

export async function enableCommission(id) {
  const { error } = await client()
    .from("shops")
    .update({ commission_enabled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function softDeleteShop(id) {
  const { data, error } = await client()
    .from("shops")
    .update({ is_deleted: true, accepting_orders: false })
    .eq("id", id)
    .select("id, name, owner_name, owner_id")
    .single();
  if (error) throw error;
  notifyVendorStatus(data, "deleted");
}

export async function restoreShop(id) {
  const { data, error } = await client()
    .from("shops")
    .update({ is_deleted: false })
    .eq("id", id)
    .select("id, name, owner_name, owner_id")
    .single();
  if (error) throw error;
  notifyVendorStatus(data, "restored");
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
    res = await client()
      .from("subscription_tiers")
      .update(payload)
      .eq("id", tier.id);
  } else {
    res = await client().from("subscription_tiers").insert(payload);
  }
  if (res.error) throw res.error;
}

export async function fetchSubscribers() {
  const { data, error } = await client()
    .from("vendor_subscriptions")
    .select(
      "id, status, started_at, expires_at, amount_paid_rupees, shop_id, tier_id, shops(name), subscription_tiers(display_name, price_rupees)",
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
  const { error } = await client()
    .from("subscription_payments")
    .update({ status })
    .eq("id", id);
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
  const { error } = await client()
    .from("promoted_placements")
    .insert({
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
  const { error } = await client()
    .from("promoted_placements")
    .update({ is_active: false })
    .eq("id", id);
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
  const { error } = await client()
    .from("promo_codes")
    .delete()
    .eq("code", code);
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
  const { data, error } = await client()
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
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
  const { data, error } = await client()
    .from("shops")
    .select("primary_category")
    .limit(5000);
  if (error) throw error;
  const counts = new Map();
  for (const row of data || []) {
    const c = (row.primary_category || "").trim();
    if (!c) continue;
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, shops]) => ({ name, shops }))
    .sort((a, b) => b.shops - a.shops);
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
  const toAdd = DEFAULT_CATEGORIES.filter(
    (c) => !have.has(c.name.toLowerCase()),
  );
  if (toAdd.length === 0) return 0;
  const { error } = await client().from("categories").insert(toAdd);
  if (error) throw error;
  return toAdd.length;
}

/* --------------------------------------------------- users (read-only) --- */

export async function fetchUsers({
  page = 0,
  pageSize = 50,
  search = "",
  role = "",
  status = "", // "" | active | blocked  (needs admin_operations.sql)
} = {}) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let q = client()
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (search.trim()) {
    const t = search.trim().replace(/[%,()]/g, "");
    q = q.or(`email.ilike.%${t}%,full_name.ilike.%${t}%`);
  }
  if (role === "unknown") q = q.is("role", null);
  else if (role) q = q.eq("role", role);
  if (status === "blocked") q = q.eq("is_blocked", true);
  else if (status === "active") q = q.eq("is_blocked", false);
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

/* ------------------------------------------------ operations & moderation --- */
// Backed by supabase/admin_operations.sql. Every write is a security-definer
// RPC that checks is_admin() and records a row in admin_moderation_log.

async function rpc(name, args) {
  const { data, error } = await client().rpc(name, args);
  if (error) {
    if (looksMissing(error) && !/not authorized/i.test(error.message || "")) {
      throw new Error(
        "Run supabase/admin_operations.sql in the Supabase SQL editor to enable this action.",
      );
    }
    throw error;
  }
  return data;
}

export const setUserBlocked = (userId, blocked, reason) =>
  rpc("admin_set_user_blocked", {
    p_user_id: userId,
    p_blocked: blocked,
    p_reason: reason ?? null,
  });

export const fetchUserSummary = (userId) =>
  rpcOrMissing("admin_user_summary", { p_user_id: userId });

export async function setShopSuspended(shopId, suspended, reason) {
  const shop = await rpc("admin_set_shop_suspended", {
    p_shop_id: shopId,
    p_suspended: suspended,
    p_reason: reason ?? null,
  });
  // the edge function already has "suspended" + "restored" email templates
  notifyVendorStatus(shop, suspended ? "suspended" : "restored", reason);
}

// Admin actions recorded against one entity (or all of a type), newest first,
// with the acting admin's email attached.
export async function fetchModerationLog({
  entityType,
  entityId,
  limit = 100,
} = {}) {
  let q = client()
    .from("admin_moderation_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (entityType) q = q.eq("entity_type", entityType);
  if (entityId) q = q.eq("entity_id", String(entityId));
  const { data, error } = await q;
  if (error) {
    if (/relation|does not exist|schema cache/i.test(error.message || ""))
      return { _missing: true, rows: [] };
    throw error;
  }
  const rows = data ?? [];
  const admins = await profilesById(rows.map((r) => r.admin_id));
  for (const r of rows) r._admin = admins.get(r.admin_id) || null;
  return { rows };
}

// id → { id, email, full_name, role } for a batch of profile ids.
async function profilesById(ids) {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return new Map();
  const { data } = await client()
    .from("profiles")
    .select("id, email, full_name, role")
    .in("id", uniq);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

async function shopsById(ids) {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return new Map();
  const { data } = await client()
    .from("shops")
    .select("id, name, owner_name, locality, status")
    .in("id", uniq);
  return new Map((data ?? []).map((s) => [s.id, s]));
}

/* ----------------------------------------------------------------- orders --- */

export const fetchOrderFacets = () => rpcOrMissing("admin_order_facets");

export async function fetchOrders({
  page = 0,
  pageSize = 25,
  search = "",
  status = "",
  paymentStatus = "",
  paymentMethod = "",
  shopId = "",
  customerId = "",
  from: fromDate = "",
  to: toDate = "",
} = {}) {
  const start = page * pageSize;
  let q = client()
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);

  // Both the text search and the customer filter are OR-groups; PostgREST
  // takes one `or` param, so two groups are nested under a single and().
  const orGroups = [];
  const t = search.trim().replace(/[%,()#]/g, "");
  if (t) {
    const parts = [`id.ilike.%${t}%`, `customer_name.ilike.%${t}%`];
    if (/^\d+$/.test(t)) parts.push(`order_number.eq.${t}`);
    orGroups.push(parts.join(","));
  }
  if (customerId)
    orGroups.push(`customer_id.eq.${customerId},user_id.eq.${customerId}`);
  if (orGroups.length === 1) q = q.or(orGroups[0]);
  else if (orGroups.length === 2)
    q = q.or(`and(or(${orGroups[0]}),or(${orGroups[1]}))`);

  if (status) q = q.eq("status", status);
  if (paymentStatus) q = q.eq("payment_status", paymentStatus);
  if (paymentMethod) q = q.eq("payment_method", paymentMethod);
  if (shopId) q = q.eq("shop_id", shopId);
  if (fromDate) q = q.gte("created_at", new Date(fromDate).toISOString());
  if (toDate) {
    const end = new Date(toDate);
    end.setDate(end.getDate() + 1); // inclusive of the whole "to" day
    q = q.lt("created_at", end.toISOString());
  }

  const { data, error, count } = await q;
  if (error) throw error;
  const rows = data ?? [];
  const [shops, people] = await Promise.all([
    shopsById(rows.map((o) => o.shop_id)),
    profilesById(rows.map((o) => o.customer_id || o.user_id)),
  ]);
  for (const o of rows) {
    o._shop = shops.get(o.shop_id) || null;
    o._customer = people.get(o.customer_id || o.user_id) || null;
  }
  return { rows, total: count ?? 0 };
}

export async function fetchOrderItems(orderId) {
  const { data, error } = await client()
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export const cancelOrder = (orderId, reason) =>
  rpc("admin_cancel_order", { p_order_id: String(orderId), p_reason: reason });

export const refundOrder = (orderId, amount, reason) =>
  rpc("admin_refund_order", {
    p_order_id: String(orderId),
    p_amount: Number(amount),
    p_reason: reason,
  });

/* --------------------------------------------------------------- products --- */

export async function fetchProducts({
  page = 0,
  pageSize = 25,
  search = "",
  shopId = "",
  categoryId = "",
  brand = "",
  state = "", // "" | active | inactive | restricted
} = {}) {
  const start = page * pageSize;
  let q = client()
    .from("products")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);

  const t = search.trim().replace(/[%,()]/g, "");
  if (t)
    q = q.or(`name.ilike.%${t}%,brand.ilike.%${t}%,barcode.ilike.%${t}%,id.ilike.%${t}%`);
  if (shopId) q = q.eq("shop_id", shopId);
  if (categoryId) q = q.eq("category_id", categoryId);
  if (brand) q = q.ilike("brand", brand.trim());
  if (state === "active") q = q.eq("is_active", true).eq("is_restricted", false);
  if (state === "inactive") q = q.eq("is_active", false);
  if (state === "restricted") q = q.eq("is_restricted", true);

  const { data, error, count } = await q;
  if (error) throw error;
  const rows = data ?? [];
  const shops = await shopsById(rows.map((p) => p.shop_id));
  for (const p of rows) p._shop = shops.get(p.shop_id) || null;
  return { rows, total: count ?? 0 };
}

export const setProductFlag = (productId, action, reason) =>
  rpc("admin_set_product_flag", {
    p_product_id: String(productId),
    p_action: action,
    p_reason: reason ?? null,
  });

export const fetchBrands = () => rpcOrMissing("admin_brands");
export const renameBrand = (from, to) =>
  rpc("admin_rename_brand", { p_from: from, p_to: to });
export const fetchDuplicateProducts = () =>
  rpcOrMissing("admin_duplicate_products");
export const fetchRestrictedMatches = () =>
  rpcOrMissing("admin_restricted_matches");

export async function fetchRestrictedKeywords() {
  const { data, error } = await client()
    .from("restricted_product_keywords")
    .select("*")
    .order("keyword");
  if (error) {
    if (/relation|does not exist|schema cache/i.test(error.message || ""))
      return { _missing: true, rows: [] };
    throw error;
  }
  return { rows: data ?? [] };
}

export async function addRestrictedKeyword(keyword, reason) {
  const { error } = await client()
    .from("restricted_product_keywords")
    .insert({ keyword: keyword.trim().toLowerCase(), reason: reason?.trim() || null });
  if (error) throw error;
}

export async function deleteRestrictedKeyword(keyword) {
  const { error } = await client()
    .from("restricted_product_keywords")
    .delete()
    .eq("keyword", keyword);
  if (error) throw error;
}

/* ---------------------------------------------------------------- reviews --- */

export async function fetchReviews({
  page = 0,
  pageSize = 25,
  search = "",
  stars = "",
  visibility = "", // "" | visible | hidden | reported
  shopId = "",
} = {}) {
  const start = page * pageSize;
  let q = client()
    .from("shop_ratings")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);

  const t = search.trim().replace(/[%,()]/g, "");
  if (t) q = q.ilike("review", `%${t}%`);
  if (stars) q = q.eq("rating", Number(stars));
  if (shopId) q = q.eq("shop_id", shopId);
  if (visibility === "visible") q = q.eq("is_hidden", false);
  if (visibility === "hidden") q = q.eq("is_hidden", true);
  if (visibility === "reported") q = q.eq("is_reported", true);

  const { data, error, count } = await q;
  if (error) throw error;
  const rows = data ?? [];
  const [shops, people] = await Promise.all([
    shopsById(rows.map((r) => r.shop_id)),
    profilesById(rows.map((r) => r.customer_id)),
  ]);
  for (const r of rows) {
    r._shop = shops.get(r.shop_id) || null;
    r._reviewer = people.get(r.customer_id) || null;
  }
  return { rows, total: count ?? 0 };
}

export const moderateReview = (reviewId, action, reason) =>
  rpc("admin_moderate_review", {
    p_review_id: reviewId,
    p_action: action,
    p_reason: reason ?? null,
  });

/* ------------------------------------------------------ platform analytics --- */

export const fetchPlatformAnalytics = (days = 30) =>
  rpcOrMissing("admin_platform_analytics", { p_days: days });

/* ------------------------------------------------- notification campaigns --- */
// Backed by supabase/notifications_campaigns.sql + the `push-campaign` edge
// function. Until the SQL runs, fetchCampaigns throws a "needs setup" error the
// view catches and turns into a one-line hint.

export async function fetchCampaigns() {
  const { data, error } = await client()
    .from("notification_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    if (/relation|does not exist|schema cache/i.test(error.message || "")) {
      throw new Error(
        "Run supabase/notifications_campaigns.sql in the Supabase SQL editor to enable Notifications.",
      );
    }
    throw error;
  }
  return data ?? [];
}

// Rough recipient count for the compose form (profiles in the chosen audience).
export async function estimateAudience(audience) {
  if (audience === "user") return 1;
  let q = client()
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (audience === "customer" || audience === "vendor")
    q = q.eq("role", audience);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

// Look up one user by email or id for the "specific user" audience.
export async function findUser(term) {
  const t = (term || "").trim();
  if (!t) return null;
  const isId = /^[0-9a-f-]{32,36}$/i.test(t);
  const { data, error } = await client()
    .from("profiles")
    .select("id, email, role")
    .eq(isId ? "id" : "email", isId ? t : t.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

const CAMPAIGN_FIELDS = [
  "title",
  "body",
  "image_url",
  "audience",
  "target_user_id",
  "channels",
  "route",
  "data",
  "email_subject",
  "email_html",
  "scheduled_at",
  "status",
];

export async function createCampaign(input) {
  const me = await getMyId();
  const payload = { created_by: me };
  for (const f of CAMPAIGN_FIELDS)
    if (input[f] !== undefined) payload[f] = input[f];
  const { data, error } = await client()
    .from("notification_campaigns")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateCampaign(id, patch) {
  const payload = {};
  for (const f of CAMPAIGN_FIELDS)
    if (patch[f] !== undefined) payload[f] = patch[f];
  const { error } = await client()
    .from("notification_campaigns")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function cancelCampaign(id) {
  const { error } = await client()
    .from("notification_campaigns")
    .update({ status: "canceled" })
    .eq("id", id)
    .in("status", ["draft", "scheduled"]);
  if (error) throw error;
}

export async function deleteCampaign(id) {
  const { error } = await client()
    .from("notification_campaigns")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Ask the edge function to start sending now. The cron tick finishes any
// remainder for large audiences.
export async function sendCampaignNow(id) {
  const { data, error } = await client().functions.invoke("push-campaign", {
    body: { action: "enqueue", campaignId: id },
  });
  if (error) throw new Error(await readFnError(error, "Send failed"));
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function sendTestNotification(input) {
  const { data, error } = await client().functions.invoke("push-campaign", {
    body: { action: "send_test", ...input },
  });
  if (error) throw new Error(await readFnError(error, "Test send failed"));
  if (data?.error) throw new Error(data.error);
  return data;
}

// supabase-js wraps a non-2xx function response in a FunctionsHttpError whose
// real message sits on error.context (a Response). Pull it out when we can.
async function readFnError(error, fallback) {
  try {
    const body = await error.context?.json?.();
    if (body?.error) return body.error;
  } catch {
    /* ignore */
  }
  return error.message || fallback;
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
  await probe("shops_is_deleted", () =>
    client().from("shops").select("is_deleted").limit(1),
  );
  await probe("shops_locality", () =>
    client().from("shops").select("locality").limit(1),
  );
  await probe("shops_locality_source", () =>
    client().from("shops").select("locality_source").limit(1),
  );
  await probe("shop_ratings", () =>
    client().from("shop_ratings").select("id").limit(1),
  );
  await probe("admin_login_logs", () =>
    client().from("admin_login_logs").select("id").limit(1),
  );
  await probe("admin_dashboard_rpc", () => client().rpc("admin_dashboard"));
  await probe("admin_analytics_rpc", () => client().rpc("admin_analytics"));
  await probe("admin_search_analytics_rpc", () =>
    client().rpc("admin_search_analytics"),
  );
  await probe("admin_ratings_analytics_rpc", () =>
    client().rpc("admin_ratings_analytics"),
  );
  await probe("admin_geo_analytics_rpc", () =>
    client().rpc("admin_geo_analytics"),
  );
  await probe("admin_user_role_counts_rpc", () =>
    client().rpc("admin_user_role_counts"),
  );
  await probe("admin_coupon_stats_rpc", () =>
    client().rpc("admin_coupon_stats"),
  );
  await probe("admin_moderation_log", () =>
    client().from("admin_moderation_log").select("id").limit(1),
  );
  await probe("profiles_is_blocked", () =>
    client().from("profiles").select("is_blocked").limit(1),
  );
  await probe("products_is_restricted", () =>
    client().from("products").select("is_restricted").limit(1),
  );
  await probe("shop_ratings_is_hidden", () =>
    client().from("shop_ratings").select("is_hidden").limit(1),
  );
  await probe("admin_order_facets_rpc", () =>
    client().rpc("admin_order_facets"),
  );
  await probe("admin_platform_analytics_rpc", () =>
    client().rpc("admin_platform_analytics", { p_days: 1 }),
  );
  return out;
}

/* --------------------------------------------------------------- storage --- */

// Business proofs are stored as `/object/authenticated/shop-proofs/<path>`
// (private bucket), and older files as `/object/public/<bucket>/<path>`, which
// 400 if that bucket is ever made private. Swap either for a short-lived
// signed URL; anything else is returned untouched.
export async function resolveStorageUrl(url, expiresIn = 3600) {
  const m = /\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+?)(\?|$)/.exec(url || "");
  if (!m) return url;
  const [, bucket, path] = m;
  const { data, error } = await client()
    .storage.from(bucket)
    .createSignedUrl(decodeURIComponent(path), expiresIn);
  if (error || !data?.signedUrl) return url;
  return data.signedUrl;
}
