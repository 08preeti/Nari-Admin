import LoginForm from '../../components/forms/LoginForm';

export default function LoginPage({ onLogin }) {
  return <div className="login-page"><div className="login-card"><div className="brand login-brand"><div className="brand-mark">N</div><div><b>THE NARI</b><small>ADMIN PANEL</small></div></div><div className="login-copy"><span className="eyebrow">STORE MANAGEMENT</span><h1>Welcome back.</h1><p>Sign in to manage your boutique operations.</p></div><LoginForm onLogin={onLogin} /><small className="login-foot">Use the admin credentials configured in backend .env</small></div><div className="login-side"><div className="side-art"><div className="art-circle" /><div className="art-word">NARI<span>.</span></div><p>Thoughtful style.<br />Made personal.</p></div><small>THE NARI · ADMIN</small></div></div>;
}
