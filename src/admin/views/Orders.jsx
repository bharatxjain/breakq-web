import { useEffect, useMemo, useState } from "react";
import {
  cancelOrder,
  fetchOrderFacets,
  fetchOrderItems,
  fetchOrders,
  refundOrder,
} from "../api";
import {
  Async,
  Badge,
  Modal,
  fmtDateTime,
  money,
  num,
  statusTone,
  useAsync,
  useToast,
} from "../ui";
import { ModerationHistory, Pager, ReasonDialog, useDebounced } from "../moderation";

const PAGE_SIZE = 25;
const BLANK = {
  status: "",
  paymentStatus: "",
  paymentMethod: "",
  from: "",
  to: "",
  shopId: "",
  shopName: "",
  customerId: "",
  customerName: "",
};

const isCancelled = (s) => /^(cancel|reject|declin)/i.test(s || "");
const isCompleted = (s) =>
  ["completed", "delivered", "picked_up", "picked up", "fulfilled"].includes(
    String(s || "").toLowerCase(),
  );

function orderTone(s) {
  if (isCancelled(s)) return "danger";
  if (isCompleted(s)) return "ok";
  return statusTone(s) === "neutral" ? "warn" : statusTone(s);
}

function orderLabel(o) {
  return o.order_number != null ? `#${o.order_number}` : String(o.id).slice(0, 10);
}

export default function Orders({ initialFilter, onNavigate }) {
  const notify = useToast();
  const [filters, setFilters] = useState(() => ({ ...BLANK, ...(initialFilter || {}) }));
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState(null);

  useEffect(() => setPage(0), [search]);

  // A drill-down while already on this tab (e.g. "All orders by this
  // customer") doesn't remount the view, so apply the new seed here.
  useEffect(() => {
    if (!initialFilter) return;
    setFilters({ ...BLANK, ...initialFilter });
    setPage(0);
    setDetail(null);
  }, [initialFilter]);

  const facets = useAsync(fetchOrderFacets, []);
  const F = facets.data && !facets.data._missing ? facets.data : null;

  const key = useMemo(() => JSON.stringify({ ...filters, search, page }), [filters, search, page]);
  const { state, data, error, reload } = useAsync(
    () => fetchOrders({ page, pageSize: PAGE_SIZE, search, ...filters }),
    [key],
  );
  const rows = data?.rows || [];
  const total = data?.total || 0;

  const set = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };
  const dirty = searchInput || JSON.stringify(filters) !== JSON.stringify(BLANK);

  return (
    <div className="ap-view">
      <div className="ap-view-head">
        <div>
          <h1>Orders</h1>
          <p className="ap-view-sub">
            {num(total)} orders · search, filter, cancel &amp; refund
          </p>
        </div>
        <button className="ap-btn ap-btn-ghost" onClick={reload}>
          Refresh
        </button>
      </div>

      {(filters.shopId || filters.customerId) && (
        <div className="ap-chip-row" style={{ marginBottom: 12 }}>
          {filters.shopId && (
            <span className="ap-chip">
              Shop: {filters.shopName || filters.shopId}{" "}
              <button className="ap-link" onClick={() => set({ shopId: "", shopName: "" })} aria-label="Remove shop filter">
                ✕
              </button>
            </span>
          )}
          {filters.customerId && (
            <span className="ap-chip">
              Customer: {filters.customerName || filters.customerId}{" "}
              <button className="ap-link" onClick={() => set({ customerId: "", customerName: "" })} aria-label="Remove customer filter">
                ✕
              </button>
            </span>
          )}
        </div>
      )}

      <div className="ap-filters">
        <input
          className="ap-filters-search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Order #, order id or customer name"
          aria-label="Search orders"
        />
        <FacetSelect
          label="Any status"
          aria="Filter by order status"
          value={filters.status}
          options={F?.statuses}
          onChange={(v) => set({ status: v })}
        />
        <FacetSelect
          label="Any payment"
          aria="Filter by payment status"
          value={filters.paymentStatus}
          options={F?.payment_statuses}
          fallback={["pending", "paid", "refunded"]}
          onChange={(v) => set({ paymentStatus: v })}
        />
        <FacetSelect
          label="Any method"
          aria="Filter by payment method"
          value={filters.paymentMethod}
          options={F?.payment_methods}
          onChange={(v) => set({ paymentMethod: v })}
        />
        <input
          type="date"
          value={filters.from}
          onChange={(e) => set({ from: e.target.value })}
          aria-label="From date"
          title="From date"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => set({ to: e.target.value })}
          aria-label="To date"
          title="To date"
        />
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
      {facets.data?._missing && (
        <p className="ap-field-hint" style={{ marginBottom: 12 }}>
          Status / method dropdowns list live values once <code>supabase/admin_operations.sql</code> is run.
        </p>
      )}

      <Async
        state={state}
        error={error}
        onRetry={reload}
        isEmpty={rows.length === 0}
        empty="No orders match these filters."
      >
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Shop</th>
                <th className="ap-num">Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Placed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <button className="ap-link" onClick={() => setDetail(o)}>
                      {orderLabel(o)}
                    </button>
                  </td>
                  <td>
                    {o.customer_name || o._customer?.full_name || "-"}
                    {o._customer?.email && <div className="ap-muted-line">{o._customer.email}</div>}
                  </td>
                  <td>{o._shop?.name || o.shop_id || "-"}</td>
                  <td className="ap-num">{money(o.total_amount)}</td>
                  <td>
                    <Badge tone={statusTone(o.payment_status)}>{o.payment_status || "-"}</Badge>
                    {o.payment_method && <div className="ap-muted-line">{o.payment_method}</div>}
                  </td>
                  <td>
                    <Badge tone={orderTone(o.status)}>{o.status || "-"}</Badge>
                  </td>
                  <td>{fmtDateTime(o.created_at)}</td>
                  <td className="ap-row-actions">
                    <button className="ap-btn ap-btn-sm ap-btn-ghost" onClick={() => setDetail(o)}>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
      </Async>

      {detail && (
        <OrderDetail
          order={detail}
          onClose={() => setDetail(null)}
          onNavigate={onNavigate}
          onChanged={(msg) => {
            notify(msg, "ok");
            setDetail(null);
            reload();
          }}
          onError={(m) => notify(m, "danger")}
        />
      )}
    </div>
  );
}

