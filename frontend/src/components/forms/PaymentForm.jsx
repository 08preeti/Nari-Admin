import { useState } from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { paymentMethods } from '../../utils/constants';
import { money, dateTime } from '../../utils/formatters';

// Status is never typed in: it follows the amounts (server enforces the same rule).
export default function PaymentForm({ order, kind, onClose, onSave }) {
  const p = order.payment || {};
  const [total, setTotal] = useState(p.totalAmount ?? 0);
  const [paid, setPaid] = useState(p.paidAmount ?? 0);
  const [method, setMethod] = useState(p.method || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const t = Number(total), pd = Number(paid);
  const problem = Number.isNaN(pd) || pd < 0 ? 'Paid amount cannot be negative' : Number.isNaN(t) || t < 0 ? 'Total cannot be negative' : pd > t ? 'Paid amount cannot exceed the total amount' : '';
  const status = pd <= 0 ? 'Pending' : pd >= t ? 'Paid' : 'Partially Paid';

  async function save() {
    if (problem) return setError(problem);
    setBusy(true); setError('');
    try { await onSave({ paidAmount: pd, ...(kind === 'stitching' ? { totalAmount: t } : {}), method, ...(note.trim() ? { note: note.trim() } : {}) }); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Modal locked eyebrow="PAYMENT UPDATE" title={order.orderId} onClose={onClose} footer={<><button className="outline-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy || !!problem} onClick={save}>{busy ? 'Saving…' : 'Save payment'}</button></>}>
    {(error || problem) && <div className="error banner">{error || problem}</div>}
    <div className="form-grid">
      <div className="field"><label>Total amount (₹)</label><input type="number" min="0" step="0.01" value={total} disabled={kind !== 'stitching'} onChange={(e) => setTotal(e.target.value)} />{kind !== 'stitching' && <small className="hint">Readymade totals come from the order items.</small>}</div>
      <div className="field"><label>Paid amount (₹)</label><input type="number" min="0" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
      <div className="field"><label>Payment method</label><input list="pay-methods" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Cash / UPI / Card" /><datalist id="pay-methods">{paymentMethods.map((m) => <option key={m} value={m} />)}</datalist></div>
      <div className="field"><label>Note (optional)</label><input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. advance received" /></div>
    </div>
    <div className="price-preview"><span>Balance</span><b>{problem ? '—' : money(Math.max(t - pd, 0))}</b><StatusBadge status={status} /></div>
    {p.history?.length > 0 && <><p className="sub-label">Payment history</p><div className="table-wrap"><table><thead><tr><th>When</th><th>Change</th><th>Paid after</th><th>Method</th><th>Note</th></tr></thead><tbody>{[...p.history].reverse().map((h, i) => <tr key={i}><td>{dateTime(h.at)}</td><td className={h.amount < 0 ? 'neg' : 'pos'}>{h.amount > 0 ? '+' : ''}{money(h.amount)}</td><td>{money(h.paidAmountAfter)}</td><td>{h.method || '—'}</td><td>{h.note || '—'}</td></tr>)}</tbody></table></div></>}
  </Modal>;
}
