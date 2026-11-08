import { useEffect, useMemo, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import StatusBadge from '../common/StatusBadge';
import CategorySelects from './CategorySelects';
import ImageListEditor from './ImageListEditor';
import SizeSelector from './SizeSelector';
import ColorEditor from './ColorEditor';
import VariantTable from './VariantTable';
import { inventoryHistory } from '../../services/catalogService';
import { blankProductForm, generateVariants, productToForm, validateForm, variantStats, variantsUsing, stockedVariants, formToPayload } from '../../utils/variants';
import { discountPercent, sellingPrice } from '../../utils/pricing';
import { money, dateTime } from '../../utils/formatters';

const TABS = [
  ['basic', 'Basic information'], ['categories', 'Categories'], ['images', 'Product images'], ['sizes', 'Sizes'], ['colors', 'Colors'],
  ['variants', 'Variant management'], ['pricing', 'Pricing'], ['inventory', 'Inventory'], ['status', 'Product status'],
];

export default function ProductForm({ product, onClose, onSubmit, notify }) {
  const [form, setForm] = useState(() => (product ? productToForm(product) : blankProductForm()));
  const [tab, setTab] = useState('basic');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [tagText, setTagText] = useState('');
  const [history, setHistory] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...(typeof patch === 'function' ? patch(f) : patch) }));
  const check = useMemo(() => validateForm(form), [form]);
  const errors = submitted ? check.errors : {};
  const sections = submitted ? check.section : {};
  const stats = variantStats(form.variants);
  const hasVariants = form.variants.length > 0;

  useEffect(() => { if (tab === 'inventory' && form._id && history === null) inventoryHistory(form._id).then((r) => setHistory(r.data || [])).catch(() => setHistory([])); }, [tab, form._id, history]);

  // ---- sizes ----
  const addSize = (s) => set((f) => ({ sizes: f.sizes.some((x) => x.toLowerCase() === s.toLowerCase()) ? f.sizes : [...f.sizes, s] }));
  const dropVariants = (pred) => set((f) => ({ variants: f.variants.filter((v) => !pred(v)) }));
  const removeSize = (s) => {
    const affected = variantsUsing(form.variants, { size: s });
    const stocked = stockedVariants(affected);
    if (stocked.length > 0) return notify(`Cannot remove size ${s}: ${stocked.length} variant(s) still hold stock. Deactivate them instead.`, 'error');
    const apply = () => { set((f) => ({ sizes: f.sizes.filter((x) => x !== s) })); dropVariants((v) => String(v.size).toLowerCase() === s.toLowerCase()); };
    if (affected.length === 0) return apply();
    return setConfirm({ title: `Remove size ${s}?`, message: `${affected.length} variant(s) with size ${s} and no stock will be removed from this product when you save.`, onConfirm: () => { apply(); setConfirm(null); } });
  };
  const toggleSize = (s) => (form.sizes.some((x) => x.toLowerCase() === s.toLowerCase()) ? removeSize(form.sizes.find((x) => x.toLowerCase() === s.toLowerCase())) : addSize(s));

  // ---- colors ----
  const addColor = (c) => set((f) => ({ colors: [...f.colors, c] }));
  const changeColor = (key, patch) => set((f) => ({
    colors: f.colors.map((c) => (c.key === key ? { ...c, ...patch } : c)),
    // keep variants in sync when a colour is renamed / recoloured
    variants: patch.name === undefined && patch.hex === undefined ? f.variants : f.variants.map((v) => {
      const old = f.colors.find((c) => c.key === key);
      return v.color && old && v.color.name === old.name ? { ...v, color: { name: patch.name ?? v.color.name, hex: patch.hex ?? v.color.hex } } : v;
    }),
  }));
  const removeColor = (c) => {
    const affected = variantsUsing(form.variants, { colorName: c.name });
    const stocked = stockedVariants(affected);
    if (stocked.length > 0) return notify(`Cannot remove ${c.name}: ${stocked.length} variant(s) still hold stock. Deactivate them instead.`, 'error');
    const apply = () => { set((f) => ({ colors: f.colors.filter((x) => x.key !== c.key) })); dropVariants((v) => v.color && v.color.name.toLowerCase() === c.name.toLowerCase()); };
    if (affected.length === 0) return apply();
    return setConfirm({ title: `Remove color ${c.name}?`, message: `${affected.length} variant(s) in ${c.name} with no stock will be removed when you save.`, onConfirm: () => { apply(); setConfirm(null); } });
  };

  // ---- variants ----
  const generate = () => {
    if (!form.sku.trim()) { setTab('basic'); setSubmitted(true); return notify('Enter the product SKU first: variant SKUs are built from it.', 'error'); }
    const r = generateVariants({ productSku: form.sku, sizes: form.sizes, colors: form.colors.filter((c) => c.name.trim()), variants: form.variants, price: form.price, salePrice: form.salePrice });
    set({ variants: r.variants });
    notify(`${r.addedCount} variant(s) added. Existing variants were left untouched.`);
  };
  const changeVariant = (key, patch) => set((f) => ({ variants: f.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) }));
  const removeVariant = (v) => {
    if (!v._id) return dropVariants((x) => x.key === v.key);
    return setConfirm({ title: `Remove variant ${v.sku}?`, message: 'This variant has no stock. It is deleted when you save. Past orders keep their own copy of its details.', onConfirm: () => { dropVariants((x) => x.key === v.key); setConfirm(null); } });
  };

  const addTag = () => { const t = tagText.trim().toLowerCase(); if (t && !form.tags.includes(t) && form.tags.length < 20) set({ tags: [...form.tags, t] }); setTagText(''); };

  async function submit() {
    setSubmitted(true); setError('');
    if (!check.valid) {
      const first = TABS.find(([id]) => check.section[id]);
      if (first) setTab(first[0]);
      return notify('Please fix the highlighted fields.', 'error');
    }
    setBusy(true);
    try { await onSubmit(formToPayload(form)); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const price = Number(form.price);
  const sale = form.salePrice === '' ? undefined : Number(form.salePrice);
  const idx = TABS.findIndex(([id]) => id === tab);

  const panel = {
    basic: <div className="form-grid">
      <div className="field full-field"><label>Product name *</label><input value={form.name} maxLength={150} onChange={(e) => set({ name: e.target.value })} className={errors.name ? 'invalid' : ''} placeholder="Women's Designer Kurti" />{errors.name && <small className="field-error">{errors.name}</small>}</div>
      <div className="field"><label>Product SKU *</label><input value={form.sku} maxLength={60} onChange={(e) => set({ sku: e.target.value.toUpperCase() })} className={errors.sku ? 'invalid' : ''} placeholder="NK-001" />{errors.sku && <small className="field-error">{errors.sku}</small>}<small className="hint">Variant SKUs are generated from this. It must be unique.</small></div>
      <div className="field"><label>Tags</label><div className="inline-add"><input value={tagText} onChange={(e) => setTagText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="cotton, festive…" /><button type="button" className="outline-btn" onClick={addTag}>Add</button></div>
        <div className="chip-row">{form.tags.map((t) => <span className="chip on removable" key={t}>{t}<button type="button" onClick={() => set({ tags: form.tags.filter((x) => x !== t) })} aria-label={`Remove tag ${t}`}><X size={12} /></button></span>)}</div></div>
      <div className="field full-field"><label>Description</label><textarea rows="4" maxLength={3000} value={form.description} onChange={(e) => set({ description: e.target.value })} /></div>
      {product && <small className="hint full-field">Created {dateTime(product.createdAt)} · last updated {dateTime(product.updatedAt)}</small>}
    </div>,
    categories: <CategorySelects moduleType="readymade" value={{ mainCategory: form.mainCategory, category: form.category, subCategory: form.subCategory }} errors={errors} onChange={(v) => set(v)} />,
    images: <ImageListEditor images={form.images} onChange={(images) => set({ images })} errors={errors} />,
    sizes: <SizeSelector sizes={form.sizes} onToggle={toggleSize} onAddCustom={addSize} onRemove={removeSize} />,
    colors: <ColorEditor colors={form.colors} errors={errors} onAdd={addColor} onChange={changeColor} onRemove={removeColor} />,
    variants: <VariantTable form={form} errors={errors} onGenerate={generate} onChange={changeVariant} onRemove={removeVariant} />,
    pricing: <div>
      <div className="form-grid">
        <div className="field"><label>Regular price (₹) *</label><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set({ price: e.target.value })} className={errors.price ? 'invalid' : ''} />{errors.price && <small className="field-error">{errors.price}</small>}</div>
        <div className="field"><label>Sale price (₹)</label><input type="number" min="0" step="0.01" value={form.salePrice} onChange={(e) => set({ salePrice: e.target.value })} className={errors.salePrice ? 'invalid' : ''} placeholder="Optional" />{errors.salePrice && <small className="field-error">{errors.salePrice}</small>}</div>
      </div>
      <div className="price-preview"><span>Selling price</span><b>{Number.isNaN(price) ? '—' : money(sellingPrice(price, sale))}</b>{discountPercent(price, sale) > 0 && <><s>{money(price)}</s><StatusBadge label={`${discountPercent(price, sale)}% off`} tone="active" /></>}</div>
      <small className="hint block">{hasVariants ? 'These are the defaults used when generating variants. Each variant can have its own price in Variant management.' : 'Display only: the server recalculates and validates all prices.'}</small>
    </div>,
    inventory: <div>
      <div className="form-grid">
        <div className="field"><label>Low-stock threshold</label><input type="number" min="0" step="1" value={form.lowStockThreshold} onChange={(e) => set({ lowStockThreshold: e.target.value })} className={errors.lowStockThreshold ? 'invalid' : ''} /><small className="hint">Products at or below this quantity show a low-stock warning.</small></div>
        {hasVariants ? <div className="field"><label>Total stock (active variants)</label><div className="readonly-box"><b>{stats.stock}</b> units · {stats.active} active variants · {stats.outOfStock} out of stock</div><small className="hint">Edit quantities per variant in Variant management.</small></div>
          : <div className="field"><label>Stock quantity</label><input type="number" min="0" step="1" value={form.simpleStock} onChange={(e) => set({ simpleStock: e.target.value })} className={errors.simpleStock ? 'invalid' : ''} placeholder="Leave empty = not tracked" />{errors.simpleStock && <small className="field-error">{errors.simpleStock}</small>}<small className="hint">Used only while the product has no variants.</small></div>}
      </div>
      {hasVariants && form.legacyStock > 0 && <div className="note-box warn"><AlertTriangle size={16} /><div><b>This product had {form.legacyStock} units of product-level stock.</b> Split exactly {form.legacyStock} units across the variants (currently {stats.stock}).
        <label className="check"><input type="checkbox" checked={form.acknowledgeLegacyStockReset} onChange={(e) => set({ acknowledgeLegacyStockReset: e.target.checked })} /> Discard the old stock figure instead</label>
        {errors.legacyStock && <small className="field-error">{errors.legacyStock}</small>}</div></div>}
      {form._id && <><p className="sub-label">Inventory history</p>
        {history === null ? <small className="hint">Loading…</small> : history.length === 0 ? <small className="hint">No stock movements recorded yet.</small> :
          <div className="table-wrap"><table><thead><tr><th>When</th><th>SKU</th><th>Change</th><th>Before → After</th><th>Reason</th></tr></thead><tbody>{history.map((h) => <tr key={h._id}><td>{dateTime(h.createdAt)}</td><td>{h.sku || '—'}</td><td className={h.change < 0 ? 'neg' : 'pos'}>{h.change > 0 ? `+${h.change}` : h.change}</td><td>{h.before} → {h.after}</td><td>{h.reason || h.type}</td></tr>)}</tbody></table></div>}</>}
    </div>,
    status: <div className="status-box">
      <label className="check big"><input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} /> <div><b>Active</b><small>Visible to customers and available to order.</small></div></label>
      <label className="check big"><input type="checkbox" checked={form.isFeatured} onChange={(e) => set({ isFeatured: e.target.checked })} /> <div><b>Featured product</b><small>Highlight this product in the storefront.</small></div></label>
    </div>,
  };

  return <>
    <Modal wide locked eyebrow={product ? 'UPDATE PRODUCT' : 'NEW PRODUCT'} title={product ? 'Edit product' : 'Add product'} onClose={onClose}
      footer={<>
        <button type="button" className="outline-btn" onClick={onClose}>Cancel</button>
        <button type="button" className="outline-btn" disabled={idx === 0} onClick={() => setTab(TABS[idx - 1][0])}>Back</button>
        {idx < TABS.length - 1 && <button type="button" className="outline-btn" onClick={() => setTab(TABS[idx + 1][0])}>Next</button>}
        <button type="button" className="primary-btn" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Save product'}</button>
      </>}>
      {error && <div className="error banner">{error}</div>}
      <div className="product-form">
        <nav className="form-tabs">{TABS.map(([id, label], i) => <button type="button" key={id} className={`${tab === id ? 'active' : ''} ${sections[id] ? 'has-error' : ''}`} onClick={() => setTab(id)}><span>{i + 1}</span>{label}{sections[id] > 0 && <em>{sections[id]}</em>}</button>)}</nav>
        <div className="form-panel"><h3>{TABS[idx][1]}</h3>{panel[tab]}</div>
      </div>
    </Modal>
    {confirm && <ConfirmDialog danger title={confirm.title} message={confirm.message} confirmLabel="Remove" onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
  </>;
}
