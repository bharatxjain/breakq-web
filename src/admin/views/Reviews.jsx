import { useEffect, useState } from "react";
import { fetchReviews, moderateReview } from "../api";
import { Async, Badge, ConfirmButton, fmtDateTime, num, useAsync, useToast } from "../ui";
import { ModerationHistory, Pager, ReasonDialog, useDebounced } from "../moderation";

const PAGE_SIZE = 25;
const STAR = "★";

const DIALOGS = {
  hide: {
    title: "Hide review",
    confirm: "Hide review",
    tone: "danger",
    placeholder: "e.g. Abusive language",
    message: "The review stays in the database but disappears for everyone except its author, and stops counting towards the shop's rating.",
  },
  report: {
    title: "Report review",
    confirm: "Report",
    tone: "primary",
    placeholder: "e.g. Looks like a fake review from a competitor",
    message: "Flags the review for follow-up. It stays visible until someone hides or removes it.",
  },
  remove: {
    title: "Remove review permanently",
    confirm: "Remove review",
    tone: "danger",
    placeholder: "e.g. Spam / not about this shop",
    message: "Deletes the review for good and recalculates the shop's rating. A copy of the text is kept in the moderation history.",
  },
};

export default function Reviews({ initialFilter }) {
  const [tab, setTab] = useState("reviews");
  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Reviews</h1>
          <p className="ap-view-sub">View, report, hide and remove customer reviews</p>
        </div>
      </div>
      <div className="ap-tabs">
        <button className={tab === "reviews" ? "is-active" : ""} onClick={() => setTab("reviews")}>
          Reviews
        </button>
        <button className={tab === "history" ? "is-active" : ""} onClick={() => setTab("history")}>
          Moderation history
        </button>
      </div>
      {tab === "reviews" ? (
        <ReviewList initialFilter={initialFilter} />
      ) : (
        <section className="ap-panel">
          <ModerationHistory entityType="review" limit={200} showEntity />
        </section>
      )}
    </div>
  );
}

