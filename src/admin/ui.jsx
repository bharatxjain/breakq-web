// Shared admin-panel UI primitives + formatters.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

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
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  if (isEmpty)
    return (
      <div className="ap-async ap-async-empty">
        {empty || "Nothing here yet."}
      </div>
    );
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
  if (["approved", "active", "paid", "captured", "success"].includes(s))
    return "ok";
  if (["pending", "created", "processing"].includes(s)) return "warn";
  if (["rejected", "failed", "expired", "cancelled", "canceled"].includes(s))
    return "danger";
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

/* --------------------------------------------------------- chart hover --- */

// Floating tooltip content for a chart element. The element it sits inside
// needs `position: relative` and a `:hover`/`:focus-visible` rule that shows
// `.ap-chart-tooltip` — see the per-chart CSS blocks in Admin.css.
export function ChartTooltip({ children }) {
  return (
    <span className="ap-chart-tooltip" role="tooltip">
      {children}
    </span>
  );
}

// Common keydown handler so every clickable chart element (bar, segment,
// row…) also activates on Enter/Space, matching native button semantics.
function activateOnKey(fn) {
  return (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn(e);
    }
  };
}

export function Bars({ data, metric, format = num, height = 150 }) {
  if (!data || data.length === 0)
    return <div className="ap-async-empty">No data in the last 30 days.</div>;
  const vals = data.map((d) => Number(d[metric]) || 0);
  const max = Math.max(1, ...vals);
  const w = 100 / data.length;

  return (
    <div className="ap-bars" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="ap-bars-svg"
        aria-hidden="true"
      >
        <line x1="0" y1="99.5" x2="100" y2="99.5" className="ap-bars-axis" />
        {data.map((d, i) => {
          const h = ((Number(d[metric]) || 0) / max) * 96;
          return (
            <rect
              key={i}
              x={i * w + w * 0.16}
              y={100 - h}
              width={w * 0.68}
              height={Math.max(h, 0.4)}
              className={
                i === data.length - 1 ? "ap-bar ap-bar-last" : "ap-bar"
              }
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

export function MiniBars({ values, labels = [], tone = "primary", unit = "" }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(1, ...values);
  return (
    <div className={`ap-minibars ap-minibars-${tone}`}>
      {values.map((v, i) => (
        <span
          key={i}
          tabIndex={0}
          className={i === values.length - 1 ? "is-last" : ""}
          aria-label={`${labels[i] || `Bar ${i + 1}`}: ${num(v)}${unit ? ` ${unit}` : ""}`}
          style={{ height: `${Math.max(4, ((Number(v) || 0) / max) * 100)}%` }}
        >
          <ChartTooltip>
            <strong>{labels[i] || `Bar ${i + 1}`}</strong>
            <span>
              {num(v)}
              {unit ? ` ${unit}` : ""}
            </span>
          </ChartTooltip>
        </span>
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
  const line = pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg
      className={`ap-spark ap-spark-${tone}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={area} className="ap-spark-fill" />
      <path
        d={line}
        className="ap-spark-line"
        vectorEffect="non-scaling-stroke"
        fill="none"
      />
    </svg>
  );
}

export function AreaChart({ data, metric, format = num, compare, onPointClick }) {
  if (!data || data.length === 0)
    return <div className="ap-async-empty">No data in the last 30 days.</div>;
  const [hoverI, setHoverI] = useState(null);
  const W = 640;
  const H = 200;
  const PL = 6;
  const PT = 14;
  const PB = 6;
  const cur = data.map((d) => Number(d[metric]) || 0);
  const cmp =
    compare && compare.length >= 2
      ? compare.map((d) => Number(d[metric]) || 0)
      : null;
  const max = Math.max(1, ...cur, ...(cmp || []));
  const n = (cmp ? Math.max(data.length, cmp.length) : data.length) - 1;
  const stepX = (W - PL * 2) / Math.max(1, n);
  const x = (i) => PL + i * stepX;
  const y = (v) => PT + (1 - v / max) * (H - PT - PB);
  const toPath = (arr) =>
    arr
      .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");
  const line = toPath(cur);
  const area = `${line} L ${x(cur.length - 1).toFixed(1)} ${H - PB} L ${PL} ${H - PB} Z`;
  const last = [x(cur.length - 1), y(cur[cur.length - 1])];

  const nearestIndex = (clientX, target) => {
    const rect = target.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    return Math.max(0, Math.min(cur.length - 1, Math.round((relX - PL) / stepX)));
  };
  const handleMove = (e) => setHoverI(nearestIndex(e.clientX, e.currentTarget));
  const handleLeave = () => setHoverI(null);
  const handleTouch = (e) => {
    const t = e.touches[0];
    if (t) setHoverI(nearestIndex(t.clientX, e.currentTarget));
  };
  const handleClick = () => {
    if (onPointClick && hoverI != null) onPointClick(data[hoverI], hoverI);
  };

  const hoverX = hoverI != null ? x(hoverI) : null;
  const hoverY = hoverI != null ? y(cur[hoverI]) : null;

  return (
    <div className="ap-area">
      <div className="ap-area-plot">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={`ap-area-svg ${onPointClick ? "ap-chart-hit" : ""}`}
          role="img"
          aria-label={`${metric} over the last 30 days`}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
          onTouchEnd={handleLeave}
          onClick={onPointClick ? handleClick : undefined}
        >
          <defs>
            <linearGradient id="apAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="ap-area-g0" />
              <stop offset="100%" className="ap-area-g1" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={PL}
              x2={W - PL}
              y1={y(max * f)}
              y2={y(max * f)}
              className="ap-area-grid"
            />
          ))}
          <path d={area} fill="url(#apAreaGrad)" />
          {cmp && <path d={toPath(cmp)} className="ap-area-cmp" fill="none" />}
          <path d={line} className="ap-area-line" fill="none" />
          <circle cx={last[0]} cy={last[1]} r="3.5" className="ap-area-dot" />
          {hoverI != null && (
            <>
              <line
                x1={hoverX}
                x2={hoverX}
                y1={PT}
                y2={H - PB}
                className="ap-area-hoverline"
              />
              <circle
                cx={hoverX}
                cy={hoverY}
                r="4.5"
                className="ap-area-hoverdot"
              />
            </>
          )}
        </svg>
        {hoverI != null && (
          <div
            className="ap-chart-tooltip ap-area-tooltip"
            role="tooltip"
            style={{
              left: `${(hoverX / W) * 100}%`,
              top: `${(hoverY / H) * 100}%`,
            }}
          >
            <strong>{fmtDate(data[hoverI]?.d)}</strong>
            <span>{format(cur[hoverI])}</span>
            {cmp && cmp[hoverI] != null && <em>prior: {format(cmp[hoverI])}</em>}
          </div>
        )}
      </div>
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

export function BarChart({
  data,
  format = num,
  height = 190,
  unit = "",
  onBarClick,
}) {
  // Tapping a bar toggles its tooltip "pinned" open — CSS :hover doesn't
  // fire reliably on touch, so this is what makes the chart usable on phones.
  const [pinned, setPinned] = useState(null);
  if (!data || data.length === 0)
    return <div className="ap-async-empty">No data.</div>;
  const vals = data.map((d) => Number(d.value) || 0);
  const max = Math.max(1, ...vals);
  const total = vals.reduce((a, b) => a + b, 0);
  const peak = vals.indexOf(Math.max(...vals));
  return (
    <div className="ap-barchart">
      <div className="ap-barchart-plot" style={{ height }}>
        {data.map((d, i) => {
          const pct = total ? Math.round((vals[i] / total) * 100) : 0;
          const activate = () => {
            setPinned((cur) => (cur === i ? null : i));
            onBarClick?.(d, i);
          };
          return (
            <div
              className={`ap-barchart-col ap-chart-hit ${pinned === i ? "is-pinned" : ""}`}
              key={i}
              tabIndex={0}
              role="button"
              aria-label={`${d.label}${unit ? ` ${unit}` : ""}: ${format(vals[i])}`}
              onClick={activate}
              onKeyDown={activateOnKey(activate)}
            >
              <span
                className={`ap-barchart-bar ${i === peak ? "is-peak" : ""}`}
                style={{ height: `${Math.max(1.5, (vals[i] / max) * 100)}%` }}
              />
              <ChartTooltip>
                <strong>{d.label}</strong>
                <span>
                  {format(vals[i])}
                  {unit ? ` ${unit}` : ""}
                </span>
                {total > 0 && <em>{pct}% of total</em>}
              </ChartTooltip>
            </div>
          );
        })}
      </div>
      <div className="ap-barchart-x">
        {data.map((d, i) => (
          <span key={i}>
            {i % Math.ceil(data.length / 8) === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

// segments: [{ value, color, label?, format? }]. Hovering or focusing a
// wedge (or its matching Legend row, if wired via activeIndex) shows a
// floating value/percentage tooltip near that wedge; clicking one calls
// onSegmentClick(segment, index) when provided.
export function Donut({
  segments,
  centerLabel,
  centerSub,
  onSegmentClick,
  activeIndex,
  onHoverIndex,
}) {
  const [localHover, setLocalHover] = useState(null);
  const hover = activeIndex !== undefined ? activeIndex : localHover;
  const setHover = onHoverIndex || setLocalHover;
  const total = segments.reduce((s, x) => s + (Number(x.value) || 0), 0);
  const R = 54;
  const C = 2 * Math.PI * R;
  const clickable = !!onSegmentClick;
  let acc = 0;
  const arcs = segments.map((seg, i) => {
    const value = Number(seg.value) || 0;
    const dash = total ? (value / total) * C : 0;
    const offset = acc;
    acc += dash;
    const midFraction = total ? (offset + dash / 2) / C : 0;
    return { ...seg, i, value, dash, offset, midFraction };
  });
  const active = hover != null ? arcs[hover] : null;
  // Wedge midpoint as a % position within the box — the svg is rotated
  // -90deg via CSS so fraction 0 sits at 12 o'clock, increasing clockwise.
  // R/66 scales the viewBox ring radius (54 of 132) down to the box's own
  // percentage space so the point lands on the ring, not the box edge.
  const ringPct = (R / 66) * 50;
  const pos = active
    ? {
        left: `${50 + ringPct * Math.sin(active.midFraction * 2 * Math.PI)}%`,
        top: `${50 - ringPct * Math.cos(active.midFraction * 2 * Math.PI)}%`,
      }
    : null;

  return (
    <div className="ap-donut">
      <svg viewBox="0 0 132 132" className="ap-donut-svg">
        <circle cx="66" cy="66" r={R} className="ap-donut-track" />
        {total > 0 &&
          arcs.map((seg) => (
            <circle
              key={seg.i}
              cx="66"
              cy="66"
              r={R}
              className={`ap-donut-seg ${hover === seg.i ? "is-active" : ""} ${clickable ? "ap-chart-hit" : ""}`}
              style={{
                stroke: seg.color,
                strokeDasharray: `${seg.dash} ${C - seg.dash}`,
                strokeDashoffset: -seg.offset,
              }}
              tabIndex={0}
              role={clickable ? "button" : undefined}
              aria-label={`${seg.label || `Segment ${seg.i + 1}`}: ${
                seg.format ? seg.format(seg.value) : num(seg.value)
              }${total ? `, ${Math.round((seg.value / total) * 100)}%` : ""}`}
              onMouseEnter={() => setHover(seg.i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(seg.i)}
              onBlur={() => setHover(null)}
              onClick={() => {
                // Tap-to-toggle so touch devices (no real hover) can still
                // see the tooltip, on top of any real drill-down navigation.
                setHover((cur) => (cur === seg.i ? null : seg.i));
                onSegmentClick?.(seg, seg.i);
              }}
              onKeyDown={
                clickable
                  ? activateOnKey(() => onSegmentClick(seg, seg.i))
                  : undefined
              }
            />
          ))}
      </svg>
      <div className="ap-donut-center">
        <strong>{centerLabel}</strong>
        {centerSub && <span>{centerSub}</span>}
      </div>
      {active && pos && (
        <div className="ap-donut-tooltip" style={pos} role="tooltip">
          <strong>{active.label || `Segment ${active.i + 1}`}</strong>
          <span>{active.format ? active.format(active.value) : num(active.value)}</span>
          {total > 0 && <em>{Math.round((active.value / total) * 100)}%</em>}
        </div>
      )}
    </div>
  );
}

export function Legend({ rows, activeIndex, onHoverIndex, onRowClick }) {
  const clickable = !!onRowClick;
  return (
    <ul className="ap-legend">
      {rows.map((r, i) => (
        <li
          key={i}
          className={`${activeIndex === i ? "is-active" : ""} ${clickable ? "ap-chart-hit" : ""}`}
          tabIndex={clickable ? 0 : -1}
          role={clickable ? "button" : undefined}
          onMouseEnter={onHoverIndex ? () => onHoverIndex(i) : undefined}
          onMouseLeave={onHoverIndex ? () => onHoverIndex(null) : undefined}
          onFocus={onHoverIndex ? () => onHoverIndex(i) : undefined}
          onBlur={onHoverIndex ? () => onHoverIndex(null) : undefined}
          onClick={clickable ? () => onRowClick(r, i) : undefined}
          onKeyDown={
            clickable ? activateOnKey(() => onRowClick(r, i)) : undefined
          }
        >
          <span className="ap-legend-dot" style={{ background: r.color }} />
          <span className="ap-legend-label">{r.label}</span>
          <span className="ap-legend-value">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------------------------------------- confirm --- */

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone = "primary",
  busy,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button
            className="ap-btn ap-btn-ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className={`ap-btn ap-btn-${tone}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="ap-confirm-msg">{message}</div>
    </Modal>
  );
}

export function ConfirmButton({
  onConfirm,
  children,
  className = "ap-btn ap-btn-danger",
  confirmLabel = "Confirm?",
}) {
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
export function NeedsSetup({
  what = "This metric",
  file = "supabase/admin_analytics.sql",
}) {
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
  if (!Number.isFinite(b) || b === 0)
    return <span className="ap-delta is-up">▲ new</span>;
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
export function DualAxisChart({ data, xKey = "d", left, right, onPointClick }) {
  if (!data || data.length < 2)
    return <div className="ap-async-empty">Not enough data yet.</div>;
  const [hoverI, setHoverI] = useState(null);
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
    return {
      d: vals
        .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
        .join(" "),
      max,
      vals,
      y,
    };
  };
  const L = path(series(left.key));
  const R = path(series(right.key));
  const lc = left.color || "var(--ap-primary)";
  const rc = right.color || "var(--ap-primary-2)";
  const fmtL = left.format || num;
  const fmtR = right.format || num;

  const posToIndex = (clientX, target) => {
    const rect = target.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    return Math.max(0, Math.min(n, Math.round((relX - PL) / sx)));
  };
  const handleMove = (e) => setHoverI(posToIndex(e.clientX, e.currentTarget));
  const handleLeave = () => setHoverI(null);
  const handleTouch = (e) => {
    const t = e.touches[0];
    if (t) setHoverI(posToIndex(t.clientX, e.currentTarget));
  };
  const handleClick = () => {
    if (onPointClick && hoverI != null) onPointClick(data[hoverI], hoverI);
  };
  const hoverX = hoverI != null ? x(hoverI) : null;

  return (
    <div className="ap-area">
      <div className="ap-area-plot">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={`ap-area-svg ${onPointClick ? "ap-chart-hit" : ""}`}
          role="img"
          aria-label={`${left.label} and ${right.label}`}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
          onTouchEnd={handleLeave}
          onClick={onPointClick ? handleClick : undefined}
        >
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={PL}
              x2={W - PL}
              y1={PT + (1 - f) * (H - PT - PB)}
              y2={PT + (1 - f) * (H - PT - PB)}
              className="ap-area-grid"
            />
          ))}
          <path
            d={R.d}
            fill="none"
            style={{ stroke: rc }}
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <path d={L.d} fill="none" style={{ stroke: lc }} strokeWidth="2.5" />
          {hoverI != null && (
            <>
              <line
                x1={hoverX}
                x2={hoverX}
                y1={PT}
                y2={H - PB}
                className="ap-area-hoverline"
              />
              <circle
                cx={hoverX}
                cy={L.y(L.vals[hoverI])}
                r="4"
                style={{ fill: "var(--ap-surface)", stroke: lc }}
                strokeWidth="2.5"
              />
              <circle
                cx={hoverX}
                cy={R.y(R.vals[hoverI])}
                r="4"
                style={{ fill: "var(--ap-surface)", stroke: rc }}
                strokeWidth="2.5"
              />
            </>
          )}
        </svg>
        {hoverI != null && (
          <div
            className="ap-chart-tooltip ap-area-tooltip"
            role="tooltip"
            style={{
              left: `${(hoverX / W) * 100}%`,
              top: `${(Math.min(L.y(L.vals[hoverI]), R.y(R.vals[hoverI])) / H) * 100}%`,
            }}
          >
            <strong>{fmtDate(data[hoverI]?.[xKey])}</strong>
            <span>
              {left.label}: {fmtL(L.vals[hoverI])}
            </span>
            <span>
              {right.label}: {fmtR(R.vals[hoverI])}
            </span>
          </div>
        )}
      </div>
      <div className="ap-area-x">
        <span>{fmtDate(data[0][xKey])}</span>
        <span className="ap-dualaxis-legend">
          <span style={{ color: lc }}>
            ● {left.label} · peak {fmtL(L.max)}
          </span>
          <span style={{ color: rc }}>
            ┄ {right.label} · peak {fmtR(R.max)}
          </span>
        </span>
        <span>{fmtDate(data[data.length - 1][xKey])}</span>
      </div>
    </div>
  );
}

// Grouped comparison bars: the selected metric summed into weekly buckets for
// the current 30-day window vs the prior 30-day window, aligned by day-offset so
// week N lines up with week N. Tolerates sparse daily data (gaps = 0).
export function ComparisonBars({
  current = [],
  prior = [],
  metric,
  format = num,
  now,
  onGroupClick,
}) {
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
        {cur.map((_, i) => {
          const delta = pri[i] ? ((cur[i] - pri[i]) / pri[i]) * 100 : null;
          const clickable = !!onGroupClick;
          return (
            <div
              className={`ap-cmpbars-group ${clickable ? "ap-chart-hit" : ""}`}
              key={i}
              tabIndex={0}
              role={clickable ? "button" : undefined}
              aria-label={`Week ${i + 1}: last ${format(cur[i])}, prior ${format(pri[i])}`}
              onClick={
                clickable
                  ? () => onGroupClick({ week: i + 1, cur: cur[i], pri: pri[i] }, i)
                  : undefined
              }
              onKeyDown={
                clickable
                  ? activateOnKey(() =>
                      onGroupClick({ week: i + 1, cur: cur[i], pri: pri[i] }, i),
                    )
                  : undefined
              }
            >
              <span
                className="ap-cmpbars-bar is-cur"
                style={{ height: `${(cur[i] / max) * 100}%` }}
              />
              <span
                className="ap-cmpbars-bar is-pri"
                style={{ height: `${(pri[i] / max) * 100}%` }}
              />
              <span className="ap-cmpbars-label">Wk {i + 1}</span>
              <ChartTooltip>
                <strong>
                  Days {i * size + 1}–{Math.min(SPAN, (i + 1) * size)}
                </strong>
                <span>Last: {format(cur[i])}</span>
                <span>Prior: {format(pri[i])}</span>
                {delta != null && (
                  <em>
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
                  </em>
                )}
              </ChartTooltip>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Vertical bar histogram — every label + count is shown (unlike BarChart).
export function Histogram({ bins, format = num }) {
  if (!bins || bins.length === 0)
    return <div className="ap-async-empty">No data.</div>;
  const vals = bins.map((b) => Number(b.value) || 0);
  const max = Math.max(1, ...vals);
  return (
    <div className="ap-histogram">
      {bins.map((b, i) => (
        <div className="ap-histogram-col" key={i}>
          <span className="ap-histogram-count">{format(vals[i])}</span>
          <span
            className="ap-histogram-bar"
            style={{ height: `${(vals[i] / max) * 100}%` }}
          />
          <span className="ap-histogram-label">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

// Horizontal ranked bars: [{ label, value, sub? }].
export function RankBars({ rows, format = num, max: fixedMax, onRowClick }) {
  if (!rows || rows.length === 0)
    return <div className="ap-async-empty">No data.</div>;
  const max = fixedMax || Math.max(1, ...rows.map((r) => Number(r.value) || 0));
  const total = rows.reduce((s, r) => s + (Number(r.value) || 0), 0);
  const clickable = !!onRowClick;
  return (
    <ul className="ap-rankbars">
      {rows.map((r, i) => {
        const value = Number(r.value) || 0;
        const pct = total ? Math.round((value / total) * 100) : 0;
        return (
          <li
            key={i}
            className={clickable ? "ap-chart-hit" : ""}
            tabIndex={0}
            role={clickable ? "button" : undefined}
            aria-label={`${r.label}: ${format(value)}`}
            onClick={clickable ? () => onRowClick(r, i) : undefined}
            onKeyDown={
              clickable ? activateOnKey(() => onRowClick(r, i)) : undefined
            }
          >
            <span className="ap-rankbars-label" title={r.label}>
              {r.label}
            </span>
            <span className="ap-rankbars-track">
              <span
                className="ap-rankbars-fill"
                style={{
                  width: `${Math.max(2, (value / max) * 100)}%`,
                }}
              />
            </span>
            <span className="ap-rankbars-value">
              {format(r.value)}
              {r.sub != null && <em>{r.sub}</em>}
            </span>
            <ChartTooltip>
              <strong>{r.label}</strong>
              <span>{format(value)}</span>
              {total > 0 && <em>{pct}% of total</em>}
            </ChartTooltip>
          </li>
        );
      })}
    </ul>
  );
}

// Conversion funnel: [{ label, value }]. Shows drop vs the previous stage.
export function Funnel({ stages, onStageClick }) {
  const clean = (stages || []).filter((s) => s && s.value != null);
  if (clean.length === 0)
    return <div className="ap-async-empty">Not tracked yet.</div>;
  const top = Math.max(1, Number(clean[0].value) || 0);
  const clickable = !!onStageClick;
  return (
    <ol className="ap-funnel">
      {clean.map((s, i) => {
        const v = Number(s.value) || 0;
        const prev = i ? Number(clean[i - 1].value) || 0 : v;
        const drop = i && prev ? (1 - v / prev) * 100 : 0;
        return (
          <li key={i}>
            <div
              className={`ap-funnel-row ${clickable ? "ap-chart-hit" : ""}`}
              tabIndex={0}
              role={clickable ? "button" : undefined}
              aria-label={`${s.label}: ${num(v)}`}
              onClick={clickable ? () => onStageClick(s, i) : undefined}
              onKeyDown={
                clickable ? activateOnKey(() => onStageClick(s, i)) : undefined
              }
            >
              <span className="ap-funnel-label">{s.label}</span>
              <span
                className="ap-funnel-bar"
                style={{ width: `${(v / top) * 100}%` }}
              />
              <span className="ap-funnel-value">{num(v)}</span>
              <ChartTooltip>
                <strong>{s.label}</strong>
                <span>{num(v)}</span>
                <em>
                  {((v / top) * 100).toFixed(0)}% of top
                  {drop > 0 ? ` · ▼${drop.toFixed(0)}% vs previous` : ""}
                </em>
              </ChartTooltip>
            </div>
            {i > 0 && (
              <span className="ap-funnel-drop">
                {((v / top) * 100).toFixed(0)}% of top
                {drop > 0 ? ` · ▼ ${drop.toFixed(0)}% from previous` : ""}
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
  if (!data || data.length === 0)
    return <div className="ap-async-empty">No data.</div>;
  const rows = [...new Set(data.map((d) => d.row))];
  const cols = [...new Set(data.map((d) => d.col))];
  const lookup = new Map(
    data.map((d) => [`${d.row} ${d.col}`, Number(d.count) || 0]),
  );
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
                    style={{
                      background: `color-mix(in srgb, var(--ap-primary) ${pct}%, transparent)`,
                      color: pct > 55 ? "#fff" : "inherit",
                    }}
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
