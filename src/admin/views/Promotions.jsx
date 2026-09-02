import { useState } from "react";
import {
  createPromotion,
  deactivatePromotion,
  fetchPromotions,
  searchShops,
} from "../api";
import {
  Async,
  Badge,
  ConfirmButton,
  Field,
  Modal,
  fmtDate,
  money,
  useAsync,
  useToast,
} from "../ui";

function daysElapsed(from) {
  const start = new Date(from).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 86400000) + 1);
}

export default function Promotions() {
  const notify = useToast();
  const { state, data, error, reload } = useAsync(fetchPromotions, []);
  const [creating, setCreating] = useState(false);
  const rows = data || [];
  const now = Date.now();

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Promoted placements</h1>
          <p className="ap-view-sub">
            Pay-per-day shop promotion · spend is kept for revenue history
          </p>
        </div>
        <button
          className="ap-btn ap-btn-primary"
          onClick={() => setCreating(true)}
        >
          + New promotion
        </button>
      </div>

      <Async
        state={state}
        error={error}
        onRetry={reload}
        isEmpty={rows.length === 0}
        empty="No promotions created yet."
      >
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Shop</th>
                <th className="ap-num">Daily budget</th>
                <th className="ap-num">Charged</th>
                <th>Window</th>
                <th>Pacing</th>
                <th>State</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const live =
                  p.is_active && new Date(p.active_to).getTime() > now;
                const budgetToDate =
                  (Number(p.daily_budget_rupees) || 0) *
                  daysElapsed(p.active_from);
                const pct =
                  budgetToDate > 0
                    ? Math.min(
                        100,
                        (Number(p.total_charged_rupees) / budgetToDate) * 100,
                      )
                    : 0;
                return (
                  <tr key={p.id}>
                    <td>{p.shops?.name || p.shop_id}</td>
                    <td className="ap-num">{money(p.daily_budget_rupees)}</td>
                    <td className="ap-num">{money(p.total_charged_rupees)}</td>
                    <td>
                      {fmtDate(p.active_from)} → {fmtDate(p.active_to)}
                    </td>
                    <td>
                      <div
                        className="ap-meter"
                        title={`${money(p.total_charged_rupees)} of ${money(budgetToDate)} budgeted to date`}
                      >
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td>
                      <Badge tone={live ? "ok" : "neutral"}>
                        {live ? "active" : "inactive"}
                      </Badge>
                    </td>
                    <td>
                      {p.is_active && (
                        <ConfirmButton
                          className="ap-btn ap-btn-sm ap-btn-danger"
                          confirmLabel="Deactivate?"
                          onConfirm={async () => {
                            try {
                              await deactivatePromotion(p.id);
                              notify("Promotion deactivated", "ok");
                              reload();
                            } catch (e) {
                              notify(e.message || "Failed", "danger");
                            }
                          }}
                        >
                          Deactivate
                        </ConfirmButton>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Async>

      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            reload();
            notify("Promotion created", "ok");
          }}
          onError={(m) => notify(m, "danger")}
        />
      )}
    </div>
  );
}

function CreateModal({ onClose, onDone, onError }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    shop_id: "",
    shop_name: "",
    daily_budget_rupees: "",
    active_from: today,
    active_to: "",
  });
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function doSearch(t) {
    setTerm(t);
    if (t.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      setResults(await searchShops(t));
    } catch {
      setResults([]);
    }
  }

  async function submit() {
    if (!form.shop_id) return onError("Pick a shop.");
    if (!(Number(form.daily_budget_rupees) > 0))
      return onError("Daily budget must be greater than 0.");
    if (!form.active_from || !form.active_to) return onError("Set both dates.");
    if (form.active_to < form.active_from)
      return onError("End date is before start date.");
    setBusy(true);
    try {
      await createPromotion(form);
      onDone();
    } catch (e) {
      onError(e.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="New promotion"
      onClose={onClose}
      footer={
        <>
          <button className="ap-btn ap-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="ap-btn ap-btn-primary"
            onClick={submit}
            disabled={busy}
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      <Field
        label="Shop"
        required
        hint={form.shop_name ? `Selected: ${form.shop_name}` : "Search by name"}
      >
        <input
          value={term}
          onChange={(e) => doSearch(e.target.value)}
          placeholder="Type a shop name…"
        />
      </Field>
      {results.length > 0 && (
        <ul className="ap-search-results">
          {results.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => {
                  set("shop_id", s.id);
                  set("shop_name", s.name);
                  setResults([]);
                  setTerm(s.name);
                }}
              >
                {s.name} <span className="ap-muted-line">{s.status}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="ap-form-grid">
        <Field label="Daily budget (₹)" required>
          <input
            type="number"
            value={form.daily_budget_rupees}
            onChange={(e) => set("daily_budget_rupees", e.target.value)}
          />
        </Field>
        <Field label="Active from" required>
          <input
            type="date"
            value={form.active_from}
            onChange={(e) => set("active_from", e.target.value)}
          />
        </Field>
        <Field label="Active to" required>
          <input
            type="date"
            value={form.active_to}
            onChange={(e) => set("active_to", e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
