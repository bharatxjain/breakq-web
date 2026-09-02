import { useEffect, useMemo, useState } from "react";
import {
  approveShop,
  enableCommission,
  fetchShopMetrics,
  fetchShopsPaged,
  fetchTiers,
  rejectShop,
  restoreShop,
  softDeleteShop,
} from "../api";
import {
  AreaChart,
  Async,
  Badge,
  ConfirmDialog,
  DualAxisChart,
  Field,
  Modal,
  NeedsSetup,
  fmtDate,
  fmtDateTime,
  num,
  statusTone,
  useAsync,
  useToast,
} from "../ui";

const PAGE_SIZE = 25;
const BLANK_FILTERS = {
  search: "",
  locality: "",
  tierId: "",
  status: "",
  state: "any", // any | active | deleted
  localitySource: "any", // any | geocoded | manual | none
  ratingMin: "",
  ratingMax: "",
};

export default function Vendors() {
  const notify = useToast();
  const [filters, setFilters] = useState(BLANK_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: 'approve' | 'delete', shop }
  const [busy, setBusy] = useState(false);

  const tiers = useAsync(fetchTiers, []);

  // debounce the free-text search into the committed filter set
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) =>
        f.search === searchInput ? f : { ...f, search: searchInput },
      );
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const key = useMemo(
    () => JSON.stringify({ ...filters, page }),
    [filters, page],
  );
  const { state, data, error, reload } = useAsync(
    () => fetchShopsPaged({ page, pageSize: PAGE_SIZE, ...filters }),
    [key],
  );

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  const set = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };
  const resetFilters = () => {
    setFilters(BLANK_FILTERS);
    setSearchInput("");
    setPage(0);
  };
  const dirty = JSON.stringify(filters) !== JSON.stringify(BLANK_FILTERS);

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

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Vendors</h1>
          <p className="ap-view-sub">
            {num(total)} shops · searchable directory
          </p>
        </div>
        <button className="ap-btn ap-btn-ghost" onClick={reload}>
          Refresh
        </button>
      </div>

      <div className="ap-filters">
        <input
          className="ap-filters-search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search name, owner, phone, id"
          aria-label="Search vendors"
        />
        <input
          value={filters.locality}
          onChange={(e) => set({ locality: e.target.value })}
          placeholder="Locality"
          aria-label="Filter by locality"
        />
        <select
          value={filters.tierId}
          onChange={(e) => set({ tierId: e.target.value })}
          aria-label="Filter by tier"
        >
          <option value="">Any tier</option>
          {(tiers.data || []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.display_name || t.tagline || t.id}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => set({ status: e.target.value })}
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={filters.state}
          onChange={(e) => set({ state: e.target.value })}
          aria-label="Filter by state"
        >
          <option value="any">Active + deleted</option>
          <option value="active">Active only</option>
          <option value="deleted">Deleted only</option>
        </select>
        <select
          value={filters.localitySource}
          onChange={(e) => set({ localitySource: e.target.value })}
          aria-label="Filter by locality source"
        >
          <option value="any">Any location source</option>
          <option value="geocoded">Geocoded</option>
          <option value="manual">Manual</option>
          <option value="none">Never geocoded</option>
        </select>
        <select
          value={filters.ratingMin}
          onChange={(e) => set({ ratingMin: e.target.value })}
          aria-label="Minimum rating"
        >
          <option value="">Min ★</option>
          {[1, 2, 3, 4, 4.5].map((r) => (
            <option key={r} value={r}>
              ≥ {r}
            </option>
          ))}
        </select>
        <select
          value={filters.ratingMax}
          onChange={(e) => set({ ratingMax: e.target.value })}
          aria-label="Maximum rating"
        >
          <option value="">Max ★</option>
          {[2, 3, 4, 4.5, 5].map((r) => (
            <option key={r} value={r}>
              ≤ {r}
            </option>
          ))}
        </select>
        {dirty && (
          <button className="ap-filters-reset" onClick={resetFilters}>
            Clear filters
          </button>
        )}
      </div>

      <Async
        state={state}
        error={error}
        onRetry={reload}
        isEmpty={rows.length === 0}
        empty="No shops match these filters."
      >
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Locality</th>
                <th>Tier</th>
                <th className="ap-num">Rating</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Last active</th>
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
                    {s.owner_name && (
                      <div className="ap-muted-line">{s.owner_name}</div>
                    )}
                  </td>
                  <td>
                    {s.locality || "—"}
                    {s.locality_source && (
                      <div className="ap-muted-line">{s.locality_source}</div>
                    )}
                  </td>
                  <td>{s._tier?.display_name || "Free"}</td>
                  <td className="ap-num">
                    {s.avg_rating ? Number(s.avg_rating).toFixed(1) : "—"}
                    {s.rating_count ? (
                      <div className="ap-muted-line">
                        {num(s.rating_count)} rated
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                  </td>
                  <td>{fmtDate(s.created_at)}</td>
                  <td>{s._last_active ? fmtDate(s._last_active) : "—"}</td>
                  <td className="ap-row-actions">
                    {s.status === "pending" && !s.is_deleted && (
                      <>
                        <button
                          className="ap-btn ap-btn-sm ap-btn-ok"
                          disabled={busy}
                          onClick={() =>
                            setConfirm({ kind: "approve", shop: s })
                          }
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
                    <button
                      className="ap-btn ap-btn-sm ap-btn-ghost"
                      onClick={() => setDetail(s)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ap-pager">
          <span>
            {from}–{to} of {num(total)}
          </span>
          <div className="ap-pager-btns">
            <button
              className="ap-btn ap-btn-sm ap-btn-ghost"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            <span className="ap-pager-page">
              Page {page + 1} / {pages}
            </span>
            <button
              className="ap-btn ap-btn-sm ap-btn-ghost"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      </Async>

      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)} wide>
          <div className="ap-detail-grid">
            <Detail
              label="Status"
              value={
                <Badge tone={statusTone(detail.status)}>{detail.status}</Badge>
              }
            />
            <Detail label="Owner" value={detail.owner_name} />
            <Detail label="Phone" value={detail.phone} />
            <Detail label="Category" value={detail.primary_category} />
            <Detail
              label="Years in business"
              value={detail.years_in_business}
            />
            <Detail label="Registered" value={fmtDateTime(detail.created_at)} />
            <Detail
              label="Accepting orders"
              value={String(detail.accepting_orders)}
            />
            <Detail
              label="Hours"
              value={`${detail.open_time || "?"} – ${detail.close_time || "?"}`}
            />
            <Detail
              label="Commission enabled"
              value={
                detail.commission_enabled_at
                  ? fmtDateTime(detail.commission_enabled_at)
                  : "Not yet"
              }
            />
            <Detail
              label="Locality"
              value={
                detail.locality
                  ? `${detail.locality}${detail.locality_source ? ` (${detail.locality_source})` : ""}`
                  : "—"
              }
            />
            <Detail label="Tier" value={detail._tier?.display_name || "Free"} />
            <Detail label="Address" value={detail.address} span />
            {detail.rejection_reason && (
              <Detail
                label="Rejection reason"
                value={detail.rejection_reason}
                span
              />
            )}
          </div>

          <ShopMetrics shop={detail} />

          <div className="ap-detail-files">
            {detail.image_url && (
              <a
                href={detail.image_url}
                target="_blank"
                rel="noreferrer"
                className="ap-btn ap-btn-ghost"
              >
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
            {detail.status === "pending" && !detail.is_deleted && (
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
                onClick={() =>
                  run("Commission enabled", () => enableCommission(detail.id))
                }
              >
                Enable commission
              </button>
            )}
            {detail.is_deleted ? (
              <button
                className="ap-btn ap-btn-ghost"
                disabled={busy}
                onClick={() =>
                  run("Shop restored", () => restoreShop(detail.id))
                }
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
          {/* "Impersonate view" and "force re-geocode" intentionally omitted:
              there is no customer-facing shop UI or geocode endpoint in this repo. */}
        </Modal>
      )}

      {rejecting && (
        <RejectModal
          shop={rejecting}
          busy={busy}
          onClose={() => setRejecting(null)}
          onSubmit={(reason) =>
            run("Shop rejected", () => rejectShop(rejecting.id, reason))
          }
        />
      )}

      {confirm?.kind === "approve" && (
        <ConfirmDialog
          title={`Verify ${confirm.shop.name}?`}
          tone="ok"
          confirmLabel="Verify vendor"
          busy={busy}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            run("Vendor verified", () => approveShop(confirm.shop.id))
          }
          message={
            <>
              <strong>{confirm.shop.name}</strong> will go live for customers
              and the owner
              {confirm.shop.owner_name
                ? ` (${confirm.shop.owner_name})`
                : ""}{" "}
              will be emailed that their shop is approved. Continue?
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
          onConfirm={() =>
            run("Vendor deleted", () => softDeleteShop(confirm.shop.id))
          }
          message={
            <>
              This soft-deletes <strong>{confirm.shop.name}</strong> and stops
              it accepting orders. The record is kept (orders and history stay
              intact) and can be restored later. The owner
              {confirm.shop.owner_name
                ? ` (${confirm.shop.owner_name})`
                : ""}{" "}
              will be emailed that their shop was removed. Continue?
            </>
          }
        />
      )}
    </div>
  );
}

function daysSince(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function ShopMetrics({ shop }) {
  const { state, data, error, reload } = useAsync(
    () => fetchShopMetrics(shop.id),
    [shop.id],
  );
  const missing = data?._missing;
  const M = data && !missing ? data : null;

  if (missing) return <NeedsSetup what="Per-shop metrics" />;

  const stale = daysSince(M?.catalog_last_added);
  const staleTone =
    stale == null
      ? "neutral"
      : stale > 90
        ? "danger"
        : stale > 30
          ? "warn"
          : "ok";
  const activity = M?.activity || [];
  const ratingTrend = M?.rating_trend || [];

  return (
    <Async state={state} error={error} onRetry={reload}>
      <div className="ap-metric-grid">
        <div className="ap-metric">
          <span className="ap-metric-label">Catalog size</span>
          <span className="ap-metric-value">
            {M?.catalog_size != null ? num(M.catalog_size) : "—"}
          </span>
        </div>
        <div className="ap-metric">
          <span className="ap-metric-label">Newest catalog item</span>
          <span className="ap-metric-value">
            {stale == null ? "—" : `${stale}d ago`}
          </span>
          {stale != null && (
            <Badge tone={staleTone}>
              {stale > 90
                ? "stale — check if dead"
                : stale > 30
                  ? "ageing"
                  : "fresh"}
            </Badge>
          )}
        </div>
        <div className="ap-metric">
          <span className="ap-metric-label">Last active</span>
          <span className="ap-metric-value">
            {M?.last_active ? fmtDate(M.last_active) : "—"}
          </span>
        </div>
        <div className="ap-metric">
          <span className="ap-metric-label">Rating (rollup)</span>
          <span className="ap-metric-value">
            {M?.rating_now?.avg ? Number(M.rating_now.avg).toFixed(1) : "—"}
          </span>
          {M?.rating_now?.count ? (
            <span className="ap-metric-label">
              {num(M.rating_now.count)} ratings
            </span>
          ) : null}
        </div>
      </div>

      <div className="ap-detail-charts">
        <div>
          <div className="ap-panel-head">
            <h2>Views &amp; searches · 30 days</h2>
          </div>
          {activity.some((a) => a.views || a.searches) ? (
            <DualAxisChart
              data={activity}
              left={{ key: "views", label: "Views", format: num }}
              right={{ key: "searches", label: "Searches", format: num }}
            />
          ) : (
            <div className="ap-async-empty">No events in the last 30 days.</div>
          )}
        </div>
        <div>
          <div className="ap-panel-head">
            <h2>Rating trend · 180 days</h2>
          </div>
          {ratingTrend.length >= 2 ? (
            <>
              <AreaChart
                data={ratingTrend}
                metric="value"
                format={(v) => Number(v).toFixed(2)}
              />
              <p className="ap-field-hint">
                From review rows directly — safe even while the rollup count is
                inflated.
              </p>
            </>
          ) : (
            <div className="ap-async-empty">Not enough ratings yet.</div>
          )}
        </div>
      </div>
    </Async>
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
          <button
            className="ap-btn ap-btn-ghost"
            onClick={onClose}
            disabled={busy}
          >
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
        <strong>{shop.name}</strong> will be marked rejected and the owner
        emailed with the reason below.
      </p>
      <Field
        label="Reason for rejection"
        required
        error={err}
        hint="Shown to the vendor in the app and email."
      >
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
