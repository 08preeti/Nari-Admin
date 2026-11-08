import Modal from './Modal';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) {
  return <Modal title={title} onClose={onCancel} footer={<>
    <button type="button" className="outline-btn" onClick={onCancel}>Cancel</button>
    <button type="button" className={danger ? 'primary-btn danger-btn' : 'primary-btn'} disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : confirmLabel}</button>
  </>}><p className="confirm-text">{message}</p></Modal>;
}
