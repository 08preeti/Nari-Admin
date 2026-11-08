import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function Toast({ message }) {
  if (!message) return null;
  const { message: text, type } = typeof message === 'string' ? { message, type: 'success' } : message;
  return <div className={`toast ${type === 'error' ? 'toast-error' : ''}`} role="status">{type === 'error' ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}{text}</div>;
}
