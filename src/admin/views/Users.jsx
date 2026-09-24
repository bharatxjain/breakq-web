import { useEffect, useMemo, useState } from "react";
import {
  fetchUserRoleCounts,
  fetchUserSummary,
  fetchUsers,
  getMyId,
  setUserBlocked,
} from "../api";
import {
  Async,
  Badge,
  ConfirmDialog,
  Modal,
  fmtDate,
  fmtDateTime,
  money,
  num,
  statusTone,
  useAsync,
  useToast,
} from "../ui";
import { ModerationHistory, ReasonDialog } from "../moderation";

const PAGE_SIZE = 50;
const BASE_ROLES = ["customer", "vendor", "admin"];

// Keys we render first (in this order) in the details modal; anything else on
// the row is shown afterwards. Purely presentational — read-only.
const PRIMARY_KEYS = [
  "email",
  "role",
  "full_name",
  "name",
  "display_name",
  "phone",
  "created_at",
  "updated_at",
];
const DATE_KEYS = new Set([
  "created_at",
  "updated_at",
  "last_sign_in_at",
  "confirmed_at",
  "blocked_at",
]);
// Shown in the "Account status" block instead of the raw field list.
const STATUS_KEYS = new Set(["is_blocked", "blocked_reason", "blocked_at"]);

