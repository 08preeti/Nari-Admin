import { useState } from 'react';
import { Plus, Trash2, ImagePlus } from 'lucide-react';
import ImageListEditor from './ImageListEditor';
import { COLOR_PRESETS } from '../../utils/constants';
import { blankImage, uid } from '../../utils/variants';

export default function ColorEditor({ colors, errors = {}, onAdd, onChange, onRemove }) {
  const [open, setOpen] = useState(null);
  const has = (name) => colors.some((c) => c.name.trim().toLowerCase() === name.toLowerCase());
  return <div>
    <p className="sub-label">Quick add</p>
    <div className="chip-row">{COLOR_PRESETS.map((p) => <button type="button" key={p.name} className="chip" disabled={has(p.name)} onClick={() => onAdd({ key: uid(), name: p.name, hex: p.hex, images: [] })}><i className="swatch" style={{ background: p.hex }} /> {p.name}</button>)}</div>
    <div className="color-list">
      {colors.map((c, i) => <div key={c.key} className="color-item">
        <div className="color-row">
          <input type="color" value={/^#[0-9A-Fa-f]{6}$/.test(c.hex) ? c.hex : '#000000'} onChange={(e) => onChange(c.key, { hex: e.target.value.toUpperCase() })} aria-label="Pick color" className="color-pick" />
          <input value={c.name} placeholder="Color name" onChange={(e) => onChange(c.key, { name: e.target.value })} className={errors[`color-${i}`] ? 'invalid' : ''} />
          <input value={c.hex} placeholder="#FF0000" maxLength={7} onChange={(e) => onChange(c.key, { hex: e.target.value })} className="hex-input" aria-label="Hex code" />
          <button type="button" className="outline-btn" onClick={() => setOpen(open === c.key ? null : c.key)}><ImagePlus size={14} /> Images ({c.images.filter((x) => x.url).length})</button>
          <button type="button" className="icon-btn" onClick={() => onRemove(c)} title="Remove color"><Trash2 size={14} /></button>
        </div>
        {errors[`color-${i}`] && <small className="field-error">{errors[`color-${i}`]}</small>}
        {open === c.key && <div className="color-images"><ImageListEditor compact images={c.images.length ? c.images : [blankImage()]} onChange={(imgs) => onChange(c.key, { images: imgs })} max={10} errorPrefix={`cimg-${c.key}`} /></div>}
      </div>)}
    </div>
    <button type="button" className="outline-btn" onClick={() => onAdd({ key: uid(), name: '', hex: '#000000', images: [] })}><Plus size={14} /> Add color</button>
    {colors.length === 0 && <small className="hint block">No colors yet. Add a preset above or create a custom color.</small>}
  </div>;
}
