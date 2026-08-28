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
| **Users** | `profiles` — read-only directory, 50/page, search by email, click a row for full details |
| **Vendors** | `shops` — pending queue, approve, reject (reason required), Enable commission, soft delete/restore, proof/photo links |
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
src/admin/views/*.jsx      one file per module
supabase/admin_panel.sql   database setup (run once)
```

`App.jsx` routes `/admin/*` to a lazy-loaded `<Admin>` **outside** the marketing
`<Header>/<Footer>`, so normal visitors never download the admin bundle.
