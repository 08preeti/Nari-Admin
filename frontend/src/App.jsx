import { useState } from 'react';
import useAuth from './hooks/useAuth';
import useToast from './hooks/useToast';
import LoginPage from './pages/auth/LoginPage';
import AppLayout from './components/layout/AppLayout';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  const { token, login } = useAuth();
  const [page, setPage] = useState('dashboard');
  const { toast, notify } = useToast();

  if (!token) return <LoginPage onLogin={login} />;
  return <AppLayout page={page} setPage={setPage} toast={toast}>
    <AppRoutes page={page} onNavigate={setPage} notify={notify} />
  </AppLayout>;
}
