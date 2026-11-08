export const money = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v || 0));
export const date = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const dateTime = (v) => v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const isHttpUrl = (value) => {
  try { const u = new URL(String(value).trim()); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
};
export const colorLabel = (c) => (c && typeof c === 'object' ? c.name : c) || '—';
