import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { login } from '../../services/authService';

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { const r = await login(email, password); onLogin(r.data.token, r.data.admin); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <form onSubmit={submit}><label>Email address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@thenari.com" required /><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />{error && <div className="error"><AlertCircle size={15} />{error}</div>}<button className="primary-btn full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <span>→</span></button></form>;
}
