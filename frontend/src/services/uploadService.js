import { getToken, clearToken } from './api';

const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');

// Uploads one image file and resolves with its public URL.
// (Not using api() because that always sends JSON; the browser must set the multipart header itself.)
export async function uploadImage(file) {
  const body = new FormData();
  body.append('image', file);
  const token = getToken();
  let response;
  try {
    response = await fetch(`${BASE}/uploads/images`, { method: 'POST', body, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and that the API is running.');
  }
  let json = {};
  try { json = await response.json(); } catch { /* non-JSON body */ }
  if (response.status === 401) { clearToken(); window.dispatchEvent(new Event('nari:unauthorized')); }
  if (!response.ok || json.success === false) throw new Error(json.message || `Upload failed (${response.status})`);
  return json.data.url;
}