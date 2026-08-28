import { useState } from "react";
import {
  fetchSubscribers,
  fetchTiers,
  overrideTier,
  saveTier,
} from "../api";
import {
  Async,
  Badge,
  Field,
  Modal,
  Toggle,
  fmtDate,
  money,
  statusTone,
  useAsync,
  useToast,
} from "../ui";

const FLAGS = [
  ["can_promote", "Can promote"],
  ["has_basic_analytics", "Basic analytics"],
  ["has_full_analytics", "Full analytics"],
  ["has_priority_placement", "Priority placement"],
  ["has_top_boost", "Top boost"],
  ["hide_breakq_branding", "Hide BreakQ branding"],
  ["has_whatsapp_alerts", "WhatsApp alerts"],
  ["has_multi_staff", "Multi-staff"],
  ["has_competitor_pricing", "Competitor pricing"],
];

const BLANK_TIER = {
  display_name: "",
  price_rupees: 0,
  item_cap: 0,
  commission_percent: 0,
  is_limited_time: false,
  offer_ends_at: "",
  tagline: "",
  ...Object.fromEntries(FLAGS.map(([k]) => [k, false])),
};

export default function Subscriptions() {
  const [sub, setSub] = useState("tiers");
  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <h1>Subscriptions</h1>
      </div>
      <div className="ap-tabs">
        <button className={sub === "tiers" ? "is-active" : ""} onClick={() => setSub("tiers")}>
          Tiers
        </button>
        <button className={sub === "subs" ? "is-active" : ""} onClick={() => setSub("subs")}>
          Subscribers
        </button>
      </div>
      {sub === "tiers" ? <Tiers /> : <Subscribers />}
    </div>
  );
}

/* ------------------------------------------------------------------ tiers --- */

function Tiers() {
  const notify = useToast();
  const { state, data, error, reload } = useAsync(fetchTiers, []);
  const [editing, setEditing] = useState(null);
  const rows = data || [];

  return (
    <>
      <div className="ap-bar">
        <button className="ap-btn ap-btn-primary" onClick={() => setEditing({ ...BLANK_TIER })}>
          + New tier
        </button>
      </div>

      <Async state={state} error={error} onRetry={reload} isEmpty={rows.length === 0} empty="No tiers defined.">
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th className="ap-num">Price</th>
                <th className="ap-num">Item cap</th>
                <th className="ap-num">Commission</th>
                <th>Features</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.display_name}</strong>
                    {t.is_limited_time && <Badge tone="warn">limited</Badge>}
                    {t.tagline && <div className="ap-muted-line">{t.tagline}</div>}
                  </td>
                  <td className="ap-num">{money(t.price_rupees)}</td>
                  <td className="ap-num">{t.item_cap}</td>
                  <td className="ap-num">{t.commission_percent}%</td>
                  <td>
                    <span className="ap-chip-row">
                      {FLAGS.filter(([k]) => t[k]).map(([k, l]) => (
                        <span key={k} className="ap-chip">
                          {l}
                        </span>
                      ))}
                      {FLAGS.filter(([k]) => t[k]).length === 0 && <span className="ap-muted-line">—</span>}
                    </span>
                  </td>
                  <td>
                    <button className="ap-btn ap-btn-sm ap-btn-ghost" onClick={() => setEditing({ ...t })}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>

      {editing && (
        <TierModal
          tier={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
            notify("Tier saved", "ok");
          }}
          onError={(m) => notify(m, "danger")}
        />
      )}
    </>
  );
}

