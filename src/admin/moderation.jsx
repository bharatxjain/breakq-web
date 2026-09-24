// Shared bits for the moderation / operations views: a reason prompt for any
// admin action, the audit trail for one entity, and a simple pager.

import { useEffect, useState } from "react";
import { fetchModerationLog } from "./api";
import { Async, Badge, Field, Modal, fmtDateTime, num, useAsync } from "./ui";

// Prompt for a reason (and optionally an amount) before running an action.
export function ReasonDialog({
  title,
  message,
  confirmLabel,
  tone = "danger",
  required = true,
  placeholder = "",
  hint = "Stored in the moderation history.",
  amount, // { label, max, initial } - shows a number field when set
  busy,
  onSubmit,
  onClose,
}) {
  const [reason, setReason] = useState("");
  const [amt, setAmt] = useState(amount?.initial ?? "");
  const [err, setErr] = useState("");

  function submit() {
    if (required && reason.trim().length < 3) {
      setErr("Please give a reason (at least 3 characters).");
      return;
    }
    if (amount) {
      const v = Number(amt);
      if (!Number.isFinite(v) || v <= 0 || (amount.max != null && v > amount.max)) {
        setErr(`Enter an amount between 1 and ${num(amount.max)}.`);
        return;
      }
    }
    onSubmit(reason.trim(), amount ? Number(amt) : undefined);
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="ap-btn ap-btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={`ap-btn ap-btn-${tone}`} onClick={submit} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      {message && <div className="ap-confirm-msg">{message}</div>}
      {amount && (
        <Field label={amount.label} required>
          <input
            type="number"
            min="1"
            max={amount.max ?? undefined}
            value={amt}
            onChange={(e) => {
              setAmt(e.target.value);
              setErr("");
            }}
          />
        </Field>
      )}
      <Field label="Reason" required={required} error={err} hint={hint}>
        <textarea
          rows={3}
          autoFocus
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setErr("");
          }}
          placeholder={placeholder}
        />
      </Field>
    </Modal>
  );
}

const ACTION_TONE = {
  block: "danger",
  suspend: "danger",
  cancel: "danger",
  refund: "warn",
  restrict: "danger",
  deactivate: "warn",
  hide: "warn",
  report: "warn",
  remove: "danger",
};

export function actionLabel(a) {
  return String(a || "").replace(/_/g, " ");
}

// Audit trail for one entity (or every entity of a type when entityId is
// omitted). `refreshKey` lets the parent force a reload after an action.
export function ModerationHistory({ entityType, entityId, refreshKey = 0, limit = 50, showEntity = false }) {
  const { state, data, error, reload } = useAsync(
    () => fetchModerationLog({ entityType, entityId, limit }),
    [entityType, entityId, refreshKey, limit],
  );
  if (data?._missing)
    return (
      <p className="ap-async-empty">
        Moderation history needs setup. Run <code>supabase/admin_operations.sql</code>.
      </p>
    );
  const rows = data?.rows || [];
  return (
    <Async
      state={state}
      error={error}
      onRetry={reload}
      isEmpty={rows.length === 0}
      empty="No admin actions recorded yet."
    >
      <div className="ap-table-wrap">
        <table className="ap-table">
          <thead>
            <tr>
              <th>When</th>
              {showEntity && <th>Item</th>}
              <th>Action</th>
              <th>Reason</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{fmtDateTime(r.created_at)}</td>
                {showEntity && <td>{describeEntity(r)}</td>}
                <td>
                  <Badge tone={ACTION_TONE[r.action] || "neutral"}>{actionLabel(r.action)}</Badge>
                </td>
                <td>{r.reason || <span className="ap-td-empty">-</span>}</td>
                <td>{r._admin?.email || r._admin?.full_name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Async>
  );
}

// Best-effort human label for a log row, from the snapshot taken at the time.
function describeEntity(r) {
  const s = r.snapshot || {};
  if (r.entity_type === "review") {
    const stars = s.rating ? `${s.rating}★ ` : "";
    const text = s.review ? `“${String(s.review).slice(0, 60)}${String(s.review).length > 60 ? "…" : ""}”` : "(no text)";
    return (
      <>
        {stars}
        {text}
      </>
    );
  }
  if (r.entity_type === "brand") return `${s.from} → ${s.to} (${num(s.products)} products)`;
  return s.name || s.email || s.full_name || r.entity_id;
}

export function Pager({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="ap-pager">
      <span>
        {from}-{to} of {num(total)}
      </span>
      <div className="ap-pager-btns">
        <button
          className="ap-btn ap-btn-sm ap-btn-ghost"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
        >
          ← Prev
        </button>
        <span className="ap-pager-page">
          Page {page + 1} / {pages}
        </span>
        <button
          className="ap-btn ap-btn-sm ap-btn-ghost"
          disabled={page + 1 >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// Debounced text input → committed value (same 350ms feel as Vendors).
export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
