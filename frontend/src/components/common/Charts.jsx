import { money } from '../../utils/formatters';

// Small dependency-free SVG charts.
export function TrendChart({ data, granularity }) {
  if (!data.length) return <div className="empty">No revenue in this period.</div>;
  const W = 640, H = 220, pad = { l: 52, r: 12, t: 12, b: 28 };
  const max = Math.max(...data.map((d) => d.total), 1);
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const bw = Math.min(40, iw / data.length - 6);
  const x = (i) => pad.l + (i + 0.5) * (iw / data.length);
  const y = (v) => pad.t + ih - (v / max) * ih;
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const label = (d) => (granularity === 'month' ? d.slice(2) : d.slice(5));
  const every = Math.ceil(data.length / 8);
  return <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Revenue trend">
    {ticks.map((t) => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" /><text x={pad.l - 6} y={y(t) + 3} textAnchor="end" className="axis">{money(t)}</text></g>)}
    {data.map((d, i) => <g key={d.date}>
      <rect x={x(i) - bw / 2} width={bw} y={y(d.readymade)} height={Math.max(ih - (y(d.readymade) - pad.t), 0)} className="bar-readymade"><title>{`${d.date} · Readymade ${money(d.readymade)}`}</title></rect>
      <rect x={x(i) - bw / 2} width={bw} y={y(d.total)} height={Math.max(y(d.readymade) - y(d.total), 0)} className="bar-stitching"><title>{`${d.date} · Stitching ${money(d.stitching)}`}</title></rect>
      {i % every === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" className="axis">{label(d.date)}</text>}
    </g>)}
  </svg>;
}

export function SplitBar({ readymade, stitching }) {
  const total = readymade + stitching;
  if (total <= 0) return <div className="empty">No revenue yet.</div>;
  const rp = Math.round((readymade / total) * 100);
  return <div>
    <div className="split"><div className="bar-readymade" style={{ width: `${rp}%` }} /><div className="bar-stitching" style={{ width: `${100 - rp}%` }} /></div>
    <div className="legend"><span><i className="bar-readymade" /> Readymade {money(readymade)} ({rp}%)</span><span><i className="bar-stitching" /> Stitching {money(stitching)} ({100 - rp}%)</span></div>
  </div>;
}

export function StatusBars({ rows }) {
  if (!rows.length) return <div className="empty">No orders in this period.</div>;
  const max = Math.max(...rows.map((r) => r.count), 1);
  return <div className="hbars">{rows.map((r) => <div key={r.status} className="hbar"><span>{r.status}</span><div><i style={{ width: `${(r.count / max) * 100}%` }} className={r.status === 'Cancelled' ? 'cancel' : ''} /></div><b>{r.count}</b></div>)}</div>;
}
