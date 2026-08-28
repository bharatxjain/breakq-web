import { useState } from "react";
import {
  deleteCategory,
  fetchCategories,
  fetchShopCategoryUsage,
  saveCategory,
  seedCategories,
} from "../api";
import { Async, ConfirmButton, Field, Modal, num, useAsync, useToast } from "../ui";

export default function Categories() {
  const notify = useToast();
  const cats = useAsync(fetchCategories, []);
  const usage = useAsync(fetchShopCategoryUsage, []);
  const [editing, setEditing] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const rows = cats.data || [];
  const usageRows = usage.data || [];
  const known = new Set(rows.map((c) => c.name.toLowerCase()));

  async function doSeed() {
    setSeeding(true);
    try {
      const added = await seedCategories();
      notify(added ? `${added} categor${added === 1 ? "y" : "ies"} added` : "All defaults already exist", "ok");
      cats.reload();
    } catch (e) {
      notify(e.message || "Seed failed", "danger");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Categories</h1>
          <p className="ap-view-sub">
            <code>categories</code> drives the app&rsquo;s category list; <code>item_count</code> is stored, treat
            it as approximate
          </p>
        </div>
        <div className="ap-bar">
          <button className="ap-btn ap-btn-ghost" onClick={doSeed} disabled={seeding}>
            {seeding ? "Adding…" : "Seed default categories"}
          </button>
          <button
            className="ap-btn ap-btn-primary"
            onClick={() => setEditing({ _new: true, name: "", icon_name: "" })}
          >
            + New category
          </button>
        </div>
      </div>

      {/* managed categories */}
      <section className="ap-panel">
        <div className="ap-panel-head">
          <h2>Managed categories</h2>
          <span className="ap-view-sub">{rows.length} defined</span>
        </div>
        <Async
          state={cats.state}
          error={cats.error}
          onRetry={cats.reload}
          isEmpty={rows.length === 0}
          empty="No categories yet — use “Seed default categories”."
        >
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Icon name</th>
                  <th className="ap-num">Item count</th>
                  <th className="ap-num">Shops using</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const u = usageRows.find((x) => x.name.toLowerCase() === c.name.toLowerCase());
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td className="ap-mono">{c.icon_name || "—"}</td>
                      <td className="ap-num">{num(c.item_count)}</td>
                      <td className="ap-num">{u ? num(u.shops) : "0"}</td>
                      <td className="ap-row-actions">
                        <button className="ap-btn ap-btn-sm ap-btn-ghost" onClick={() => setEditing({ ...c })}>
                          Edit
                        </button>
                        <ConfirmButton
                          className="ap-btn ap-btn-sm ap-btn-danger"
                          confirmLabel="Delete?"
                          onConfirm={async () => {
                            try {
                              await deleteCategory(c.id);
                              notify("Category deleted", "ok");
                              cats.reload();
                            } catch (e) {
                              notify(e.message || "Failed — products may still reference it", "danger");
                            }
                          }}
                        >
                          Delete
                        </ConfirmButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Async>
      </section>

      {/* live usage from shops.primary_category */}
      <section className="ap-panel">
        <div className="ap-panel-head">
          <h2>Shop categories in use</h2>
          <span className="ap-view-sub">live from shops.primary_category</span>
        </div>
        <Async
          state={usage.state}
          error={usage.error}
          onRetry={usage.reload}
          isEmpty={usageRows.length === 0}
          empty="No shops have a category set yet."
        >
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="ap-num">Shops</th>
                  <th>In managed list?</th>
                </tr>
              </thead>
              <tbody>
                {usageRows.map((u) => (
                  <tr key={u.name}>
                    <td>{u.name}</td>
                    <td className="ap-num">{num(u.shops)}</td>
                    <td>
                      {known.has(u.name.toLowerCase()) ? (
                        <span className="ap-badge ap-badge-ok">yes</span>
                      ) : (
                        <button
                          className="ap-btn ap-btn-sm ap-btn-ghost"
                          onClick={() => setEditing({ _new: true, name: u.name, icon_name: "" })}
                        >
                          Add to list
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Async>
      </section>

      <p className="ap-note">
        Confirm with the dev team that a trigger keeps <code>categories.item_count</code> in sync with{" "}
        <code>products.category_id</code>. The Dashboard&rsquo;s “Top category” is computed live from order data
        and does not rely on it.
      </p>

      {editing && (
        <CatModal
          cat={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            cats.reload();
            notify("Category saved", "ok");
          }}
          onError={(m) => notify(m, "danger")}
        />
      )}
    </div>
  );
}

function CatModal({ cat, onClose, onDone, onError }) {
  const isNew = !!cat._new;
  const [form, setForm] = useState(cat);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.name.trim()) return onError("Name is required.");
    setBusy(true);
    try {
      await saveCategory({ ...form, name: form.name.trim(), icon_name: form.icon_name?.trim() || null }, isNew);
      onDone();
    } catch (e) {
      onError(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={isNew ? "New category" : `Edit ${cat.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="ap-btn ap-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="ap-btn ap-btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <Field label="Name" required>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Icon name" hint="Matches the icon key used by the app">
        <input value={form.icon_name || ""} onChange={(e) => set("icon_name", e.target.value)} className="ap-mono" />
      </Field>
    </Modal>
  );
}