function label(k) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default function Users({ onNavigate }) {
  const notify = useToast();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [role, setRole] = useState(""); // "" = all
  const [status, setStatus] = useState(""); // "" | active | blocked
  const [myId, setMyId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [blocking, setBlocking] = useState(null); // user to block
  const [unblocking, setUnblocking] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMyId().then(setMyId);
  }, []);

  const roleCounts = useAsync(fetchUserRoleCounts, []);
  const counts =
    roleCounts.data && !roleCounts.data._missing ? roleCounts.data : null;

  const { state, data, error, reload } = useAsync(
    () => fetchUsers({ page, pageSize: PAGE_SIZE, search, role, status }),
    [page, search, role, status],
  );

  async function changeBlock(user, blocked, reason) {
    setBusy(true);
    try {
      const res = await setUserBlocked(user.id, blocked, reason);
      notify(
        blocked
          ? res?.auth_enforced === false
            ? "User flagged as blocked, but the sign-in ban couldn't be applied"
            : "User blocked and signed out"
          : "User unblocked",
        "ok",
      );
      setBlocking(null);
      setUnblocking(null);
      setDetail(null);
      reload();
    } catch (e) {
      notify(e.message || "Action failed", "danger");
    } finally {
      setBusy(false);
    }
  }

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  const grandTotal = counts
    ? Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0)
    : total;
  const roleList = useMemo(() => {
    const extra = counts
      ? Object.keys(counts).filter((k) => !BASE_ROLES.includes(k))
      : [];
    return [...BASE_ROLES, ...extra.sort()];
  }, [counts]);

  function applySearch(e) {
    e.preventDefault();
    setPage(0);
    setSearch(term);
  }
  const pickRole = (r) => {
    setRole(r);
    setPage(0);
  };

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Users</h1>
          <p className="ap-view-sub">
            Every account · {num(grandTotal)} total
            {counts && (
              <>
                {" "}
                · {num(counts.customer || 0)} customers ·{" "}
                {num(counts.vendor || 0)} vendors · {num(counts.admin || 0)}{" "}
                admins
              </>
            )}
          </p>
        </div>
      </div>

      <section className="ap-stat-grid" aria-label="User account metrics">
        <div className="ap-stat">
          <span className="ap-stat-label">Total users</span>
          <span className="ap-stat-value">
            {num(counts ? grandTotal : "—")}
          </span>
        </div>
        <div className="ap-stat">
          <span className="ap-stat-label">Total customers</span>
          <span className="ap-stat-value">
            {num(counts ? counts.customer || 0 : "—")}
          </span>
        </div>
        <div className="ap-stat">
          <span className="ap-stat-label">Total vendors</span>
          <span className="ap-stat-value">
            {num(counts ? counts.vendor || 0 : "—")}
          </span>
        </div>
        <div className="ap-stat">
          <span className="ap-stat-label">Total admins</span>
          <span className="ap-stat-value">
            {num(counts ? counts.admin || 0 : "—")}
          </span>
        </div>
      </section>

      <div className="ap-tabs">
        <button
          className={role === "" ? "is-active" : ""}
          onClick={() => pickRole("")}
        >
          All
        </button>
        {roleList.map((r) => (
          <button
            key={r}
            className={role === r ? "is-active" : ""}
            onClick={() => pickRole(r)}
          >
            {cap(r)}
          </button>
        ))}
      </div>

      <form className="ap-bar" onSubmit={applySearch}>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by email or name…"
          style={{ maxWidth: 280 }}
        />
        <button className="ap-btn ap-btn-ghost" type="submit">
          Search
        </button>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          aria-label="Filter by account status"
        >
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
        {search && (
          <button
            type="button"
            className="ap-btn ap-btn-ghost"
            onClick={() => {
              setTerm("");
              setSearch("");
              setPage(0);
            }}
          >
            Clear
          </button>
        )}
      </form>

      <Async
        state={state}
        error={error}
        onRetry={reload}
        isEmpty={rows.length === 0}
        empty={
          search
            ? "No users match that search."
            : role
              ? `No ${cap(role)} accounts.`
              : "No users yet."
        }
      >
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <button className="ap-link" onClick={() => setDetail(u)}>
                      {u.full_name || u.name || u.display_name || "—"}
                    </button>
                    {u.id === myId && <Badge tone="neutral">you</Badge>}
                  </td>
                  <td>{u.email || "—"}</td>
                  <td>
                    <Badge tone={u.role === "admin" ? "ok" : "neutral"}>
                      {u.role || "unknown"}
                    </Badge>
                  </td>
                  <td>
                    {u.phone ||
                      u.mobile ||
                      u.phone_number ||
                      u.user_metadata?.mobile ||
                      "—"}
                  </td>
                  <td>
                    <AccountBadge user={u} />
                  </td>
                  <td>{fmtDate(u.created_at)}</td>
                  <td className="ap-row-actions">
                    {u.id !== myId &&
                      u.role !== "admin" &&
                      (u.is_blocked ? (
                        <button
                          className="ap-btn ap-btn-sm ap-btn-ok"
                          disabled={busy}
                          onClick={() => setUnblocking(u)}
                        >
                          Unblock
                        </button>
                      ) : (
                        <button
                          className="ap-btn ap-btn-sm ap-btn-danger"
                          disabled={busy}
                          onClick={() => setBlocking(u)}
                        >
                          Block
                        </button>
                      ))}
                    <button
                      className="ap-btn ap-btn-sm ap-btn-ghost"
                      onClick={() => setDetail(u)}
                    >
                      View
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
              className="ap-btn ap-btn-ghost ap-btn-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← Prev
            </button>
            <span className="ap-pager-page">
              Page {page + 1} / {pages}
            </span>
            <button
              className="ap-btn ap-btn-ghost ap-btn-sm"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      </Async>

      {detail && (
        <UserDetail
          user={detail}
          isMe={detail.id === myId}
          busy={busy}
          onClose={() => setDetail(null)}
          onBlock={() => setBlocking(detail)}
          onUnblock={() => setUnblocking(detail)}
          onNavigate={onNavigate}
        />
      )}

      {blocking && (
        <ReasonDialog
          title={`Block ${blocking.email || blocking.full_name || "user"}?`}
          confirmLabel="Block user"
          busy={busy}
          placeholder="e.g. Repeated fake orders"
          message={
            <>
              They&rsquo;re signed out, can&rsquo;t sign in again, and show as{" "}
              <strong>blocked</strong> here until unblocked.
              {blocking.role === "vendor" &&
                " Their shop stays as it is — suspend it from Vendors if needed."}
            </>
          }
          onClose={() => setBlocking(null)}
          onSubmit={(reason) => changeBlock(blocking, true, reason)}
        />
      )}

      {unblocking && (
        <ConfirmDialog
          title={`Unblock ${unblocking.email || unblocking.full_name || "user"}?`}
          tone="ok"
          confirmLabel="Unblock"
          busy={busy}
          onClose={() => setUnblocking(null)}
          onConfirm={() => changeBlock(unblocking, false)}
          message="They'll be able to sign in and use BreakQ again."
        />
      )}
    </div>
  );
}

function AccountBadge({ user }) {
  return user.is_blocked ? (
    <Badge tone="danger">blocked</Badge>
  ) : (
    <Badge tone="ok">active</Badge>
  );
}

