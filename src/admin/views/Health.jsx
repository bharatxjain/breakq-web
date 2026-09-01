import { probeSchema } from "../api";
import { Async, useAsync } from "../ui";

const CHECKS = [
  ["admin_dashboard_rpc", "admin_dashboard() RPC", "Analytics dashboard — install via supabase/admin_panel.sql"],
  ["admin_login_logs", "admin_login_logs table", "Login attempts are logged here (best-effort until it exists)"],
  ["shops_is_deleted", "shops.is_deleted column", "Soft delete for vendors — hard delete is never used"],
  ["shops_locality", "shops.locality column", "Enables the “Top performing area” card (decision 1)"],
  ["shops_locality_source", "shops.locality_source column", "Geographic Intelligence — manual vs geocoded backfill health"],
  ["shop_ratings", "shop_ratings table", "Ratings & Reviews moderation queue + distribution"],
  ["admin_analytics_rpc", "admin_analytics() RPC", "Dashboard demand/supply cards + graphs — install via supabase/admin_analytics.sql"],
  ["admin_search_analytics_rpc", "admin_search_analytics() RPC", "Search & Discovery tab — supabase/admin_analytics.sql"],
  ["admin_ratings_analytics_rpc", "admin_ratings_analytics() RPC", "Ratings & Reviews tab — supabase/admin_analytics.sql"],
  ["admin_geo_analytics_rpc", "admin_geo_analytics() RPC", "Geographic Intelligence tab — supabase/admin_analytics.sql"],
];

const NOTES = [
  {
    title: "shop_ratings refresh trigger — watch for duplicates",
    body: "shops.rating_count is a rollup maintained by refresh_shop_rating() on insert. If more than one trigger calls it (a past migration added shop_ratings_aggregate / shop_ratings_refresh alongside trg_refresh_shop_rating), the count inflates. The Ratings tab now checks this live and shows a banner when the rollup and the actual review-row count diverge.",
  },
  {
    title: "categories.item_count may drift",
    body: "It's a stored column, not computed. Confirm a trigger keeps it in sync with products.category_id. The Dashboard computes “Top category” live from order data and does not trust this number.",
  },
  {
    title: "subscription_tiers declared twice in pasted schema",
    body: "Same definition, harmless as a paste — but confirm the migration files don't actually declare it twice, which fails on re-run.",
  },
  {
    title: "commission_enabled_at trigger — manual or automatic?",
    body: "The panel exposes an “Enable commission” button on the vendor detail view assuming it's manual. Confirm with the dev team whether something sets it automatically after N days.",
  },
];

export default function Health() {
  const { state, data, error, reload } = useAsync(probeSchema, []);

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>System</h1>
          <p className="ap-view-sub">Migration status &amp; known data-integrity notes</p>
        </div>
        <button className="ap-btn ap-btn-ghost" onClick={reload}>
          Re-check
        </button>
      </div>

      <section className="ap-panel">
        <div className="ap-panel-head">
          <h2>Schema checks</h2>
        </div>
        <Async state={state} error={error} onRetry={reload}>
          <ul className="ap-checklist">
            {CHECKS.map(([key, label, desc]) => (
              <li key={key} className={data?.[key] ? "is-ok" : "is-missing"}>
                <span className="ap-check-dot" aria-hidden="true" />
                <div>
                  <strong>{label}</strong>
                  <span>{desc}</span>
                </div>
                <span className="ap-check-state">{data?.[key] ? "installed" : "missing"}</span>
              </li>
            ))}
          </ul>
        </Async>
        {data && CHECKS.some(([k]) => !data[k]) && (
          <p className="ap-note">
            Run <code>supabase/admin_panel.sql</code> then <code>supabase/admin_analytics.sql</code> in the
            Supabase SQL editor to install everything above. Both are safe to re-run.
          </p>
        )}
      </section>

      <section className="ap-panel">
        <div className="ap-panel-head">
          <h2>Data-integrity notes for the dev team</h2>
        </div>
        <div className="ap-notes">
          {NOTES.map((n) => (
            <div key={n.title} className="ap-note-card">
              <strong>{n.title}</strong>
              <p>{n.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
