import { useEffect, useState } from 'react';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import SafeImage from './SafeImage';
import { getOrder } from '../../services/orderService';
import { money, date, dateTime, colorLabel } from '../../utils/formatters';

const Info = ({ label, children }) => <div className="info-item"><small>{label}</small><div>{children || '—'}</div></div>;

const PaymentBlock = ({ p }) => <div className="detail-card"><h4>Payment</h4><div className="info-grid">
  <Info label="Status"><StatusBadge status={p.status} /></Info><Info label="Method">{p.method}</Info>
  <Info label="Total">{money(p.totalAmount)}</Info><Info label="Paid">{money(p.paidAmount)}</Info><Info label="Balance">{money(p.balance)}</Info><Info label="Last update">{p.lastUpdatedAt && dateTime(p.lastUpdatedAt)}</Info></div></div>;

const History = ({ list }) => <div className="detail-card"><h4>Status history</h4>{(list || []).length === 0 ? <small className="hint">No history.</small> : <ul className="timeline">{[...list].reverse().map((h, i) => <li key={i}><StatusBadge status={h.status} /> <span>{dateTime(h.changedAt)}</span>{h.note && <em>{h.note}</em>}</li>)}</ul>}</div>;

function Readymade({ o }) {
  return <>
    <div className="detail-top"><StatusBadge status={o.status} /><span>Placed {dateTime(o.createdAt)}</span></div>
    <div className="detail-cols">
      <div className="detail-card"><h4>Customer</h4><div className="info-grid"><Info label="Name">{o.customer?.name}</Info><Info label="Mobile">{o.customer?.mobile}</Info></div></div>
      <div className="detail-card"><h4>Shipping address</h4><div>{[o.address?.line1, o.address?.line2, `${o.address?.city || ''}, ${o.address?.state || ''}`, o.address?.pincode].filter(Boolean).join(' · ')}</div></div>
    </div>
    <div className="detail-card"><h4>Items</h4><div className="table-wrap"><table><thead><tr><th>Product</th><th>Variant SKU</th><th>Size</th><th>Color</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>
      {o.items.map((it, i) => { const c = it.variant?.color; return <tr key={i}>
        <td><div className="cell-flex"><SafeImage src={it.productSnapshot?.image} /><div><b>{it.productSnapshot?.name}</b><small className="cell-sub">SKU {it.productSnapshot?.sku || '—'}</small></div></div></td>
        <td>{it.variant?.sku ? <span className="tag">{it.variant.sku}</span> : '—'}</td><td>{it.variant?.size || '—'}</td>
        <td>{c ? <span className="color-cell">{c.hex && <i className="swatch" style={{ background: c.hex }} />}{colorLabel(c)}</span> : '—'}</td>
        <td>{it.quantity}</td><td>{money(it.unitPrice)}{it.salePrice != null && <small className="cell-sub"><s>{money(it.regularPrice)}</s> sale</small>}</td><td>{money(it.lineTotal)}</td></tr>; })}
    </tbody></table></div><div className="order-total">Order total <b>{money(o.orderTotal)}</b></div></div>
    <div className="detail-cols"><PaymentBlock p={o.payment || {}} /><History list={o.statusHistory} /></div>
    {o.notes && <div className="detail-card"><h4>Notes</h4>{o.notes}</div>}
  </>;
}

function Stitching({ o }) {
  const d = o.designSnapshot || {};
  const m = o.measurements && typeof o.measurements === 'object' ? Object.entries(o.measurements) : [];
  return <>
    <div className="detail-top"><StatusBadge status={o.status} /><span>Ordered {date(o.orderDate || o.createdAt)} · delivery {date(o.deliveryDate)}</span></div>
    <div className="detail-cols">
      <div className="detail-card"><h4>Customer</h4><div className="info-grid"><Info label="Name">{o.customer?.name}</Info><Info label="Mobile">{o.customer?.mobile}</Info></div></div>
      <div className="detail-card"><h4>Selected design</h4><div className="info-grid"><Info label="Name">{d.name}</Info><Info label="Reference code">{d.referenceCode && <span className="tag">{d.referenceCode}</span>}</Info><Info label="Category">{[d.category?.name, d.subCategory?.name].filter(Boolean).join(' › ')}</Info></div>{d.description && <p className="hint">{d.description}</p>}</div>
    </div>
    {d.images?.length > 0 && <div className="detail-card"><h4>Design images</h4><div className="gallery">{d.images.map((im, i) => <a key={i} href={im.url} target="_blank" rel="noreferrer"><SafeImage src={im.url} alt={im.alt} size={96} /></a>)}</div></div>}
    <div className="detail-card"><h4>Measurements</h4>{m.length === 0 ? <small className="hint">None recorded.</small> : <div className="measure-grid">{m.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>}{o.measurementNotes && <p className="hint">Notes: {o.measurementNotes}</p>}</div>
    <div className="detail-cols"><PaymentBlock p={o.payment || {}} /><History list={o.statusHistory} /></div>
    {o.notes && <div className="detail-card"><h4>Order notes</h4>{o.notes}</div>}
  </>;
}

export default function OrderDetailsModal({ endpoint, id, kind, orderId, onClose }) {
  const [order, setOrder] = useState(null); const [error, setError] = useState('');
  useEffect(() => { getOrder(endpoint, id).then((r) => setOrder(r.data)).catch((e) => setError(e.message)); }, [endpoint, id]);
  return <Modal wide eyebrow="ORDER DETAILS" title={orderId} onClose={onClose} footer={<button className="primary-btn" onClick={onClose}>Close</button>}>
    {error && <div className="error banner">{error}</div>}
    {!order && !error && <div className="empty"><span className="spinner" /> Loading…</div>}
    {order && (kind === 'stitching' ? <Stitching o={order} /> : <Readymade o={order} />)}
  </Modal>;
}
