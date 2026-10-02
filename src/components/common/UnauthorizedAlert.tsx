import React from 'react';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../../context/AuthContext';

interface UnauthorizedAlertProps {
  requiredRole?: string;
  onGoHome: () => void;
  onOpenLogin: () => void;
}

export const UnauthorizedAlert: React.FC<UnauthorizedAlertProps> = ({
  requiredRole = 'ADMIN / STAFF',
  onGoHome,
  onOpenLogin,
}) => {
  const { user, isAuthenticated } = useAuth();

  return (
    <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2.5rem', background: '#ffffff', borderRadius: 'var(--radius-xl)', border: '1px solid #fee2e2', boxShadow: 'var(--shadow-xl)', textAlign: 'center' }}>
      <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
        <ShieldAlert size={36} />
      </div>

      <span className="badge badge-keras" style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }}>
        403 Access Denied / Terlarang
      </span>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary-900)', marginBottom: '0.75rem' }}>
        Akses Dibatasi oleh Kebijakan Role
      </h2>

      <p style={{ color: 'var(--secondary-600)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Halaman ini memerlukan hak akses <strong>{requiredRole}</strong>.
        {isAuthenticated ? (
          <> Akun Anda saat ini masuk sebagai <strong>{user?.name}</strong> dengan role <strong>{user?.role}</strong> yang tidak memiliki izin untuk melihat modul ini.</>
        ) : (
          <> Anda belum masuk ke sistem. Silakan login menggunakan akun dengan kredensial yang sesuai.</>
        )}
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Button variant="secondary" size="md" icon={<ArrowLeft size={16} />} onClick={onGoHome}>
          Kembali ke Beranda
        </Button>
        <Button variant="primary" size="md" icon={<LogIn size={16} />} onClick={onOpenLogin}>
          {isAuthenticated ? 'Ganti Akun Login' : 'Login Sekarang'}
        </Button>
      </div>
    </div>
  );
};
