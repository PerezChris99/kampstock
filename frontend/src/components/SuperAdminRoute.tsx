import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export default function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isSuperAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
