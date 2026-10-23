import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="loading">Chargement…</p>;
  if (!user) return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

export function RequireStaff({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { user, loading, isStaff, role } = useAuth();
  const location = useLocation();
  if (loading) return <p className="loading">Chargement…</p>;
  if (!user) return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  if (!isStaff) return <Navigate to="/" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
