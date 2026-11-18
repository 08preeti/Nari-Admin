import { useMemo, useState } from "react";
import Modal from "../common/Modal";
import CategorySelects from "./CategorySelects";
import { money } from "../../utils/formatters";

const dateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");
const today = () => new Date().toISOString().slice(0, 10);

export default function OrderBasicForm({ order, onClose, onSave }) {
  const editing = !!order;
  const [v, setV] = useState(() => ({
    customerName: order?.customer?.name || "",
    phone: order?.customer?.mobile || "",
    address: order?.address?.line1 || "",
    mainCategory: order?.catalog?.mainCategory?.id || "",
    category: order?.catalog?.category?.id || "",
    subCategory: order?.catalog?.subCategory?.id || "",
    totalAmount: order?.payment?.totalAmount ?? "",
    paidAmount: order?.payment?.paidAmount ?? "",
    receivedDate: dateInput(order?.receivedDate || order?.createdAt) || today(),
    deliveredDate: dateInput(order?.deliveredDate),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const set = (patch) => setV((o) => ({ ...o, ...patch }));

  const total = Number(v.totalAmount);
  const paid = v.paidAmount === "" ? 0 : Number(v.paidAmount);
  const pending =
    Number.isNaN(total) || Number.isNaN(paid)
      ? null
      : Math.max(total - paid, 0);

  const errors = useMemo(() => {
    const e = {};
    if (!v.customerName.trim()) e.customerName = "Customer name is required";
    if (v.phone.replace(/\D/g, "").length < 10)
      e.phone = "Enter a valid 10-digit phone number";
    if (!v.address.trim()) e.address = "Address is required";
    if (!v.mainCategory) e.mainCategory = "Select a main category";
    if (!v.category) e.category = "Select a category";
    if (!v.subCategory) e.subCategory = "Select a subcategory";
    if (v.totalAmount === "" || Number.isNaN(total) || total < 0)
      e.totalAmount = "Enter the total (0 or more)";
    if (Number.isNaN(paid) || paid < 0)
      e.paidAmount = "Amount paid cannot be negative";
    else if (!Number.isNaN(total) && paid > total)
      e.paidAmount = "Amount paid cannot exceed the total";
    if (!v.receivedDate) e.receivedDate = "Order received date is required";
    if (v.deliveredDate && v.receivedDate && v.deliveredDate < v.receivedDate)
      e.deliveredDate = "Cannot be before the received date";
    return e;
  }, [v, total, paid]);
  const shown = submitted ? errors : {};
  const err = (k) =>
    shown[k] && <small className="field-error">{shown[k]}</small>;

  async function submit(ev) {
    ev.preventDefault();
    setSubmitted(true);
    setError("");
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      await onSave({
        customerName: v.customerName.trim(),
        phone: v.phone.trim(),
        address: v.address.trim(),
        mainCategory: v.mainCategory,
        category: v.category,
        subCategory: v.subCategory,
        totalAmount: total,
        paidAmount: paid,
        receivedDate: v.receivedDate,
        deliveredDate: v.deliveredDate || null,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      locked
      wide
      eyebrow={editing ? "UPDATE ORDER" : "NEW ORDER"}
      title={editing ? `Edit ${order.orderId}` : "Add order"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="outline-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            form="order-basic-form"
            className="primary-btn"
            disabled={busy}
          >
            {busy ? "Saving…" : "Save order"}
          </button>
        </>
      }
    >
      <form id="order-basic-form" onSubmit={submit} noValidate>
        {error && <div className="error banner">{error}</div>}
        <div className="form-grid">
          <div className="field">
            <label>Customer name *</label>
            <input
              value={v.customerName}
              maxLength={100}
              className={shown.customerName ? "invalid" : ""}
              onChange={(e) => set({ customerName: e.target.value })}
            />
            {err("customerName")}
          </div>
          <div className="field">
            <label>Phone *</label>
            <input
              type="tel"
              value={v.phone}
              className={shown.phone ? "invalid" : ""}
              onChange={(e) => set({ phone: e.target.value })}
            />
            {err("phone")}
          </div>
          <div className="field full-field">
            <label>Address *</label>
            <textarea
              rows="2"
              value={v.address}
              maxLength={500}
              className={shown.address ? "invalid" : ""}
              onChange={(e) => set({ address: e.target.value })}
            />
            {err("address")}
          </div>
        </div>
        <CategorySelects
          value={{
            mainCategory: v.mainCategory,
            category: v.category,
            subCategory: v.subCategory,
          }}
          onChange={(next) => set(next)}
          errors={shown}
        />
        <div className="form-grid three">
          <div className="field">
            <label>Total (₹) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={v.totalAmount}
              className={shown.totalAmount ? "invalid" : ""}
              onChange={(e) => set({ totalAmount: e.target.value })}
            />
            {err("totalAmount")}
          </div>
          <div className="field">
            <label>Amount paid (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={v.paidAmount}
              className={shown.paidAmount ? "invalid" : ""}
              onChange={(e) => set({ paidAmount: e.target.value })}
            />
            {err("paidAmount")}
          </div>
          <div className="field">
            <label>Pending amount</label>
            <div className="readonly-box">
              <b>{pending === null ? "—" : money(pending)}</b>
            </div>
            <small className="hint">Total minus amount paid.</small>
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Order received date *</label>
            <input
              type="date"
              value={v.receivedDate}
              className={shown.receivedDate ? "invalid" : ""}
              onChange={(e) => set({ receivedDate: e.target.value })}
            />
            {err("receivedDate")}
          </div>
          <div className="field">
            <label>Delivered date</label>
            <input
              type="date"
              min={v.receivedDate || undefined}
              value={v.deliveredDate}
              className={shown.deliveredDate ? "invalid" : ""}
              onChange={(e) => set({ deliveredDate: e.target.value })}
            />
            {err("deliveredDate")}
            <small className="hint">
              Leave empty until the order is delivered.
            </small>
          </div>
        </div>
      </form>
    </Modal>
  );
}
