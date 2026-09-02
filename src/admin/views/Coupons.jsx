import { useState } from "react";
import {
  couponUsage,
  deleteCoupon,
  fetchCouponStats,
  fetchCoupons,
  saveCoupon,
} from "../api";
import {
  AreaChart,
  Async,
  Badge,
  ConfirmButton,
  Field,
  Modal,
  Spark,
  fmtDate,
  money,
  num,
  useAsync,
  useToast,
} from "../ui";

const BLANK = {
  code: "",
  description: "",
  discount_percent: "",
  discount_flat_rupees: "",
  min_order_amount: "",
  max_discount_rupees: "",
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: "",
  usage_limit: "",
};

// Days-until-expiry badge from valid_until.
function expiry(validUntil) {
  if (!validUntil) return { text: "No expiry", tone: "neutral" };
  const ms = new Date(validUntil).getTime() - Date.now();
  if (Number.isNaN(ms)) return { text: "—", tone: "neutral" };
  const days = Math.ceil(ms / 86400000);
  if (days < 0) return { text: `Expired ${-days}d ago`, tone: "danger" };
  if (days === 0) return { text: "Expires today", tone: "warn" };
  if (days <= 7) return { text: `${days}d left`, tone: "warn" };
  return { text: `${days}d left`, tone: "ok" };
}

