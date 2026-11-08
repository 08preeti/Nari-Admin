import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Footer from './Footer';
import Toast from '../common/Toast';

export default function AppLayout({ page, setPage, toast, children }) {
  const [mobile, setMobile] = useState(false);
  return <div className="app-shell">
    <Sidebar page={page} setPage={setPage} mobile={mobile} setMobile={setMobile} />
    {mobile && <div className="sidebar-scrim" onClick={() => setMobile(false)} />}
    <main className="main">
      <Topbar page={page} onMenu={() => setMobile(true)} />
      <section className="content">{children}</section>
      <Footer />
    </main>
    <Toast message={toast} />
  </div>;
}
