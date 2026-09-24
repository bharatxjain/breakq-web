# BreakQ Admin Panel

Hidden operator console at **`/admin`**. It is **not linked anywhere** in the
site — reachable only by typing the URL. On a fresh checkout it works in `npm run
dev` immediately; a few things below unlock full functionality.

---

## 1. Run the database setup (once)

Open the Supabase project → **SQL Editor** → **New query** → paste all of
[`supabase/admin_panel.sql`](supabase/admin_panel.sql) → **Run**. It is safe to
re-run.

It creates:

| Object | Why |
|---|---|
| `admin_login_logs` table | records every admin login attempt (success + failure) |
| `shops.is_deleted` column | soft delete — the panel never issues a hard `DELETE` on a shop |
| `shops.locality` column | enables the Dashboard's "Top performing area" card |
| `is_admin()` + RLS policies | lets an admin's browser session actually read/write the tables |
| `admin_dashboard()` RPC | all analytics cards in one round-trip (orders, revenue, 30-day trend vs prior 30 days, orders-by-hour, top product/category, searches) |
| `admin_override_tier()` RPC | the transactional "change a vendor's tier" flow |
| self read/update policy on `profiles` + `prevent_role_escalation` trigger | powers the header **Edit profile** modal; the trigger stops a non-admin changing their own role |