export default function Coupons() {
  const notify = useToast();
  const { state, data, error, reload } = useAsync(fetchCoupons, []);
  const stats = useAsync(fetchCouponStats, []);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [usage, setUsage] = useState({});
  const rows = data || [];

  const statsMissing = stats.data?._missing;
  const byCode = new Map(
    (stats.data && !statsMissing ? stats.data.codes || [] : []).map((s) => [s.code, s]),
  );

  async function checkUsage(code) {
    setUsage((u) => ({ ...u, [code]: "…" }));
    try {
      const n = await couponUsage(code);
      setUsage((u) => ({ ...u, [code]: n }));
    } catch {
      setUsage((u) => ({ ...u, [code]: "err" }));
    }
  }

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Coupons</h1>
          <p className="ap-view-sub">Promo codes · usage, redemption trend and expiry</p>
        </div>
        <button className="ap-btn ap-btn-primary" onClick={() => setEditing({ ...BLANK, _new: true })}>
          + New coupon
        </button>
      </div>

      <Async state={state} error={error} onRetry={reload} isEmpty={rows.length === 0} empty="No coupons.">
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th className="ap-num">Min order</th>
                <th className="ap-num">Max disc.</th>
                <th>Redemptions</th>
                <th>Trend · 30d</th>
                <th>Expires</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const st = byCode.get(c.code);
                const used = st ? st.redemptions : usage[c.code];
                const limit = c.usage_limit;
                const pct = limit && Number(used) >= 0 ? Math.min(100, Math.round((Number(used) / limit) * 100)) : null;
                const exp = expiry(c.valid_until);
                const daily = (st?.daily || []).map((d) => d.c);
                return (
                  <tr key={c.code}>
                    <td>
                      <strong className="ap-mono">{c.code}</strong>
                      {c.description && <div className="ap-muted-line">{c.description}</div>}
                    </td>
                    <td>
                      {c.discount_percent ? `${c.discount_percent}%` : ""}
                      {c.discount_percent && c.discount_flat_rupees ? " · " : ""}
                      {c.discount_flat_rupees ? money(c.discount_flat_rupees) : ""}
                      {!c.discount_percent && !c.discount_flat_rupees ? "—" : ""}
                    </td>
                    <td className="ap-num">{c.min_order_amount ? money(c.min_order_amount) : "—"}</td>
                    <td className="ap-num">{c.max_discount_rupees ? money(c.max_discount_rupees) : "—"}</td>
                    <td>
                      {used === undefined ? (
                        <button className="ap-link" onClick={() => checkUsage(c.code)}>
                          count
                        </button>
                      ) : (
                        <div className="ap-coupon-use">
                          <span>
                            <strong>{num(used)}</strong>
                            {limit ? <span className="ap-muted-line"> / {num(limit)}</span> : " · no cap"}
                          </span>
                          {pct != null && (
                            <span className="ap-meter" title={`${pct}% of limit`}>
                              <span
                                style={{
                                  width: `${pct}%`,
                                  background: pct >= 80 ? "var(--ap-danger)" : "var(--ap-primary)",
                                }}
                              />
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ width: 120 }}>
                      {daily.filter((v) => v > 0).length >= 2 ? (
                        <Spark values={daily} />
                      ) : (
                        <span className="ap-td-empty">—</span>
                      )}
                    </td>
                    <td>
                      <Badge tone={exp.tone}>{exp.text}</Badge>
                    </td>
                    <td className="ap-row-actions">
                      {st && (
                        <button className="ap-btn ap-btn-sm ap-btn-ghost" onClick={() => setViewing({ c, st })}>
                          View
                        </button>
                      )}
                      <button className="ap-btn ap-btn-sm ap-btn-ghost" onClick={() => setEditing({ ...c })}>
                        Edit
                      </button>
                      <ConfirmButton
                        className="ap-btn ap-btn-sm ap-btn-danger"
                        confirmLabel="Delete?"
                        onConfirm={async () => {
                          try {
                            await deleteCoupon(c.code);
                            notify("Coupon deleted", "ok");
                            reload();
                            stats.reload();
                          } catch (e) {
                            notify(e.message || "Failed", "danger");
                          }
                        }}
                      >
                        Delete
                      </ConfirmButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Async>

      <p className="ap-note">
        Redemptions are counted live against <code>orders</code> (<code>promo_code = code</code>,{" "}
        <code>status != 'Cancelled'</code>). {statsMissing && "Run supabase/admin_analytics.sql for the trend and per-code stats. "}
        There is no per-vendor targeting on promo codes — a code applies platform-wide.
      </p>

      {viewing && <CouponDetail c={viewing.c} st={viewing.st} onClose={() => setViewing(null)} />}

      {editing && (
        <CouponModal
          coupon={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
            stats.reload();
            notify("Coupon saved", "ok");
          }}
          onError={(m) => notify(m, "danger")}
        />
      )}
    </div>
  );
}

function CouponDetail({ c, st, onClose }) {
  const exp = expiry(c.valid_until);
  const pct = c.usage_limit ? Math.round((st.redemptions / c.usage_limit) * 100) : null;
  return (
    <Modal title={`${c.code} — usage`} onClose={onClose} wide>
      <div className="ap-stat-grid">
        <div className="ap-stat">
          <span className="ap-stat-label">Redemptions</span>
          <span className="ap-stat-value">{num(st.redemptions)}</span>
          {c.usage_limit ? <span className="ap-stat-sub">of {num(c.usage_limit)} limit · {pct}%</span> : <span className="ap-stat-sub">no cap</span>}
        </div>
        <div className="ap-stat">
          <span className="ap-stat-label">Order value driven</span>
          <span className="ap-stat-value">{money(st.gmv)}</span>
        </div>
        <div className="ap-stat">
          <span className="ap-stat-label">Last used</span>
          <span className="ap-stat-value">{st.last_used ? fmtDate(st.last_used) : "—"}</span>
        </div>
        <div className="ap-stat">
          <span className="ap-stat-label">Window</span>
          <span className="ap-stat-value" style={{ fontSize: 14 }}>
            {fmtDate(c.valid_from)} → {c.valid_until ? fmtDate(c.valid_until) : "∞"}
          </span>
          <span className="ap-stat-sub">{exp.text}</span>
        </div>
      </div>

      <div className="ap-panel-head" style={{ marginTop: 16 }}>
        <h2>Redemptions per day · last 30 days</h2>
      </div>
      {(st.daily || []).some((d) => d.c > 0) ? (
        <AreaChart data={st.daily} metric="c" format={num} />
      ) : (
        <div className="ap-async-empty">No redemptions in the last 30 days.</div>
      )}
    </Modal>
  );
}

function CouponModal({ coupon, onClose, onDone, onError }) {
  const isNew = !!coupon._new;
  const [form, setForm] = useState(coupon);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.code.trim()) return onError("Code is required.");
    setBusy(true);
    try {
      const numOrNull = (x) => (x === "" || x == null ? null : Number(x));
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description || null,
        discount_percent: numOrNull(form.discount_percent),
        discount_flat_rupees: numOrNull(form.discount_flat_rupees),
        min_order_amount: numOrNull(form.min_order_amount),
        max_discount_rupees: numOrNull(form.max_discount_rupees),
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        usage_limit: numOrNull(form.usage_limit),
      };
      await saveCoupon(payload, isNew);
      onDone();
    } catch (e) {
      onError(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={isNew ? "New coupon" : `Edit ${coupon.code}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="ap-btn ap-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="ap-btn ap-btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="ap-form-grid">
        <Field label="Code" required hint={isNew ? "Uppercased on save" : "Primary key - can't be changed"}>
          <input
            value={form.code}
            disabled={!isNew}
            onChange={(e) => set("code", e.target.value)}
            className="ap-mono"
          />
        </Field>
        <Field label="Description">
          <input value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Discount %">
          <input
            type="number"
            value={form.discount_percent ?? ""}
            onChange={(e) => set("discount_percent", e.target.value)}
          />
        </Field>
        <Field label="Flat discount (₹)">
          <input
            type="number"
            value={form.discount_flat_rupees ?? ""}
            onChange={(e) => set("discount_flat_rupees", e.target.value)}
          />
        </Field>
        <Field label="Min order (₹)">
          <input
            type="number"
            value={form.min_order_amount ?? ""}
            onChange={(e) => set("min_order_amount", e.target.value)}
          />
        </Field>
        <Field label="Max discount (₹)">
          <input
            type="number"
            value={form.max_discount_rupees ?? ""}
            onChange={(e) => set("max_discount_rupees", e.target.value)}
          />
        </Field>
        <Field label="Valid from">
          <input
            type="date"
            value={form.valid_from ? String(form.valid_from).slice(0, 10) : ""}
            onChange={(e) => set("valid_from", e.target.value)}
          />
        </Field>
        <Field label="Valid until">
          <input
            type="date"
            value={form.valid_until ? String(form.valid_until).slice(0, 10) : ""}
            onChange={(e) => set("valid_until", e.target.value)}
          />
        </Field>
        <Field label="Usage limit" hint="Blank = unlimited">
          <input
            type="number"
            value={form.usage_limit ?? ""}
            onChange={(e) => set("usage_limit", e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
