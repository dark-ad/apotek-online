import React from 'react';
import { useAuth, UserRole } from '../../context/AuthContext';
import { UnauthorizedAlert } from '../common/UnauthorizedAlert';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  onGoHome: () => void;
  onOpenLogin: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
  onGoHome,
  onOpenLogin,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div style={{ fontSize: '1rem', color: 'var(--primary-700)', fontWeight: 600 }}>
          Memverifikasi izin akses...
        </div>
      </div>
    );
  }

  // Check 1: User must be authenticated
  if (!isAuthenticated || !user) {
    return (
      <UnauthorizedAlert
        requiredRole={allowedRoles.join(' / ')}
        onGoHome={onGoHome}
        onOpenLogin={onOpenLogin}
      />
    );
  }

  // Check 2: Role must be in allowedRoles
  if (!allowedRoles.includes(user.role)) {
    return (
      <UnauthorizedAlert
        requiredRole={allowedRoles.join(' / ')}
        onGoHome={onGoHome}
        onOpenLogin={onOpenLogin}
      />
    );
  }

  // Authorized
  return <>{children}</>;
};