function ReviewList({ initialFilter }) {
  const notify = useToast();
  const [visibility, setVisibility] = useState(initialFilter?.visibility || "");
  const [stars, setStars] = useState("");
  const [shop, setShop] = useState(
    initialFilter?.shopId ? { id: initialFilter.shopId, name: initialFilter.shopName } : null,
  );
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);
  const [page, setPage] = useState(0);
  const [dialog, setDialog] = useState(null); // { review, action }
  const [busy, setBusy] = useState(false);
  const [historyFor, setHistoryFor] = useState(null);

  useEffect(() => setPage(0), [search, visibility, stars, shop]);

  const { state, data, error, reload } = useAsync(
    () =>
      fetchReviews({
        page,
        pageSize: PAGE_SIZE,
        search,
        stars,
        visibility,
        shopId: shop?.id || "",
      }),
    [page, search, stars, visibility, shop?.id],
  );
  const rows = data?.rows || [];
  const total = data?.total || 0;

  async function act(review, action, reason) {
    setBusy(true);
    try {
      await moderateReview(review.id, action, reason);
      const done = {
        hide: "Review hidden",
        unhide: "Review visible again",
        report: "Review reported",
        clear_report: "Report cleared",
        remove: "Review removed",
      };
      notify(done[action] || "Done", "ok");
      setDialog(null);
      reload();
    } catch (e) {
      notify(e.message || "Action failed", "danger");
    } finally {
      setBusy(false);
    }
  }

  const needsSetup = error && /is_hidden|is_reported/.test(error.message || "");

  return (
    <>
      <div className="ap-tabs ap-tabs-sub">
        {[
          ["", "All"],
          ["reported", "Reported"],
          ["hidden", "Hidden"],
          ["visible", "Visible"],
        ].map(([k, label]) => (
          <button key={k} className={visibility === k ? "is-active" : ""} onClick={() => setVisibility(k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="ap-filters">
        <input
          className="ap-filters-search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search review text"
          aria-label="Search review text"
        />
        <select value={stars} onChange={(e) => setStars(e.target.value)} aria-label="Filter by stars">
          <option value="">Any rating</option>
          {[1, 2, 3, 4, 5].map((s) => (
            <option key={s} value={s}>
              {s} {STAR}
            </option>
          ))}
        </select>
        {shop && (
          <span className="ap-chip">
            Shop: {shop.name || shop.id}{" "}
            <button className="ap-link" onClick={() => setShop(null)} aria-label="Remove shop filter">
              ✕
            </button>
          </span>
        )}
      </div>

      {needsSetup ? (
        <p className="ap-async-empty">
          Review moderation needs setup — run <code>supabase/admin_operations.sql</code>.
        </p>
      ) : (
        <Async state={state} error={error} onRetry={reload} isEmpty={rows.length === 0} empty="No reviews match.">
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Review</th>
                  <th className="ap-num">Stars</th>
                  <th>Shop</th>
                  <th>Reviewer</th>
                  <th>When</th>
                  <th>State</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.is_hidden ? "is-deleted" : ""}>
                    <td style={{ maxWidth: 360 }}>
                      {r.review || <span className="ap-td-empty">— no text —</span>}
                      {r.is_reported && r.report_reason && (
                        <div className="ap-muted-line">Reported: {r.report_reason}</div>
                      )}
                      {r.is_hidden && r.hidden_reason && (
                        <div className="ap-muted-line">Hidden: {r.hidden_reason}</div>
                      )}
                    </td>
                    <td className="ap-num">
                      {r.rating}
                      {STAR}
                    </td>
                    <td>
                      <button className="ap-link" onClick={() => setShop({ id: r.shop_id, name: r._shop?.name })}>
                        {r._shop?.name || r.shop_id}
                      </button>
                    </td>
                    <td>{r._reviewer?.full_name || r._reviewer?.email || "Anonymous"}</td>
                    <td>{fmtDateTime(r.created_at)}</td>
                    <td>
                      <span className="ap-chip-row">
                        {r.is_hidden ? <Badge tone="warn">hidden</Badge> : <Badge tone="ok">visible</Badge>}
                        {r.is_reported && <Badge tone="danger">reported</Badge>}
                      </span>
                    </td>
                    <td className="ap-row-actions">
                      {r.is_reported ? (
                        <button className="ap-btn ap-btn-sm ap-btn-ghost" disabled={busy} onClick={() => act(r, "clear_report")}>
                          Clear report
                        </button>
                      ) : (
                        <button className="ap-btn ap-btn-sm ap-btn-ghost" disabled={busy} onClick={() => setDialog({ review: r, action: "report" })}>
                          Report
                        </button>
                      )}
                      {r.is_hidden ? (
                        <ConfirmButton className="ap-btn ap-btn-sm ap-btn-ghost" confirmLabel="Show?" onConfirm={() => act(r, "unhide")}>
                          Unhide
                        </ConfirmButton>
                      ) : (
                        <button className="ap-btn ap-btn-sm ap-btn-danger" disabled={busy} onClick={() => setDialog({ review: r, action: "hide" })}>
                          Hide
                        </button>
                      )}
                      <button className="ap-btn ap-btn-sm ap-btn-danger" disabled={busy} onClick={() => setDialog({ review: r, action: "remove" })}>
                        Remove
                      </button>
                      <button className="ap-btn ap-btn-sm ap-btn-ghost" onClick={() => setHistoryFor(historyFor === r.id ? null : r.id)}>
                        History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
          <p className="ap-field-hint">{num(total)} reviews match.</p>
        </Async>
      )}

      {historyFor && (
        <section className="ap-panel">
          <div className="ap-panel-head">
            <h2>History for this review</h2>
            <button className="ap-btn ap-btn-sm ap-btn-ghost" onClick={() => setHistoryFor(null)}>
              Close
            </button>
          </div>
          <ModerationHistory entityType="review" entityId={historyFor} limit={20} />
        </section>
      )}

      {dialog && (
        <ReasonDialog
          title={DIALOGS[dialog.action].title}
          confirmLabel={DIALOGS[dialog.action].confirm}
          tone={DIALOGS[dialog.action].tone}
          placeholder={DIALOGS[dialog.action].placeholder}
          message={
            <>
              <p>{DIALOGS[dialog.action].message}</p>
              <blockquote className="ap-quote">
                {dialog.review.rating}
                {STAR} — {dialog.review.review || "(no text)"}
              </blockquote>
            </>
          }
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => act(dialog.review, dialog.action, reason)}
        />
      )}
    </>
  );
}
