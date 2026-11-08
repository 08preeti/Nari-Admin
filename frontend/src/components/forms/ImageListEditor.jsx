import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import SafeImage from '../common/SafeImage';
import { blankImage } from '../../utils/variants';
import { isHttpUrl } from '../../utils/formatters';

// Dynamic list of image URLs: add, remove, reorder, live preview. Always shows at least one input row.
export default function ImageListEditor({ images, onChange, errors = {}, errorPrefix = 'image', max = 20, compact }) {
  const update = (i, patch) => onChange(images.map((img, idx) => (idx === i ? { ...img, ...patch } : img)));
  const move = (i, d) => { const next = [...images]; const j = i + d; if (j < 0 || j >= next.length) return; [next[i], next[j]] = [next[j], next[i]]; onChange(next); };
  const remove = (i) => { const next = images.filter((_, idx) => idx !== i); onChange(next.length ? next : [blankImage()]); };
  const filled = images.filter((i) => i.url.trim()).length;
  return <div className="img-editor">
    {images.map((img, i) => {
      const err = errors[`${errorPrefix}-${i}`];
      return <div className="img-row" key={img.key}>
        <SafeImage src={img.url.trim() && isHttpUrl(img.url) ? img.url.trim() : ''} size={compact ? 48 : 64} />
        <div className="img-fields">
          <input type="url" placeholder="https://example.com/image.jpg" value={img.url} onChange={(e) => update(i, { url: e.target.value })} className={err ? 'invalid' : ''} aria-label={`Image ${i + 1} URL`} />
          {!compact && <input placeholder="Alt text, e.g. Front view" value={img.alt} onChange={(e) => update(i, { alt: e.target.value })} aria-label={`Image ${i + 1} alt text`} />}
          {err && <small className="field-error">{err}</small>}
        </div>
        <div className="img-actions">
          <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} title="Move up"><ArrowUp size={14} /></button>
          <button type="button" className="icon-btn" disabled={i === images.length - 1} onClick={() => move(i, 1)} title="Move down"><ArrowDown size={14} /></button>
          <button type="button" className="icon-btn" onClick={() => remove(i)} title="Remove image"><Trash2 size={14} /></button>
        </div>
      </div>;
    })}
    <div className="img-foot">
      <button type="button" className="outline-btn" disabled={images.length >= max} onClick={() => onChange([...images, blankImage()])}><Plus size={14} /> Add Image</button>
      <small>{filled} image{filled === 1 ? '' : 's'} · the first image is the main image · empty rows are not saved</small>
    </div>
  </div>;
}
