import React, { useState } from 'react';
import { OrderData } from '../../services/orderService';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import {
  CheckCircle,
  FileText,
  Clock,
  ArrowRight,
  ShoppingBag,
  MapPin,
  CreditCard,
  Copy,
  Check,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react';

interface OrderSuccessViewProps {
  order: OrderData;
  onViewOrderDetail: (orderId: string) => void;
  onViewMyOrders: () => void;
  onContinueShopping: () => void;
}

export const OrderSuccessView: React.FC<OrderSuccessViewProps> = ({
  order,
  onViewOrderDetail,
  onViewMyOrders,
  onContinueShopping,
}) => {
  const isPrescriptionOrder = order.status === 'PENDING_VERIFICATION';
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleCopyShortId = () => {
    navigator.clipboard.writeText(order.shortId || order.id);
    setCopied(true);
    toast.success(`Nomor pesanan #${order.shortId} berhasil disalin!`);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ maxWidth: '780px', margin: '2rem auto', padding: '0 1.5rem' }}>
      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem 2rem',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-light)',
          textAlign: 'center',
        }}
      >
        {/* Success Icon with Glow */}
        <div
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            border: '2px solid #a7f3d0',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.2)',
          }}
        >
          <CheckCircle size={44} />
        </div>

        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--secondary-900)', margin: '0 0 0.5rem 0' }}>
          Pesanan Berhasil Dibuat!
        </h1>

        <p style={{ fontSize: '1rem', color: 'var(--secondary-600)', margin: 0 }}>
          Terima kasih telah mempercayakan kebutuhan obat Anda kepada <strong>Apotek Sehat AI</strong>.
        </p>

        {/* Order ID & Copy Banner */}
        <div
          style={{
            background: 'var(--secondary-50)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            margin: '1.75rem 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--secondary-500)' }}>
            Nomor Pesanan (Order ID)
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-700)', letterSpacing: '0.5px' }}>
              #{order.shortId}
            </span>
            <button
              onClick={handleCopyShortId}
              title="Salin Nomor Pesanan"
              aria-label="Salin nomor pesanan"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: copied ? '#ecfdf5' : '#ffffff',
                border: copied ? '1px solid #10b981' : '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: copied ? '#059669' : 'var(--secondary-700)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--secondary-400)', fontFamily: 'monospace' }}>
            ID Transaksi Database: {order.id}
          </div>

          {/* Dynamic Status Badge */}
          <div
            style={{
              marginTop: '0.25rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-full)',
              fontWeight: 700,
              fontSize: '0.85rem',
              background: isPrescriptionOrder ? '#fff1f2' : '#fef9c3',
              color: isPrescriptionOrder ? '#be123c' : '#a16207',
              border: isPrescriptionOrder ? '1px solid #fecdd3' : '1px solid #fef08a',
            }}
          >
            {isPrescriptionOrder ? <FileText size={16} /> : <Clock size={16} />}
            <span>
              Status: {isPrescriptionOrder ? 'PENDING_VERIFICATION (Menunggu Verifikasi Apoteker)' : 'PENDING_PAYMENT (Menunggu Pembayaran)'}
            </span>
          </div>

          {/* Next Step Information Card */}
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--secondary-700)',
              maxWidth: '560px',
              lineHeight: 1.55,
              background: '#ffffff',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              textAlign: 'left',
              marginTop: '0.5rem',
            }}
          >
            {isPrescriptionOrder ? (
              <div>
                <div style={{ fontWeight: 700, color: '#be123c', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} />
                  Tahap Verifikasi Resep Dokter Sedang Berjalan
                </div>
                Pesanan Anda berisi obat keras yang wajib menyertakan resep dokter. Tim Apoteker kami sedang memverifikasi keabsahan foto resep Anda (estimasi waktu verifikasi 5-15 menit pada jam kerja). Anda akan menerima pemberitahuan saat resep disetujui.
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 700, color: '#a16207', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} />
                  Menunggu Pembayaran Pesanan
                </div>
                Pesanan Anda telah dicatat dalam sistem. Silakan lanjutkan pembayaran melalui metode simulasi transfer bank untuk pesanan ini agar tim apotek dapat segera meracik dan mengirimkan obat Anda.
              </div>
            )}
          </div>
        </div>

        {/* Order Details Preview */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            margin: '1.5rem 0',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary-800)', marginBottom: '0.75rem' }}>
            Ringkasan Pengiriman & Pembayaran
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {order.shippingAddress && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                <MapPin size={18} color="var(--primary-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)' }}>Alamat Pengiriman:</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--secondary-800)', fontWeight: 600 }}>
                    {order.shippingAddress}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CreditCard size={18} color="var(--primary-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)' }}>Total Pembayaran:</div>
                <div style={{ fontSize: '1.05rem', color: 'var(--primary-700)', fontWeight: 800 }}>
                  {formatIDR(order.totalAmount)}
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: order.paymentStatus === 'PAID' ? '#ecfdf5' : '#fffbeb',
                    color: order.paymentStatus === 'PAID' ? '#059669' : '#d97706',
                  }}
                >
                  {order.paymentStatus === 'PAID' ? 'LUNAS (PAID)' : 'BELUM DIBAYAR (UNPAID)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            marginTop: '2rem',
          }}
        >
          <Button
            variant="primary"
            size="lg"
            icon={<ArrowRight size={18} />}
            onClick={() => onViewOrderDetail(order.id)}
          >
            Lihat Detail Pesanan Ini
          </Button>

          <Button
            variant="secondary"
            size="lg"
            icon={<PackageCheck size={18} />}
            onClick={onViewMyOrders}
          >
            Daftar Semua Pesanan Saya
          </Button>

          <Button
            variant="secondary"
            size="lg"
            icon={<ShoppingBag size={18} />}
            onClick={onContinueShopping}
          >
            Belanja Obat Lain
          </Button>
        </div>
      </div>
    </div>
  );
};
