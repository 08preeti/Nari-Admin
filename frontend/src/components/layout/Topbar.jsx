import { Menu } from 'lucide-react';
import { catalogConfigs } from '../../utils/catalogConfig';
import { nav } from '../../routes/navigation';
import useAuth from '../../hooks/useAuth';

const titleFor = (page) => {
  if (page === 'dashboard') return 'Overview';
  if (catalogConfigs[page]) return catalogConfigs[page].title;
  for (const g of nav) for (const [label, id] of g.items) if (id === page) return label;
  return page.replaceAll('-', ' ');
};

export default function Topbar({ page, onMenu }) {
  const { admin } = useAuth();
  return <header className="topbar"><button className="menu-btn" onClick={onMenu} aria-label="Open menu"><Menu /></button><div className="breadcrumb">The Nari <span>/</span> <b>{titleFor(page)}</b></div><div className="top-right"><span className="status-pill"><i /> {admin?.email || 'Signed in'}</span><div className="avatar">{(admin?.name || 'A').slice(0, 1).toUpperCase()}</div></div></header>;
}