function UserDetail({
  user,
  isMe,
  busy,
  onClose,
  onBlock,
  onUnblock,
  onNavigate,
}) {
  const keys = [
    ...PRIMARY_KEYS.filter((k) => k in user),
    ...Object.keys(user).filter(
      (k) =>
        !PRIMARY_KEYS.includes(k) && !k.startsWith("_") && !STATUS_KEYS.has(k),
    ),
  ];
  const summary = useAsync(() => fetchUserSummary(user.id), [user.id]);
  const S = summary.data && !summary.data._missing ? summary.data : null;
  const canBlock = !isMe && user.role !== "admin";

  return (
    <Modal
      title={user.email || user.full_name || "User"}
      onClose={onClose}
      wide
    >
      <div className="ap-panel-head">
        <h2>Account status</h2>
      </div>
      <div className="ap-detail-grid">
        <div className="ap-detail">
          <span className="ap-detail-label">Status</span>
          <span className="ap-detail-value">
            <AccountBadge user={user} />
          </span>
        </div>
        <div className="ap-detail">
          <span className="ap-detail-label">Last sign-in</span>
          <span className="ap-detail-value">
            {S?.last_sign_in_at ? fmtDateTime(S.last_sign_in_at) : "—"}
          </span>
        </div>
        {user.is_blocked && (
          <>
            <div className="ap-detail">
              <span className="ap-detail-label">Blocked since</span>
              <span className="ap-detail-value">
                {fmtDateTime(user.blocked_at)}
              </span>
            </div>
            <div className="ap-detail ap-detail-span">
              <span className="ap-detail-label">Block reason</span>
              <span className="ap-detail-value">
                {user.blocked_reason || "—"}
              </span>
            </div>
          </>
        )}
      </div>

      {S && (
        <>
          <div className="ap-panel-head" style={{ marginTop: 16 }}>
            <h2>Activity</h2>
          </div>
          <div className="ap-metric-grid">
            <div className="ap-metric">
              <span className="ap-metric-label">Orders</span>
              <span className="ap-metric-value">{num(S.orders?.total)}</span>
              {S.orders?.cancelled ? (
                <span className="ap-metric-label">
                  {num(S.orders.cancelled)} cancelled
                </span>
              ) : null}
            </div>
            <div className="ap-metric">
              <span className="ap-metric-label">Spend</span>
              <span className="ap-metric-value">{money(S.orders?.spend)}</span>
            </div>
            <div className="ap-metric">
              <span className="ap-metric-label">Last order</span>
              <span className="ap-metric-value">
                {S.orders?.last_at ? fmtDate(S.orders.last_at) : "—"}
              </span>
            </div>
            <div className="ap-metric">
              <span className="ap-metric-label">Reviews</span>
              <span className="ap-metric-value">{num(S.reviews?.count)}</span>
              {S.reviews?.avg ? (
                <span className="ap-metric-label">avg {S.reviews.avg} ★</span>
              ) : null}
            </div>
          </div>
          {(S.shops || []).length > 0 && (
            <p className="ap-field-hint">
              Owns:{" "}
              {S.shops.map((s, i) => (
                <span key={s.id}>
                  {i > 0 && ", "}
                  {s.name} <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                </span>
              ))}
            </p>
          )}
          <div className="ap-detail-actions" style={{ margin: "8px 0 16px" }}>
            {S.orders?.total > 0 && onNavigate && (
              <button
                className="ap-btn ap-btn-sm ap-btn-ghost"
                onClick={() =>
                  onNavigate("orders", {
                    customerId: user.id,
                    customerName: user.email || user.full_name || "",
                  })
                }
              >
                View orders →
              </button>
            )}
            {(S.shops || []).length > 0 && onNavigate && (
              <button
                className="ap-btn ap-btn-sm ap-btn-ghost"
                onClick={() => onNavigate("vendors", { search: S.shops[0].name })}
              >
                View shop →
              </button>
            )}
          </div>
        </>
      )}

      <div className="ap-panel-head">
        <h2>Profile</h2>
      </div>
      <div className="ap-detail-grid">
        {keys.map((k) => {
          const v = user[k];
          let display;
          if (v === null || v === undefined || v === "") display = "—";
          else if (DATE_KEYS.has(k)) display = fmtDateTime(v);
          else if (typeof v === "boolean") display = v ? "yes" : "no";
          else if (typeof v === "object") display = JSON.stringify(v);
          else display = String(v);
          return (
            <div
              key={k}
              className={
                k === "id" || typeof user[k] === "object"
                  ? "ap-detail ap-detail-span"
                  : "ap-detail"
              }
            >
              <span className="ap-detail-label">{label(k)}</span>
              <span className="ap-detail-value">{display}</span>
            </div>
          );
        })}
      </div>
      {isMe && <p className="ap-note">This is your own account.</p>}

      <div className="ap-panel-head" style={{ marginTop: 16 }}>
        <h2>Admin actions</h2>
      </div>
      <ModerationHistory entityType="user" entityId={user.id} limit={20} />

      {canBlock && (
        <div className="ap-detail-actions" style={{ marginTop: 16 }}>
          {user.is_blocked ? (
            <button className="ap-btn ap-btn-ok" disabled={busy} onClick={onUnblock}>
              Unblock user
            </button>
          ) : (
            <button className="ap-btn ap-btn-danger" disabled={busy} onClick={onBlock}>
              Block user…
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
