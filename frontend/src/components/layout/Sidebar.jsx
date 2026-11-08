import { X, ChevronDown, LogOut } from 'lucide-react';
import { nav } from '../../routes/navigation';
import useAuth from '../../hooks/useAuth';

export default function Sidebar({ page, setPage, mobile, setMobile }) {
  const { admin, logout } = useAuth();
  return <aside className={`sidebar ${mobile ? 'open' : ''}`}>
    <div className="brand"><div className="brand-mark">N</div><div><b>THE NARI</b><small>ADMIN PANEL</small></div><button className="mobile-close" onClick={() => setMobile(false)}><X size={18} /></button></div>
    <div className="store-chip"><span className="live-dot" /> Store management <ChevronDown size={14} /></div>
    {nav.map(group => <div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(([label, id, Icon]) => <button key={id} className={`nav-link ${page === id ? 'active' : ''}`} onClick={() => { setPage(id); setMobile(false); }}><Icon size={17} /><span>{label}</span></button>)}</div>)}
    <div className="sidebar-bottom"><div className="admin-mini"><div className="avatar">{(admin?.name || 'A').slice(0, 1).toUpperCase()}</div><div><b>{admin?.name || 'Admin'}</b><small>{admin?.role || 'Owner'}</small></div></div><button className="logout" onClick={logout}><LogOut size={16} /> Sign out</button></div>
  </aside>;
}
