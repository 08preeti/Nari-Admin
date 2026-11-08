import { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import SafeImage from '../common/SafeImage';
import { isHttpUrl } from '../../utils/formatters';

const parentLabel = (p) => (p.mainCategory?.name ? `${p.mainCategory.name} › ${p.name}` : p.name) + (p.isActive === false ? ' (inactive)' : '');

const initial = (config, item) => {
  const v = { isActive: item ? item.isActive !== false : true };
  config.fields.forEach(([key, , kind]) => {
    if (kind === 'image') v[key] = item?.image?.url || '';
    else if (kind === 'parent') v[key] = item?.[key]?._id || item?.[key] || '';
    else if (kind === 'select') v[key] = item?.[key] || 'readymade';
    else v[key] = item?.[key] ?? (kind === 'number' && key === 'displayOrder' ? 0 : '');
  });
  return v;
};

export default function CatalogEditor({ config, modal, parents, onClose, onSave }) {
  const editing = !!modal.item;
  const [values, setValues] = useState(() => initial(config, modal.item));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const set = (k, v) => setValues((o) => ({ ...o, [k]: v }));

  const errors = useMemo(() => {
    const e = {};
    config.fields.forEach(([k, label, kind]) => {
      const v = values[k];
      if (['name'].includes(k) && !String(v).trim()) e[k] = `${label} is required`;
      if (kind === 'parent' && !v) e[k] = `Select a ${label.toLowerCase()}`;
      if (kind === 'image' && v && !isHttpUrl(v)) e[k] = 'Enter a valid http(s) URL';
      if (kind === 'number' && v !== '' && (Number.isNaN(Number(v)) || Number(v) < 0)) e[k] = 'Must be 0 or more';
    });
    return e;
  }, [values, config]);
  const shown = submitted ? errors : {};

  async function submit(ev) {
    ev.preventDefault(); setSubmitted(true); setError('');
    if (Object.keys(errors).length) return;
    const payload = { isActive: values.isActive };
    config.fields.forEach(([k, , kind]) => {
      if (k === 'moduleType' && editing) return; // module type is permanent
      if (kind === 'image') { if (values[k].trim()) payload.image = { url: values[k].trim() }; }
      else if (kind === 'number') { if (values[k] !== '') payload[k] = Number(values[k]); }
      else payload[k] = typeof values[k] === 'string' ? values[k].trim() : values[k];
    });
    setBusy(true);
    try { await onSave(payload); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return <Modal locked eyebrow={editing ? 'UPDATE RECORD' : 'NEW RECORD'} title={`${editing ? 'Edit' : 'Add'} ${config.title.replace(/ories$/, 'ory').replace(/s$/, '')}`} onClose={onClose}
    footer={<><button type="button" className="outline-btn" onClick={onClose}>Cancel</button><button form="catalog-form" className="primary-btn" disabled={busy}>{busy ? 'Saving…' : 'Save record'}</button></>}>
    <form id="catalog-form" onSubmit={submit}>
      {error && <div className="error banner">{error}</div>}
      <div className="form-grid">
        {config.fields.map(([key, label, kind, extra]) => <div className={kind === 'textarea' ? 'field full-field' : 'field'} key={key}>
          <label>{label}{['name', 'parent'].includes(kind) || key === 'name' ? ' *' : ''}</label>
          {kind === 'textarea' ? <textarea rows="3" value={values[key]} onChange={(e) => set(key, e.target.value)} />
            : kind === 'select' ? <select value={values[key]} disabled={editing} onChange={(e) => set(key, e.target.value)}>{extra.map((x) => <option key={x}>{x}</option>)}</select>
            : kind === 'parent' ? <select value={values[key]} className={shown[key] ? 'invalid' : ''} onChange={(e) => set(key, e.target.value)}><option value="">Select {label.toLowerCase()}</option>{(parents[extra] || []).map((p) => <option key={p._id} value={p._id}>{parentLabel(p)}</option>)}</select>
            : <input type={kind === 'number' ? 'number' : kind === 'image' ? 'url' : 'text'} min={kind === 'number' ? '0' : undefined} value={values[key]} className={shown[key] ? 'invalid' : ''} onChange={(e) => set(key, e.target.value)} />}
          {kind === 'select' && editing && <small className="hint">The module type cannot be changed.</small>}
          {kind === 'image' && values[key] && isHttpUrl(values[key]) && <SafeImage src={values[key]} size={64} />}
          {shown[key] && <small className="field-error">{shown[key]}</small>}
        </div>)}
        <label className="check big full-field"><input type="checkbox" checked={values.isActive} onChange={(e) => set('isActive', e.target.checked)} /><div><b>Active</b><small>Inactive records are hidden from customers.</small></div></label>
      </div>
    </form>
  </Modal>;
}
