import { useEffect, useState } from 'react';
import { listRecords } from '../../services/catalogService';

const label = (x) => (x.isActive === false ? `${x.name} (inactive)` : x.name);

// Dependent dropdowns: Main category -> Category -> Subcategory.
// Only children of the selected parent are loaded; changing a parent clears invalid children.
export default function CategorySelects({ value, onChange, moduleType, errors = {}, disabled }) {
  const [mains, setMains] = useState([]);
  const [cats, setCats] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => { listRecords('/main-categories', { moduleType }).then((r) => setMains(r.data || [])).catch((e) => setLoadError(e.message)); }, [moduleType]);
  useEffect(() => {
    if (!value.mainCategory) { setCats([]); return; }
    listRecords('/categories', { mainCategory: value.mainCategory }).then((r) => setCats(r.data || [])).catch((e) => setLoadError(e.message));
  }, [value.mainCategory]);
  useEffect(() => {
    if (!value.category) { setSubs([]); return; }
    listRecords('/sub-categories', { category: value.category }).then((r) => setSubs(r.data || [])).catch((e) => setLoadError(e.message));
  }, [value.category]);

  const field = (key, text, options, onPick, off) => <div className="field">
    <label>{text}</label>
    <select value={value[key]} disabled={disabled || off} className={errors[key] ? 'invalid' : ''} onChange={(e) => onPick(e.target.value)}>
      <option value="">Select {text.toLowerCase()}</option>
      {options.map((o) => <option key={o._id} value={o._id}>{label(o)}</option>)}
    </select>
    {errors[key] && <small className="field-error">{errors[key]}</small>}
  </div>;

  return <div className="form-grid three">
    {loadError && <div className="error full-field">{loadError}</div>}
    {field('mainCategory', 'Main category', mains, (v) => onChange({ mainCategory: v, category: '', subCategory: '' }))}
    {field('category', 'Category', cats, (v) => onChange({ ...value, category: v, subCategory: '' }), !value.mainCategory)}
    {field('subCategory', 'Subcategory', subs, (v) => onChange({ ...value, subCategory: v }), !value.category)}
    {value.mainCategory && cats.length === 0 && <small className="hint full-field">This main category has no categories yet. Add some under Categories first.</small>}
    {value.category && subs.length === 0 && <small className="hint full-field">This category has no subcategories yet. Add some under Subcategories first.</small>}
  </div>;
}
