import { useState } from "react";
import { getMyProfile, updateMyProfile } from "./api";
import { Async, Field, Modal, useAsync, useToast } from "./ui";

// Only these columns are offered for editing — and only the ones that actually
// exist on the profiles row. `role` and `id` are never touched here.
const EDITABLE = ["full_name", "name", "display_name", "phone", "avatar_url"];
const LABELS = {
  full_name: "Full name",
  name: "Name",
  display_name: "Display name",
  phone: "Phone",
  avatar_url: "Avatar URL",
};

export default function ProfileModal({ onClose }) {
  const { state, data, error, reload } = useAsync(getMyProfile, []);
  return (
    <Modal title="My profile" onClose={onClose}>
      <Async state={state} error={error} onRetry={reload}>
        {data && <ProfileForm profile={data} onClose={onClose} />}
      </Async>
    </Modal>
  );
}

function ProfileForm({ profile, onClose }) {
  const notify = useToast();
  const fields = EDITABLE.filter((k) => k in profile);
  const [form, setForm] = useState(() =>
    Object.fromEntries(fields.map((k) => [k, profile[k] ?? ""])),
  );
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    const patch = {};
    for (const k of fields) {
      const next = form[k].trim();
      if (next !== (profile[k] ?? "")) patch[k] = next || null;
    }
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      await updateMyProfile(patch);
      notify("Profile updated", "ok");
      onClose();
    } catch (e) {
      notify(e.message || "Could not save profile", "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="ap-detail ap-detail-span">
        <span className="ap-detail-label">Email</span>
        <span className="ap-detail-value">{profile.email || "—"}</span>
        <span className="ap-field-hint">Changing your login email isn&rsquo;t supported here.</span>
      </div>
      <div className="ap-detail ap-detail-span">
        <span className="ap-detail-label">Role</span>
        <span className="ap-detail-value">{profile.role || "—"}</span>
      </div>

      {fields.length === 0 ? (
        <p className="ap-note">No editable profile fields exist on this account.</p>
      ) : (
        <div className="ap-form-grid">
          {fields.map((k) => (
            <Field key={k} label={LABELS[k] || k}>
              <input value={form[k]} onChange={(e) => set(k, e.target.value)} />
            </Field>
          ))}
        </div>
      )}

      <div className="ap-modal-foot" style={{ borderTop: "none", padding: 0, marginTop: 4 }}>
        <button className="ap-btn ap-btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="ap-btn ap-btn-primary" onClick={save} disabled={busy || fields.length === 0}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </>
  );
}
