import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { orderService } from '../../services/orderService';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Save,
  Star,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

interface CustomerProfileViewProps {
  onNavigateToOrders?: () => void;
}

const fmtDate = (iso?: string) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

export const CustomerProfileView: React.FC<CustomerProfileViewProps> = ({
  onNavigateToOrders,
}) => {
  const { user, token, updateProfile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [isSaving, setIsSaving] = useState(false);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [activeOrders, setActiveOrders] = useState<number>(0);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
      setAddress(user.address || '');
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const fetchOrderStats = async () => {
      if (!token) return;
      try {
        const res = await orderService.getMyOrders();
        if (res.success && res.data?.orders && isMounted) {
          setTotalOrders(res.data.orders.length);
          const active = res.data.orders.filter(
            (o) => !['COMPLETED', 'CANCELLED'].includes(o.status)
          ).length;
          setActiveOrders(active);
        }
      } catch (err) {
        console.error('Error fetching order stats for profile:', err);
      }
    };
    fetchOrderStats();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await updateProfile({ name, phone, address });
      if (res.success) {
        toast.success('Profil berhasil diperbarui!');
      } else {
        toast.error(res.message || 'Gagal menyimpan profil.');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan profil.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 0.875rem 0.75rem 2.6rem',
    border: '1.5px solid var(--border-light)',
    borderRadius: '0.65rem',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
    background: '#fff',
    color: 'var(--secondary-900)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* ---- HERO HEADER ---- */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #0c4a6e 60%, #1e1b4b 100%)',
          padding: '2.5rem 0 3.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16,185,129,0.15) 0%, transparent 50%)',
          }}
        />
        <div className="container" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '5rem',
                height: '5rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #0284c7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '2rem',
                fontWeight: 800,
                boxShadow: '0 0 0 4px rgba(255,255,255,0.2)',
                flexShrink: 0,
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {user?.name}
                </h1>
                <span
                  style={{
                    background: 'rgba(16,185,129,0.25)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(110,231,183,0.4)',
                    borderRadius: '999px',
                    padding: '0.2rem 0.7rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  CUSTOMER
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: 0 }}>
                {user?.email}
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginTop: '2rem',
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '1rem',
                padding: '1rem 1.25rem',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', marginBottom: '0.25rem' }}>
                {totalOrders} Pesanan
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                Total Transaksi Akun ({activeOrders} Berjalan)
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '1rem',
                padding: '1rem 1.25rem',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa', marginBottom: '0.25rem' }}>
                Terverifikasi
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                Status Akun Customer Aktif
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '1rem',
                padding: '1rem 1.25rem',
              }}
            >
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbcfe8', marginBottom: '0.25rem' }}>
                {fmtDate(user?.createdAt)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                Tanggal Pendaftaran Member
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="container" style={{ marginTop: '-1.5rem', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Quick Order History Banner Shortcut */}
          {onNavigateToOrders && (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '1rem',
                border: '1px solid var(--border-light)',
                padding: '1.25rem 1.5rem',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '2.75rem',
                    height: '2.75rem',
                    borderRadius: '0.75rem',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Package size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--secondary-900)' }}>
                    Ingin Memeriksa Riwayat Pesanan?
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--secondary-500)' }}>
                    Riwayat dan pelacakan pesanan Anda kini tersaji rapi di menu <strong>Pesanan Saya</strong> pada navbar atas.
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight size={15} />}
                onClick={onNavigateToOrders}
                style={{ fontWeight: 600 }}
              >
                Buka Pesanan Saya
              </Button>
            </div>
          )}

          {/* Edit Profile Card Form */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '1rem',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #064e3b, #0c4a6e)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={18} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ color: '#ffffff', margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>
                  Edit Data Profil
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', margin: 0 }}>
                  Kelola informasi kontak dan alamat pengiriman obat untuk mempermudah checkout
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Nama Lengkap */}
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                  Nama Lengkap *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={inputStyle}
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
              </div>

              {/* Email (Readonly) */}
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                  Alamat Email <span style={{ color: '#94a3b8', fontWeight: 400 }}>(terkunci & terhubung akun)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                  Nomor Telepon / WhatsApp
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
                  Digunakan untuk konfirmasi pesanan dan koordinasi kurir pengiriman.
                </span>
              </div>

              {/* Shipping Address */}
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                  Alamat Pengiriman Utama
                </label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.875rem', top: '0.875rem' }} />
                  <textarea
                    rows={3}
                    placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan/kecamatan, kota dan kode pos..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
                  Alamat ini otomatis menjadi alamat default setiap kali Anda checkout.
                </span>
              </div>

              {/* Submit Button */}
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={isSaving}
                  icon={<Save size={16} />}
                  style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }}
                >
                  {isSaving ? 'Menyimpan Perubahan...' : 'Simpan Perubahan Profil'}
                </Button>
              </div>
            </form>
          </div>

          {/* Account Security & Verification Badge Info */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '1rem',
              border: '1px solid var(--border-light)',
              padding: '1.25rem 1.5rem',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.65rem',
                  background: '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--secondary-900)' }}>
                  Keamanan & Status Privasi Akun
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)' }}>
                  Data medis dan resep Anda dilindungi enkripsi standar kesehatan privasi pasien.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: '#f0fdf4',
                  color: '#059669',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Star size={13} /> Member Terverifikasi
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};