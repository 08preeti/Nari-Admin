import { useState } from 'react';
import { Search, RefreshCw, Eye, Edit2 } from 'lucide-react';
import PageHead from './PageHead';
import Pagination from './Pagination';
import TableState from './TableState';
import StatusBadge from './StatusBadge';
import ConfirmDialog from './ConfirmDialog';
import OrderDetailsModal from './OrderDetailsModal';
import PaymentForm from '../forms/PaymentForm';
import usePagedList from '../../hooks/usePagedList';
import useDebounce from '../../hooks/useDebounce';
import { listOrders, updateOrderStatus, getOrder } from '../../services/orderService';
import { listPayments, updatePayment } from '../../services/paymentService';
import { money, date } from '../../utils/formatters';
import { statusOptions, paymentStatuses } from '../../utils/constants';

export default function OrdersManager({ type, notify }) {
  const payments = type === 'payments'; const stitching = type === 'stitching-orders';
  const endpoint = payments ? '/payments' : stitching ? '/stitching-orders' : '/readymade-orders';
  const [kind, setKind] = useState('stitching');
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [pay, setPay] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [outstanding, setOutstanding] = useState(false);
  const dq = useDebounce(q);
  const params = payments ? { q: dq, paymentStatus: status, from, to, outstanding: outstanding ? 'true' : '' } : { q: dq, status, paymentStatus: pay, from, to };
  const fetcher = (p) => (payments ? listPayments(kind, { ...p, limit: 10 }) : listOrders(endpoint, { ...p, limit: 10 }));
  const { items, meta, page, setPage, loading, error, reload } = usePagedList(fetcher, params, [payments ? kind : endpoint]);
  const [selected, setSelected] = useState(null); const [edit, setEdit] = useState(null); const [pendingStatus, setPendingStatus] = useState(null); const [busy, setBusy] = useState(false);
  const statuses = statusOptions[type] || [];
  const orderKind = payments ? kind : stitching ? 'stitching' : 'readymade';
  const mgrEndpoint = payments ? `/${kind === 'stitching' ? 'stitching' : 'readymade'}-orders` : endpoint;

  async function applyStatus(item, newStatus) {
    setBusy(true);
    try { await updateOrderStatus(endpoint, item._id, newStatus); notify('Order status updated'); setPendingStatus(null); reload(); }
    catch (e) { notify(e.message, 'error'); setPendingStatus(null); reload(); } finally { setBusy(false); }
  }
  const changeStatus = (item, newStatus) => {
    if (newStatus === item.status) return;
    if (newStatus === 'Cancelled' || item.status === 'Cancelled') setPendingStatus({ item, newStatus });
    else applyStatus(item, newStatus);
  };
  async function openPayment(o) { try { setEdit((await getOrder(`/payments/${kind}`, o._id)).data); } catch (e) { notify(e.message, 'error'); } }
  async function savePayment(payload) { await updatePayment(kind, edit._id, payload); notify('Payment updated'); setEdit(null); reload(); }

  const heading = payments ? 'Payments' : stitching ? 'Stitching orders' : 'Readymade orders';
  const cols = payments ? 9 : 8;
  return <>
    <PageHead eyebrow={payments ? 'FINANCE' : 'ORDER MANAGEMENT'} title={heading} desc={payments ? 'Review collections, outstanding balances and payment methods.' : 'Review customer orders and keep fulfilment status up to date.'} action={<button className="outline-btn" onClick={reload}><RefreshCw size={15} /> Refresh</button>} />
    <div className="toolbar wrap">
      {payments && <div className="switcher"><button className={kind === 'stitching' ? 'selected' : ''} onClick={() => setKind('stitching')}>Stitching</button><button className={kind === 'readymade' ? 'selected' : ''} onClick={() => setKind('readymade')}>Readymade</button></div>}
      <div className="searchbox"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order ID, customer name or mobile…" /></div>
      <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter"><option value="">{payments ? 'All payment statuses' : 'All order statuses'}</option>{(payments ? paymentStatuses : statuses).map((s) => <option key={s}>{s}</option>)}</select>
      {!payments && <select className="filter-select" value={pay} onChange={(e) => setPay(e.target.value)} aria-label="Payment filter"><option value="">All payments</option>{paymentStatuses.map((s) => <option key={s}>{s}</option>)}</select>}
      {payments && <label className="check"><input type="checkbox" checked={outstanding} onChange={(e) => setOutstanding(e.target.checked)} /> Outstanding only</label>}
      <label className="date-f">From <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
      <label className="date-f">To <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
      {(from || to || q || status || pay || outstanding) && <button className="link-btn" onClick={() => { setQ(''); setStatus(''); setPay(''); setFrom(''); setTo(''); setOutstanding(false); }}>Clear filters</button>}
    </div>
    <div className="table-wrap"><table><thead><tr><th>Order ID</th><th>Customer</th>{!payments && <th>{stitching ? 'Design / Delivery' : 'Items'}</th>}<th>{payments ? 'Payment status' : 'Order status'}</th><th>Amount</th>{payments && <><th>Paid</th><th>Balance</th><th>Method</th></>}{!payments && <th>Payment</th>}<th>Date</th><th>Action</th></tr></thead><tbody>
      <TableState loading={loading} error={error} empty={items.length === 0} colSpan={cols + 1} emptyText="No records found for these filters." onRetry={reload} />
      {!loading && !error && items.map((o) => <tr key={o._id}>
        <td><b>{o.orderId}</b></td>
        <td><b>{o.customer?.name || '—'}</b><small className="cell-sub">{o.customer?.mobile || ''}</small></td>
        {!payments && <td>{stitching ? (o.designSnapshot?.name || 'Design') : `${o.items?.length || 0} item(s)`}<small className="cell-sub">{stitching ? `Delivery ${date(o.deliveryDate)}` : date(o.createdAt)}</small></td>}
        <td>{payments ? <StatusBadge status={o.payment?.status} /> : <select className={`status-select tone-${o.status === 'Cancelled' ? 'danger' : o.status === 'Delivered' ? 'active' : ''}`} value={o.status} onChange={(e) => changeStatus(o, e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select>}</td>
        <td>{money(o.payment?.totalAmount ?? o.orderTotal ?? 0)}</td>
        {payments && <><td>{money(o.payment?.paidAmount)}</td><td>{money(o.payment?.balance)}</td><td>{o.payment?.method || '—'}</td></>}
        {!payments && <td><StatusBadge status={o.payment?.status} /><small className="cell-sub">Paid {money(o.payment?.paidAmount)}</small></td>}
        <td>{date(o.createdAt || o.orderDate)}</td>
        <td><div className="row-actions"><button title="View details" onClick={() => setSelected(o)}><Eye size={15} /></button>{payments && <button title="Update payment" onClick={() => openPayment(o)}><Edit2 size={15} /></button>}</div></td></tr>)}
    </tbody></table></div>
    <Pagination meta={meta} page={page} onPage={setPage} />
    {selected && <OrderDetailsModal endpoint={mgrEndpoint} id={selected._id} kind={orderKind} orderId={selected.orderId} onClose={() => setSelected(null)} />}
    {edit && <PaymentForm order={edit} kind={kind} onClose={() => setEdit(null)} onSave={savePayment} />}
    {pendingStatus && <ConfirmDialog danger={pendingStatus.newStatus === 'Cancelled'} title={pendingStatus.newStatus === 'Cancelled' ? 'Cancel this order?' : 'Re-open this order?'} busy={busy}
      message={pendingStatus.newStatus === 'Cancelled' ? (stitching ? `${pendingStatus.item.orderId} will be marked Cancelled.` : `${pendingStatus.item.orderId} will be cancelled and its reserved stock returned to inventory (once).`) : (stitching ? `${pendingStatus.item.orderId} will move back to "${pendingStatus.newStatus}".` : `${pendingStatus.item.orderId} will move to "${pendingStatus.newStatus}" and its stock will be reserved again if available.`)}
      confirmLabel="Yes, continue" onConfirm={() => applyStatus(pendingStatus.item, pendingStatus.newStatus)} onCancel={() => setPendingStatus(null)} />}
  </>;
}
