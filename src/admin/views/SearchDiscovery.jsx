import { fetchSearchAnalytics } from "../api";
import { Async, Heatmap, NeedsSetup, RankBars, num, useAsync } from "../ui";

// Search & Discovery — the pre-payments demand signal. Everything here is
// derived from customer search / view events; each block degrades to a "needs
// setup" hint until supabase/admin_analytics.sql has been run.
export default function SearchDiscovery() {
  const { state, data, error, reload } = useAsync(fetchSearchAnalytics, []);
  const missing = data?._missing;
  const A = data && !missing ? data : null;

  const zero = A?.zero_result_terms || [];
  const lowCtr = A?.low_ctr_terms || [];
  const conv = A?.conversion_by_locality || [];
  const heat = (A?.heatmap || []).map((h) => ({ row: h.locality, col: h.event_type, count: h.count }));

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Search &amp; Discovery</h1>
          <p className="ap-view-sub">What customers look for, and where supply isn&rsquo;t meeting demand</p>
        </div>
        <button className="ap-btn ap-btn-ghost" onClick={reload}>
          Refresh
        </button>
      </div>

      <Async state={state} error={error} onRetry={reload}>
        {missing ? (
          <NeedsSetup what="Search analytics" />
        ) : (
          <>
            <section className="ap-panel">
              <div className="ap-panel-head">
                <h2>Searches with no results</h2>
                <span className="ap-view-sub">ranked by frequency · last 30 days · direct vendor-acquisition targets</span>
              </div>
              {zero.length ? (
                <div className="ap-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th style={{ width: 48 }}>#</th>
                        <th>Search term</th>
                        <th className="ap-num">Searches with no view</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zero.map((t, i) => (
                        <tr key={t.term}>
                          <td>{i + 1}</td>
                          <td>{t.term}</td>
                          <td className="ap-num">{num(t.hits)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="ap-async-empty">No unmatched searches recorded yet.</div>
              )}
            </section>

            <section className="ap-panel">
              <div className="ap-panel-head">
                <h2>Results, but low view-through</h2>
                <span className="ap-view-sub">
                  terms customers search often yet rarely open a shop for — a catalog / pricing / photo problem
                </span>
              </div>
              {lowCtr.length ? (
                <div className="ap-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>Search term</th>
                        <th className="ap-num">Searches</th>
                        <th className="ap-num">Led to a view</th>
                        <th className="ap-num">View-through</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowCtr.map((t) => (
                        <tr key={t.term}>
                          <td>{t.term}</td>
                          <td className="ap-num">{num(t.searches)}</td>
                          <td className="ap-num">{num(t.views)}</td>
                          <td className="ap-num">{t.ctr}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="ap-async-empty">Nothing flagged — view-through looks healthy.</div>
              )}
            </section>

            <section className="ap-two-col">
              <div className="ap-panel">
                <div className="ap-panel-head">
                  <h2>Search → view conversion by locality</h2>
                  <span className="ap-view-sub">last 30 days · where supply matches demand</span>
                </div>
                {conv.length ? (
                  <RankBars
                    rows={conv.map((c) => ({
                      label: c.locality,
                      value: c.rate,
                      sub: `${num(c.searches)} searches`,
                    }))}
                    format={(v) => `${v}%`}
                    max={100}
                  />
                ) : (
                  <div className="ap-async-empty">No locality-tagged events yet.</div>
                )}
              </div>

              <div className="ap-panel">
                <div className="ap-panel-head">
                  <h2>Volume by locality &amp; event type</h2>
                  <span className="ap-view-sub">last 30 days</span>
                </div>
                {heat.length ? (
                  <Heatmap data={heat} />
                ) : (
                  <div className="ap-async-empty">No locality-tagged events yet.</div>
                )}
              </div>
            </section>

            <p className="ap-note">
              &ldquo;No results&rdquo; is inferred: the event log has no result count, so a search counts as
              unmatched when the same visitor opened no shop within 30 minutes of it. Anonymous searches
              are excluded.
            </p>
          </>
        )}
      </Async>
    </div>
  );
}
