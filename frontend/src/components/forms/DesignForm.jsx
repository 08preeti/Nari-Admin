import { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import CategorySelects from './CategorySelects';
import ImageListEditor from './ImageListEditor';
import { blankImage, uid } from '../../utils/variants';
import { isHttpUrl } from '../../utils/formatters';

const toForm = (d) => ({
  mainCategory: d?.mainCategory?._id || d?.mainCategory || '', category: d?.category?._id || d?.category || '', subCategory: d?.subCategory?._id || d?.subCategory || '',
  name: d?.name || '', referenceCode: d?.referenceCode || '', description: d?.description || '', displayOrder: d?.displayOrder ?? 0, isActive: d ? d.isActive !== false : true,
  images: d?.images?.length ? d.images.map((i) => ({ key: uid(), url: i.url, alt: i.alt || '' })) : [blankImage()],
});

export default function DesignForm({ design, onClose, onSubmit, notify }) {
  const [form, setForm] = useState(() => toForm(design));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const errors = useMemo(() => {
    const e = {};
    if (!form.name.trim()) e.name = 'Design name is required';
    if (!form.referenceCode.trim()) e.referenceCode = 'Reference code is required';
    ['mainCategory', 'category', 'subCategory'].forEach((k) => { if (!form[k]) e[k] = 'Required'; });
    form.images.forEach((img, i) => { if (img.url.trim() && !isHttpUrl(img.url)) e[`image-${i}`] = 'Enter a valid http(s) URL'; });
    if (form.displayOrder === '' || Number(form.displayOrder) < 0 || Number.isNaN(Number(form.displayOrder))) e.displayOrder = '0 or more';
    return e;
  }, [form]);
  const shown = submitted ? errors : {};

  async function submit(ev) {
    ev.preventDefault(); setSubmitted(true); setError('');
    if (Object.keys(errors).length) return notify('Please fix the highlighted fields.', 'error');
    setBusy(true);
    try {
      await onSubmit({
        mainCategory: form.mainCategory, category: form.category, subCategory: form.subCategory,
        name: form.name.trim(), referenceCode: form.referenceCode.trim().toUpperCase(), description: form.description.trim(),
        displayOrder: Number(form.displayOrder), isActive: form.isActive,
        images: form.images.filter((i) => i.url.trim()).map((i) => ({ url: i.url.trim(), ...(i.alt.trim() ? { alt: i.alt.trim() } : {}) })),
      });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return <Modal wide locked eyebrow={design ? 'UPDATE DESIGN' : 'NEW DESIGN'} title={design ? 'Edit design' : 'Add design'} onClose={onClose}
    footer={<><button type="button" className="outline-btn" onClick={onClose}>Cancel</button><button form="design-form" className="primary-btn" disabled={busy}>{busy ? 'Saving…' : 'Save design'}</button></>}>
    <form id="design-form" onSubmit={submit} className="stack">
      {error && <div className="error banner">{error}</div>}
      <div className="form-grid">
        <div className="field"><label>Design name *</label><input value={form.name} maxLength={150} onChange={(e) => set({ name: e.target.value })} className={shown.name ? 'invalid' : ''} />{shown.name && <small className="field-error">{shown.name}</small>}</div>
        <div className="field"><label>Reference code *</label><input value={form.referenceCode} onChange={(e) => set({ referenceCode: e.target.value.toUpperCase() })} className={shown.referenceCode ? 'invalid' : ''} />{shown.referenceCode && <small className="field-error">{shown.referenceCode}</small>}</div>
      </div>
      <CategorySelects moduleType="stitching" value={{ mainCategory: form.mainCategory, category: form.category, subCategory: form.subCategory }} errors={shown} onChange={(v) => set(v)} />
      <div className="field"><label>Description</label><textarea rows="3" value={form.description} onChange={(e) => set({ description: e.target.value })} /></div>
      <div><p className="sub-label">Design images</p><ImageListEditor images={form.images} onChange={(images) => set({ images })} errors={shown} /></div>
      <div className="form-grid">
        <div className="field"><label>Display order</label><input type="number" min="0" value={form.displayOrder} onChange={(e) => set({ displayOrder: e.target.value })} className={shown.displayOrder ? 'invalid' : ''} /></div>
        <label className="check big"><input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} /><div><b>Active</b><small>Available for new stitching orders.</small></div></label>
      </div>
    </form>
  </Modal>;
}
