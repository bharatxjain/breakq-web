import { useEffect, useState } from "react";
import {
  cancelCampaign,
  createCampaign,
  deleteCampaign,
  estimateAudience,
  fetchCampaigns,
  findUser,
  sendCampaignNow,
  sendTestNotification,
  updateCampaign,
} from "../api";
import {
  Async,
  Badge,
  ConfirmButton,
  Field,
  Modal,
  fmtDateTime,
  num,
  useAsync,
  useToast,
} from "../ui";

const AUDIENCES = [
  { key: "all", label: "All users" },
  { key: "customer", label: "Customers" },
  { key: "vendor", label: "Vendors" },
  { key: "user", label: "Specific user" },
];

const STATUS_TONE = {
  draft: "neutral",
  scheduled: "warn",
  sending: "warn",
  sent: "ok",
  failed: "danger",
  canceled: "neutral",
};

const BLANK = {
  title: "",
  body: "",
  image_url: "",
  audience: "all",
  target_user_id: "",
  channels: ["push", "email"],
  route: "notifications",
  data_text: "",
  email_subject: "",
  email_html: "",
  delivery: "now", // now | schedule
  scheduled_at: "",
};

// campaign row → editable form model
function toForm(c) {
  return {
    ...BLANK,
    title: c.title || "",
    body: c.body || "",
    image_url: c.image_url || "",
    audience: c.audience || "all",
    target_user_id: c.target_user_id || "",
    channels: c.channels?.length ? c.channels : ["push", "email"],
    route: c.route || "notifications",
    data_text: c.data && Object.keys(c.data).length ? JSON.stringify(c.data, null, 2) : "",
    email_subject: c.email_subject || "",
    email_html: c.email_html || "",
    delivery: c.scheduled_at ? "schedule" : "now",
    scheduled_at: c.scheduled_at ? toLocalInput(c.scheduled_at) : "",
  };
}

function toLocalInput(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Notifications() {
  const notify = useToast();
  const { state, data, error, reload } = useAsync(fetchCampaigns, []);
  const [composing, setComposing] = useState(null); // form-model | null
  const rows = data || [];

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Notifications</h1>
          <p className="ap-view-sub">
            Promotional push &amp; email blasts to customers or vendors · tapping a
            push opens the app's Notifications screen
          </p>
        </div>
        <button className="ap-btn ap-btn-primary" onClick={() => setComposing({ ...BLANK })}>
          + New notification
        </button>
      </div>

      <Async
        state={state}
        error={error}
        onRetry={reload}
        isEmpty={rows.length === 0}
        empty="No notifications sent yet."
      >
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Notification</th>
                <th>Audience</th>
                <th>Channels</th>
                <th>Status</th>
                <th>When</th>
                <th>Results</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <Row
                  key={c.id}
                  c={c}
                  onEdit={() => setComposing({ id: c.id, status: c.status, ...toForm(c) })}
                  onChanged={reload}
                  notify={notify}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Async>

      <p className="ap-note">
        Push goes out via Firebase Cloud Messaging to tokens in{" "}
        <code>device_tokens</code>; email via Resend. Every recipient also gets a
        row in <code>notifications</code> so it appears in the app's in-app list.
        Large audiences finish over a few minutes (a cron tick drains the rest).
        See <code>supabase/NOTIFICATIONS.md</code> for setup.
      </p>

      {composing && (
        <ComposeModal
          model={composing}
          onClose={() => setComposing(null)}
          onDone={(msg) => {
            setComposing(null);
            reload();
            notify(msg, "ok");
          }}
          onError={(m) => notify(m, "danger")}
        />
      )}
    </div>
  );
}

