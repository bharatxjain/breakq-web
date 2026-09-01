import { fetchRatingsAnalytics } from "../api";
import { Async, Histogram, NeedsSetup, fmtDateTime, num, useAsync } from "../ui";

const STAR = "★";

export default function RatingsModeration() {
  const { state, data, error, reload } = useAsync(fetchRatingsAnalytics, []);
  const missing = data?._missing;
  const A = data && !missing ? data : null;

  const dist = A?.distribution || [];
  const low = A?.low_ratings || [];
  const integ = A?.integrity;
  const totalRatings = dist.reduce((s, b) => s + (Number(b.count) || 0), 0);
  const weighted = dist.reduce((s, b) => s + b.stars * (Number(b.count) || 0), 0);
  const mean = totalRatings ? (weighted / totalRatings).toFixed(2) : "—";

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Ratings &amp; Reviews</h1>
          <p className="ap-view-sub">Moderation queue and rating-data health</p>
        </div>
        <button className="ap-btn ap-btn-ghost" onClick={reload}>
          Refresh
        </button>
      </div>

      <Async state={state} error={error} onRetry={reload}>
        {missing ? (
          <NeedsSetup what="Ratings analytics" />
        ) : (
          <>
            {integ && integ.inflated ? (
              <div className="ap-banner ap-banner-danger">
                <strong>Rating counts may be inflated.</strong> The stored rollup totals{" "}
                <strong>{num(integ.rollup)}</strong> against <strong>{num(integ.reviews)}</strong> actual
                reviews
                {integ.ratio ? ` (~${integ.ratio}×)` : ""}
                {integ.refresh_triggers > 1
                  ? ` and ${integ.refresh_triggers} refresh triggers fire per insert`
                  : ""}
                . Don&rsquo;t trust per-shop rating counts until the duplicate-trigger cleanup migration
                ships — the distribution below is counted directly from review rows and is safe.
              </div>
            ) : integ ? (
              <div className="ap-banner ap-banner-ok">
                Rating rollup looks consistent — {num(integ.reviews)} reviews,{" "}
                {integ.refresh_triggers} refresh trigger{integ.refresh_triggers === 1 ? "" : "s"}.
              </div>
            ) : null}

            <section className="ap-stat-grid">
              <div className="ap-stat">
                <span className="ap-stat-label">Total reviews</span>
                <span className="ap-stat-value">{num(totalRatings)}</span>
              </div>
              <div className="ap-stat">
                <span className="ap-stat-label">Mean rating</span>
                <span className="ap-stat-value">{mean}</span>
              </div>
              <div className="ap-stat">
                <span className="ap-stat-label">1–2 star (180d)</span>
                <span className="ap-stat-value">{num(low.length)}</span>
              </div>
            </section>

            <section className="ap-panel">
              <div className="ap-panel-head">
                <h2>Rating distribution</h2>
                <span className="ap-view-sub">count per bucket · all time</span>
              </div>
              {totalRatings ? (
                <Histogram bins={dist.map((b) => ({ label: `${b.stars}${STAR}`, value: b.count }))} />
              ) : (
                <div className="ap-async-empty">No reviews yet.</div>
              )}
            </section>

            <section className="ap-panel">
              <div className="ap-panel-head">
                <h2>Flagged &amp; low ratings</h2>
                <span className="ap-view-sub">1–2 star · last 180 days · newest first</span>
              </div>
              {low.length ? (
                <div className="ap-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>Shop</th>
                        <th>Reviewer</th>
                        <th>When</th>
                        <th className="ap-num">Stars</th>
                        <th>Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {low.map((r) => (
                        <tr key={r.id}>
                          <td>{r.shop_name}</td>
                          <td>{r.reviewer}</td>
                          <td>{fmtDateTime(r.created_at)}</td>
                          <td className="ap-num">{r.rating}{STAR}</td>
                          <td>{r.review ? r.review : <span className="ap-td-empty">— no text —</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="ap-async-empty">No 1–2 star reviews in the last 180 days.</div>
              )}
            </section>
          </>
        )}
      </Async>
    </div>
  );
}
