import { useMemo, useState } from "react";
import { fetchPlatformAnalytics } from "../api";
import {
  AreaChart,
  Async,
  DualAxisChart,
  Histogram,
  NeedsSetup,
  money,
  num,
  useAsync,
} from "../ui";

const PERIODS = [7, 30, 90];
const OPS_SQL = "supabase/admin_operations.sql";

const ratio = (a, b) => {
  const x = Number(a);
  const y = Number(b);
  return Number.isFinite(x) && Number.isFinite(y) && y > 0 ? x / y : null;
};
const pct = (v, digits = 1) => (v == null ? "—" : `${(v * 100).toFixed(digits)}%`);
const fixed = (v, digits = 1) => (v == null || !Number.isFinite(Number(v)) ? "—" : Number(v).toFixed(digits));

// % change vs the previous window. `invert` = a rise is bad (cancellations…).
function Delta({ now, prev, invert = false }) {
  const a = Number(now);
  const b = Number(prev);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  const change = ((a - b) / b) * 100;
  const good = invert ? change <= 0 : change >= 0;
  return (
    <span className={`ap-delta ${good ? "is-up" : "is-down"}`}>
      {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
    </span>
  );
}

function Kpi({ label, value, now, prev, invert, sub }) {
  return (
    <div className="ap-stat">
      <span className="ap-stat-label">{label}</span>
      <span className="ap-stat-value">{value}</span>
      <span className="ap-stat-sub">
        <Delta now={now} prev={prev} invert={invert} /> {sub}
      </span>
    </div>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const { state, data, error, reload } = useAsync(() => fetchPlatformAnalytics(days), [days]);
  const missing = data?._missing;
  const A = data && !missing ? data : null;

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Analytics</h1>
          <p className="ap-view-sub">
            Platform, customer and vendor metrics · last {days} days vs the {days} days before
          </p>
        </div>
        <div className="ap-view-actions">
          <div className="ap-seg" role="group" aria-label="Period">
            {PERIODS.map((p) => (
              <button key={p} className={days === p ? "is-active" : ""} onClick={() => setDays(p)}>
                {p}d
              </button>
            ))}
          </div>
          <button className="ap-btn ap-btn-ghost" onClick={reload}>
            Refresh
          </button>
        </div>
      </div>

      <Async state={state} error={error} onRetry={reload}>
        {missing ? (
          <NeedsSetup what="Platform analytics" file={OPS_SQL} />
        ) : A ? (
          <>
            <Platform A={A} days={days} />
            <Customer A={A} days={days} />
            <Vendor A={A} />
            <p className="ap-note">
              <strong>Definitions.</strong> Cancelled = status starting with cancel / reject / declin. GMV and revenue
              exclude cancelled orders; revenue = commission + platform fee. Active user = placed an order or generated
              a signed-in search/view event. Retention = users active in the previous {days} days who were active again
              in this window. Acceptance = orders the shop confirmed ÷ orders the shop decided on (confirmed, or
              cancelled by anyone other than the customer). Prep time = ready − preparing (or accepted).
            </p>
          </>
        ) : null}
      </Async>
    </div>
  );
}

/* ------------------------------------------------------------- platform --- */

function Platform({ A, days }) {
  const u = A.users || {};
  const s = A.shops || {};
  const o = A.orders || {};
  const act = A.activity || {};
  const aov = ratio(o.gmv, o.valid);
  const aovPrev = ratio(o.gmv_prev, o.valid_prev);
  const cancel = ratio(o.cancelled, o.count);
  const cancelPrev = ratio(o.cancelled_prev, o.count_prev);
  const refund = ratio(o.refunded, o.count);
  const refundPrev = ratio(o.refunded_prev, o.count_prev);

  return (
    <section className="ap-panel">
      <div className="ap-panel-head">
        <h2>Platform</h2>
      </div>
      <div className="ap-stat-grid">
        <Kpi label="Total users" value={num(u.total)} sub={`${num(u.customers)} customers`} />
        <Kpi label="Active users" value={num(act.active)} now={act.active} prev={act.active_prev} />
        <Kpi label="New users" value={num(u.new)} now={u.new} prev={u.new_prev} />
        <Kpi label="Vendors" value={num(u.vendors)} sub={`${num(s.approved)} approved shops`} />
        <Kpi
          label="Active shops"
          value={num(o.active_shops)}
          now={o.active_shops}
          prev={o.active_shops_prev}
          sub="took ≥1 order"
        />
        <Kpi label="Orders" value={num(o.count)} now={o.count} prev={o.count_prev} />
        <Kpi label="GMV" value={money(o.gmv)} now={o.gmv} prev={o.gmv_prev} />
        <Kpi label="Revenue" value={money(o.revenue)} now={o.revenue} prev={o.revenue_prev} sub="commission + fees" />
        <Kpi label="AOV" value={money(aov)} now={aov} prev={aovPrev} />
        <Kpi
          label="Cancellation rate"
          value={pct(cancel)}
          now={cancel}
          prev={cancelPrev}
          invert
          sub={`${num(o.cancelled)} orders`}
        />
        <Kpi
          label="Refund rate"
          value={pct(refund)}
          now={refund}
          prev={refundPrev}
          invert
          sub={`${num(o.refunded)} orders`}
        />
        <Kpi label="Shops pending / suspended" value={`${num(s.pending)} / ${num(s.suspended)}`} />
      </div>

      <div className="ap-two-col" style={{ marginTop: 16 }}>
        <div>
          <div className="ap-panel-head">
            <h2>GMV per day</h2>
          </div>
          <AreaChart data={A.daily || []} metric="gmv" format={money} />
        </div>
        <div>
          <div className="ap-panel-head">
            <h2>Orders &amp; cancellations per day</h2>
          </div>
          {(A.daily || []).length ? (
            <DualAxisChart
              data={A.daily}
              left={{ key: "orders", label: "Orders", format: num }}
              right={{ key: "cancelled", label: "Cancelled", format: num }}
            />
          ) : (
            <div className="ap-async-empty">No orders in the last {days} days.</div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- customer --- */

function Customer({ A, days }) {
  const act = A.activity;
  const p = A.purchase || {};
  const cohorts = A.cohorts || [];

  if (!act && !A.purchase)
    return (
      <section className="ap-panel">
        <div className="ap-panel-head">
          <h2>Customers</h2>
        </div>
        <p className="ap-async-empty">Customer metrics couldn&rsquo;t be computed from the orders table.</p>
      </section>
    );

  const stickiness = ratio(act?.dau_avg, act?.mau);
  const retention = ratio(act?.retained, act?.active_prev);
  const repeat = ratio(p.repeat_buyers, p.buyers);
  const lifetimeRepeat = ratio(p.lifetime_repeat, p.lifetime_buyers);
  const perUser = ratio(p.orders, p.buyers);
  const lifetimePerUser = ratio(p.lifetime_orders, p.lifetime_buyers);

  return (
    <section className="ap-panel">
      <div className="ap-panel-head">
        <h2>Customers</h2>
      </div>
      <div className="ap-stat-grid">
        <Kpi label="DAU (today)" value={num(act?.dau_today)} sub={`avg ${fixed(act?.dau_avg)} / day`} />
        <Kpi label="WAU" value={num(act?.wau)} sub="last 7 days" />
        <Kpi label="MAU" value={num(act?.mau)} sub={`stickiness ${pct(stickiness)}`} />
        <Kpi
          label="Retention"
          value={pct(retention)}
          sub={`${num(act?.retained)} of ${num(act?.active_prev)} came back`}
        />
        <Kpi
          label="Repeat purchase"
          value={pct(repeat)}
          sub={`lifetime ${pct(lifetimeRepeat)}`}
        />
        <Kpi
          label="Avg orders / user"
          value={fixed(perUser, 2)}
          sub={`lifetime ${fixed(lifetimePerUser, 2)}`}
        />
      </div>

      <div className="ap-two-col" style={{ marginTop: 16 }}>
        <div>
          <div className="ap-panel-head">
            <h2>Daily active users</h2>
          </div>
          <AreaChart data={act?.daily || []} metric="active" />
        </div>
        <div>
          <div className="ap-panel-head">
            <h2>Orders per buyer · last {days} days</h2>
          </div>
          <Histogram bins={(p.frequency || []).map((f) => ({ label: `${f.bucket}`, value: f.count }))} />
        </div>
      </div>

      <div className="ap-panel-head" style={{ marginTop: 16 }}>
        <h2>Monthly cohorts</h2>
        <span className="ap-view-sub">customers by first-order month · % who ordered again in later months</span>
      </div>
      {cohorts.length ? (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Cohort</th>
                <th className="ap-num">New buyers</th>
                <th className="ap-num">Month 1</th>
                <th className="ap-num">Month 2</th>
                <th className="ap-num">Month 3</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => (
                <tr key={c.cohort}>
                  <td>{new Date(c.cohort).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td>
                  <td className="ap-num">{num(c.size)}</td>
                  {[1, 2, 3].map((k) => (
                    <td key={k} className="ap-num">
                      {cohortCell(c, k)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ap-async-empty">No completed orders yet.</div>
      )}
    </section>
  );
}

// "—" for months that haven't happened yet; 0% when they have and nobody returned.
function cohortCell(c, k) {
  const start = new Date(c.cohort);
  const target = new Date(start.getFullYear(), start.getMonth() + k, 1);
  const now = new Date();
  if (target > new Date(now.getFullYear(), now.getMonth(), 1)) return "—";
  return pct(ratio(c[`m${k}`] || 0, c.size), 0);
}

/* --------------------------------------------------------------- vendor --- */

const COLS = [
  ["name", "Shop"],
  ["sales", "Sales"],
  ["orders", "Orders"],
  ["acceptance", "Acceptance"],
  ["cancellation", "Cancellation"],
  ["prep_min", "Prep time"],
  ["rating", "Rating"],
];

function Vendor({ A }) {
  const v = A.vendors;
  const [sort, setSort] = useState({ key: "sales", dir: -1 });
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const list = (v?.shops || []).map((s) => ({
      ...s,
      acceptance: ratio(s.accepted, s.decided),
      cancellation: ratio(s.cancelled, s.orders),
    }));
    const t = q.trim().toLowerCase();
    const filtered = t ? list.filter((s) => String(s.name).toLowerCase().includes(t)) : list;
    return filtered.sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === "string" ? x.localeCompare(y) : x - y) * sort.dir;
    });
  }, [v, sort, q]);

  if (!v)
    return (
      <section className="ap-panel">
        <div className="ap-panel-head">
          <h2>Vendors</h2>
        </div>
        <p className="ap-async-empty">Vendor metrics couldn&rsquo;t be computed from the orders table.</p>
      </section>
    );

  const sm = v.summary || {};
  return (
    <section className="ap-panel">
      <div className="ap-panel-head">
        <h2>Vendors</h2>
      </div>
      <div className="ap-stat-grid">
        <Kpi label="Sales / shop" value={money(ratio(sm.sales, sm.shops))} sub={`${num(sm.shops)} shops with orders`} />
        <Kpi label="Orders / shop" value={fixed(ratio(sm.orders, sm.shops), 1)} />
        <Kpi label="Acceptance rate" value={pct(ratio(sm.accepted, sm.decided))} />
        <Kpi label="Cancellation rate" value={pct(ratio(sm.cancelled, sm.orders))} />
        <Kpi label="Avg prep time" value={sm.prep_min != null ? `${fixed(sm.prep_min)} min` : "—"} />
        <Kpi label="Avg shop rating" value={sm.avg_rating != null ? `${fixed(sm.avg_rating, 2)} ★` : "—"} />
      </div>

      <div className="ap-filters" style={{ marginTop: 16 }}>
        <input className="ap-filters-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a shop" aria-label="Find a shop" />
      </div>
      {rows.length ? (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                {COLS.map(([k, label]) => (
                  <th key={k} className={k === "name" ? "" : "ap-num"}>
                    <button
                      className="ap-sort"
                      onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? -s.dir : k === "name" ? 1 : -1 }))}
                    >
                      {label}
                      {sort.key === k ? (sort.dir > 0 ? " ▲" : " ▼") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.shop_id}>
                  <td>
                    {s.name}
                    {s.locality && <div className="ap-muted-line">{s.locality}</div>}
                  </td>
                  <td className="ap-num">{money(s.sales)}</td>
                  <td className="ap-num">{num(s.orders)}</td>
                  <td className="ap-num">{pct(s.acceptance, 0)}</td>
                  <td className="ap-num">{pct(s.cancellation, 0)}</td>
                  <td className="ap-num">{s.prep_min != null ? `${fixed(s.prep_min)} min` : "—"}</td>
                  <td className="ap-num">
                    {s.rating != null ? `${fixed(s.rating)} ★` : "—"}
                    {s.rating_count ? <div className="ap-muted-line">{num(s.rating_count)}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ap-async-empty">No shop took an order in this window.</div>
      )}
    </section>
  );
}