function TierModal({ tier, onClose, onSaved, onError }) {
  const [form, setForm] = useState(tier);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.display_name.trim()) {
      onError("Display name is required.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        price_rupees: Number(form.price_rupees) || 0,
        item_cap: Number(form.item_cap) || 0,
        commission_percent: Number(form.commission_percent) || 0,
        offer_ends_at: form.offer_ends_at || null,
      };
      await saveTier(payload);
      onSaved();
    } catch (e) {
      onError(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={tier.id ? `Edit ${tier.display_name}` : "New tier"}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="ap-btn ap-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="ap-btn ap-btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Save tier"}
          </button>
        </>
      }
    >
      <div className="ap-form-grid">
        <Field label="Display name" required>
          <input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} />
        </Field>
        <Field label="Price (₹)">
          <input type="number" value={form.price_rupees} onChange={(e) => set("price_rupees", e.target.value)} />
        </Field>
        <Field label="Item cap">
          <input type="number" value={form.item_cap} onChange={(e) => set("item_cap", e.target.value)} />
        </Field>
        <Field label="Commission %">
          <input
            type="number"
            step="0.1"
            value={form.commission_percent}
            onChange={(e) => set("commission_percent", e.target.value)}
          />
        </Field>
      </div>

      <h4 className="ap-form-section">Feature flags</h4>
      <div className="ap-toggle-grid">
        {FLAGS.map(([k, l]) => (
          <Toggle key={k} label={l} checked={!!form[k]} onChange={(v) => set(k, v)} />
        ))}
      </div>

      <h4 className="ap-form-section">Limited-time offer</h4>
      <div className="ap-form-grid">
        <Toggle
          label="Is limited time"
          checked={!!form.is_limited_time}
          onChange={(v) => set("is_limited_time", v)}
        />
        <Field label="Offer ends at">
          <input
            type="datetime-local"
            value={form.offer_ends_at ? String(form.offer_ends_at).slice(0, 16) : ""}
            onChange={(e) => set("offer_ends_at", e.target.value)}
          />
        </Field>
        <Field label="Tagline" hint='e.g. "Diwali offer — 40% off"'>
          <input value={form.tagline || ""} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------ subscribers --- */

function Subscribers() {
  const notify = useToast();
  const { state, data, error, reload } = useAsync(fetchSubscribers, []);
  const { data: tiers } = useAsync(fetchTiers, []);
  const [changing, setChanging] = useState(null);
  const rows = data || [];

  return (
    <>
      <Async
        state={state}
        error={error}
        onRetry={reload}
        isEmpty={rows.length === 0}
        empty="No vendor subscriptions yet."
      >
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Started</th>
                <th>Expires</th>
                <th className="ap-num">Paid</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.shops?.name || r.shop_id}</td>
                  <td>{r.subscription_tiers?.display_name || "—"}</td>
                  <td>
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </td>
                  <td>{fmtDate(r.started_at)}</td>
                  <td>{fmtDate(r.expires_at)}</td>
                  <td className="ap-num">{money(r.amount_paid_rupees)}</td>
                  <td>
                    {r.status === "active" && (
                      <button
                        className="ap-btn ap-btn-sm ap-btn-ghost"
                        onClick={() => setChanging(r)}
                      >
                        Change tier
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>

      {changing && (
        <ChangeTierModal
          row={changing}
          tiers={tiers || []}
          onClose={() => setChanging(null)}
          onDone={() => {
            setChanging(null);
            reload();
            notify("Tier changed", "ok");
          }}
          onError={(m) => notify(m, "danger")}
        />
      )}
    </>
  );
}

function ChangeTierModal({ row, tiers, onClose, onDone, onError }) {
  const [tierId, setTierId] = useState("");
  const [amount, setAmount] = useState("0");
  const [busy, setBusy] = useState(false);
  const picked = tiers.find((t) => String(t.id) === String(tierId));

  async function submit() {
    if (!tierId) {
      onError("Pick a tier.");
      return;
    }
    setBusy(true);
    try {
      await overrideTier(
        row.shop_id,
        tierId,
        Number(picked?.commission_percent) || 0,
        Number(amount) || 0,
      );
      onDone();
    } catch (e) {
      onError(
        e.message?.includes("function")
          ? "admin_override_tier isn't installed — run supabase/admin_panel.sql"
          : e.message || "Change failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Change tier — ${row.shops?.name || row.shop_id}`}
      onClose={onClose}
      footer={
        <>
          <button className="ap-btn ap-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="ap-btn ap-btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Applying…" : "Apply change"}
          </button>
        </>
      }
    >
      <p className="ap-note">
        Expires the current active subscription and inserts a new active row
        (<code>payment_ref = manual-admin-override</code>) in one transaction.
      </p>
      <Field label="New tier" required>
        <select value={tierId} onChange={(e) => setTierId(e.target.value)}>
          <option value="">Select…</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.display_name} — {money(t.price_rupees)} / {t.commission_percent}%
            </option>
          ))}
        </select>
      </Field>
      <Field label="Amount paid (₹)" hint="Recorded on the new subscription row.">
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
    </Modal>
  );
}
