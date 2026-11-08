import { useState } from 'react';
import { Trash2, ImagePlus, Wand2 } from 'lucide-react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import ImageListEditor from './ImageListEditor';
import { blankImage, variantAvailability, variantStats, missingCombinations } from '../../utils/variants';
import { STOCK_STATUS_LABELS, STOCK_STATUS_TONES } from '../../utils/constants';

export default function VariantTable({ form, errors, onGenerate, onChange, onRemove }) {
  const [imgFor, setImgFor] = useState(null);
  const stats = variantStats(form.variants);
  const pending = missingCombinations({ sizes: form.sizes, colors: form.colors, variants: form.variants }).length;
  const target = form.variants.find((v) => v.key === imgFor);
  const cell = (v, field, props = {}) => <input value={v[field]} onChange={(e) => onChange(v.key, { [field]: e.target.value })} className={errors[`v-${v.key}-${field}`] ? 'invalid' : ''} title={errors[`v-${v.key}-${field}`] || ''} {...props} />;

  return <div>
    <div className="variant-bar">
      <div><b>{stats.active}</b> active of {stats.total} variants · stock <b>{stats.stock}</b> · {stats.outOfStock} out of stock</div>
      <button type="button" className="primary-btn" onClick={onGenerate} disabled={pending === 0}><Wand2 size={14} /> {pending > 0 ? `Generate ${pending} missing combination${pending === 1 ? '' : 's'}` : 'All combinations exist'}</button>
    </div>
    {form.sizes.length === 0 && form.colors.length === 0 && <div className="note-box">Select sizes and/or colors first, then generate the combinations here.</div>}
    {form.variants.length > 0 && <div className="table-wrap variant-table"><table><thead><tr><th>Active</th><th>SKU</th><th>Color</th><th>Size</th><th>Price</th><th>Sale price</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody>
      {form.variants.map((v) => {
        const av = variantAvailability(v, Number(form.lowStockThreshold));
        return <tr key={v.key} className={v.isActive ? '' : 'row-off'}>
          <td><input type="checkbox" checked={v.isActive} onChange={(e) => onChange(v.key, { isActive: e.target.checked })} aria-label="Active" /></td>
          <td>{cell(v, 'sku', { className: `sku-input ${errors[`v-${v.key}-sku`] ? 'invalid' : ''}` })}{errors[`v-${v.key}-sku`] && <small className="field-error">{errors[`v-${v.key}-sku`]}</small>}</td>
          <td>{v.color ? <span className="color-cell"><i className="swatch" style={{ background: v.color.hex || '#ccc' }} />{v.color.name}</span> : '—'}</td>
          <td>{v.size || '—'}</td>
          <td>{cell(v, 'price', { type: 'number', min: 0, step: '0.01', className: 'num-input' })}</td>
          <td>{cell(v, 'salePrice', { type: 'number', min: 0, step: '0.01', className: 'num-input', placeholder: '—' })}</td>
          <td>{cell(v, 'stock', { type: 'number', min: 0, step: 1, className: 'num-input' })}</td>
          <td>{av === 'inactive' ? <StatusBadge status="Inactive" /> : <StatusBadge label={STOCK_STATUS_LABELS[av]} tone={STOCK_STATUS_TONES[av]} />}</td>
          <td><div className="row-actions">
            <button type="button" title="Variant images" onClick={() => setImgFor(v.key)}><ImagePlus size={14} />{v.images.length > 0 && <sup>{v.images.length}</sup>}</button>
            <button type="button" title={v.originalStock > 0 ? 'Has stock: deactivate it instead of removing' : 'Remove variant'} disabled={v.originalStock > 0} onClick={() => onRemove(v)}><Trash2 size={14} /></button>
          </div></td>
        </tr>;
      })}
    </tbody></table></div>}
    <small className="hint block">Existing variants are never overwritten when you generate more. Variants that hold stock can only be deactivated, not removed.</small>
    {target && <Modal title={`Images · ${target.sku}`} onClose={() => setImgFor(null)} footer={<button type="button" className="primary-btn" onClick={() => setImgFor(null)}>Done</button>}>
      <ImageListEditor compact images={target.images.length ? target.images : [blankImage()]} onChange={(imgs) => onChange(target.key, { images: imgs })} max={10} errorPrefix={`vimg-${target.key}`} />
    </Modal>}
  </div>;
}
