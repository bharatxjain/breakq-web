import { fetchGeoAnalytics } from "../api";
import { Async, Donut, Legend, NeedsSetup, RankBars, fmtDate, num, useAsync } from "../ui";

// Lightweight proportional-symbol plot from shop coordinates. A real tiled map
// needs a maps layer that isn't bundled in this app; this still shows the
// geographic concentration the single-locality pilot decision hinges on.
function BubbleMap({ points }) {
  const pts = points.filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
  if (pts.length < 2) return <div className="ap-async-empty">Not enough geocoded shops to plot.</div>;
  const lats = pts.map((p) => Number(p.lat));
  const lngs = pts.map((p) => Number(p.lng));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const W = 640;
  const H = 320;
  const P = 24;
  const sx = (v) => P + ((v - minLng) / (maxLng - minLng || 1)) * (W - P * 2);
  const sy = (v) => H - P - ((v - minLat) / (maxLat - minLat || 1)) * (H - P * 2);
  const maxShops = Math.max(...pts.map((p) => Number(p.shops) || 1));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ap-area-svg" role="img" aria-label="Shop density by locality">
      <rect x="0" y="0" width={W} height={H} fill="var(--ap-surface-2)" rx="10" />
      {pts.map((p, i) => {
        const r = 6 + Math.sqrt((Number(p.shops) || 1) / maxShops) * 26;
        return (
          <g key={i}>
            <circle cx={sx(Number(p.lng))} cy={sy(Number(p.lat))} r={r} fill="var(--ap-primary)" fillOpacity="0.28" stroke="var(--ap-primary)" />
            <text x={sx(Number(p.lng))} y={sy(Number(p.lat)) - r - 3} textAnchor="middle" fontSize="10" fill="var(--ap-text-soft)">
              {p.locality} ({num(p.shops)})
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function GeoIntelligence() {
  const { state, data, error, reload } = useAsync(fetchGeoAnalytics, []);
  const missing = data?._missing;
  const A = data && !missing ? data : null;

  const density = A?.density || [];
  const src = A?.locality_source;
  const ungeocoded = A?.ungeocoded || [];

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Geographic Intelligence</h1>
          <p className="ap-view-sub">Where the shops are — and how good the location data is</p>
        </div>
        <button className="ap-btn ap-btn-ghost" onClick={reload}>
          Refresh
        </button>
      </div>

      <Async state={state} error={error} onRetry={reload}>
        {missing ? (
          <NeedsSetup what="Geographic analytics" />
        ) : (
          <>
            <section className="ap-panel">
              <div className="ap-panel-head">
                <h2>Shop density by locality</h2>
                <span className="ap-view-sub">bubble size = shop count · active shops only</span>
              </div>
              {density.length ? <BubbleMap points={density} /> : <div className="ap-async-empty">No localised shops.</div>}
            </section>

            <section className="ap-two-col">
              <div className="ap-panel">
                <div className="ap-panel-head">
                  <h2>Shops per locality</h2>
                  <span className="ap-view-sub">top 40</span>
                </div>
                {density.length ? (
                  <RankBars
                    rows={density.map((d) => ({
                      label: d.locality,
                      value: d.shops,
                      sub: `${num(d.accepting)} accepting`,
                    }))}
                  />
                ) : (
                  <div className="ap-async-empty">No data.</div>
                )}
              </div>

              <div className="ap-panel">
                <div className="ap-panel-head">
                  <h2>Location data health</h2>
                  <span className="ap-view-sub">how localities were resolved</span>
                </div>
                {src ? (
                  <>
                    <div className="ap-kpi-donut">
                      <Donut
                        segments={[
                          { value: src.geocoded || 0, color: "var(--ap-primary)" },
                          { value: src.manual || 0, color: "var(--ap-primary-2)" },
                          { value: src.none || 0, color: "var(--ap-warn)" },
                        ]}
                        centerLabel={num(src.total || 0)}
                        centerSub="shops"
                      />
                      <Legend
                        rows={[
                          { label: "Geocoded (Nominatim)", value: num(src.geocoded || 0), color: "var(--ap-primary)" },
                          { label: "Manual", value: num(src.manual || 0), color: "var(--ap-primary-2)" },
                          { label: "Never geocoded", value: num(src.none || 0), color: "var(--ap-warn)" },
                        ]}
                      />
                    </div>
                    {src.none > 0 && (
                      <p className="ap-field-hint" style={{ marginTop: 10 }}>
                        {num(src.none)} shop{src.none === 1 ? "" : "s"} still need the backfill script run.
                      </p>
                    )}
                  </>
                ) : (
                  <NeedsSetup what="Location-source breakdown" />
                )}
              </div>
            </section>

            {ungeocoded.length > 0 && (
              <section className="ap-panel">
                <div className="ap-panel-head">
                  <h2>Never-geocoded shops</h2>
                  <span className="ap-view-sub">worklist for the backfill script · newest 50</span>
                </div>
                <div className="ap-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>Shop</th>
                        <th>Locality (text)</th>
                        <th>Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ungeocoded.map((s) => (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>{s.locality || <span className="ap-td-empty">—</span>}</td>
                          <td>{fmtDate(s.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </Async>
    </div>
  );
}
