import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Package, 
  Save, 
  CheckCircle2, 
  Clock, 
  AlertCircle
} from 'lucide-react';

export const CustomerProfileView: React.FC = () => {
  const { user, token, updateProfile } = useAuth();

  const [name, setName] = useState<string>(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [address, setAddress] = useState<string>(user?.address || '');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
      setAddress(user.address || '');
    }
  }, [user]);

  // Fetch customer orders
  useEffect(() => {
    if (token) {
      fetch('/api/customer/orders', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.orders) {
            setOrders(data.data.orders);
          }
        })
        .catch((err) => console.error('Error fetching orders:', err))
        .finally(() => setLoadingOrders(false));
    }
  }, [token]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    const res = await updateProfile({ name, phone, address });
    if (res.success) {
      setSaveSuccess('Data profil Anda berhasil diperbarui!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } else {
      setSaveError(res.message || 'Gagal menyimpan profil.');
    }
    setIsSaving(false);
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="container" style={{ padding: '3rem 1.25rem 5rem 1.25rem' }}>
      {/* Header Profile */}
      <div style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '2rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '4.5rem', height: '4.5rem', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '1.75rem', fontWeight: 800 }}>
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{user?.name}</h2>
              <span className="badge badge-bebas">CUSTOMER</span>
            </div>
            <p style={{ color: 'var(--secondary-500)', fontSize: '0.9rem' }}>{user?.email}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ background: 'var(--secondary-50)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-700)' }}>{orders.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)', fontWeight: 600 }}>Total Pesanan</div>
          </div>
        </div>
      </div>

      {/* 2 Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '2rem' }}>
        {/* Left Column: Form Edit Profile */}
        <div style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '2rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="#059669" />
            Informasi Data Diri & Kontak
          </h3>

          {saveSuccess && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <CheckCircle2 size={16} />
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <AlertCircle size={16} />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Nama Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', fontSize: '0.9rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Email Akun (Terkunci)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  style={{ width: '100%', padding: '0.65rem 0.85rem 0.65rem 2.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: 'var(--secondary-100)', color: 'var(--secondary-500)', fontSize: '0.9rem' }}
                />
                <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Nomor Telepon / WhatsApp</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="tel"
                  placeholder="0812xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem 0.65rem 2.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', fontSize: '0.9rem' }}
                />
                <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Alamat Pengiriman Obat</label>
              <div style={{ position: 'relative' }}>
                <textarea
                  rows={3}
                  placeholder="Masukkan alamat pengiriman lengkap..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem 0.65rem 2.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', fontSize: '0.9rem' }}
                />
                <MapPin size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '0.75rem' }} />
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isSaving}
              icon={<Save size={16} />}
              style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
            </Button>
          </form>
        </div>

        {/* Right Column: Order History */}
        <div style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '2rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={18} color="#0284c7" />
            Riwayat Pesanan Obat Anda
          </h3>

          {loadingOrders ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary-500)' }}>
              Memuat data pesanan...
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--secondary-50)', borderRadius: 'var(--radius-lg)' }}>
              <Package size={36} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--secondary-700)' }}>Belum ada riwayat pesanan</div>
              <p style={{ fontSize: '0.825rem', color: 'var(--secondary-500)', marginTop: '0.25rem' }}>
                Pesanan obat Anda dari katalog akan tercatat di sini.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
              {orders.map((ord: any) => (
                <div key={ord.id} style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1rem', background: 'var(--secondary-50)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-700)' }}>
                      Order #{ord.id.slice(-6).toUpperCase()}
                    </span>
                    <span className={`badge ${ord.status === 'CONFIRMED' ? 'badge-bebas' : ord.status === 'PROCESSING' ? 'badge-terbatas' : 'badge-suplemen'}`}>
                      {ord.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--secondary-600)', marginBottom: '0.5rem' }}>
                    {ord.items?.map((it: any) => (
                      <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', margin: '0.2rem 0' }}>
                        <span>• {it.medicine?.name} ({it.quantity}x)</span>
                        <span style={{ fontWeight: 600 }}>{formatIDR(it.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem', marginTop: '0.5rem', fontSize: '0.825rem' }}>
                    <span style={{ color: 'var(--secondary-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} />
                      {new Date(ord.createdAt).toLocaleDateString('id-ID')}
                    </span>
                    <span style={{ fontWeight: 800, color: 'var(--primary-700)', fontSize: '0.95rem' }}>
                      Total: {formatIDR(ord.totalAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