Re-run this file after pulling changes — it's idempotent, and later versions add
fields (e.g. the dashboard's hourly / prior-period series) and the profile policies.

### 1b. Analytics add-on

After `admin_panel.sql`, also run [`supabase/admin_analytics.sql`](supabase/admin_analytics.sql)
(same place, safe to re-run). It adds read-only `security definer` RPCs behind the
extra Dashboard cards/graphs and the **Search & Discovery**, **Ratings**, and
**Geography** tabs, plus per-shop metrics on the Vendors detail view. Every metric
is wrapped in its own exception block — a schema mismatch nulls just that field and
the panel shows a "needs setup" hint for it. The **System** tab lists which RPCs
are installed.

Notes on what the data can and can't show:
- **Zero-result searches** — the event log has no result count, so this is a
  proxy: a search by a signed-in visitor that produced no shop view within 30 min.
- **Discovery funnel** — the "contact / visit" stage stays empty until
  call / WhatsApp / directions taps are recorded as view events.
- **MRR** — sum of active subscription tier prices where price > 0, treated as monthly.
- **Impersonate view** and **force re-geocode** were requested but not built:
  there's no customer-facing shop UI or geocode endpoint in this repo.

### 1c. Operations & moderation add-on

Then run [`supabase/admin_operations.sql`](supabase/admin_operations.sql) (safe to
re-run). It lets the panel **act**, not just read. Every write is a
`security definer` RPC that checks `is_admin()` and records who / what / why in
`admin_moderation_log`:

| Adds | Used by |
|---|---|
| `profiles.is_blocked` + `admin_set_user_blocked()` | **Users**: block / unblock. Also sets `auth.users.banned_until` and ends their sessions |
| `shops.suspended_at / suspension_reason` + `admin_set_shop_suspended()` | **Vendors**: suspend / lift. Status goes to `suspended` and the shop stops taking orders |
| `orders.refund_*` + `admin_cancel_order()` / `admin_refund_order()` | **Orders**: cancel / record a refund |
| `products.is_restricted` + `admin_set_product_flag()`, `admin_rename_brand()`, `admin_duplicate_products()`, `restricted_product_keywords` | **Products**: moderation, brands, duplicates, restricted list |
| `shop_ratings.is_hidden / is_reported` + `admin_moderate_review()` | **Reviews**: hide / report / remove |
| `admin_platform_analytics(days)`, `admin_order_facets()`, `admin_user_summary()` | **Platform analytics**, Orders filters, Users detail |

Enforcement is in the database, so the mobile app needs no change:
- **Column-protection triggers**: a customer or vendor can't clear `is_blocked`,
  lift a suspension, or un-restrict or un-hide something.
- **Restrictive RLS**: hidden reviews and restricted products disappear from
  the app. These policies are only added when the table already has RLS on.
- **Blocked users** can't sign in or refresh a token. An access token already
  issued stays valid until it expires (≤1h).

Known limits:
- **Refunds are bookkeeping.** The panel marks `payment_status = 'refunded'` and
  records the amount. Return the money in the payment gateway (or in cash) yourself.
- **Hiding or removing a review** recalculates `shops.avg_rating / rating_count`
  from the visible reviews. The app's own `refresh_shop_rating()` trigger may
  count hidden reviews again the next time a review is added. Make it ignore
  `is_hidden = true` to fix that.
- **Order status values** aren't fixed in the schema (`orders.status` is text).
  The Orders filters list whatever values exist. Cancellation matches any status
  starting with `cancel`, `reject`, or `declin`.

Until it runs: the Dashboard shows a "not installed" message, login logging is
silently skipped, and the delete/commission/tier controls will error. The
**System** tab in the panel shows exactly which pieces are installed.

> If `subscription_tiers.id` is **not** a `uuid` in your schema, change the
> `p_tier_id` argument type in `admin_override_tier(...)` to match.

## 2. Make yourself an admin

The panel authorizes on **`profiles.role = 'admin'`** (guarded by your existing
`prevent_role_escalation` trigger — set it directly in SQL):

```sql
update public.profiles set role = 'admin' where id = '<your-auth-user-id>';
```

Your email must already exist as an auth user (the panel uses
`signInWithOtp({ shouldCreateUser: false })` — it never provisions accounts).

## 3. Optional: set the page-gate password

`/admin` shows a shared password prompt **before** the email login. This is a
pre-filter, not real security (it ships in the client bundle). Default is
`breakq-admin`; override with:

```
VITE_ADMIN_GATE_PASSWORD=something-else
```

---

## Login flow

1. Page-gate password
2. `supabase.auth.signInWithOtp({ email })` → 6-digit code
3. On verify → `select role from profiles where id = auth.uid()`
4. `role !== 'admin'` → immediate `signOut()` + a failure row in `admin_login_logs`
5. `role === 'admin'` → panel loads, session persists across refresh

`admin_login_logs.ip_address` stays `null` from the browser — capture it from an
Edge Function later if you need it.

---

## Modules

| Tab | Backed by |
|---|---|
| **Dashboard** | `admin_dashboard()` — orders 24h/30d, platform revenue, busy hour, top product/category, top-rated shops, most-searched, 30-day trend vs prior 30 days, orders-by-hour |
| **Users** | `profiles`: customers / vendors / admins tabs, search by email or name, active/blocked filter, block/unblock (reason required), details with orders, spend, reviews, shops owned, last sign-in, and admin history |
| **Vendors** | `shops`: pending queue, approve, reject (reason required), **suspend / lift suspension**, Enable commission, soft delete/restore, inline photo + document previews, location, ratings, links to the shop's orders / products / reviews |
| **Orders** | `orders` + `order_items`: search (order #, id, customer), filter by status / payment status / method / date / shop / customer, details (items, timeline, cancellation, refund), cancel, record refund |
| **Products** | `products`: moderation (restrict / deactivate), **Brands** (grouped spellings, rename / merge), **Duplicates** (same shop + name/unit or barcode), **Restricted** (keyword blocklist → flagged queue → restricted list), moderation history. Categories stay on their own tab |
| **Reviews** | `shop_ratings`: all reviews with text / stars / shop / reported / hidden filters, report, hide, remove (text kept in history), per-review and global moderation history |
| **Platform analytics** | `admin_platform_analytics()`. Platform: users, active / new users, vendors, active shops, orders, GMV, revenue, AOV, cancellation + refund rate. Customer: DAU / WAU / MAU, retention, repeat purchase, orders per user, monthly cohorts. Vendor: sales, orders, acceptance, cancellation, prep time and rating per shop. 7 / 30 / 90-day windows vs the previous window |
| **Subscriptions** | `subscription_tiers` (per-flag editor) + `vendor_subscriptions` (subscribers, manual tier change via RPC) |
| **Payments** | `subscription_payments` — read-only Razorpay ledger; **only `status`** is editable, for reconciliation |
| **Promotions** | `promoted_placements` — create (shop / daily budget / date range), spend-pacing meter, deactivate (keeps the row) |
| **Coupons** | `promo_codes` — full CRUD (`code` is the PK); usage counted live against `orders` |
| **Categories** | `categories` — CRUD; `item_count` shown as approximate |
| **System** | migration-status checks + data-integrity notes for the dev team |

---

## Files

```
src/pages/Admin.jsx        gate + OTP auth + role check + shell/nav
src/pages/Admin.css        all panel styles (scoped under .ap)
src/admin/api.js           every Supabase call
src/admin/ui.jsx           shared primitives (Modal, toasts, StatCard, Bars, …)
src/admin/moderation.jsx   reason prompt, moderation-history table, pager
src/admin/views/*.jsx      one file per module
supabase/admin_panel.sql   database setup (run once)
supabase/admin_analytics.sql   analytics RPCs (run second)
supabase/admin_operations.sql  moderation + operations (run third)
```

`App.jsx` routes `/admin/*` to a lazy-loaded `<Admin>` **outside** the marketing
`<Header>/<Footer>`, so normal visitors never download the admin bundle.
