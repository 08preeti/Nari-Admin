import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import SafeImage from '../common/SafeImage';
import { uploadImage } from '../../services/uploadService';

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_MB = 5;

// Pick an image from the device. The file is uploaded right away and `onChange` receives its URL ('' when removed).
export default function ImageUpload({ value, onChange, onBusyChange, invalid = false }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setBusyState = (b) => { setBusy(b); onBusyChange?.(b); };

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be chosen again later
    if (!file) return;
    if (!TYPES.includes(file.type)) { setError('Choose a JPG, PNG, WebP or GIF image.'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setError(`Image must be ${MAX_MB} MB or smaller.`); return; }
    setError(''); setBusyState(true);
    try { onChange(await uploadImage(file)); } catch (err) { setError(err.message); } finally { setBusyState(false); }
  }

  return <div className={`img-upload${invalid ? ' invalid' : ''}`}>
    <SafeImage src={value} size={72} />
    <div className="img-upload-body">
      <div className="img-upload-actions">
        <button type="button" className="outline-btn" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <><span className="spinner" /> Uploading…</> : <><ImagePlus size={16} /> {value ? 'Change image' : 'Choose image'}</>}
        </button>
        {value && !busy && <button type="button" className="outline-btn" onClick={() => onChange('')}><Trash2 size={15} /> Remove</button>}
      </div>
      <small className="hint">JPG, PNG, WebP or GIF, up to {MAX_MB} MB.</small>
      {error && <small className="field-error">{error}</small>}
    </div>
    <input ref={inputRef} type="file" accept={TYPES.join(',')} hidden onChange={pick} />
  </div>;
}