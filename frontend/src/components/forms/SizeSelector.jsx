import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { STANDARD_SIZES } from '../../utils/constants';

export default function SizeSelector({ sizes, onToggle, onAddCustom, onRemove }) {
  const [custom, setCustom] = useState('');
  const [err, setErr] = useState('');
  const has = (s) => sizes.some((x) => x.toLowerCase() === s.toLowerCase());
  const add = () => {
    const v = custom.trim().replace(/\s+/g, ' ');
    if (!v) return;
    if (v.length > 20) return setErr('Max 20 characters');
    if (has(v)) return setErr(`"${v}" is already selected`);
    onAddCustom(v); setCustom(''); setErr('');
  };
  const customSizes = sizes.filter((s) => !STANDARD_SIZES.includes(s));
  return <div>
    <p className="sub-label">Standard sizes</p>
    <div className="chip-row">{STANDARD_SIZES.map((s) => <button type="button" key={s} className={`chip ${has(s) ? 'on' : ''}`} onClick={() => onToggle(s)} aria-pressed={has(s)}>{s}</button>)}</div>
    <p className="sub-label">Custom size</p>
    <div className="inline-add">
      <input value={custom} onChange={(e) => { setCustom(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder="e.g. 38, Petite, 4-5 yrs" />
      <button type="button" className="outline-btn" onClick={add}><Plus size={14} /> Add size</button>
    </div>
    {err && <small className="field-error">{err}</small>}
    <p className="sub-label">Selected sizes ({sizes.length})</p>
    <div className="chip-row">{sizes.length === 0 ? <small className="hint">No sizes selected. A product can also be sold without sizes.</small>
      : sizes.map((s) => <span className="chip on removable" key={s}>{s}<button type="button" onClick={() => onRemove(s)} aria-label={`Remove size ${s}`}><X size={12} /></button></span>)}</div>
    {customSizes.length > 0 && <small className="hint">Custom: {customSizes.join(', ')}</small>}
  </div>;
}
