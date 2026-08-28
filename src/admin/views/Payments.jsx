import { useState } from "react";
import { fetchPayments, updatePaymentStatus } from "../api";
import { Async, Badge, Modal, fmtDateTime, money, statusTone, useAsync, useToast } from "../ui";

// Only status is ever editable here — signature / payment-id fields are a
// payment-integrity risk and stay read-only.
const STATUSES = ["created", "authorized", "captured", "paid", "failed", "refunded"];

export default function Payments() {
  const notify = useToast();
  const { state, data, error, reload } = useAsync(fetchPayments, []);
  const [editing, setEditing] = useState(null);
  const rows = data || [];

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Payments</h1>
          <p className="ap-view-sub">Razorpay audit trail · read-only ledger</p>
        </div>
        <button className="ap-btn ap-btn-ghost" onClick={reload}>
          Refresh
        </button>
      </div>

      <Async
        state={state}
        error={error}
        onRetry={reload}
        isEmpty={rows.length === 0}
        empty="No payment records."
      >
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Razorpay order</th>
                <th>Razorpay payment</th>
                <th className="ap-num">Amount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{fmtDateTime(p.created_at)}</td>
                  <td className="ap-mono">{p.razorpay_order_id || "—"}</td>
                  <td className="ap-mono">{p.razorpay_payment_id || "—"}</td>
                  <td className="ap-num">{money(p.amount_rupees ?? p.amount)}</td>
                  <td>
                    <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                  </td>
                  <td>
                    <button
                      className="ap-btn ap-btn-sm ap-btn-ghost"
                      onClick={() => setEditing(p)}
                    >
                      Adjust status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>

      {editing && (
        <AdjustModal
          row={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
            notify("Payment status updated", "ok");
          }}
          onError={(m) => notify(m, "danger")}
        />
      )}
    </div>
  );
}

function AdjustModal({ row, onClose, onDone, onError }) {
  const [status, setStatus] = useState(row.status || "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await updatePaymentStatus(row.id, status);
      onDone();
    } catch (e) {
      onError(e.message || "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Adjust payment status"
      onClose={onClose}
      footer={
        <>
          <button className="ap-btn ap-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="ap-btn ap-btn-primary" onClick={submit} disabled={busy || status === row.status}>
            {busy ? "Saving…" : "Save status"}
          </button>
        </>
      }
    >
      <p className="ap-note">
        Reconciliation only — e.g. marking a stuck <code>created</code> as <code>failed</code> after manual
        verification. Signature and payment-id fields cannot be changed here.
      </p>
      <div className="ap-detail-grid">
        <div className="ap-detail ap-detail-span">
          <span className="ap-detail-label">Razorpay signature</span>
          <span className="ap-detail-value ap-mono">{row.razorpay_signature || "—"}</span>
        </div>
      </div>
      <label className="ap-field">
        <span className="ap-field-label">Status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {[...new Set([row.status, ...STATUSES].filter(Boolean))].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </Modal>
  );
}
