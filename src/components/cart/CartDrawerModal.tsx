import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  LogIn, 
  ArrowRight,
  PackageX
} from 'lucide-react';

interface CartDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuthModal: () => void;
  onNavigateToCatalog: () => void;
  onProceedToCheckout?: () => void;
}

export const CartDrawerModal: React.FC<CartDrawerModalProps> = ({
  isOpen,
  onClose,
  onOpenAuthModal,
  onNavigateToCatalog,
  onProceedToCheckout,
}) => {
  const { user, isAuthenticated } = useAuth();
  const { 
    items, 
    totalAmount, 
    totalCount, 
    hasStockIssue, 
    isLoading, 
    error, 
    updateItemQty, 
    removeItem, 
    validateBeforeCheckout 
  } = useCart();

  const [validating, setValidating] = useState<boolean>(false);
  const [validationAlert, setValidationAlert] = useState<{
    success: boolean;
    message: string;
    issues?: Array<{ medicineName: string; message: string }>;
  } | null>(null);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleCheckoutClick = async () => {
    setValidating(true);
    setValidationAlert(null);
    try {
      const result = await validateBeforeCheckout();
      if (!result) return;

      if (result.isValid) {
        setValidationAlert({
          success: true,
          message: `Validasi server berhasil! Semua stok dan harga (${formatIDR(result.totalAmount)}) terverifikasi akurat. Mengarahkan ke halaman Checkout...`,
        });
        if (onProceedToCheckout) {
          setTimeout(() => {
            onClose();
            onProceedToCheckout();
          }, 350);
        }
      } else {
        setValidationAlert({
          success: false,
          message: `Ditemukan ${result.issuesCount} ketidaksesuaian stok database. Harap sesuaikan keranjang sebelum checkout.`,
          issues: result.issues.map((iss) => ({
            medicineName: iss.medicineName,
            message: iss.message,
          })),
        });
      }
    } catch (err: any) {
      setValidationAlert({
        success: false,
        message: err.message || 'Gagal memvalidasi keranjang ke server.',
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Keranjang Belanja ${isAuthenticated && user?.role === 'CUSTOMER' ? `(${totalCount} Item)` : ''}`}
    >
      <div>
        {/* Case 1: User Not Logged In */}
        {!isAuthenticated && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div
              style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                background: 'var(--primary-50)',
                color: 'var(--primary-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
              }}
            >
              <ShoppingCart size={32} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--secondary-900)' }}>
              Masuk untuk Mengakses Keranjang
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--secondary-600)', maxWidth: '380px', margin: '0.5rem auto 1.5rem auto', lineHeight: 1.5 }}>
              Fitur keranjang belanja dan pemesanan obat memerlukan akun <strong>CUSTOMER (Pembeli)</strong> yang terdaftar.
            </p>
            <Button
              variant="primary"
              size="md"
              icon={<LogIn size={16} />}
              onClick={() => {
                onClose();
                onOpenAuthModal();
              }}
            >
              Masuk / Daftar Akun Pembeli
            </Button>
          </div>
        )}

        {/* Case 2: Logged In as STAFF or ADMIN */}
        {isAuthenticated && user && user.role !== 'CUSTOMER' && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div
              style={{
                width: '3.75rem',
                height: '3.75rem',
                borderRadius: '50%',
                background: '#fef2f2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
              }}
            >
              <AlertCircle size={30} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--secondary-900)' }}>
              Keranjang Khusus Akun Pembeli (Customer)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--secondary-600)', maxWidth: '400px', margin: '0.5rem auto 1.5rem auto', lineHeight: 1.5 }}>
              Anda saat ini masuk sebagai <strong>{user.role}</strong> ({user.name}). Role staf apotek atau admin tidak melakukan transaksi belanja obat.
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={<LogIn size={15} />}
              onClick={() => {
                onClose();
                onOpenAuthModal();
              }}
            >
              Beralih ke Akun Customer
            </Button>
          </div>
        )}

        {/* Case 3: Customer Logged In */}
        {isAuthenticated && user?.role === 'CUSTOMER' && (
          <div>
            {/* Global Error Banner */}
            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#991b1b',
                  fontSize: '0.825rem',
                  marginBottom: '1rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Validation Feedback Alert */}
            {validationAlert && (
              <div
                style={{
                  background: validationAlert.success ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${validationAlert.success ? '#bbf7d0' : '#fecaca'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.85rem',
                  color: validationAlert.success ? '#166534' : '#991b1b',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  {validationAlert.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{validationAlert.message}</span>
                </div>

                {validationAlert.issues && validationAlert.issues.length > 0 && (
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.8rem', lineHeight: 1.5 }}>
                    {validationAlert.issues.map((iss, idx) => (
                      <li key={idx}>
                        <strong>{iss.medicineName}</strong>: {iss.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Empty Cart State */}
            {!isLoading && items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <div
                  style={{
                    width: '3.75rem',
                    height: '3.75rem',
                    borderRadius: '50%',
                    background: 'var(--secondary-100)',
                    color: 'var(--secondary-400)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem auto',
                  }}
                >
                  <ShoppingCart size={28} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--secondary-800)' }}>
                  Keranjang Belanja Anda Kosong
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--secondary-500)', marginTop: '0.35rem' }}>
                  Belum ada obat yang ditambahkan. Silakan pilih obat dari katalog kami.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  style={{ marginTop: '1.25rem' }}
                  onClick={() => {
                    onClose();
                    onNavigateToCatalog();
                  }}
                >
                  Jelajahi Katalog Obat
                </Button>
              </div>
            )}

            {/* Cart Items List */}
            {items.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Stock Issue Warning Banner */}
                {hasStockIssue && (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#b45309',
                      fontSize: '0.8rem',
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>Terdapat item yang kuantitasnya melebihi stok database. Harap sesuaikan kuantitas.</span>
                  </div>
                )}

                <div
                  style={{
                    maxHeight: '340px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    paddingRight: '0.25rem',
                  }}
                >
                  {items.map((item) => {
                    const isOutOfStock = !item.isAvailable;
                    const exceedsStock = item.quantity > item.availableStock;

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem',
                          background: isOutOfStock ? '#fef2f2' : exceedsStock ? '#fffbeb' : 'var(--secondary-50)',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${isOutOfStock ? '#fecaca' : exceedsStock ? '#fde68a' : 'var(--border-light)'}`,
                          gap: '0.75rem',
                        }}
                      >
                        {/* Medicine Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                          <img
                            src={item.medicine.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80'}
                            alt={item.medicine.name}
                            style={{
                              width: '48px',
                              height: '48px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              background: '#fff',
                              border: '1px solid var(--border-light)',
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                color: 'var(--secondary-900)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.medicine.name}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--primary-700)', fontWeight: 700 }}>
                                {formatIDR(item.unitPrice)}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--secondary-400)' }}>
                                / {item.medicine.unit}
                              </span>

                              {item.medicine.requiresPrescription && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    color: '#dc2626',
                                    background: '#fee2e2',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                  }}
                                >
                                  <FileText size={10} /> Resep
                                </span>
                              )}
                            </div>

                            {/* Stock Indicator Status */}
                            <div style={{ fontSize: '0.72rem', marginTop: '3px' }}>
                              {isOutOfStock ? (
                                <span style={{ color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <PackageX size={11} /> Stok Habis di Database
                                </span>
                              ) : exceedsStock ? (
                                <span style={{ color: '#b45309', fontWeight: 700 }}>
                                  Stok tersisa hanya {item.availableStock} unit
                                </span>
                              ) : (
                                <span style={{ color: 'var(--secondary-500)' }}>
                                  Stok tersedia: {item.availableStock}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quantity Controls & Subtotal */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {/* Decrease Button - min 1 */}
                            <button
                              type="button"
                              onClick={() => updateItemQty(item.id, item.quantity - 1)}
                              disabled={isLoading || item.quantity <= 1}
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-light)',
                                background: '#fff',
                                cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: item.quantity <= 1 ? 0.4 : 1,
                              }}
                              title={item.quantity <= 1 ? 'Kuantitas minimal adalah 1' : 'Kurangi kuantitas'}
                            >
                              <Minus size={12} />
                            </button>

                            <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '22px', textAlign: 'center' }}>
                              {item.quantity}
                            </span>

                            {/* Increase Button - max stock */}
                            <button
                              type="button"
                              onClick={() => updateItemQty(item.id, item.quantity + 1)}
                              disabled={isLoading || item.quantity >= item.availableStock}
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-light)',
                                background: '#fff',
                                cursor: item.quantity >= item.availableStock ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: item.quantity >= item.availableStock ? 0.4 : 1,
                              }}
                              title={item.quantity >= item.availableStock ? 'Maksimal pembelian sesuai stok tersedia' : 'Tambah kuantitas'}
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          {/* Server-calculated Subtotal */}
                          <div style={{ textAlign: 'right', minWidth: '85px' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--secondary-900)' }}>
                              {formatIDR(item.subtotal)}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              disabled={isLoading}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#ef4444',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: 0,
                                marginTop: '2px',
                              }}
                            >
                              <Trash2 size={11} /> Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Server-Side Calculated Summary Card */}
                <div
                  style={{
                    borderTop: '1px solid var(--border-light)',
                    paddingTop: '1rem',
                    background: 'var(--secondary-50)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--secondary-600)', marginBottom: '0.35rem' }}>
                    <span>Total Produk</span>
                    <strong>{totalCount} item</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--secondary-900)' }}>
                      Total Pembayaran (Server)
                    </span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                      {formatIDR(totalAmount)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--secondary-500)', marginBottom: '1rem' }}>
                    <ShieldCheck size={13} color="#059669" />
                    <span>Harga dan total dihitung otomatis oleh server menggunakan data resmi database apotek.</span>
                  </div>

                  {/* Checkout Action Button */}
                  <Button
                    variant="primary"
                    size="md"
                    disabled={isLoading || validating || items.length === 0 || hasStockIssue}
                    onClick={handleCheckoutClick}
                    icon={<ArrowRight size={16} />}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {validating ? 'Memvalidasi Stok ke Server...' : hasStockIssue ? 'Perbaiki Item Keranjang' : 'Lanjut ke Checkout'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
