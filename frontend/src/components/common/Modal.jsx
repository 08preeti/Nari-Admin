import { useEffect } from 'react';
import { X } from 'lucide-react';

// Closes on Escape and on backdrop click (unless `locked`). Body scroll is frozen while open.
export default function Modal({ eyebrow, title, onClose, children, footer, wide, locked }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !locked) onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose, locked]);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !locked && onClose()}>
    <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true">
      <div className="modal-head"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
      {children}
      {footer && <div className="modal-foot">{footer}</div>}
    </div>
  </div>;
}
