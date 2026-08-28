import { probeSchema } from "../api";
import { Async, useAsync } from "../ui";

const CHECKS = [
  ["admin_dashboard_rpc", "admin_dashboard() RPC", "Analytics dashboard — install via supabase/admin_panel.sql"],
  ["admin_login_logs", "admin_login_logs table", "Login attempts are logged here (best-effort until it exists)"],
  ["shops_is_deleted", "shops.is_deleted column", "Soft delete for vendors — hard delete is never used"],
  ["shops_locality", "shops.locality column", "Enables the “Top performing area” card (decision 1)"],
];

const NOTES = [
  {
    title: "Redundant triggers on shop_ratings",
    body: "Three triggers (shop_ratings_aggregate, shop_ratings_refresh, trg_refresh_shop_rating) all call refresh_shop_rating() on insert. Harmless if idempotent, but it recalculates three times per rating. Drop two of the three next time you're in that migration.",
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
            Run <code>supabase/admin_panel.sql</code> in the Supabase SQL editor to install everything above.
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
