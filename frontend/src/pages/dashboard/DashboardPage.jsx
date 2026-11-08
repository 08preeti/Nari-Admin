import { useEffect, useState } from 'react';
import { ShoppingBag, Scissors, Package, Wallet, RefreshCw, Boxes, AlertTriangle, PackageX, CheckCircle2, Layers, Clock } from 'lucide-react';
import PageHead from '../../components/common/PageHead';
import StatusBadge from '../../components/common/StatusBadge';
import { TrendChart, SplitBar, StatusBars } from '../../components/common/Charts';
import { getDashboardSummary } from '../../services/dashboardService';
import { money, date } from '../../utils/formatters';

const iso = (d) => d.toISOString().slice(0, 10);
const PRESETS = [['all', 'All time'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['custom', 'Custom']];

export default function DashboardPage({ onNavigate }) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [preset, setPreset] = useState('30'); const [from, setFrom] = useState(''); const [to, setTo] = useState('');

  const range = () => {
    if (preset === 'all') return {};
    if (preset === 'custom') return { from, to };
    const d = new Date(); d.setDate(d.getDate() - Number(preset) + 1);
    return { from: iso(d) };
  };
  const load = () => {
    setLoading(true); setError('');
    getDashboardSummary(range()).then((r) => setData(r.data)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, [preset, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const p = data?.products, o = data?.orders, r = data?.revenue;
  const v = (x) => (loading || !data ? '…' : x);
  const cards = [
    ['Total products', v(p?.totalProducts), `${p?.activeProducts ?? 0} active`, Package, 'purple', 'products'],
    ['Total variants', v(p?.totalVariants), `${p?.activeVariants ?? 0} active`, Layers, 'purple', 'products'],
    ['Total stock', v(p?.totalStock), 'Active products, active variants', Boxes, 'green', 'products'],
    ['Low-stock products', v(p?.lowStockProducts), 'At or below their threshold', AlertTriangle, 'orange', 'products'],
    ['Out-of-stock variants', v(p?.outOfStockVariants), `${p?.outOfStockProducts ?? 0} products fully out`, PackageX, 'red', 'products'],
    ['Total orders', v(o?.total), `${o?.cancelled ?? 0} cancelled`, ShoppingBag, 'purple', 'readymade-orders'],
    ['Pending orders', v(o?.pending), `${o?.byType.stitching.pending ?? 0} stitching · ${o?.byType.readymade.pending ?? 0} readymade`, Clock, 'orange', 'readymade-orders'],
    ['Completed orders', v(o?.completed), 'Delivered', CheckCircle2, 'green', 'stitching-orders'],
    ['Revenue collected', v(money(r?.collected)), `Booked ${money(r?.booked)}`, Wallet, 'green', 'payments'],
    ['Outstanding payments', v(money(r?.outstanding)), 'Unpaid balance on open orders', Wallet, 'orange', 'payments'],
  ];

  return <>
    <PageHead eyebrow="OVERVIEW" title="Dashboard" desc="Live figures from your store. Order figures follow the date range; stock cards are always current."
      action={<button className="outline-btn" onClick={load}><RefreshCw size={15} /> Refresh</button>} />
    <div className="toolbar wrap">
      <div className="switcher">{PRESETS.map(([id, label]) => <button key={id} className={preset === id ? 'selected' : ''} onClick={() => setPreset(id)}>{label}</button>)}</div>
      {preset === 'custom' && <><label className="date-f">From <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label><label className="date-f">To <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label></>}
    </div>
    {error && <div className="error banner">{error} · <button className="link-btn" onClick={load}>Retry</button></div>}
    <div className="stats-grid five">{cards.map(([label, value, sub, Icon, tone, page]) => <button className="stat-card clickable" key={label} onClick={() => onNavigate(page)}>
      <div className="stat-top"><span>{label}</span><div className={`stat-icon ${tone}`}><Icon size={18} /></div></div><strong>{value}</strong><small>{loading ? 'Loading…' : sub}</small></button>)}</div>
    {data && <>
      <div className="dashboard-grid even">
        <div className="panel"><div className="panel-head"><div><h3>Revenue trend</h3><p>Collected payments by order date ({data.range.granularity === 'day' ? 'daily' : 'monthly'}, {data.range.timezone})</p></div></div>
          <TrendChart data={data.trends} granularity={data.range.granularity} /><div className="legend"><span><i className="bar-readymade" /> Readymade</span><span><i className="bar-stitching" /> Stitching</span></div></div>
        <div className="panel"><div className="panel-head"><div><h3>Readymade vs stitching</h3><p>Collected revenue split</p></div><Scissors size={19} /></div>
          <SplitBar readymade={r.byType.readymade.collected} stitching={r.byType.stitching.collected} />
          <div className="panel-head sp"><div><h3>Order status</h3><p>Orders in range, all types</p></div></div><StatusBars rows={data.statusDistribution} /></div>
      </div>
      <div className="panel sp"><div className="panel-head"><div><h3>Recent orders</h3><p>Latest readymade and stitching orders in range</p></div></div>
        {data.recentOrders.length === 0 ? <div className="empty">No orders in this period.</div> : <div className="table-wrap flat"><table><thead><tr><th>Order</th><th>Customer</th><th>Type</th><th>Status</th><th>Total</th><th>Payment</th><th>Date</th></tr></thead><tbody>
          {data.recentOrders.map((x) => <tr key={x._id}><td><b>{x.orderId}</b></td><td>{x.customer?.name}</td><td><span className="tag">{x.orderType}</span></td><td><StatusBadge status={x.status} /></td><td>{money(x.payment?.totalAmount)}</td><td><StatusBadge status={x.payment?.status} /></td><td>{date(x.createdAt)}</td></tr>)}</tbody></table></div>}</div>
      <small className="hint block">Revenue = payments received on non-cancelled orders. Outstanding = unpaid balance on non-cancelled orders. Cancelled orders are never counted as sales.</small>
    </>}
  </>;
}