function Row({ c, onEdit, onChanged, notify }) {
  const results = [];
  if (c.channels?.includes("push"))
    results.push(`push ${num(c.push_sent)}${c.push_failed ? ` · ${num(c.push_failed)} failed` : ""}`);
  if (c.channels?.includes("email"))
    results.push(`email ${num(c.email_sent)}${c.email_failed ? ` · ${num(c.email_failed)} failed` : ""}`);

  const when =
    c.status === "sent" || c.status === "sending"
      ? fmtDateTime(c.started_at || c.scheduled_at)
      : c.scheduled_at
        ? fmtDateTime(c.scheduled_at)
        : "—";

  const editable = c.status === "draft" || c.status === "scheduled";
  const cancelable = c.status === "draft" || c.status === "scheduled";

  return (
    <tr>
      <td>
        <strong>{c.title}</strong>
        <div className="ap-muted-line">{c.body}</div>
        {c.status === "failed" && c.error && (
          <div className="ap-field-error" style={{ marginTop: 4 }}>{c.error}</div>
        )}
      </td>
      <td>
        {c.audience === "user" ? "1 user" : AUDIENCES.find((a) => a.key === c.audience)?.label || c.audience}
        {c.recipients_total != null && c.audience !== "user" && (
          <div className="ap-muted-line">{num(c.recipients_total)} recipients</div>
        )}
      </td>
      <td>
        <span className="ap-chip-row">
          {(c.channels || []).map((ch) => (
            <span key={ch} className="ap-chip">{ch}</span>
          ))}
        </span>
      </td>
      <td>
        <Badge tone={STATUS_TONE[c.status] || "neutral"}>
          {c.status === "sending" && c.recipients_total
            ? `sending ${Math.min(
                100,
                Math.round(((c.push_sent + c.email_sent + c.notif_rows) / (c.recipients_total * (c.channels?.length || 1))) * 100),
              )}%`
            : c.status}
        </Badge>
      </td>
      <td>{when}</td>
      <td className="ap-muted-line">{results.join("  ·  ") || "—"}</td>
      <td className="ap-row-actions">
        {c.status === "draft" && (
          <ConfirmButton
            className="ap-btn ap-btn-sm ap-btn-primary"
            confirmLabel="Send now?"
            onConfirm={async () => {
              try {
                await sendCampaignNow(c.id);
                notify("Sending started", "ok");
                onChanged();
              } catch (e) {
                notify(e.message || "Failed", "danger");
              }
            }}
          >
            Send
          </ConfirmButton>
        )}
        {editable && (
          <button className="ap-btn ap-btn-sm ap-btn-ghost" onClick={onEdit}>
            Edit
          </button>
        )}
        {cancelable && (
          <ConfirmButton
            className="ap-btn ap-btn-sm ap-btn-danger"
            confirmLabel="Cancel?"
            onConfirm={async () => {
              try {
                await cancelCampaign(c.id);
                notify("Campaign canceled", "ok");
                onChanged();
              } catch (e) {
                notify(e.message || "Failed", "danger");
              }
            }}
          >
            Cancel
          </ConfirmButton>
        )}
        {c.status !== "sending" && (
          <ConfirmButton
            className="ap-btn ap-btn-sm ap-btn-ghost"
            confirmLabel="Delete?"
            onConfirm={async () => {
              try {
                await deleteCampaign(c.id);
                notify("Deleted", "ok");
                onChanged();
              } catch (e) {
                notify(e.message || "Failed", "danger");
              }
            }}
          >
            Delete
          </ConfirmButton>
        )}
      </td>
    </tr>
  );
}

