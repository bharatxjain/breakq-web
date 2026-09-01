import { useState } from "react";
import { fetchAnalytics, fetchDashboard } from "../api";
import {
  AreaChart,
  Async,
  BarChart,
  DeltaChip,
  Donut,
  DualAxisChart,
  Funnel,
  Legend,
  MiniBars,
  NeedsSetup,
  RankBars,
  Spark,
  TrendArrow,
  hourLabel,
  money,
  num,
  fmtDateTime,
  useAsync,
} from "../ui";

// Cumulative user total over time, bucketed to day / week / month.
function buildGrowth(signups, before, grain) {
  if (!signups || signups.length === 0) return [];
  const keyOf = (dStr) => {
    if (grain === "day") return dStr;
    if (grain === "month") return dStr.slice(0, 7) + "-01";
    const dt = new Date(dStr + "T00:00:00Z"); // week → Monday
    const shift = (dt.getUTCDay() + 6) % 7;
    dt.setUTCDate(dt.getUTCDate() - shift);
    return dt.toISOString().slice(0, 10);
  };
  const buckets = new Map();
  for (const s of signups) {
    const k = keyOf(s.d);
    buckets.set(k, (buckets.get(k) || 0) + (Number(s.count) || 0));
  }
  let cum = Number(before) || 0;
  return [...buckets.keys()].sort().map((k) => {
    cum += buckets.get(k);
    return { d: k, value: cum };
  });
}

