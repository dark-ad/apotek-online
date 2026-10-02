import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  MapPin, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onLoginSuccess?: (role: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onLoginSuccess,
}) => {
  const { login, register, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  // Status & Error Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setAddress('');
    setErrorMsg(null);
    setFieldErrors({});
    setSuccessMsg(null);
  };

  const handleModeChange = (newMode: 'login' | 'register') => {
    setMode(newMode);
    resetForm();
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setErrorMsg(null);
    setFieldErrors({});

    const res = await login(demoEmail, 'password123');
    if (res.success) {
      setSuccessMsg('Login berhasil!');
      setTimeout(() => {
        onClose();
        if (onLoginSuccess) onLoginSuccess(demoEmail.includes('admin') ? 'ADMIN' : demoEmail.includes('staff') ? 'STAFF' : 'CUSTOMER');
      }, 500);
    } else {
      setErrorMsg(res.message || 'Login gagal.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});

    if (mode === 'login') {
      if (!email || !password) {
        setErrorMsg('Email dan password wajib diisi.');
        return;
      }

      const res = await login(email, password);
      if (res.success) {
        setSuccessMsg('Login berhasil! Mengalihkan...');
        setTimeout(() => {
          onClose();
          if (onLoginSuccess) onLoginSuccess('CUSTOMER');
        }, 500);
      } else {
        setErrorMsg(res.message || 'Login gagal.');
        if (res.errors) setFieldErrors(res.errors);
      }
    } else {
      // Register Mode (Customer only)
      if (!name || name.trim().length < 2) {
        setFieldErrors((prev) => ({ ...prev, name: 'Nama wajib diisi minimal 2 karakter.' }));
        return;
      }
      if (!email || !email.includes('@')) {
        setFieldErrors((prev) => ({ ...prev, email: 'Email tidak valid.' }));
        return;
      }
      if (!password || password.length < 6) {
        setFieldErrors((prev) => ({ ...prev, password: 'Password minimal 6 karakter.' }));
        return;
      }

      const res = await register({ name, email, password, phone, address });
      if (res.success) {
        setSuccessMsg('Akun Customer berhasil didaftarkan!');
        setTimeout(() => {
          onClose();
          if (onLoginSuccess) onLoginSuccess('CUSTOMER');
        }, 700);
      } else {
        setErrorMsg(res.message || 'Registrasi gagal.');
        if (res.errors) setFieldErrors(res.errors);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'login' ? 'Masuk ke Akun Apotek' : 'Daftar Akun Pembeli Baru'}
    >
      <div>
        {/* Mode Switcher Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--secondary-100)', padding: '0.35rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'login' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-sm)' }}
            onClick={() => handleModeChange('login')}
          >
            <LogIn size={15} />
            <span>Masuk</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'register' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-sm)' }}
            onClick={() => handleModeChange('register')}
          >
            <UserPlus size={15} />
            <span>Daftar Akun</span>
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontSize: '0.85rem', marginBottom: '1rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontSize: '0.85rem', marginBottom: '1rem' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Quick Role Login Chips for Testing */}
        {mode === 'login' && (
          <div style={{ background: 'var(--secondary-50)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary-600)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Sparkles size={13} color="#8b5cf6" />
              <span>Login Demo Cepat (1 Klik):</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.55rem', borderLeft: '3px solid #8b5cf6' }}
                onClick={() => handleQuickLogin('admin@apoteksehat-ai.com')}
              >
                👑 Admin
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.55rem', borderLeft: '3px solid #0284c7' }}
                onClick={() => handleQuickLogin('staff.apoteker@apoteksehat-ai.com')}
              >
                🩺 Staf Apoteker
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.55rem', borderLeft: '3px solid #10b981' }}
                onClick={() => handleQuickLogin('budi.santoso@gmail.com')}
              >
                🛍️ Customer
              </button>
            </div>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* Name Field (Register only) */}
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Nama Lengkap *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Masukkan nama lengkap Anda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${fieldErrors.name ? '#ef4444' : 'var(--border-light)'}`,
                    fontSize: '0.9rem'
                  }}
                  required
                />
                <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              {fieldErrors.name && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>{fieldErrors.name}</span>}
            </div>
          )}

          {/* Email Field */}
          <div>
            <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
              Alamat Email *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${fieldErrors.email ? '#ef4444' : 'var(--border-light)'}`,
                  fontSize: '0.9rem'
                }}
                required
              />
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            {fieldErrors.email && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>{fieldErrors.email}</span>}
          </div>

          {/* Password Field */}
          <div>
            <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
              Kata Sandi *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 2.5rem 0.65rem 2.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${fieldErrors.password ? '#ef4444' : 'var(--border-light)'}`,
                  fontSize: '0.9rem'
                }}
                required
              />
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>{fieldErrors.password}</span>}
          </div>

          {/* Optional Phone & Address for Register */}
          {mode === 'register' && (
            <>
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Nomor HP (WhatsApp)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    placeholder="0812xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.9rem'
                    }}
                  />
                  <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Alamat Lengkap Pengiriman
                </label>
                <div style={{ position: 'relative' }}>
                  <textarea
                    rows={2}
                    placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kota"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.9rem'
                    }}
                  />
                  <MapPin size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '0.75rem' }} />
                </div>
              </div>
            </>
          )}

          {/* Security Notice */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--secondary-500)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            <ShieldCheck size={14} color="#059669" />
            <span>Password dienkripsi dengan standar industri Bcrypt 10-rounds.</span>
          </div>

          {/* Submit Button */}
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={isLoading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {isLoading ? 'Memproses...' : mode === 'login' ? 'Masuk Sekarang' : 'Daftar Akun Baru'}
          </Button>
        </form>
      </div>
    </Modal>
  );
};