function ComposeModal({ model, onClose, onDone, onError }) {
  const notify = useToast();
  const isEdit = !!model.id;
  const [form, setForm] = useState(model);
  const [busy, setBusy] = useState("");
  const [audienceCount, setAudienceCount] = useState(null);
  const [userCheck, setUserCheck] = useState(null); // {ok, email, role} | {error} | null
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleChannel = (ch) =>
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter((c) => c !== ch)
        : [...f.channels, ch],
    }));

  // refresh the recipient estimate when the audience changes
  useEffect(() => {
    if (form.audience === "user") {
      setAudienceCount(null);
      return;
    }
    let alive = true;
    setAudienceCount(null);
    estimateAudience(form.audience)
      .then((n) => alive && setAudienceCount(n))
      .catch(() => alive && setAudienceCount(null));
    return () => {
      alive = false;
    };
  }, [form.audience]);

  async function checkUser() {
    setUserCheck({ loading: true });
    try {
      const u = await findUser(form.target_user_id);
      if (!u) setUserCheck({ error: "No user with that email or id." });
      else {
        setUserCheck({ ok: true, email: u.email, role: u.role });
        set("target_user_id", u.id);
      }
    } catch (e) {
      setUserCheck({ error: e.message || "Lookup failed" });
    }
  }

  // Assemble the payload shared by every submit path. Returns null on a
  // validation error (already surfaced via onError).
  function buildPayload() {
    if (!form.title.trim()) return onError("Title is required."), null;
    if (!form.body.trim()) return onError("Message is required."), null;
    if (form.channels.length === 0) return onError("Pick at least one channel."), null;
    if (form.audience === "user" && !/^[0-9a-f-]{32,36}$/i.test(form.target_user_id))
      return onError("Look up and select a specific user first."), null;

    let data = {};
    if (form.data_text.trim()) {
      try {
        data = JSON.parse(form.data_text);
        if (typeof data !== "object" || Array.isArray(data)) throw new Error();
      } catch {
        return onError("Advanced data must be a JSON object."), null;
      }
    }

    return {
      title: form.title.trim(),
      body: form.body.trim(),
      image_url: form.image_url.trim() || null,
      audience: form.audience,
      target_user_id: form.audience === "user" ? form.target_user_id : null,
      channels: form.channels,
      route: form.route.trim() || "notifications",
      data,
      email_subject: form.email_subject.trim() || null,
      email_html: form.email_html.trim() || null,
    };
  }

  async function persist(extra) {
    const base = buildPayload();
    if (!base) return null;
    const payload = { ...base, ...extra };
    if (isEdit) {
      await updateCampaign(model.id, payload);
      return model.id;
    }
    const row = await createCampaign(payload);
    return row.id;
  }

  async function onSaveDraft() {
    setBusy("draft");
    try {
      const id = await persist({ status: "draft", scheduled_at: null });
      if (id) onDone("Draft saved");
    } catch (e) {
      onError(e.message || "Save failed");
    } finally {
      setBusy("");
    }
  }

  async function onPrimary() {
    if (form.delivery === "schedule") {
      if (!form.scheduled_at) return onError("Pick a date and time.");
      const when = new Date(form.scheduled_at);
      if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60000)
        return onError("Schedule must be in the future.");
      setBusy("primary");
      try {
        const id = await persist({ status: "scheduled", scheduled_at: when.toISOString() });
        if (id) onDone("Scheduled");
      } catch (e) {
        onError(e.message || "Schedule failed");
      } finally {
        setBusy("");
      }
      return;
    }
    // send now
    setBusy("primary");
    try {
      const id = await persist({ status: "draft", scheduled_at: null });
      if (!id) return;
      await sendCampaignNow(id);
      onDone("Sending started");
    } catch (e) {
      onError(e.message || "Send failed");
    } finally {
      setBusy("");
    }
  }

  async function onTest() {
    if (!form.title.trim() || !form.body.trim())
      return onError("Add a title and message before testing.");
    setBusy("test");
    try {
      let data = {};
      if (form.data_text.trim()) {
        try {
          data = JSON.parse(form.data_text);
        } catch {
          return onError("Advanced data must be valid JSON.");
        }
      }
      const res = await sendTestNotification({
        title: form.title.trim(),
        body: form.body.trim(),
        route: form.route.trim() || "notifications",
        data,
        image_url: form.image_url.trim() || undefined,
        channels: form.channels,
        email_subject: form.email_subject.trim() || undefined,
        email_html: form.email_html.trim() || undefined,
      });
      const note =
        typeof res?.push === "string"
          ? `Test sent · push: ${res.push}`
          : "Test sent to your account";
      notify(note, "ok");
    } catch (e) {
      onError(e.message || "Test failed");
    } finally {
      setBusy("");
    }
  }

  const primaryLabel =
    form.delivery === "schedule" ? "Schedule" : isEdit ? "Save & send now" : "Send now";

  return (
    <Modal
      title={isEdit ? "Edit notification" : "New notification"}
      onClose={onClose}
      wide
      footer={
        <>
          <button
            className="ap-btn ap-btn-ghost ap-btn-test"
            onClick={onTest}
            disabled={!!busy}
            title="Send just to your own account"
          >
            {busy === "test" ? "Sending…" : "Send test to me"}
          </button>
          <button className="ap-btn ap-btn-ghost" onClick={onClose} disabled={!!busy}>
            Cancel
          </button>
          {form.delivery !== "schedule" && (
            <button className="ap-btn ap-btn-ghost" onClick={onSaveDraft} disabled={!!busy}>
              {busy === "draft" ? "Saving…" : "Save draft"}
            </button>
          )}
          <button className="ap-btn ap-btn-primary" onClick={onPrimary} disabled={!!busy}>
            {busy === "primary" ? "Working…" : primaryLabel}
          </button>
        </>
      }
    >
      <Field label="Title" required hint="Shown as the push heading and the email subject">
        <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={120} />
      </Field>
      <Field label="Message" required>
        <textarea rows={3} value={form.body} onChange={(e) => set("body", e.target.value)} maxLength={480} />
      </Field>
      <Field label="Image URL" hint="Optional · shown in the push and email">
        <input value={form.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" />
      </Field>

      <p className="ap-form-section">Audience</p>
      <div className="ap-seg" role="tablist" style={{ marginBottom: 8 }}>
        {AUDIENCES.map((a) => (
          <button
            key={a.key}
            className={form.audience === a.key ? "is-active" : ""}
            onClick={() => set("audience", a.key)}
          >
            {a.label}
          </button>
        ))}
      </div>
      {form.audience === "user" ? (
        <Field label="User email or id" required>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={form.target_user_id}
              onChange={(e) => {
                set("target_user_id", e.target.value);
                setUserCheck(null);
              }}
              placeholder="person@example.com"
            />
            <button className="ap-btn ap-btn-ghost" onClick={checkUser} disabled={userCheck?.loading}>
              Check
            </button>
          </div>
          {userCheck?.ok && (
            <span className="ap-field-hint">✓ {userCheck.email} · {userCheck.role || "no role"}</span>
          )}
          {userCheck?.error && <span className="ap-field-error">{userCheck.error}</span>}
        </Field>
      ) : (
        <p className="ap-note" style={{ marginTop: 0 }}>
          {audienceCount == null ? "Counting recipients…" : `≈ ${num(audienceCount)} people match this audience.`}
        </p>
      )}

      <p className="ap-form-section">Channels</p>
      <div className="ap-chip-row" style={{ gap: 8, marginBottom: 8 }}>
        {["push", "email"].map((ch) => (
          <label key={ch} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={form.channels.includes(ch)} onChange={() => toggleChannel(ch)} />
            {ch === "push" ? "Mobile push" : "Email"}
          </label>
        ))}
      </div>

      <p className="ap-form-section">Delivery</p>
      <div className="ap-seg" style={{ marginBottom: 8 }}>
        <button className={form.delivery === "now" ? "is-active" : ""} onClick={() => set("delivery", "now")}>
          Send now
        </button>
        <button className={form.delivery === "schedule" ? "is-active" : ""} onClick={() => set("delivery", "schedule")}>
          Schedule
        </button>
      </div>
      {form.delivery === "schedule" && (
        <Field label="Send at" required hint="Your local time · a cron tick sends it within ~1 min of this time">
          <input
            type="datetime-local"
            value={form.scheduled_at}
            min={toLocalInput(new Date().toISOString())}
            onChange={(e) => set("scheduled_at", e.target.value)}
          />
        </Field>
      )}

      <details className="ap-advanced" style={{ marginTop: 12 }}>
        <summary className="ap-form-section" style={{ cursor: "pointer" }}>Advanced</summary>
        <div style={{ marginTop: 10 }}>
          <Field label="Deep-link route" hint="App screen key the tap opens. Default opens the Notifications list.">
            <input value={form.route} onChange={(e) => set("route", e.target.value)} />
          </Field>
          <Field label="Extra data (JSON object)" hint='Merged into the push data payload, e.g. {"promo_id":"diwali"}'>
            <textarea
              rows={3}
              className="ap-mono"
              value={form.data_text}
              onChange={(e) => set("data_text", e.target.value)}
              placeholder="{}"
            />
          </Field>
          {form.channels.includes("email") && (
            <>
              <Field label="Email subject" hint="Blank = use the title">
                <input value={form.email_subject} onChange={(e) => set("email_subject", e.target.value)} />
              </Field>
              <Field label="Custom email HTML" hint="Blank = a simple template from the title + message">
                <textarea
                  rows={4}
                  className="ap-mono"
                  value={form.email_html}
                  onChange={(e) => set("email_html", e.target.value)}
                  placeholder="<div>…</div>"
                />
              </Field>
            </>
          )}
        </div>
      </details>
    </Modal>
  );
}
