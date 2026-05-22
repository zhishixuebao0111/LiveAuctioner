import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import type { Role } from '@liveauctioner/shared';

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { token, user } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <div className="loading">加载中...</div>;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
