import { useEffect, useMemo, useState } from "react";
import { fetchUserRoleCounts, fetchUsers, getMyId } from "../api";
import { Async, Badge, Modal, fmtDate, fmtDateTime, num, useAsync } from "../ui";

const PAGE_SIZE = 50;
const BASE_ROLES = ["customer", "vendor", "admin"];

// Keys we render first (in this order) in the details modal; anything else on
// the row is shown afterwards. Purely presentational — read-only.
const PRIMARY_KEYS = ["email", "role", "full_name", "name", "display_name", "phone", "created_at", "updated_at"];
const DATE_KEYS = new Set(["created_at", "updated_at", "last_sign_in_at", "confirmed_at"]);

function label(k) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default function Users() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [role, setRole] = useState(""); // "" = all
  const [myId, setMyId] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    getMyId().then(setMyId);
  }, []);

  const roleCounts = useAsync(fetchUserRoleCounts, []);
  const counts = roleCounts.data && !roleCounts.data._missing ? roleCounts.data : null;

  const { state, data, error, reload } = useAsync(
    () => fetchUsers({ page, pageSize: PAGE_SIZE, search, role }),
    [page, search, role],
  );

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  const grandTotal = counts ? Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0) : total;
  const roleList = useMemo(() => {
    const extra = counts ? Object.keys(counts).filter((k) => !BASE_ROLES.includes(k)) : [];
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
            Read-only directory of every account · {num(grandTotal)} total
            {counts && (
              <>
                {" "}
                · {num(counts.customer || 0)} customers · {num(counts.vendor || 0)} vendors ·{" "}
                {num(counts.admin || 0)} admins
              </>
            )}
          </p>
        </div>
      </div>

      <div className="ap-tabs">
        <button className={role === "" ? "is-active" : ""} onClick={() => pickRole("")}>
          All{counts ? ` (${num(grandTotal)})` : ""}
        </button>
        {roleList.map((r) => (
          <button key={r} className={role === r ? "is-active" : ""} onClick={() => pickRole(r)}>
            {cap(r)}
            {counts ? ` (${num(counts[r] || 0)})` : ""}
          </button>
        ))}
      </div>

      <form className="ap-bar" onSubmit={applySearch}>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by email…"
          style={{ maxWidth: 280 }}
        />
        <button className="ap-btn ap-btn-ghost" type="submit">
          Search
        </button>
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
            ? "No users match that email."
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
                    <Badge tone={u.role === "admin" ? "ok" : "neutral"}>{u.role || "unknown"}</Badge>
                  </td>
                  <td>{u.phone || "—"}</td>
                  <td>{fmtDate(u.created_at)}</td>
                  <td className="ap-row-actions">
                    <button className="ap-btn ap-btn-sm ap-btn-ghost" onClick={() => setDetail(u)}>
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

      {detail && <UserDetail user={detail} isMe={detail.id === myId} onClose={() => setDetail(null)} />}
    </div>
  );
}

function UserDetail({ user, isMe, onClose }) {
  const keys = [
    ...PRIMARY_KEYS.filter((k) => k in user),
    ...Object.keys(user).filter((k) => !PRIMARY_KEYS.includes(k) && !k.startsWith("_")),
  ];

  return (
    <Modal title={user.email || user.full_name || "User"} onClose={onClose} wide>
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
            <div key={k} className={k === "id" || typeof user[k] === "object" ? "ap-detail ap-detail-span" : "ap-detail"}>
              <span className="ap-detail-label">{label(k)}</span>
              <span className="ap-detail-value">{display}</span>
            </div>
          );
        })}
      </div>
      {isMe && <p className="ap-note">This is your own account.</p>}
    </Modal>
  );
}
