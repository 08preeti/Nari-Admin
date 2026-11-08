const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const TOKEN_KEY = 'nari_admin_token';

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(token) { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

export class ApiError extends Error {
  constructor(message, status, errors) { super(message); this.status = status; this.errors = errors || []; }
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and that the API is running.', 0);
  }
  let body = {};
  try { body = await response.json(); } catch { /* non-JSON body */ }
  if (response.status === 401 && !path.startsWith('/auth/login')) {
    clearToken();
    window.dispatchEvent(new Event('nari:unauthorized'));
  }
  if (!response.ok || body.success === false) {
    const detail = Array.isArray(body.errors) && body.errors.length ? `: ${body.errors.map((e) => e.message).join('; ')}` : '';
    throw new ApiError((body.message || `Request failed (${response.status})`) + detail, response.status, body.errors);
  }
  return body;
}