function FacetSelect({ label, aria, value, options, fallback = [], onChange }) {
  const list = options?.length ? options : fallback.map((v) => ({ value: v }));
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={aria}>
      <option value="">{label}</option>
      {list.map((o) => (
        <option key={o.value} value={o.value}>
          {o.value}
          {o.count != null ? ` (${num(o.count)})` : ""}
        </option>
      ))}
      {value && !list.some((o) => o.value === value) && <option value={value}>{value}</option>}
    </select>
  );
}

const TIMELINE = [
  ["created_at", "Placed"],
  ["confirmed_at", "Accepted by shop"],
  ["preparing_at", "Preparing"],
  ["ready_at", "Ready"],
  ["completed_at", "Completed"],
  ["cancelled_at", "Cancelled"],
  ["refunded_at", "Refunded"],
];

function OrderDetail({ order: o, onClose, onChanged, onError, onNavigate }) {
  const items = useAsync(() => fetchOrderItems(o.id), [o.id]);
  const [dialog, setDialog] = useState(null); // cancel | refund
  const [busy, setBusy] = useState(false);

  // Items live in order_items; older orders may only have the inline json copy.
  const rows = items.data?.length
    ? items.data.map((i) => ({
        name: i.product_name || i.product_id,
        qty: i.quantity,
        price: i.unit_price,
      }))
    : Array.isArray(o.items)
      ? o.items.map((i) => ({
          name: i.product_name || i.name || i.title || i.product_id || "Item",
          qty: i.quantity ?? i.qty ?? 1,
          price: i.unit_price ?? i.price ?? null,
        }))
      : [];
  const itemsTotal = rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.price) || 0), 0);

  const canCancel = !isCancelled(o.status) && !isCompleted(o.status);
  const canRefund = o.payment_status === "paid";

  async function run(fn, msg) {
    setBusy(true);
    try {
      await fn();
      onChanged(msg);
    } catch (e) {
      onError(e.message || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const customerId = o.customer_id || o.user_id;

  return (
    <>
      <Modal title={`Order ${orderLabel(o)}`} onClose={onClose} wide>
        <div className="ap-detail-grid">
          <Detail label="Status" value={<Badge tone={orderTone(o.status)}>{o.status || "-"}</Badge>} />
          <Detail
            label="Payment"
            value={
              <>
                <Badge tone={statusTone(o.payment_status)}>{o.payment_status || "-"}</Badge>{" "}
                {o.payment_method || ""}
              </>
            }
          />
          <Detail label="Total" value={money(o.total_amount)} />
          <Detail
            label="Platform take"
            value={money((Number(o.commission_rupees) || 0) + (Number(o.platform_fee_rupees) || 0))}
          />
          <Detail
            label="Customer"
            value={
              <>
                {o.customer_name || o._customer?.full_name || "-"}
                {o._customer?.email && <div className="ap-muted-line">{o._customer.email}</div>}
                {customerId && onNavigate && (
                  <button
                    className="ap-link"
                    onClick={() =>
                      onNavigate("orders", {
                        customerId,
                        customerName: o.customer_name || o._customer?.email || "",
                      })
                    }
                  >
                    All orders by this customer →
                  </button>
                )}
              </>
            }
          />
          <Detail
            label="Shop"
            value={
              <>
                {o._shop?.name || o.shop_id}
                {o._shop?.locality && <div className="ap-muted-line">{o._shop.locality}</div>}
              </>
            }
          />
          {o.promo_code && <Detail label="Promo code" value={o.promo_code} />}
          <Detail label="Order id" value={<span className="ap-mono">{o.id}</span>} span />
          {o.cancel_reason && (
            <Detail
              label="Cancellation"
              value={`${o.cancel_reason}${o.cancelled_by ? ` (by ${o.cancelled_by})` : ""}`}
              span
            />
          )}
          {o.refund_amount != null && (
            <Detail label="Refund" value={`${money(o.refund_amount)}${o.refund_reason ? ` (${o.refund_reason})` : ""}`} span />
          )}
        </div>

        <div className="ap-panel-head" style={{ marginTop: 16 }}>
          <h2>Items</h2>
        </div>
        <Async state={items.state} error={items.error} onRetry={items.reload} isEmpty={rows.length === 0} empty="No line items recorded.">
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="ap-num">Qty</th>
                  <th className="ap-num">Unit price</th>
                  <th className="ap-num">Line total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td className="ap-num">{num(r.qty)}</td>
                    <td className="ap-num">{r.price != null ? money(r.price) : "-"}</td>
                    <td className="ap-num">
                      {r.price != null ? money((Number(r.qty) || 0) * Number(r.price)) : "-"}
                    </td>
                  </tr>
                ))}
                {itemsTotal > 0 && (
                  <tr>
                    <td colSpan={3}>
                      <strong>Items subtotal</strong>
                    </td>
                    <td className="ap-num">
                      <strong>{money(itemsTotal)}</strong>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Async>

        <div className="ap-panel-head" style={{ marginTop: 16 }}>
          <h2>Timeline</h2>
        </div>
        <ul className="ap-timeline">
          {TIMELINE.filter(([k]) => o[k]).map(([k, label]) => (
            <li key={k}>
              <strong>{label}</strong>
              <span>{fmtDateTime(o[k])}</span>
            </li>
          ))}
        </ul>

        <div className="ap-panel-head" style={{ marginTop: 16 }}>
          <h2>Admin actions</h2>
        </div>
        <ModerationHistory entityType="order" entityId={o.id} limit={20} />

        <div className="ap-detail-actions" style={{ marginTop: 16 }}>
          {canCancel && (
            <button className="ap-btn ap-btn-danger" disabled={busy} onClick={() => setDialog("cancel")}>
              Cancel order…
            </button>
          )}
          {canRefund && (
            <button className="ap-btn ap-btn-primary" disabled={busy} onClick={() => setDialog("refund")}>
              Record refund…
            </button>
          )}
          {!canCancel && !canRefund && (
            <span className="ap-field-hint">
              No actions available: the order is {o.status?.toLowerCase() || "closed"} and payment is{" "}
              {o.payment_status || "unknown"}.
            </span>
          )}
        </div>
      </Modal>

      {dialog === "cancel" && (
        <ReasonDialog
          title={`Cancel order ${orderLabel(o)}?`}
          confirmLabel="Cancel order"
          busy={busy}
          onClose={() => setDialog(null)}
          placeholder="e.g. Shop unresponsive for 30 minutes"
          message={
            <>
              The order is marked <strong>Cancelled</strong> (cancelled by admin).
              {o.payment_status === "paid" && " It was paid online. Record a refund afterwards once the money is returned."}
            </>
          }
          onSubmit={(reason) => run(() => cancelOrder(o.id, reason), "Order cancelled")}
        />
      )}
      {dialog === "refund" && (
        <ReasonDialog
          title={`Refund order ${orderLabel(o)}`}
          confirmLabel="Record refund"
          tone="primary"
          busy={busy}
          amount={{ label: "Refund amount (₹)", max: Number(o.total_amount) || undefined, initial: o.total_amount ?? "" }}
          onClose={() => setDialog(null)}
          placeholder="e.g. Items out of stock after payment"
          message={
            <>
              Marks the payment as <strong>refunded</strong> and records the amount. This is bookkeeping only;
              return the money through the payment gateway dashboard (or in cash) as well.
            </>
          }
          onSubmit={(reason, amount) => run(() => refundOrder(o.id, amount, reason), "Refund recorded")}
        />
      )}
    </>
  );
}

function Detail({ label, value, span }) {
  return (
    <div className={`ap-detail ${span ? "ap-detail-span" : ""}`}>
      <span className="ap-detail-label">{label}</span>
      <span className="ap-detail-value">{value ?? "-"}</span>
    </div>
  );
}
