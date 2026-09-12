import {
  fetchDashboard,
  fetchGeoAnalytics,
  resolveShopLocalities,
} from "../api";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
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

// Status -> pin color, kept in sync with the badge colors Vendors.jsx uses.
const STATUS_COLOR = {
  approved: "var(--ap-ok)",
  pending: "var(--ap-warn)",
  rejected: "var(--ap-danger)",
};

// One divIcon per status, built once and reused for every marker of that
// status instead of re-creating (and re-parsing) SVG markup on every render.
const shopIconCache = new Map();
function shopIcon(status) {
  const color = STATUS_COLOR[status] || "var(--ap-primary)";
  const key = status || "default";
  if (shopIconCache.has(key)) return shopIconCache.get(key);
  const icon = L.divIcon({
    className: "ap-shop-marker",
    html: `<span class="ap-shop-pin" style="--pin-color:${color}">
      <svg class="ap-shop-pin-icon" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
        <path d="M3 9.5 4.2 4h15.6l1.2 5.5" />
        <path d="M3 9.5a2.1 2.1 0 0 0 4.2 0 2.1 2.1 0 0 0 4.2 0 2.1 2.1 0 0 0 4.2 0 2.1 2.1 0 0 0 4.2 0" />
        <path d="M4.5 9.5V19h15V9.5" />
        <path d="M9.5 19v-5.5h5V19" />
      </svg>
    </span>`,
    iconSize: [26, 32],
    iconAnchor: [13, 30],
    popupAnchor: [0, -28],
  });
  shopIconCache.set(key, icon);
  return icon;
}

function FitMap({ points }) {
  const map = useMap();
  useEffect(() => {
    const bounds = points.map((p) => [Number(p.lat), Number(p.lng)]);
    if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
    }
  }, [map, points]);
  return null;
}

