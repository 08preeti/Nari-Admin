import { useEffect, useState } from 'react';
import { Search, RefreshCw, Eye } from 'lucide-react';
import PageHead from '../../components/common/PageHead';
import Pagination from '../../components/common/Pagination';
import TableState from '../../components/common/TableState';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import usePagedList from '../../hooks/usePagedList';
import useDebounce from '../../hooks/useDebounce';
import { listCustomers, getCustomer } from '../../services/customerService';
import { money, date } from '../../utils/formatters';

function CustomerModal({ mobile, onClose }) {
  const [c, setC] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { getCustomer(mobile).then((r) => setC(r.data)).catch((e) => setErr(e.message)); }, [mobile]);
  return <Modal wide eyebrow="CUSTOMER" title={c?.name || mobile} onClose={onClose} footer={<button className="primary-btn" onClick={onClose}>Close</button>}>
    {err && <div className="error banner">{err}</div>}
    {!c && !err && <div className="empty"><span className="spinner" /> Loading…</div>}
    {c && <>
      <div className="stats-grid four"><div className="stat-card"><div className="stat-top"><span>Mobile</span></div><strong className="sm">{c.mobile}</strong></div><div className="stat-card"><div className="stat-top"><span>Orders</span></div><strong className="sm">{c.orderCount}</strong></div><div className="stat-card"><div className="stat-top"><span>Total spending</span></div><strong className="sm">{money(c.totalSpending)}</strong><small>Paid {money(c.totalPaid)} · excludes cancelled</small></div><div className="stat-card"><div className="stat-top"><span>Last order</span></div><strong className="sm">{date(c.lastOrderDate)}</strong></div></div>
      <div className="table-wrap"><table><thead><tr><th>Order</th><th>Type</th><th>Details</th><th>Status</th><th>Total</th><th>Payment</th><th>Date</th></tr></thead><tbody>{c.orders.map((o) => <tr key={o._id}><td><b>{o.orderId}</b></td><td><span className="tag">{o.orderType}</span></td>
        <td>{o.orderType === 'stitching' ? `${o.designSnapshot?.name || 'Design'} (${o.designSnapshot?.referenceCode || '—'})` : (o.items || []).map((i) => `${i.productSnapshot?.name} ×${i.quantity}`).join(', ')}</td>
        <td><StatusBadge status={o.status} /></td><td>{money(o.payment?.totalAmount)}</td><td><StatusBadge status={o.payment?.status} /></td><td>{date(o.createdAt)}</td></tr>)}</tbody></table></div>
    </>}
  </Modal>;
}

export default function CustomersPage() {
  const [q, setQ] = useState(''); const dq = useDebounce(q); const [open, setOpen] = useState(null);
  const { items, meta, page, setPage, loading, error, reload } = usePagedList((p) => listCustomers({ ...p, limit: 10 }), { q: dq });
  return <>
    <PageHead eyebrow="ORDERS & PAYMENTS" title="Customers" desc="Built from order records. One customer per mobile number across readymade and stitching orders." action={<button className="outline-btn" onClick={reload}><RefreshCw size={15} /> Refresh</button>} />
    <div className="toolbar"><div className="searchbox"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or mobile…" /></div></div>
    <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Mobile</th><th>Orders</th><th>Total spending</th><th>Last order</th><th></th></tr></thead><tbody>
      <TableState loading={loading} error={error} empty={items.length === 0} colSpan={6} emptyText="No customers yet: they appear when orders are placed." onRetry={reload} />
      {!loading && !error && items.map((c) => <tr key={c.mobile}><td><b>{c.name}</b></td><td>{c.mobile}</td><td>{c.orderCount}<small className="cell-sub">{c.readymadeOrders} readymade · {c.stitchingOrders} stitching</small></td><td>{money(c.totalSpending)}<small className="cell-sub">Paid {money(c.totalPaid)}</small></td><td>{date(c.lastOrderDate)}</td><td><div className="row-actions"><button title="Order history" onClick={() => setOpen(c.mobile)}><Eye size={15} /></button></div></td></tr>)}
    </tbody></table></div>
    <Pagination meta={meta} page={page} onPage={setPage} />
    {open && <CustomerModal mobile={open} onClose={() => setOpen(null)} />}
  </>;
}
