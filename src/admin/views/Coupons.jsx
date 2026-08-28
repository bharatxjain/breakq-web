import { useState } from "react";
import { couponUsage, deleteCoupon, fetchCoupons, saveCoupon } from "../api";
import { Async, ConfirmButton, Field, Modal, fmtDate, money, useAsync, useToast } from "../ui";

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

export default function Coupons() {
  const notify = useToast();
  const { state, data, error, reload } = useAsync(fetchCoupons, []);
  const [editing, setEditing] = useState(null);
  const [usage, setUsage] = useState({});
  const rows = data || [];

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
          <p className="ap-view-sub">
            <code>promo_codes</code> · <code>code</code> is the primary key
          </p>
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
                <th>Valid</th>
                <th className="ap-num">Limit</th>
                <th className="ap-num">Used</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
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
                    {fmtDate(c.valid_from)} → {fmtDate(c.valid_until)}
                  </td>
                  <td className="ap-num">{c.usage_limit ?? "∞"}</td>
                  <td className="ap-num">
                    {usage[c.code] === undefined ? (
                      <button className="ap-link" onClick={() => checkUsage(c.code)}>
                        count
                      </button>
                    ) : (
                      String(usage[c.code])
                    )}
                  </td>
                  <td className="ap-row-actions">
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
                        } catch (e) {
                          notify(e.message || "Failed", "danger");
                        }
                      }}
                    >
                      Delete
                    </ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>

      <p className="ap-note">
        Usage is counted live against <code>orders</code> (<code>promo_code = code</code> and{" "}
        <code>status != 'Cancelled'</code>) — there is no <code>used_count</code> column yet.
      </p>

      {editing && (
        <CouponModal
          coupon={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
            notify("Coupon saved", "ok");
          }}
          onError={(m) => notify(m, "danger")}
        />
      )}
    </div>
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
        <Field label="Code" required hint={isNew ? "Uppercased on save" : "Primary key — can't be changed"}>
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
          <input type="number" value={form.discount_percent ?? ""} onChange={(e) => set("discount_percent", e.target.value)} />
        </Field>
        <Field label="Flat discount (₹)">
          <input
            type="number"
            value={form.discount_flat_rupees ?? ""}
            onChange={(e) => set("discount_flat_rupees", e.target.value)}
          />
        </Field>
        <Field label="Min order (₹)">
          <input type="number" value={form.min_order_amount ?? ""} onChange={(e) => set("min_order_amount", e.target.value)} />
        </Field>
        <Field label="Max discount (₹)">
          <input
            type="number"
            value={form.max_discount_rupees ?? ""}
            onChange={(e) => set("max_discount_rupees", e.target.value)}
          />
        </Field>
        <Field label="Valid from">
          <input type="date" value={form.valid_from ? String(form.valid_from).slice(0, 10) : ""} onChange={(e) => set("valid_from", e.target.value)} />
        </Field>
        <Field label="Valid until">
          <input type="date" value={form.valid_until ? String(form.valid_until).slice(0, 10) : ""} onChange={(e) => set("valid_until", e.target.value)} />
        </Field>
        <Field label="Usage limit" hint="Blank = unlimited">
          <input type="number" value={form.usage_limit ?? ""} onChange={(e) => set("usage_limit", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