function ShopMap({ points }) {
  const pts = points.filter(
    (p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)),
  );
  if (!pts.length)
    return (
      <div className="ap-async-empty">
        No shops with coordinates to plot.
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
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          maxClusterRadius={50}
          spiderfyOnMaxZoom
        >
          {pts.map((p) => (
            <Marker
              key={p.id}
              position={[Number(p.lat), Number(p.lng)]}
              icon={shopIcon(p.status)}
            >
              <Popup>
                <strong>{p.name || "Unnamed shop"}</strong>
                <br />
                {p.locality || "Locality not resolved"}
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}

export default function GeoIntelligence() {
  const { state, data, error, reload } = useAsync(fetchGeoAnalytics, []);
  const platform = useAsync(fetchDashboard, []);
  const toast = useToast();
  const [resolving, setResolving] = useState(false);
  const missing = data?._missing;
  const A = data && !missing ? data : null;

  const density = A?.density || [];
  const res = A?.resolution;
  const src = A?.locality_source;
  const ungeocoded = A?.ungeocoded || [];
  const mapPoints = A?.map_points || [];
  const platformData =
    platform.state === "done" && platform.data && !platform.data._missing
      ? platform.data
      : null;
  const backfillTotal = Number(src?.total) || 0;
  const backfillPct = (value) =>
    backfillTotal ? Math.round(((Number(value) || 0) / backfillTotal) * 100) : 0;

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
            <section className="ap-stat-grid" aria-label="Geographic coverage metrics">
              <div className="ap-stat ap-stat-primary">
                <span className="ap-stat-label">Total shops</span>
                <span className="ap-stat-value">{num(res?.total)}</span>
              </div>
              <div className="ap-stat">
                <span className="ap-stat-label">On the map</span>
                <span className="ap-stat-value">{num(mapPoints.length)}</span>
                <span className="ap-stat-sub">have exact coordinates</span>
              </div>
              <div className="ap-stat">
                <span className="ap-stat-label">Areas identified</span>
                <span className="ap-stat-value">{num(density.length)}</span>
              </div>
              <div className="ap-stat">
                <span className="ap-stat-label">Location coverage</span>
                <span className="ap-stat-value">
                  {res?.total
                    ? `${Math.round(
                        (((res.text || 0) + (res.pincode || 0) + (res.coords || 0)) /
                          res.total) *
                          100,
                      )}%`
                    : "—"}
                </span>
                <span className="ap-stat-sub">placeable by some basis</span>
              </div>
              <div className="ap-stat">
                <span className="ap-stat-label">Unresolved</span>
                <span className="ap-stat-value">{num(res?.none)}</span>
                <span className="ap-stat-sub">no usable location</span>
              </div>
            </section>

            <section className="ap-panel">
              <div className="ap-panel-head">
                <h2>Shop density by area</h2>
                <span className="ap-view-sub">
                  each pin = one shop · click a pin for details
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
                          {
                            value: res.text || 0,
                            color: "var(--ap-primary)",
                            label: "Named locality",
                          },
                          {
                            value: res.pincode || 0,
                            color: "var(--ap-primary-2)",
                            label: "PIN code (from address)",
                          },
                          {
                            value: res.coords || 0,
                            color: "var(--ap-ok)",
                            label: "Coordinates only",
                          },
                          {
                            value: res.none || 0,
                            color: "var(--ap-warn)",
                            label: "Nothing usable",
                          },
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
                    location enrichment status for every shop
                  </span>
                </div>
                <div className="ap-backfill-layout">
                  <div className="ap-backfill-overview">
                    <Donut
                      segments={[
                        {
                          value: src.geocoded || 0,
                          color: "var(--ap-primary)",
                          label: "Geocoded (Nominatim)",
                        },
                        {
                          value: src.manual || 0,
                          color: "var(--ap-primary-2)",
                          label: "Manual",
                        },
                        {
                          value: src.none || 0,
                          color: "var(--ap-warn)",
                          label: "Never geocoded",
                        },
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
                  <div className="ap-backfill-stats">
                    {[
                      ["Geocoded", src.geocoded, "var(--ap-primary)"],
                      ["Manual", src.manual, "var(--ap-primary-2)"],
                      ["Needs backfill", src.none, "var(--ap-warn)"],
                    ].map(([label, value, color]) => (
                      <div className="ap-backfill-stat" key={label}>
                        <div className="ap-kpi-top">
                          <span className="ap-kpi-label">{label}</span>
                          <strong>{backfillPct(value)}%</strong>
                        </div>
                        <span className="ap-kpi-value">{num(value || 0)}</span>
                        <div className="ap-progress-track" aria-hidden="true">
                          <span
                            className="ap-progress-fill"
                            style={{ width: `${backfillPct(value)}%`, background: color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {src.none > 0 && (
                  <div className="ap-backfill-alert">
                    <strong>{num(src.none)} shops need attention.</strong>
                    <span>Run the backfill script to add reverse-geocoded localities.</span>
                  </div>
                )}
              </section>
            )}

            <section className="ap-panel">
              <div className="ap-panel-head">
                <h2>Platform snapshot</h2>
                <span className="ap-view-sub">available account and activity signals</span>
              </div>
              <div className="ap-kpi-grid ap-platform-grid">
                <div className="ap-kpi">
                  <span className="ap-kpi-label">Total users</span>
                  <span className="ap-kpi-value">{num(platformData?.users_total)}</span>
                  <span className="ap-kpi-foot">registered accounts</span>
                </div>
                <div className="ap-kpi">
                  <span className="ap-kpi-label">Customer accounts</span>
                  <span className="ap-kpi-value">{num(platformData?.customers_total)}</span>
                  <span className="ap-kpi-foot">profiles with customer role</span>
                </div>
                <div className="ap-kpi">
                  <span className="ap-kpi-label">Orders · 30 days</span>
                  <span className="ap-kpi-value">{num(platformData?.orders_30d)}</span>
                  <span className="ap-kpi-foot">completed platform activity signal</span>
                </div>
                <div className="ap-kpi ap-kpi-muted">
                  <span className="ap-kpi-label">App downloads</span>
                  <span className="ap-kpi-value">Not tracked</span>
                  <span className="ap-kpi-foot">install events are not stored yet</span>
                </div>
              </div>
            </section>

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
