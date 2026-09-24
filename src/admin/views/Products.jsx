import { useEffect, useMemo, useState } from "react";
import {
  addRestrictedKeyword,
  deleteRestrictedKeyword,
  fetchBrands,
  fetchCategories,
  fetchDuplicateProducts,
  fetchProducts,
  fetchRestrictedKeywords,
  fetchRestrictedMatches,
  renameBrand,
  setProductFlag,
} from "../api";
import {
  Async,
  Badge,
  ConfirmButton,
  Field,
  Modal,
  NeedsSetup,
  fmtDate,
  fmtDateTime,
  num,
  useAsync,
  useToast,
} from "../ui";
import { ModerationHistory, Pager, ReasonDialog, useDebounced } from "../moderation";

const OPS_SQL = "supabase/admin_operations.sql";
const TABS = [
  ["products", "All products"],
  ["brands", "Brands"],
  ["duplicates", "Duplicates"],
  ["restricted", "Restricted"],
  ["history", "Moderation history"],
];

export default function Products({ initialFilter, onNavigate }) {
  const [tab, setTab] = useState(initialFilter?.tab || "products");
  const [seed, setSeed] = useState(initialFilter || null);

  // jump from Brands → the product list filtered to one brand
  const showBrand = (brand) => {
    setSeed({ brand });
    setTab("products");
  };

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Products</h1>
          <p className="ap-view-sub">
            Catalogue moderation across every shop ·{" "}
            <button className="ap-link" onClick={() => onNavigate?.("categories")}>
              Manage categories →
            </button>
          </p>
        </div>
      </div>

      <div className="ap-tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={tab === k ? "is-active" : ""} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "products" && <ProductList seed={seed} />}
      {tab === "brands" && <Brands onShowBrand={showBrand} />}
      {tab === "duplicates" && <Duplicates />}
      {tab === "restricted" && <Restricted />}
      {tab === "history" && (
        <section className="ap-panel">
          <ModerationHistory entityType="product" limit={200} showEntity />
        </section>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- list --- */

const BLANK = { shopId: "", shopName: "", categoryId: "", brand: "", state: "" };

function ProductList({ seed }) {
  const notify = useToast();
  const [filters, setFilters] = useState(() => ({ ...BLANK, ...(seed || {}) }));
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState(null);
  const [dialog, setDialog] = useState(null); // { product, action }
  const [busy, setBusy] = useState(false);

  useEffect(() => setPage(0), [search]);

  const cats = useAsync(fetchCategories, []);
  const catName = useMemo(
    () => new Map((cats.data || []).map((c) => [String(c.id), c.name])),
    [cats.data],
  );

  const key = JSON.stringify({ ...filters, search, page });
  const { state, data, error, reload } = useAsync(
    () => fetchProducts({ page, pageSize: 25, search, ...filters }),
    [key],
  );
  const rows = data?.rows || [];
  const total = data?.total || 0;
  const set = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };
  const dirty = searchInput || JSON.stringify(filters) !== JSON.stringify(BLANK);

  async function act(product, action, reason) {
    setBusy(true);
    try {
      await setProductFlag(product.id, action, reason);
      notify(`Product ${action === "restrict" ? "restricted" : action === "unrestrict" ? "unrestricted" : `${action}d`}`, "ok");
      setDialog(null);
      setDetail(null);
      reload();
    } catch (e) {
      notify(e.message || "Action failed", "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {filters.shopId && (
        <div className="ap-chip-row" style={{ marginBottom: 12 }}>
          <span className="ap-chip">
            Shop: {filters.shopName || filters.shopId}{" "}
            <button className="ap-link" onClick={() => set({ shopId: "", shopName: "" })} aria-label="Remove shop filter">
              ✕
            </button>
          </span>
        </div>
      )}
      <div className="ap-filters">
        <input
          className="ap-filters-search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Name, brand, barcode or id"
          aria-label="Search products"
        />
        <select value={filters.categoryId} onChange={(e) => set({ categoryId: e.target.value })} aria-label="Filter by category">
          <option value="">Any category</option>
          {(cats.data || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          value={filters.brand}
          onChange={(e) => set({ brand: e.target.value })}
          placeholder="Brand"
          aria-label="Filter by brand"
        />
        <select value={filters.state} onChange={(e) => set({ state: e.target.value })} aria-label="Filter by state">
          <option value="">Any state</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
          <option value="restricted">Restricted</option>
        </select>
        {dirty && (
          <button
            className="ap-filters-reset"
            onClick={() => {
              setFilters(BLANK);
              setSearchInput("");
              setPage(0);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <Async state={state} error={error} onRetry={reload} isEmpty={rows.length === 0} empty="No products match these filters.">
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Shop</th>
                <th className="ap-num">Stock</th>
                <th>State</th>
                <th>Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={p.is_restricted ? "is-deleted" : ""}>
                  <td>
                    <span className="ap-prod-cell">
                      {productImage(p) && <img className="ap-thumb" src={productImage(p)} alt="" loading="lazy" />}
                      <span>
                        <button className="ap-link" onClick={() => setDetail(p)}>
                          {p.name || "—"}
                        </button>
                        {p.unit && <div className="ap-muted-line">{p.unit}</div>}
                      </span>
                    </span>
                  </td>
                  <td>{p.brand || "—"}</td>
                  <td>{catName.get(String(p.category_id)) || "—"}</td>
                  <td>{p._shop?.name || p.shop_id}</td>
                  <td className="ap-num">
                    {p.stock_qty != null ? num(p.stock_qty) : p.in_stock === false ? "out" : "—"}
                  </td>
                  <td>
                    <StateBadge p={p} />
                  </td>
                  <td>{fmtDate(p.created_at)}</td>
                  <td className="ap-row-actions">
                    {p.is_restricted ? (
                      <ConfirmButton
                        className="ap-btn ap-btn-sm ap-btn-ghost"
                        confirmLabel="Lift?"
                        onConfirm={() => act(p, "unrestrict")}
                      >
                        Unrestrict
                      </ConfirmButton>
                    ) : (
                      <button className="ap-btn ap-btn-sm ap-btn-danger" disabled={busy} onClick={() => setDialog({ product: p, action: "restrict" })}>
                        Restrict
                      </button>
                    )}
                    <button className="ap-btn ap-btn-sm ap-btn-ghost" onClick={() => setDetail(p)}>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} pageSize={25} total={total} onPage={setPage} />
      </Async>

      {detail && (
        <Modal title={detail.name || "Product"} onClose={() => setDetail(null)} wide>
          {productImages(detail).length > 0 && (
            <div className="ap-gallery">
              {productImages(detail).map((src) => (
                <a key={src} href={src} target="_blank" rel="noreferrer">
                  <img src={src} alt="" loading="lazy" />
                </a>
              ))}
            </div>
          )}
          <div className="ap-detail-grid">
            <Detail label="State" value={<StateBadge p={detail} />} />
            <Detail label="Brand" value={detail.brand} />
            <Detail label="Category" value={catName.get(String(detail.category_id))} />
            <Detail label="Shop" value={detail._shop?.name || detail.shop_id} />
            <Detail label="Unit" value={detail.unit} />
            <Detail label="Stock" value={detail.stock_qty != null ? num(detail.stock_qty) : String(detail.in_stock ?? "—")} />
            <Detail label="Barcode" value={detail.barcode} />
            <Detail label="Added" value={fmtDateTime(detail.created_at)} />
            {detail.is_restricted && (
              <Detail label="Restricted" value={`${detail.restricted_reason || "—"} (${fmtDateTime(detail.restricted_at)})`} span />
            )}
            <Detail label="Description" value={detail.description} span />
            <Detail label="Product id" value={<span className="ap-mono">{detail.id}</span>} span />
          </div>

          <div className="ap-panel-head" style={{ marginTop: 16 }}>
            <h2>Admin actions</h2>
          </div>
          <ModerationHistory entityType="product" entityId={detail.id} limit={20} />

          <div className="ap-detail-actions" style={{ marginTop: 16 }}>
            {detail.is_restricted ? (
              <button className="ap-btn ap-btn-ghost" disabled={busy} onClick={() => act(detail, "unrestrict")}>
                Lift restriction
              </button>
            ) : (
              <button className="ap-btn ap-btn-danger" disabled={busy} onClick={() => setDialog({ product: detail, action: "restrict" })}>
                Restrict…
              </button>
            )}
            {detail.is_active === false ? (
              <button className="ap-btn ap-btn-ok" disabled={busy || detail.is_restricted} onClick={() => act(detail, "activate")}>
                Activate
              </button>
            ) : (
              <button className="ap-btn ap-btn-ghost" disabled={busy} onClick={() => setDialog({ product: detail, action: "deactivate" })}>
                Deactivate…
              </button>
            )}
          </div>
          <p className="ap-field-hint">
            <strong>Restrict</strong> is an admin lock: the product disappears for customers and the vendor can&rsquo;t
            undo it. <strong>Deactivate</strong> just switches it off — the vendor can switch it back on.
          </p>
        </Modal>
      )}

      {dialog && (
        <ReasonDialog
          title={`${dialog.action === "restrict" ? "Restrict" : "Deactivate"} ${dialog.product.name}?`}
          confirmLabel={dialog.action === "restrict" ? "Restrict product" : "Deactivate"}
          required={dialog.action === "restrict"}
          busy={busy}
          placeholder={dialog.action === "restrict" ? "e.g. Tobacco products aren't allowed on BreakQ" : "Optional"}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => act(dialog.product, dialog.action, reason)}
        />
      )}
    </>
  );
}

function productImages(p) {
  const list = Array.isArray(p.image_urls) ? p.image_urls : [];
  return [...new Set([p.image_url, ...list].filter((u) => typeof u === "string" && u))];
}
const productImage = (p) => productImages(p)[0];

function StateBadge({ p }) {
  if (p.is_restricted) return <Badge tone="danger">restricted</Badge>;
  if (p.is_active === false) return <Badge tone="warn">deactivated</Badge>;
  return <Badge tone="ok">active</Badge>;
}

/* ------------------------------------------------------------- brands --- */

function Brands({ onShowBrand }) {
  const notify = useToast();
  const { state, data, error, reload } = useAsync(fetchBrands, []);
  const [q, setQ] = useState("");
  const [renaming, setRenaming] = useState(null);

  if (data?._missing) return <NeedsSetup what="Brands" file={OPS_SQL} />;
  const all = data?.brands || [];
  const t = q.trim().toLowerCase();
  const rows = t ? all.filter((b) => String(b.brand).toLowerCase().includes(t)) : all;
  const variantCount = all.filter((b) => (b.variants || []).length > 1).length;

  return (
    <>
      <section className="ap-stat-grid">
        <div className="ap-stat">
          <span className="ap-stat-label">Brands</span>
          <span className="ap-stat-value">{num(all.length)}</span>
        </div>
        <div className="ap-stat">
          <span className="ap-stat-label">Spelled more than one way</span>
          <span className="ap-stat-value">{num(variantCount)}</span>
        </div>
        <div className="ap-stat">
          <span className="ap-stat-label">Products with no brand</span>
          <span className="ap-stat-value">{num(data?.unbranded)}</span>
        </div>
      </section>
      <div className="ap-filters">
        <input className="ap-filters-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a brand" aria-label="Find a brand" />
      </div>
      <Async state={state} error={error} onRetry={reload} isEmpty={rows.length === 0} empty="No brands recorded on products yet.">
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Spellings in use</th>
                <th className="ap-num">Products</th>
                <th className="ap-num">Shops</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.brand}>
                  <td>
                    <button className="ap-link" onClick={() => onShowBrand(b.brand)}>
                      {b.brand}
                    </button>
                    {b.restricted > 0 && <Badge tone="danger">{num(b.restricted)} restricted</Badge>}
                  </td>
                  <td>
                    {(b.variants || []).length > 1 ? (
                      <span className="ap-chip-row">
                        {b.variants.map((v) => (
                          <span key={v} className="ap-chip">
                            {v}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="ap-td-empty">—</span>
                    )}
                  </td>
                  <td className="ap-num">{num(b.products)}</td>
                  <td className="ap-num">{num(b.shops)}</td>
                  <td className="ap-row-actions">
                    <button className="ap-btn ap-btn-sm ap-btn-ghost" onClick={() => setRenaming(b)}>
                      Rename / merge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>

      {renaming && (
        <RenameBrand
          brand={renaming}
          brands={all}
          onClose={() => setRenaming(null)}
          onDone={(n) => {
            notify(`Updated ${num(n)} products`, "ok");
            setRenaming(null);
            reload();
          }}
          onError={(m) => notify(m, "danger")}
        />
      )}
    </>
  );
}

function RenameBrand({ brand, brands, onClose, onDone, onError }) {
  const [to, setTo] = useState(brand.brand);
  const [busy, setBusy] = useState(false);
  const merging = brands.find(
    (b) => b.brand !== brand.brand && String(b.brand).toLowerCase() === to.trim().toLowerCase(),
  );
  return (
    <Modal
      title={`Rename brand “${brand.brand}”`}
      onClose={onClose}
      footer={
        <>
          <button className="ap-btn ap-btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="ap-btn ap-btn-primary"
            disabled={busy || !to.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                onDone(await renameBrand(brand.brand, to.trim()));
              } catch (e) {
                onError(e.message || "Rename failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Working…" : merging ? "Merge brands" : "Rename"}
          </button>
        </>
      }
    >
      <p className="ap-confirm-msg">
        All {num(brand.products)} products whose brand is{" "}
        {(brand.variants || [brand.brand]).map((v) => `“${v}”`).join(", ")} will be set to the name below.
      </p>
      <Field
        label="New brand name"
        hint={merging ? `“${merging.brand}” already exists — the two will be merged.` : "Case and spacing are normalised when matching."}
      >
        <input value={to} onChange={(e) => setTo(e.target.value)} list="ap-brand-list" autoFocus />
        <datalist id="ap-brand-list">
          {brands.map((b) => (
            <option key={b.brand} value={b.brand} />
          ))}
        </datalist>
      </Field>
    </Modal>
  );
}

/* --------------------------------------------------------- duplicates --- */

function Duplicates() {
  const notify = useToast();
  const { state, data, error, reload } = useAsync(fetchDuplicateProducts, []);
  const [busyId, setBusyId] = useState(null);

  if (data?._missing) return <NeedsSetup what="Duplicate detection" file={OPS_SQL} />;
  const groups = data?.groups || [];

  async function deactivate(p) {
    setBusyId(p.id);
    try {
      await setProductFlag(p.id, "deactivate", "Duplicate listing");
      notify("Duplicate deactivated", "ok");
      reload();
    } catch (e) {
      notify(e.message || "Failed", "danger");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <p className="ap-view-sub" style={{ marginBottom: 12 }}>
        Listings inside the <strong>same shop</strong> with the same name + unit, or the same barcode. The oldest copy
        is listed first; deactivate the extras.
      </p>
      <Async state={state} error={error} onRetry={reload} isEmpty={groups.length === 0} empty="No duplicate listings found.">
        {groups.map((g, gi) => (
          <section className="ap-panel" key={`${g.shop_id}-${g.kind}-${g.match_key}-${gi}`}>
            <div className="ap-panel-head">
              <h2>
                {g.shop_name} · {num(g.count)} copies
              </h2>
              <span className="ap-view-sub">
                same {g.kind === "barcode" ? "barcode" : "name + unit"}: <code>{g.match_key}</code>
              </span>
            </div>
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Brand</th>
                    <th>Barcode</th>
                    <th>State</th>
                    <th>Added</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(g.items || []).map((p, i) => (
                    <tr key={p.id}>
                      <td>
                        {p.name} {i === 0 && <Badge tone="ok">oldest</Badge>}
                        {p.unit && <div className="ap-muted-line">{p.unit}</div>}
                      </td>
                      <td>{p.brand || "—"}</td>
                      <td>{p.barcode || "—"}</td>
                      <td>
                        <StateBadge p={p} />
                      </td>
                      <td>{fmtDate(p.created_at)}</td>
                      <td className="ap-row-actions">
                        {p.is_active !== false && !p.is_restricted && (
                          <button className="ap-btn ap-btn-sm ap-btn-ghost" disabled={busyId === p.id} onClick={() => deactivate(p)}>
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </Async>
    </>
  );
}

/* --------------------------------------------------------- restricted --- */

function Restricted() {
  const notify = useToast();
  const kw = useAsync(fetchRestrictedKeywords, []);
  const matches = useAsync(fetchRestrictedMatches, []);
  const restricted = useAsync(() => fetchProducts({ pageSize: 100, state: "restricted" }), []);
  const [keyword, setKeyword] = useState("");
  const [reason, setReason] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  if (kw.data?._missing) return <NeedsSetup what="Restricted products" file={OPS_SQL} />;

  const reloadAll = () => {
    kw.reload();
    matches.reload();
    restricted.reload();
  };

  async function add(e) {
    e.preventDefault();
    if (!keyword.trim()) return;
    try {
      await addRestrictedKeyword(keyword, reason);
      setKeyword("");
      setReason("");
      notify("Keyword added", "ok");
      reloadAll();
    } catch (err) {
      notify(err.message || "Could not add keyword", "danger");
    }
  }

  async function restrict(p, why) {
    setBusy(true);
    try {
      await setProductFlag(p.id, "restrict", why);
      notify("Product restricted", "ok");
      setDialog(null);
      reloadAll();
    } catch (e) {
      notify(e.message || "Failed", "danger");
    } finally {
      setBusy(false);
    }
  }

  const matchRows = matches.data?.matches || [];
  const restrictedRows = restricted.data?.rows || [];

  return (
    <>
      <section className="ap-panel">
        <div className="ap-panel-head">
          <h2>Blocked keywords</h2>
          <span className="ap-view-sub">products containing these words are flagged below for review</span>
        </div>
        <form className="ap-bar" onSubmit={add}>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Keyword, e.g. cigarette" style={{ maxWidth: 220 }} />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why (optional)" style={{ maxWidth: 280 }} />
          <button className="ap-btn ap-btn-primary" type="submit">
            Add
          </button>
        </form>
        <Async state={kw.state} error={kw.error} onRetry={kw.reload} isEmpty={(kw.data?.rows || []).length === 0} empty="No blocked keywords yet.">
          <div className="ap-chip-row">
            {(kw.data?.rows || []).map((k) => (
              <span key={k.keyword} className="ap-chip" title={k.reason || ""}>
                {k.keyword}{" "}
                <button
                  className="ap-link"
                  aria-label={`Remove ${k.keyword}`}
                  onClick={async () => {
                    try {
                      await deleteRestrictedKeyword(k.keyword);
                      reloadAll();
                    } catch (e) {
                      notify(e.message || "Failed", "danger");
                    }
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </Async>
      </section>

      <section className="ap-panel">
        <div className="ap-panel-head">
          <h2>Flagged by keyword</h2>
          <span className="ap-view-sub">not restricted yet · review and restrict</span>
        </div>
        <Async state={matches.state} error={matches.error} onRetry={matches.reload} isEmpty={matchRows.length === 0} empty="Nothing matches the blocked keywords.">
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Shop</th>
                  <th>Matched</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {matchRows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.name}
                      {p.brand && <div className="ap-muted-line">{p.brand}</div>}
                    </td>
                    <td>{p.shop_name || p.shop_id}</td>
                    <td>
                      <span className="ap-chip-row">
                        {(p.keywords || []).map((k) => (
                          <span key={k} className="ap-chip">
                            {k}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="ap-row-actions">
                      <button className="ap-btn ap-btn-sm ap-btn-danger" disabled={busy} onClick={() => setDialog({ ...p, _reason: p.reasons })}>
                        Restrict
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Async>
      </section>

      <section className="ap-panel">
        <div className="ap-panel-head">
          <h2>Restricted products</h2>
          <span className="ap-view-sub">hidden from customers · vendor can&rsquo;t lift</span>
        </div>
        <Async state={restricted.state} error={restricted.error} onRetry={restricted.reload} isEmpty={restrictedRows.length === 0} empty="No restricted products.">
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Shop</th>
                  <th>Reason</th>
                  <th>Since</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {restrictedRows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p._shop?.name || p.shop_id}</td>
                    <td>{p.restricted_reason || "—"}</td>
                    <td>{fmtDate(p.restricted_at)}</td>
                    <td className="ap-row-actions">
                      <ConfirmButton
                        className="ap-btn ap-btn-sm ap-btn-ghost"
                        confirmLabel="Lift?"
                        onConfirm={async () => {
                          try {
                            await setProductFlag(p.id, "unrestrict");
                            notify("Restriction lifted", "ok");
                            reloadAll();
                          } catch (e) {
                            notify(e.message || "Failed", "danger");
                          }
                        }}
                      >
                        Unrestrict
                      </ConfirmButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Async>
      </section>

      {dialog && (
        <ReasonDialog
          title={`Restrict ${dialog.name}?`}
          confirmLabel="Restrict product"
          busy={busy}
          placeholder={dialog._reason || "e.g. Not allowed on BreakQ"}
          onClose={() => setDialog(null)}
          onSubmit={(why) => restrict(dialog, why)}
        />
      )}
    </>
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
