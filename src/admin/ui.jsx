// Shared admin-panel UI primitives + formatters.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/* --------------------------------------------------------- formatters --- */

export function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function num(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("en-IN");
}

export function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function hourLabel(h) {
  const n = Number(h);
  if (!Number.isFinite(n)) return "—";
  const am = n < 12;
  const twelve = n % 12 === 0 ? 12 : n % 12;
  return `${twelve} ${am ? "AM" : "PM"}`;
}

/* -------------------------------------------------------------- toasts --- */

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, tone = "info") => {
    const id = Math.random().toString(36).slice(2);
    setItems((xs) => [...xs, { id, message, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="ap-toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`ap-toast ap-toast-${t.tone}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------------------------------------------------- async hook --- */

export function useAsync(fn, deps) {
  const [state, setState] = useState("loading"); // loading | done | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(() => {
    let alive = true;
    setState("loading");
    setError(null);
    Promise.resolve()
      .then(() => fnRef.current())
      .then((d) => {
        if (alive) {
          setData(d);
          setState("done");
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e);
          setState("error");
        }
      });
    return () => {
      alive = false;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(reload, [reload]);

  return { state, data, error, reload, setData };
}

export function Async({ state, error, onRetry, isEmpty, empty, children }) {
  if (state === "loading")
    return (
      <div className="ap-async ap-async-load">
        <Spinner />
        <span>Loading…</span>
      </div>
    );
  if (state === "error")
    return (
      <div className="ap-async ap-async-error">
        <p>{String(error?.message || error || "Something went wrong.")}</p>
        {onRetry && (
          <button className="ap-btn ap-btn-ghost" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  if (isEmpty) return <div className="ap-async ap-async-empty">{empty || "Nothing here yet."}</div>;
  return children;
}

/* ------------------------------------------------------------ spinner --- */

export function Spinner() {
  return <span className="ap-spinner" aria-hidden="true" />;
}

/* -------------------------------------------------------------- modal --- */

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ap-modal-backdrop" onMouseDown={onClose}>
      <div
        className={`ap-modal ${wide ? "ap-modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="ap-modal-head">
          <h3>{title}</h3>
          <button className="ap-modal-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="ap-modal-body">{children}</div>
        {footer && <footer className="ap-modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- stat card --- */

export function StatCard({ label, value, sub, tone }) {
  return (
    <div className={`ap-stat ${tone ? `ap-stat-${tone}` : ""}`}>
      <span className="ap-stat-label">{label}</span>
      <span className="ap-stat-value">{value}</span>
      {sub != null && <span className="ap-stat-sub">{sub}</span>}
    </div>
  );
}

/* -------------------------------------------------------------- avatar --- */

export function Avatar({ name, email, size = 32 }) {
  const src = (name || email || "").trim();
  let initials = "?";
  if (src.includes("@")) {
    initials = src[0].toUpperCase();
  } else if (src) {
    initials = src
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("");
  }
  return (
    <span
      className="ap-avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}

/* --------------------------------------------------------------- badge --- */

export function Badge({ children, tone = "neutral" }) {
  return <span className={`ap-badge ap-badge-${tone}`}>{children}</span>;
}

export function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (["approved", "active", "paid", "captured", "success"].includes(s)) return "ok";
  if (["pending", "created", "processing"].includes(s)) return "warn";
  if (["rejected", "failed", "expired", "cancelled", "canceled"].includes(s)) return "danger";
  return "neutral";
}

/* ---------------------------------------------------------------- form --- */

export function Field({ label, hint, error, children, required }) {
  return (
    <label className="ap-field">
      <span className="ap-field-label">
        {label} {required && <span className="ap-req">*</span>}
      </span>
      {children}
      {hint && !error && <span className="ap-field-hint">{hint}</span>}
      {error && <span className="ap-field-error">{error}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`ap-toggle ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span className="ap-toggle-track">
        <span className="ap-toggle-thumb" />
      </span>
      <span className="ap-toggle-label">{label}</span>
    </button>
  );
}

/* -------------------------------------------------------- mini bar chart --- */
// Deliberately minimal: one hue, faint baseline, emphasized last bar.
// Good enough for an at-a-glance internal trend; not a full analytics viz.

export function Bars({ data, metric, format = num, height = 150 }) {
  if (!data || data.length === 0) return <div className="ap-async-empty">No data in the last 30 days.</div>;
  const vals = data.map((d) => Number(d[metric]) || 0);
  const max = Math.max(1, ...vals);
  const w = 100 / data.length;

  return (
    <div className="ap-bars" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="ap-bars-svg" aria-hidden="true">
        <line x1="0" y1="99.5" x2="100" y2="99.5" className="ap-bars-axis" />
        {data.map((d, i) => {
          const h = (Number(d[metric]) || 0) / max * 96;
          return (
            <rect
              key={i}
              x={i * w + w * 0.16}
              y={100 - h}
              width={w * 0.68}
              height={Math.max(h, 0.4)}
              className={i === data.length - 1 ? "ap-bar ap-bar-last" : "ap-bar"}
            />
          );
        })}
      </svg>
      <div className="ap-bars-meta">
        <span>{fmtDate(data[0].d)}</span>
        <span className="ap-bars-peak">peak {format(max)}</span>
        <span>{fmtDate(data[data.length - 1].d)}</span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- delta chip --- */

export function DeltaChip({ now, prev }) {
  const a = Number(now);
  const b = Number(prev);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  const pct = ((a - b) / b) * 100;
  const up = pct >= 0;
  return (
    <span className={`ap-delta ${up ? "is-up" : "is-down"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

/* ---------------------------------------------------------- mini charts --- */

export function MiniBars({ values, tone = "primary" }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(1, ...values);
  return (
    <div className={`ap-minibars ap-minibars-${tone}`}>
      {values.map((v, i) => (
        <span
          key={i}
          className={i === values.length - 1 ? "is-last" : ""}
          style={{ height: `${Math.max(4, ((Number(v) || 0) / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function Spark({ values, tone = "primary" }) {
  if (!values || values.length === 0) return null;
  const W = 100;
  const H = 40;
  const vs = values.map((v) => Number(v) || 0);
  const max = Math.max(1, ...vs);
  const step = vs.length > 1 ? W / (vs.length - 1) : 0;
  const pts = vs.map((v, i) => [i * step, H - 3 - (v / max) * (H - 6)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg className={`ap-spark ap-spark-${tone}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={area} className="ap-spark-fill" />
      <path d={line} className="ap-spark-line" vectorEffect="non-scaling-stroke" fill="none" />
    </svg>
  );
}

export function AreaChart({ data, metric, format = num, compare }) {
  if (!data || data.length === 0) return <div className="ap-async-empty">No data in the last 30 days.</div>;
  const W = 640;
  const H = 200;
  const PL = 6;
  const PT = 14;
  const PB = 6;
  const cur = data.map((d) => Number(d[metric]) || 0);
  const cmp = compare && compare.length >= 2 ? compare.map((d) => Number(d[metric]) || 0) : null;
  const max = Math.max(1, ...cur, ...(cmp || []));
  const n = (cmp ? Math.max(data.length, cmp.length) : data.length) - 1;
  const stepX = (W - PL * 2) / Math.max(1, n);
  const x = (i) => PL + i * stepX;
  const y = (v) => PT + (1 - v / max) * (H - PT - PB);
  const toPath = (arr) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const line = toPath(cur);
  const area = `${line} L ${x(cur.length - 1).toFixed(1)} ${H - PB} L ${PL} ${H - PB} Z`;
  const last = [x(cur.length - 1), y(cur[cur.length - 1])];

  return (
    <div className="ap-area">
      <svg viewBox={`0 0 ${W} ${H}`} className="ap-area-svg" role="img" aria-label={`${metric} over the last 30 days`}>
        <defs>
          <linearGradient id="apAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="ap-area-g0" />
            <stop offset="100%" className="ap-area-g1" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PL} x2={W - PL} y1={y(max * f)} y2={y(max * f)} className="ap-area-grid" />
        ))}
        <path d={area} fill="url(#apAreaGrad)" />
        {cmp && <path d={toPath(cmp)} className="ap-area-cmp" fill="none" />}
        <path d={line} className="ap-area-line" fill="none" />
        <circle cx={last[0]} cy={last[1]} r="3.5" className="ap-area-dot" />
      </svg>
      <div className="ap-area-x">
        <span>{fmtDate(data[0].d)}</span>
        <span className="ap-area-peak">
          peak {format(max)}
          {cmp ? "  ·  ┄ prior 30 days" : ""}
        </span>
        <span>{fmtDate(data[data.length - 1].d)}</span>
      </div>
    </div>
  );
}

export function BarChart({ data, format = num, height = 190, unit = "" }) {
  if (!data || data.length === 0) return <div className="ap-async-empty">No data.</div>;
  const vals = data.map((d) => Number(d.value) || 0);
  const max = Math.max(1, ...vals);
  const peak = vals.indexOf(Math.max(...vals));
  return (
    <div className="ap-barchart">
      <div className="ap-barchart-plot" style={{ height }}>
        {data.map((d, i) => (
          <div className="ap-barchart-col" key={i} title={`${d.label}${unit ? ` ${unit}` : ""}: ${format(vals[i])}`}>
            <span
              className={`ap-barchart-bar ${i === peak ? "is-peak" : ""}`}
              style={{ height: `${Math.max(1.5, (vals[i] / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="ap-barchart-x">
        {data.map((d, i) => (
          <span key={i}>{i % Math.ceil(data.length / 8) === 0 ? d.label : ""}</span>
        ))}
      </div>
    </div>
  );
}

export function Donut({ segments, centerLabel, centerSub }) {
  const total = segments.reduce((s, x) => s + (Number(x.value) || 0), 0);
  const R = 54;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="ap-donut">
      <svg viewBox="0 0 132 132" className="ap-donut-svg">
        <circle cx="66" cy="66" r={R} className="ap-donut-track" />
        {total > 0 &&
          segments.map((seg, i) => {
            const dash = ((Number(seg.value) || 0) / total) * C;
            const node = (
              <circle
                key={i}
                cx="66"
                cy="66"
                r={R}
                className="ap-donut-seg"
                style={{ stroke: seg.color, strokeDasharray: `${dash} ${C - dash}`, strokeDashoffset: -acc }}
              />
            );
            acc += dash;
            return node;
          })}
      </svg>
      <div className="ap-donut-center">
        <strong>{centerLabel}</strong>
        {centerSub && <span>{centerSub}</span>}
      </div>
    </div>
  );
}

export function Legend({ rows }) {
  return (
    <ul className="ap-legend">
      {rows.map((r, i) => (
        <li key={i}>
          <span className="ap-legend-dot" style={{ background: r.color }} />
          <span className="ap-legend-label">{r.label}</span>
          <span className="ap-legend-value">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------------------------------------- confirm --- */

export function ConfirmDialog({ title, message, confirmLabel, tone = "primary", busy, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="ap-btn ap-btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={`ap-btn ap-btn-${tone}`} onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="ap-confirm-msg">{message}</div>
    </Modal>
  );
}

export function ConfirmButton({ onConfirm, children, className = "ap-btn ap-btn-danger", confirmLabel = "Confirm?" }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      className={className}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}

/* ----------------------------------------------------- analytics add-ons --- */

// One-line hint shown wherever an analytics RPC / column isn't installed yet.
export function NeedsSetup({ what = "This metric", file = "supabase/admin_analytics.sql" }) {
  return (
    <p className="ap-async-empty">
      {what} needs setup — run <code>{file}</code> in the Supabase SQL editor.
    </p>
  );
}

// Absolute-delta trend indicator. Renders even without a baseline (shows "new").
export function TrendArrow({ now, prev, unit = "" }) {
  const a = Number(now);
  const b = Number(prev);
  if (!Number.isFinite(a)) return null;
  if (!Number.isFinite(b) || b === 0) return <span className="ap-delta is-up">▲ new</span>;
  const pct = ((a - b) / b) * 100;
  const up = pct >= 0;
  return (
    <span className={`ap-delta ${up ? "is-up" : "is-down"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%{unit}
    </span>
  );
}

// Two independently-scaled lines on a shared x-axis. `left` / `right` are
// { key, label, format, color }.
export function DualAxisChart({ data, xKey = "d", left, right }) {
  if (!data || data.length < 2) return <div className="ap-async-empty">Not enough data yet.</div>;
  const W = 640;
  const H = 200;
  const PL = 6;
  const PT = 14;
  const PB = 6;
  const n = data.length - 1;
  const sx = (W - PL * 2) / Math.max(1, n);
  const x = (i) => PL + i * sx;
  const series = (key) => data.map((d) => Number(d[key]) || 0);
  const path = (vals) => {
    const max = Math.max(1, ...vals);
    const y = (v) => PT + (1 - v / max) * (H - PT - PB);
    return { d: vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" "), max };
  };
  const L = path(series(left.key));
  const R = path(series(right.key));
  const lc = left.color || "var(--ap-primary)";
  const rc = right.color || "var(--ap-primary-2)";
  const fmtL = left.format || num;
  const fmtR = right.format || num;

  return (
    <div className="ap-area">
      <svg viewBox={`0 0 ${W} ${H}`} className="ap-area-svg" role="img" aria-label={`${left.label} and ${right.label}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PL} x2={W - PL} y1={PT + (1 - f) * (H - PT - PB)} y2={PT + (1 - f) * (H - PT - PB)} className="ap-area-grid" />
        ))}
        <path d={R.d} fill="none" style={{ stroke: rc }} strokeWidth="2" strokeDasharray="4 3" />
        <path d={L.d} fill="none" style={{ stroke: lc }} strokeWidth="2.5" />
      </svg>
      <div className="ap-area-x">
        <span>{fmtDate(data[0][xKey])}</span>
        <span className="ap-dualaxis-legend">
          <span style={{ color: lc }}>● {left.label} · peak {fmtL(L.max)}</span>
          <span style={{ color: rc }}>┄ {right.label} · peak {fmtR(R.max)}</span>
        </span>
        <span>{fmtDate(data[data.length - 1][xKey])}</span>
      </div>
    </div>
  );
}

// Grouped comparison bars: the selected metric summed into weekly buckets for
// the current 30-day window vs the prior 30-day window, aligned by day-offset so
// week N lines up with week N. Tolerates sparse daily data (gaps = 0).
export function ComparisonBars({ current = [], prior = [], metric, format = num, now }) {
  const DAY = 86400000;
  const SPAN = 30;
  const N = 5;
  const size = Math.ceil(SPAN / N); // 6-day buckets

  const start = now ? new Date(now) : new Date();
  start.setHours(0, 0, 0, 0);
  const startCur = new Date(start);
  startCur.setDate(startCur.getDate() - (SPAN - 1));
  const startPri = new Date(startCur);
  startPri.setDate(startPri.getDate() - SPAN);

  const bucketize = (rows, originMs) => {
    const out = new Array(N).fill(0);
    for (const r of rows || []) {
      const t = new Date(r.d).getTime();
      if (!Number.isFinite(t)) continue;
      let idx = Math.floor((t - originMs) / DAY / size);
      idx = Math.max(0, Math.min(N - 1, idx));
      out[idx] += Number(r[metric]) || 0;
    }
    return out;
  };

  const cur = bucketize(current, startCur.getTime());
  const pri = bucketize(prior, startPri.getTime());
  const max = Math.max(1, ...cur, ...pri);
  const curTotal = cur.reduce((a, b) => a + b, 0);
  const priTotal = pri.reduce((a, b) => a + b, 0);

  return (
    <div className="ap-cmpbars">
      <div className="ap-cmpbars-head">
        <span>
          <i className="ap-cmpbars-key is-cur" />
          Last 30 days <b>{format(curTotal)}</b>
        </span>
        <span>
          <i className="ap-cmpbars-key is-pri" />
          Prior 30 days <b>{format(priTotal)}</b>
        </span>
        <DeltaChip now={curTotal} prev={priTotal} />
      </div>
      <div className="ap-cmpbars-plot">
        {cur.map((_, i) => (
          <div
            className="ap-cmpbars-group"
            key={i}
            title={`Days ${i * size + 1}–${Math.min(SPAN, (i + 1) * size)}\nLast: ${format(cur[i])}\nPrior: ${format(pri[i])}`}
          >
            <span className="ap-cmpbars-bar is-cur" style={{ height: `${(cur[i] / max) * 100}%` }} />
            <span className="ap-cmpbars-bar is-pri" style={{ height: `${(pri[i] / max) * 100}%` }} />
            <span className="ap-cmpbars-label">Wk {i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Vertical bar histogram — every label + count is shown (unlike BarChart).
export function Histogram({ bins, format = num }) {
  if (!bins || bins.length === 0) return <div className="ap-async-empty">No data.</div>;
  const vals = bins.map((b) => Number(b.value) || 0);
  const max = Math.max(1, ...vals);
  return (
    <div className="ap-histogram">
      {bins.map((b, i) => (
        <div className="ap-histogram-col" key={i}>
          <span className="ap-histogram-count">{format(vals[i])}</span>
          <span className="ap-histogram-bar" style={{ height: `${(vals[i] / max) * 100}%` }} />
          <span className="ap-histogram-label">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

// Horizontal ranked bars: [{ label, value, sub? }].
export function RankBars({ rows, format = num, max: fixedMax }) {
  if (!rows || rows.length === 0) return <div className="ap-async-empty">No data.</div>;
  const max = fixedMax || Math.max(1, ...rows.map((r) => Number(r.value) || 0));
  return (
    <ul className="ap-rankbars">
      {rows.map((r, i) => (
        <li key={i}>
          <span className="ap-rankbars-label" title={r.label}>{r.label}</span>
          <span className="ap-rankbars-track">
            <span className="ap-rankbars-fill" style={{ width: `${Math.max(2, ((Number(r.value) || 0) / max) * 100)}%` }} />
          </span>
          <span className="ap-rankbars-value">
            {format(r.value)}
            {r.sub != null && <em>{r.sub}</em>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Conversion funnel: [{ label, value }]. Shows drop vs the previous stage.
export function Funnel({ stages }) {
  const clean = (stages || []).filter((s) => s && s.value != null);
  if (clean.length === 0) return <div className="ap-async-empty">Not tracked yet.</div>;
  const top = Math.max(1, Number(clean[0].value) || 0);
  return (
    <ol className="ap-funnel">
      {clean.map((s, i) => {
        const v = Number(s.value) || 0;
        const prev = i ? Number(clean[i - 1].value) || 0 : v;
        const drop = i && prev ? (1 - v / prev) * 100 : 0;
        return (
          <li key={i}>
            <div className="ap-funnel-row">
              <span className="ap-funnel-label">{s.label}</span>
              <span className="ap-funnel-bar" style={{ width: `${(v / top) * 100}%` }} />
              <span className="ap-funnel-value">{num(v)}</span>
            </div>
            {i > 0 && (
              <span className="ap-funnel-drop">
                {((v / top) * 100).toFixed(0)}% of top{drop > 0 ? ` · ▼ ${drop.toFixed(0)}% from previous` : ""}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// Locality × event-type intensity grid. `data` = [{ row, col, count }].
export function Heatmap({ data, format = num }) {
  if (!data || data.length === 0) return <div className="ap-async-empty">No data.</div>;
  const rows = [...new Set(data.map((d) => d.row))];
  const cols = [...new Set(data.map((d) => d.col))];
  const lookup = new Map(data.map((d) => [`${d.row} ${d.col}`, Number(d.count) || 0]));
  const max = Math.max(1, ...data.map((d) => Number(d.count) || 0));
  return (
    <div className="ap-heatmap-wrap">
      <table className="ap-heatmap">
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <th>{r}</th>
              {cols.map((c) => {
                const v = lookup.get(`${r} ${c}`) || 0;
                const pct = Math.round((v / max) * 100);
                return (
                  <td
                    key={c}
                    style={{ background: `color-mix(in srgb, var(--ap-primary) ${pct}%, transparent)`, color: pct > 55 ? "#fff" : "inherit" }}
                    title={`${r} · ${c}: ${format(v)}`}
                  >
                    {v ? format(v) : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
