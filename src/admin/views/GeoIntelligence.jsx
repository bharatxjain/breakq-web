import { fetchGeoAnalytics, resolveShopLocalities } from "../api";
import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  Async,
  Donut,
  Legend,
  NeedsSetup,
  RankBars,
  fmtDate,
  num,
  useToast,
  useAsync,
} from "../ui";

const BASIS_LABEL = {
  text: "named locality",
  pincode: "PIN code",
  coords: "coordinates",
  none: "unknown",
};

function FitMap({ points }) {
  const map = useMap();
  useEffect(() => {
    const bounds = points.map((p) => [Number(p.lat), Number(p.lng)]);
    if (bounds.length)
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
  }, [map, points]);
  return null;
}

function ShopMap({ points }) {
  const pts = points.filter(
    (p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)),
  );
  if (pts.length < 2)
    return (
      <div className="ap-async-empty">
        Not enough shops with coordinates to plot.
      </div>
    );
  const center = [
    pts.reduce((sum, p) => sum + Number(p.lat), 0) / pts.length,
    pts.reduce((sum, p) => sum + Number(p.lng), 0) / pts.length,
  ];

  return (
    <div className="ap-map" role="region" aria-label="Exact shop locations">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        className="ap-map-canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitMap points={pts} />
        {pts.map((p) => (
          <CircleMarker
            key={p.id}
            center={[Number(p.lat), Number(p.lng)]}
            radius={8}
            pathOptions={{
              color: "#7001fe",
              fillColor: "#7001fe",
              fillOpacity: 0.72,
            }}
          >
            <Popup>
              <strong>{p.name || "Unnamed shop"}</strong>
              <br />
              {p.locality || "Locality not resolved"}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export default function GeoIntelligence() {
  const { state, data, error, reload } = useAsync(fetchGeoAnalytics, []);
  const toast = useToast();
  const [resolving, setResolving] = useState(false);
  const missing = data?._missing;
  const A = data && !missing ? data : null;

  const density = A?.density || [];
  const res = A?.resolution;
  const src = A?.locality_source;
  const ungeocoded = A?.ungeocoded || [];
  const mapPoints = A?.map_points || [];

  async function resolveLocalities() {
    setResolving(true);
    try {
      const result = await resolveShopLocalities();
      toast(
        `Resolved ${result.resolved} of ${result.scanned} shops.`,
        result.resolved ? "success" : "info",
      );
      reload();
    } catch (e) {
      toast(e.message || "Could not resolve localities.", "danger");
    } finally {
      setResolving(false);
    }
  }

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
        <div className="ap-view-actions">
          <button
            className="ap-btn ap-btn-ghost"
            onClick={resolveLocalities}
            disabled={resolving}
          >
            {resolving ? "Resolving..." : "Resolve localities"}
          </button>
          <button className="ap-btn ap-btn-ghost" onClick={reload}>
            Refresh
          </button>
        </div>
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
              {mapPoints.length ? (
                <ShopMap points={mapPoints} />
              ) : (
                <div className="ap-async-empty">
                  No shops with exact coordinates.
                </div>
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
