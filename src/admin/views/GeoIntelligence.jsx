import { fetchGeoAnalytics } from "../api";
import {
  Async,
  Donut,
  Legend,
  NeedsSetup,
  RankBars,
  fmtDate,
  num,
  useAsync,
} from "../ui";

const BASIS_LABEL = {
  text: "named locality",
  pincode: "PIN code",
  coords: "coordinates",
  none: "unknown",
};

// Lightweight proportional-symbol plot from shop coordinates. A real tiled map
// needs a maps layer that isn't bundled in this app; this still shows the
// geographic concentration the single-locality pilot decision hinges on.
function BubbleMap({ points }) {
  const pts = points.filter(
    (p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)),
  );
  if (pts.length < 2)
    return (
      <div className="ap-async-empty">
        Not enough shops with coordinates to plot.
      </div>
    );
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
  const sy = (v) =>
    H - P - ((v - minLat) / (maxLat - minLat || 1)) * (H - P * 2);
  const maxShops = Math.max(...pts.map((p) => Number(p.shops) || 1));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="ap-area-svg"
      role="img"
      aria-label="Shop density by area"
    >
      <rect
        x="0"
        y="0"
        width={W}
        height={H}
        fill="var(--ap-surface-2)"
        rx="10"
      />
      {pts.map((p, i) => {
        const r = 6 + Math.sqrt((Number(p.shops) || 1) / maxShops) * 26;
        return (
          <g key={i}>
            <circle
              cx={sx(Number(p.lng))}
              cy={sy(Number(p.lat))}
              r={r}
              fill="var(--ap-primary)"
              fillOpacity="0.28"
              stroke="var(--ap-primary)"
            />
            <text
              x={sx(Number(p.lng))}
              y={sy(Number(p.lat)) - r - 3}
              textAnchor="middle"
              fontSize="10"
              fill="var(--ap-text-soft)"
            >
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
  const res = A?.resolution;
  const src = A?.locality_source;
  const ungeocoded = A?.ungeocoded || [];

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Geographic Intelligence</h1>
          <p className="ap-view-sub">
            Where the shops are - grouped by named locality, else PIN code, else
            coordinates
          </p>
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
                <h2>Shop density by area</h2>
                <span className="ap-view-sub">
                  bubble size = shop count · positioned by coordinates
                </span>
              </div>
              {density.length ? (
                <BubbleMap points={density} />
              ) : (
                <div className="ap-async-empty">No placeable shops.</div>
              )}
            </section>

            <section className="ap-two-col">
              <div className="ap-panel">
                <div className="ap-panel-head">
                  <h2>Shops per area</h2>
                  <span className="ap-view-sub">
                    top 40 · named locality / PIN / coordinate cluster
                  </span>
                </div>
                {density.length ? (
                  <RankBars
                    rows={density.map((d) => ({
                      label: d.locality,
                      value: d.shops,
                      sub: `${num(d.accepting)} accepting · via ${BASIS_LABEL[d.basis] || d.basis}`,
                    }))}
                  />
                ) : (
                  <div className="ap-async-empty">No data.</div>
                )}
              </div>

              <div className="ap-panel">
                <div className="ap-panel-head">
                  <h2>How location is known</h2>
                  <span className="ap-view-sub">
                    per shop · what we can place it by
                  </span>
                </div>
                {res ? (
                  <>
                    <div className="ap-kpi-donut">
                      <Donut
                        segments={[
                          { value: res.text || 0, color: "var(--ap-primary)" },
                          {
                            value: res.pincode || 0,
                            color: "var(--ap-primary-2)",
                          },
                          { value: res.coords || 0, color: "var(--ap-ok)" },
                          { value: res.none || 0, color: "var(--ap-warn)" },
                        ]}
                        centerLabel={num(res.total || 0)}
                        centerSub="shops"
                      />
                      <Legend
                        rows={[
                          {
                            label: "Named locality",
                            value: num(res.text || 0),
                            color: "var(--ap-primary)",
                          },
                          {
                            label: "PIN code (from address)",
                            value: num(res.pincode || 0),
                            color: "var(--ap-primary-2)",
                          },
                          {
                            label: "Coordinates only",
                            value: num(res.coords || 0),
                            color: "var(--ap-ok)",
                          },
                          {
                            label: "Nothing usable",
                            value: num(res.none || 0),
                            color: "var(--ap-warn)",
                          },
                        ]}
                      />
                    </div>
                    {res.none > 0 && (
                      <p className="ap-field-hint" style={{ marginTop: 10 }}>
                        {num(res.none)} shop{res.none === 1 ? "" : "s"}{" "}
                        can&rsquo;t be placed at all - see the list below.
                      </p>
                    )}
                  </>
                ) : (
                  <NeedsSetup what="Location resolution" />
                )}
              </div>
            </section>

            {src && (
              <section className="ap-panel">
                <div className="ap-panel-head">
                  <h2>Backfill health</h2>
                  <span className="ap-view-sub">
                    shops.locality_source - manual vs Nominatim vs never run
                  </span>
                </div>
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
                      {
                        label: "Geocoded (Nominatim)",
                        value: num(src.geocoded || 0),
                        color: "var(--ap-primary)",
                      },
                      {
                        label: "Manual",
                        value: num(src.manual || 0),
                        color: "var(--ap-primary-2)",
                      },
                      {
                        label: "Never geocoded",
                        value: num(src.none || 0),
                        color: "var(--ap-warn)",
                      },
                    ]}
                  />
                </div>
                {src.none > 0 && (
                  <p className="ap-field-hint" style={{ marginTop: 10 }}>
                    {num(src.none)} shop{src.none === 1 ? "" : "s"} have
                    coordinates but no reverse-geocoded locality yet - run the
                    backfill script.
                  </p>
                )}
              </section>
            )}

            {ungeocoded.length > 0 && (
              <section className="ap-panel">
                <div className="ap-panel-head">
                  <h2>Shops with no usable location</h2>
                  <span className="ap-view-sub">
                    no locality, no PIN in the address, no coordinates · newest
                    50
                  </span>
                </div>
                <div className="ap-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>Shop</th>
                        <th>Address on file</th>
                        <th>Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ungeocoded.map((s) => (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>
                            {s.address || (
                              <span className="ap-td-empty">—</span>
                            )}
                          </td>
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
