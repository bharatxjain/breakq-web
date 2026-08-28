import { useState } from "react";
import {
  approveShop,
  enableCommission,
  fetchShops,
  rejectShop,
  restoreShop,
  softDeleteShop,
} from "../api";
import {
  Async,
  Badge,
  ConfirmDialog,
  Field,
  Modal,
  fmtDate,
  fmtDateTime,
  statusTone,
  useAsync,
  useToast,
} from "../ui";

const TABS = ["pending", "approved", "rejected", "all"];

export default function Vendors() {
  const [tab, setTab] = useState("pending");
  const notify = useToast();
  const { state, data, error, reload } = useAsync(() => fetchShops(tab), [tab]);
  const [detail, setDetail] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: 'approve' | 'delete', shop }
  const [busy, setBusy] = useState(false);

  async function run(label, fn) {
    setBusy(true);
    try {
      await fn();
      notify(label, "ok");
      setDetail(null);
      setRejecting(null);
      setConfirm(null);
      reload();
    } catch (e) {
      notify(e.message || "Action failed", "danger");
    } finally {
      setBusy(false);
    }
  }

  const rows = data || [];

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <h1>Vendors</h1>
      </div>

      <div className="ap-tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? "is-active" : ""} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <Async
        state={state}
        error={error}
        onRetry={reload}
        isEmpty={rows.length === 0}
        empty={`No ${tab === "all" ? "" : tab} shops.`}
      >
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Owner</th>
                <th>Phone</th>
                <th>Years</th>
                <th>Registered</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className={s.is_deleted ? "is-deleted" : ""}>
                  <td>
                    <button className="ap-link" onClick={() => setDetail(s)}>
                      {s.name}
                    </button>
                    {s.is_deleted && <Badge tone="danger">deleted</Badge>}
                  </td>
                  <td>{s.owner_name || "—"}</td>
                  <td>{s.phone || "—"}</td>
                  <td>{s.years_in_business ?? "—"}</td>
                  <td>{fmtDate(s.created_at)}</td>
                  <td>
                    <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                  </td>
                  <td className="ap-row-actions">
                    {s.status === "pending" && (
                      <>
                        <button
                          className="ap-btn ap-btn-sm ap-btn-ok"
                          disabled={busy}
                          onClick={() => setConfirm({ kind: "approve", shop: s })}
                        >
                          Verify
                        </button>
                        <button
                          className="ap-btn ap-btn-sm ap-btn-danger"
                          disabled={busy}
                          onClick={() => setRejecting(s)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button className="ap-btn ap-btn-sm ap-btn-ghost" onClick={() => setDetail(s)}>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>

      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)} wide>
          <div className="ap-detail-grid">
            <Detail label="Status" value={<Badge tone={statusTone(detail.status)}>{detail.status}</Badge>} />
            <Detail label="Owner" value={detail.owner_name} />
            <Detail label="Phone" value={detail.phone} />
            <Detail label="Category" value={detail.primary_category} />
            <Detail label="Years in business" value={detail.years_in_business} />
            <Detail label="Registered" value={fmtDateTime(detail.created_at)} />
            <Detail label="Accepting orders" value={String(detail.accepting_orders)} />
            <Detail label="Hours" value={`${detail.open_time || "?"} – ${detail.close_time || "?"}`} />
            <Detail
              label="Commission enabled"
              value={detail.commission_enabled_at ? fmtDateTime(detail.commission_enabled_at) : "Not yet"}
            />
            <Detail label="Locality" value={detail.locality || "—"} />
            <Detail label="Address" value={detail.address} span />
            {detail.rejection_reason && (
              <Detail label="Rejection reason" value={detail.rejection_reason} span />
            )}
          </div>

          <div className="ap-detail-files">
            {detail.image_url && (
              <a href={detail.image_url} target="_blank" rel="noreferrer" className="ap-btn ap-btn-ghost">
                Shop photo ↗
              </a>
            )}
            {detail.business_proof_url && (
              <a
                href={detail.business_proof_url}
                target="_blank"
                rel="noreferrer"
                className="ap-btn ap-btn-ghost"
              >
                Business proof ↗
              </a>
            )}
          </div>

          <div className="ap-detail-actions">
            {detail.status === "pending" && (
              <>
                <button
                  className="ap-btn ap-btn-ok"
                  disabled={busy}
                  onClick={() => setConfirm({ kind: "approve", shop: detail })}
                >
                  Verify
                </button>
                <button
                  className="ap-btn ap-btn-danger"
                  disabled={busy}
                  onClick={() => setRejecting(detail)}
                >
                  Reject…
                </button>
              </>
            )}
            {!detail.commission_enabled_at && (
              <button
                className="ap-btn ap-btn-primary"
                disabled={busy}
                onClick={() => run("Commission enabled", () => enableCommission(detail.id))}
              >
                Enable commission
              </button>
            )}
            {detail.is_deleted ? (
              <button
                className="ap-btn ap-btn-ghost"
                disabled={busy}
                onClick={() => run("Shop restored", () => restoreShop(detail.id))}
              >
                Restore
              </button>
            ) : (
              <button
                className="ap-btn ap-btn-danger"
                disabled={busy}
                onClick={() => setConfirm({ kind: "delete", shop: detail })}
              >
                Delete
              </button>
            )}
          </div>
        </Modal>
      )}

      {rejecting && (
        <RejectModal
          shop={rejecting}
          busy={busy}
          onClose={() => setRejecting(null)}
          onSubmit={(reason) => run("Shop rejected", () => rejectShop(rejecting.id, reason))}
        />
      )}

      {confirm?.kind === "approve" && (
        <ConfirmDialog
          title={`Verify ${confirm.shop.name}?`}
          tone="ok"
          confirmLabel="Verify vendor"
          busy={busy}
          onClose={() => setConfirm(null)}
          onConfirm={() => run("Vendor verified", () => approveShop(confirm.shop.id))}
          message={
            <>
              <strong>{confirm.shop.name}</strong> will go live for customers and the owner
              {confirm.shop.owner_name ? ` (${confirm.shop.owner_name})` : ""} will be emailed that
              their shop is approved. Continue?
            </>
          }
        />
      )}

      {confirm?.kind === "delete" && (
        <ConfirmDialog
          title={`Delete ${confirm.shop.name}?`}
          tone="danger"
          confirmLabel="Delete vendor"
          busy={busy}
          onClose={() => setConfirm(null)}
          onConfirm={() => run("Vendor deleted", () => softDeleteShop(confirm.shop.id))}
          message={
            <>
              This soft-deletes <strong>{confirm.shop.name}</strong> and stops it accepting orders. The
              record is kept (orders and history stay intact) and can be restored later. Continue?
            </>
          }
        />
      )}
    </div>
  );
}

function Detail({ label, value, span }) {
  return (
    <div className={`ap-detail ${span ? "ap-detail-span" : ""}`}>
      <span className="ap-detail-label">{label}</span>
      <span className="ap-detail-value">{value ?? "—"}</span>
    </div>
  );
}

function RejectModal({ shop, onClose, onSubmit, busy }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  return (
    <Modal
      title={`Reject ${shop.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="ap-btn ap-btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="ap-btn ap-btn-danger"
            disabled={busy}
            onClick={() => {
              if (reason.trim().length < 4) {
                setErr("A remark is required — the vendor sees this.");
                return;
              }
              onSubmit(reason.trim());
            }}
          >
            {busy ? "Working…" : "Reject vendor"}
          </button>
        </>
      }
    >
      <p className="ap-confirm-msg">
        <strong>{shop.name}</strong> will be marked rejected and the owner emailed with the reason below.
      </p>
      <Field label="Reason for rejection" required error={err} hint="Shown to the vendor in the app and email.">
        <textarea
          rows={4}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setErr("");
          }}
          placeholder="e.g. Business proof is unreadable — please re-upload a clearer photo."
        />
      </Field>
    </Modal>
  );
}
