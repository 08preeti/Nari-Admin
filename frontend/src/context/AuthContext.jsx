import { createContext, useEffect, useState } from 'react';
import { getMe } from '../services/authService';
import { getToken, setToken as saveToken, clearToken } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getToken());
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    if (token) getMe().then(r => setAdmin(r.data)).catch(() => { clearToken(); setToken(null); });
  }, [token]);

  // Any 401 from the API (expired / invalid token) signs the admin out.
  useEffect(() => {
    const onUnauthorized = () => { setToken(null); setAdmin(null); };
    window.addEventListener('nari:unauthorized', onUnauthorized);
    return () => window.removeEventListener('nari:unauthorized', onUnauthorized);
  }, []);

  const login = (t, a) => { saveToken(t); setToken(t); setAdmin(a); };
  const logout = () => { clearToken(); setToken(null); setAdmin(null); };

  return <AuthContext.Provider value={{ token, admin, login, logout }}>{children}</AuthContext.Provider>;
}