export default function Dashboard() {
  const { state, data, error, reload } = useAsync(fetchDashboard, []);
  const an = useAsync(fetchAnalytics, []);
  const [metric, setMetric] = useState("orders");
  const [grain, setGrain] = useState("week");
  const [evWin, setEvWin] = useState("e7"); // e24 | e7

  const A = an.state === "done" && an.data && !an.data._missing ? an.data : null;
  const anMissing = an.state === "error" || !!an.data?._missing;
  const series = data?.daily_series || [];
  const commission = Number(data?.commission_30d) || 0;
  const fee = Number(data?.platform_fee_30d) || 0;
  const shopsTotal = Number(data?.shops_total);
  const shopsPending = Number(data?.shops_pending);
  const growth = buildGrowth(
    data?.user_signups,
    data?.users_before_window,
    grain,
  );

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Dashboard</h1>
          <p className="ap-view-sub">
            What&rsquo;s happening across BreakQ right now
            {data?.generated_at
              ? ` · as of ${fmtDateTime(data.generated_at)}`
              : ""}
          </p>
        </div>
        <button className="ap-btn ap-btn-ghost" onClick={reload}>
          Refresh
        </button>
      </div>

      <Async state={state} error={error} onRetry={reload}>
        {data && (
          <>
            {data._fallback && (
              <div className="ap-banner">
                Showing a limited, live-computed view. Run{" "}
                <code>supabase/admin_panel.sql</code> in the Supabase SQL editor
                to enable full analytics and the rest of the panel.
              </div>
            )}

            {A?.rating_integrity?.inflated && (
              <div className="ap-banner ap-banner-danger">
                Rating counts look inflated — the stored rollup totals{" "}
                <strong>{num(A.rating_integrity.rollup)}</strong> against{" "}
                <strong>{num(A.rating_integrity.reviews)}</strong> actual
                reviews. Treat shop rating counts as unreliable until the
                duplicate rating-trigger migration ships. See the{" "}
                <strong>Ratings</strong> and <strong>System</strong> tabs.
              </div>
            )}

            {/* KPI row */}
            <section className="ap-kpi-grid">
              <div className="ap-kpi">
                <div className="ap-kpi-top">
                  <span className="ap-kpi-label">Orders · 30 days</span>
                  <DeltaChip
                    now={data.orders_30d}
                    prev={data.orders_prev_30d}
                  />
                </div>
                <span className="ap-kpi-value">{num(data.orders_30d)}</span>
                <MiniBars values={series.map((d) => d.orders)} />
              </div>

              <div className="ap-kpi">
                <div className="ap-kpi-top">
                  <span className="ap-kpi-label">
                    Platform revenue · 30 days
                  </span>
                </div>
                <span className="ap-kpi-value">
                  {money(data.platform_revenue_30d)}
                </span>
                <div className="ap-kpi-spark">
                  <Spark values={series.map((d) => d.platform_revenue)} />
                </div>
                <span className="ap-kpi-foot">commission + platform fee</span>
              </div>

              <div className="ap-kpi">
                <div className="ap-kpi-top">
                  <span className="ap-kpi-label">Revenue mix · 30 days</span>
                </div>
                {commission + fee > 0 ? (
                  <div className="ap-kpi-donut">
                    <Donut
                      segments={[
                        { value: commission, color: "var(--ap-primary)" },
                        { value: fee, color: "var(--ap-primary-2)" },
                      ]}
                      centerLabel={money(commission + fee)}
                      centerSub="total"
                    />
                    <Legend
                      rows={[
                        {
                          label: "Commission",
                          value: money(commission),
                          color: "var(--ap-primary)",
                        },
                        {
                          label: "Platform fee",
                          value: money(fee),
                          color: "var(--ap-primary-2)",
                        },
                      ]}
                    />
                  </div>
                ) : (
                  <span className="ap-kpi-foot">
                    No revenue recorded in the last 30 days.
                  </span>
                )}
              </div>

              <div className="ap-kpi">
                <div className="ap-kpi-top">
                  <span className="ap-kpi-label">Vendors</span>
                </div>
                {Number.isFinite(shopsTotal) ? (
                  <div className="ap-kpi-donut">
                    <Donut
                      segments={[
                        { value: shopsPending || 0, color: "var(--ap-warn)" },
                        {
                          value: Math.max(
                            0,
                            (shopsTotal || 0) - (shopsPending || 0),
                          ),
                          color: "var(--ap-primary)",
                        },
                      ]}
                      centerLabel={num(shopsPending || 0)}
                      centerSub="pending"
                    />
                    <Legend
                      rows={[
                        {
                          label: "Pending review",
                          value: num(shopsPending || 0),
                          color: "var(--ap-warn)",
                        },
                        {
                          label: "Total shops",
                          value: num(shopsTotal || 0),
                          color: "var(--ap-primary)",
                        },
                      ]}
                    />
                  </div>
                ) : (
                  <span className="ap-kpi-foot">
                    Vendor counts need full analytics.
                  </span>
                )}
              </div>
            </section>

            {/* demand + supply KPI row (admin_analytics) */}
            <section className="ap-kpi-grid">
              <div className="ap-kpi">
                <div className="ap-kpi-top">
                  <span className="ap-kpi-label">
                    New shop signups · 30 days
                  </span>
                  {A?.shop_signups && (
                    <TrendArrow
                      now={A.shop_signups.d30}
                      prev={A.shop_signups.prev30}
                    />
                  )}
                </div>
                <span className="ap-kpi-value">
                  {A?.shop_signups ? num(A.shop_signups.d30) : "—"}
                </span>
                {A?.shop_signups ? (
                  <span className="ap-kpi-foot">
                    {num(A.shop_signups.d7)} in the last 7 days
                  </span>
                ) : anMissing ? (
                  <NeedsSetup what="Signups" />
                ) : (
                  <span className="ap-kpi-foot">loading…</span>
                )}
              </div>

              <div className="ap-kpi">
                <div className="ap-kpi-top">
                  <span className="ap-kpi-label">Searches + views</span>
                  <div className="ap-seg">
                    {[
                      ["e24", "24h"],
                      ["e7", "7d"],
                    ].map(([k, l]) => (
                      <button
                        key={k}
                        className={evWin === k ? "is-active" : ""}
                        onClick={() => setEvWin(k)}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                {A?.events_window?.[evWin] ? (
                  <>
                    <span className="ap-kpi-value">
                      {num(A.events_window[evWin].total)}
                    </span>
                    <span className="ap-kpi-split">
                      <span>
                        Search <b>{num(A.events_window[evWin].search)}</b>
                      </span>
                      <span>
                        View <b>{num(A.events_window[evWin].view)}</b>
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="ap-kpi-value">—</span>
                    {anMissing ? (
                      <NeedsSetup what="Event volume" />
                    ) : (
                      <span className="ap-kpi-foot">loading…</span>
                    )}
                  </>
                )}
              </div>

              <div className="ap-kpi">
                <div className="ap-kpi-top">
                  <span className="ap-kpi-label">
                    Zero-result searches · 7 days
                  </span>
                </div>
                {A?.zero_result ? (
                  <>
                    <span className="ap-kpi-value">
                      {A.zero_result.searches ? `${A.zero_result.pct}%` : "—"}
                    </span>
                    <span className="ap-kpi-foot">
                      {A.zero_result.searches
                        ? `${num(A.zero_result.no_view)} of ${num(A.zero_result.searches)} searches led to no shop view`
                        : "no attributable searches yet"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="ap-kpi-value">—</span>
                    {anMissing ? (
                      <NeedsSetup what="Zero-result rate" />
                    ) : (
                      <span className="ap-kpi-foot">loading…</span>
                    )}
                  </>
                )}
              </div>

              <div className="ap-kpi">
                <div className="ap-kpi-top">
                  <span className="ap-kpi-label">Active paid subscribers</span>
                </div>
                {A?.paid_subs ? (
                  <>
                    <span className="ap-kpi-value">
                      {num(A.paid_subs.count)}
                    </span>
                    <span className="ap-kpi-foot">
                      MRR ≈ {money(A.paid_subs.mrr)} (monthly, tier price &gt;
                      0)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="ap-kpi-value">—</span>
                    {anMissing ? (
                      <NeedsSetup what="Subscriber count" />
                    ) : (
                      <span className="ap-kpi-foot">loading…</span>
                    )}
                  </>
                )}
              </div>

              <div className="ap-kpi">
                <div className="ap-kpi-top">
                  <span className="ap-kpi-label">Pending vendor approvals</span>
                </div>
                <span className="ap-kpi-value">
                  {A?.pending_approvals != null
                    ? num(A.pending_approvals)
                    : Number.isFinite(shopsPending)
                      ? num(shopsPending)
                      : "—"}
                </span>
                <span className="ap-kpi-foot">
                  awaiting review in the Vendors queue
                </span>
              </div>
            </section>

            {/* secondary stat strip */}
            <section className="ap-stat-grid">
              <MiniStat
                label="Orders · last 24h"
                value={num(data.orders_24h)}
              />
              <MiniStat
                label="Busiest hour"
                value={data.busy_hour ? hourLabel(data.busy_hour.hour) : "—"}
                sub={
                  data.busy_hour
                    ? `${num(data.busy_hour.orders)} orders`
                    : "no data"
                }
              />
              <MiniStat label="Total users" value={num(data.users_total)} />
              <MiniStat label="Platform fee · 30 days" value={money(fee)} />
            </section>

            {/* main trend — line chart vs prior 30 days */}
            <section className="ap-panel">
              <div className="ap-panel-head">
                <h2>Last 30 days vs prior 30 days</h2>
                <div className="ap-seg">
                  {[
                    ["orders", "Orders"],
                    ["revenue", "Revenue"],
                    ["platform_revenue", "Platform rev."],
                  ].map(([k, l]) => (
                    <button
                      key={k}
                      className={metric === k ? "is-active" : ""}
                      onClick={() => setMetric(k)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <AreaChart
                data={series}
                compare={data.daily_series_prev || []}
                metric={metric}
                format={metric === "orders" ? num : money}
              />
            </section>

            {/* orders by hour — bar chart */}
            <section className="ap-panel">
              <div className="ap-panel-head">
                <h2>Orders by hour of day</h2>
                <span className="ap-view-sub">last 30 days</span>
              </div>
              {(data.hourly || []).some((h) => h.orders > 0) ? (
                <BarChart
                  data={(data.hourly || []).map((h) => ({
                    label: hourLabel(h.hour),
                    value: h.orders,
                  }))}
                  format={num}
                  unit="orders"
                />
              ) : (
                <div className="ap-async-empty">
                  No orders in the last 30 days.
                </div>
              )}
            </section>

            {/* user-count growth — line chart */}
            <section className="ap-panel">
              <div className="ap-panel-head">
                <h2>User growth</h2>
                <div className="ap-seg">
                  {[
                    ["day", "Day"],
                    ["week", "Week"],
                    ["month", "Month"],
                  ].map(([k, l]) => (
                    <button
                      key={k}
                      className={grain === k ? "is-active" : ""}
                      onClick={() => setGrain(k)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {growth.length >= 2 ? (
                <AreaChart data={growth} metric="value" format={num} />
              ) : (
                <div className="ap-async-empty">
                  {data._fallback && data.users_total == null
                    ? "User growth needs full analytics — run admin_panel.sql."
                    : "Not enough signup history yet."}
                </div>
              )}
            </section>

            {/* active shops vs searches — dual axis */}
            <section className="ap-panel">
              <div className="ap-panel-head">
                <h2>Daily active shops &amp; searches</h2>
                <span className="ap-view-sub">last 30 days</span>
              </div>
              {A?.daily_active_searches?.length ? (
                <DualAxisChart
                  data={A.daily_active_searches}
                  left={{
                    key: "active_shops",
                    label: "Active shops",
                    format: num,
                  }}
                  right={{ key: "searches", label: "Searches", format: num }}
                />
              ) : anMissing ? (
                <NeedsSetup what="This chart" />
              ) : (
                <div className="ap-async-empty">
                  No activity in the last 30 days.
                </div>
              )}
            </section>

            {/* signups by locality + funnel */}
            <section className="ap-two-col">
              <div className="ap-panel">
                <div className="ap-panel-head">
                  <h2>Signups by locality</h2>
                  <span className="ap-view-sub">top 10 · last 30 days</span>
                </div>
                {A?.signups_by_locality?.length ? (
                  <RankBars
                    rows={A.signups_by_locality.map((l) => ({
                      label: l.locality,
                      value: l.count,
                    }))}
                  />
                ) : anMissing ? (
                  <NeedsSetup what="This chart" />
                ) : (
                  <div className="ap-async-empty">
                    No localised signups in the last 30 days.
                  </div>
                )}
              </div>

              <div className="ap-panel">
                <div className="ap-panel-head">
                  <h2>Discovery funnel</h2>
                  <span className="ap-view-sub">last 30 days</span>
                </div>
                {A?.funnel ? (
                  <Funnel
                    stages={[
                      { label: "Search", value: A.funnel.search },
                      { label: "Shop view", value: A.funnel.view },
                      { label: "Contact / visit", value: A.funnel.contact },
                    ]}
                  />
                ) : anMissing ? (
                  <NeedsSetup what="The funnel" />
                ) : (
                  <div className="ap-async-empty">
                    No events in the last 30 days.
                  </div>
                )}
                {A?.funnel && A.funnel.contact == null && (
                  <p className="ap-field-hint" style={{ marginTop: 8 }}>
                    No contact/visit events are being recorded — the last stage
                    will populate once call / WhatsApp / directions taps are
                    tracked.
                  </p>
                )}
              </div>
            </section>

            {/* bottom row */}
            <section className="ap-two-col">
              <div className="ap-panel">
                <div className="ap-panel-head">
                  <h2>Top 5 rated shops</h2>
                  <span className="ap-view-sub">highest average rating</span>
                </div>
                <div className="ap-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>Shop</th>
                        <th className="ap-num">Rating</th>
                        <th className="ap-num">Ratings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.top_rated_shops || []).length === 0 && (
                        <tr>
                          <td colSpan={3} className="ap-td-empty">
                            No rated shops yet.
                          </td>
                        </tr>
                      )}
                      {(data.top_rated_shops || []).map((s, i) => (
                        <tr key={i}>
                          <td>{s.name}</td>
                          <td className="ap-num">
                            {Number(s.avg_rating).toFixed(2)}
                          </td>
                          <td className="ap-num">{num(s.rating_count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="ap-panel">
                <div className="ap-panel-head">
                  <h2>Highlights</h2>
                </div>
                <ul className="ap-highlights">
                  <Highlight
                    label="Top performing area"
                    value={
                      data.top_area ? data.top_area.locality : "Not available"
                    }
                    foot={
                      data.top_area
                        ? `${num(data.top_area.orders)} orders`
                        : "Add shops.locality via admin_panel.sql"
                    }
                  />
                  <Highlight
                    label="Top category"
                    value={data.top_category ? data.top_category.name : "—"}
                    foot={
                      data.top_category
                        ? `${money(data.top_category.revenue)} in sales`
                        : needsFull(data)
                    }
                  />
                  <Highlight
                    label="Top product"
                    value={data.top_product ? data.top_product.name : "—"}
                    foot={
                      data.top_product
                        ? `${num(data.top_product.units)} units`
                        : needsFull(data)
                    }
                  />
                  <Highlight
                    label="Most searched product"
                    value={
                      data.most_searched_product
                        ? data.most_searched_product.term
                        : "—"
                    }
                    foot={
                      data.most_searched_product
                        ? `${num(data.most_searched_product.hits)} searches`
                        : needsFull(data)
                    }
                  />
                  <Highlight
                    label="Most searched category"
                    value={
                      data.most_searched_category
                        ? data.most_searched_category.name
                        : "—"
                    }
                    foot={
                      data.most_searched_category
                        ? `${num(data.most_searched_category.hits)} searches`
                        : needsFull(data)
                    }
                  />
                </ul>
              </div>
            </section>
          </>
        )}
      </Async>
    </div>
  );
}

function needsFull(data) {
  return data._fallback ? "Needs full analytics" : "no data";
}

function MiniStat({ label, value, sub }) {
  return (
    <div className="ap-stat">
      <span className="ap-stat-label">{label}</span>
      <span className="ap-stat-value">{value}</span>
      {sub && <span className="ap-stat-sub">{sub}</span>}
    </div>
  );
}

function Highlight({ label, value, foot }) {
  return (
    <li>
      <span className="ap-hl-label">{label}</span>
      <span className="ap-hl-value">{value}</span>
      <span className="ap-hl-foot">{foot}</span>
    </li>
  );
}
