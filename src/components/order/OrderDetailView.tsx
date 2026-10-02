import React, { useState, useEffect } from 'react';
import { orderService, OrderData } from '../../services/orderService';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { OrderCardSkeleton } from '../common/SkeletonLoader';
import { 
  ArrowLeft, 
  Clock, 
  FileText, 
  CheckCircle, 
  CheckCircle2,
  XCircle,
  MapPin, 
  CreditCard, 
  ShieldCheck, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  PackageCheck
} from 'lucide-react';

interface OrderDetailViewProps {
  orderId: string;
  onBack: () => void;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({ orderId, onBack }) => {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPayingMock, setIsPayingMock] = useState<boolean>(false);
  const [mockPaySuccess, setMockPaySuccess] = useState<string | null>(null);
  const toast = useToast();

  const fetchDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await orderService.getOrderDetail(orderId);
      if (res.success && res.data?.order) {
        setOrder(res.data.order);
      } else {
        setError(res.message || 'Gagal memuat detail pesanan.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan pada jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [orderId]);

  const handleSimulatePayment = async () => {
    if (!order) return;
    setIsPayingMock(true);
    setMockPaySuccess(null);
    try {
      const res = await orderService.mockPayment(order.id);
      if (res.success) {
        setMockPaySuccess(res.message || 'Pembayaran simulasi berhasil.');
        toast.success(res.message || 'Pembayaran simulasi berhasil.');
        await fetchDetail();
      } else {
        toast.error(res.message || 'Gagal memproses pembayaran simulasi.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsPayingMock(false);
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Button variant="secondary" size="sm" icon={<ArrowLeft size={16} />} onClick={onBack}>
            Kembali
          </Button>
        </div>
        <OrderCardSkeleton />
        <OrderCardSkeleton />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ maxWidth: '700px', margin: '3rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-lg)', padding: '2.5rem 1.5rem', color: '#991b1b' }}>
          <AlertCircle size={42} color="#dc2626" style={{ margin: '0 auto 0.75rem auto' }} />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Gagal Memuat Pesanan</h2>
          <p style={{ fontSize: '0.9rem', color: '#7f1d1d', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
            {error || 'Pesanan tidak ditemukan atau Anda tidak memiliki hak akses.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Button variant="primary" size="md" icon={<RefreshCw size={16} />} onClick={fetchDetail}>
              Coba Lagi
            </Button>
            <Button variant="secondary" size="md" icon={<ArrowLeft size={16} />} onClick={onBack}>
              Kembali ke Pesanan Saya
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isPrescription = order.status === 'PENDING_VERIFICATION';
  const isPaid = order.paymentStatus === 'PAID';

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: '#ffffff',
              cursor: 'pointer',
              color: 'var(--secondary-700)',
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary-900)', margin: 0 }}>
                Rincian Pesanan #{order.shortId}
              </h1>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--secondary-500)' }}>
              Dibuat pada: {formatDate(order.createdAt)} • ID: <code style={{ fontSize: '0.75rem' }}>{order.id}</code>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={fetchDetail}
          >
            Segarkan
          </Button>
        </div>
      </div>

      {mockPaySuccess && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            color: '#065f46',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.875rem',
          }}
        >
          <CheckCircle size={18} color="#059669" />
          <span>{mockPaySuccess}</span>
        </div>
      )}

      {/* Prescription Status Banner (Accepted / Rejected / In Review) */}
      {order.requiresPrescription && (
        <>
          {order.rejectionReason || order.status === 'CANCELLED' ? (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
              }}
            >
              <XCircle size={28} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '1.05rem', marginBottom: '4px' }}>
                  Resep Dokter Ditolak oleh Apoteker
                </div>
                {order.rejectionReason && (
                  <div style={{ fontSize: '0.9rem', color: '#7f1d1d', marginBottom: '8px' }}>
                    <strong>Alasan Penolakan dari Apoteker:</strong> "{order.rejectionReason}"
                  </div>
                )}
                <div style={{ fontSize: '0.825rem', color: '#b91c1c', lineHeight: 1.4 }}>
                  Pesanan ini dibatalkan karena dokumen resep belum memenuhi standar legalitas atau keselamatan pasien. Silakan buat pesanan baru dengan mengunggah foto resep yang jelas, asli, dan masih berlaku.
                </div>
              </div>
            </div>
          ) : order.status === 'PENDING_VERIFICATION' ? (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
              }}
            >
              <Clock size={28} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 800, color: '#92400e', fontSize: '1.05rem', marginBottom: '4px' }}>
                  Dokumen Resep Sedang Diverifikasi Apoteker
                </div>
                <div style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.45 }}>
                  Tim apoteker berlisensi kami sedang memeriksa keabsahan resep dokter yang Anda unggah. Anda akan menerima notifikasi segera setelah resep disetujui untuk melanjutkan pembayaran.
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
              }}
            >
              <CheckCircle2 size={28} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 800, color: '#065f46', fontSize: '1.05rem', marginBottom: '4px' }}>
                  Resep Dokter Diterima & Telah Diverifikasi
                </div>
                <div style={{ fontSize: '0.85rem', color: '#047857', lineHeight: 1.45 }}>
                  Dokumen resep telah divalidasi sah oleh Apoteker Apotek Sehat AI. Pesanan Anda telah disetujui untuk diproses.
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Progress Timeline Tracker */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary-800)', marginBottom: '1rem' }}>
          Status Alur Pemesanan Apotek
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
            textAlign: 'center',
          }}
        >
          {/* Step 1: Order Created */}
          <div style={{ padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-md)', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <CheckCircle size={20} color="#059669" style={{ margin: '0 auto 0.35rem auto' }} />
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#065f46' }}>1. Order Dibuat</div>
            <span style={{ fontSize: '0.7rem', color: '#047857' }}>Selesai</span>
          </div>

          {/* Step 2: Verification or Payment */}
          <div
            style={{
              padding: '0.75rem 0.5rem',
              borderRadius: 'var(--radius-md)',
              background: isPrescription ? '#fff1f2' : isPaid ? '#ecfdf5' : '#fef9c3',
              border: isPrescription ? '1px solid #fecdd3' : isPaid ? '1px solid #a7f3d0' : '1px solid #fef08a',
            }}
          >
            {isPrescription ? (
              <FileText size={20} color="#be123c" style={{ margin: '0 auto 0.35rem auto' }} />
            ) : isPaid ? (
              <CheckCircle size={20} color="#059669" style={{ margin: '0 auto 0.35rem auto' }} />
            ) : (
              <Clock size={20} color="#a16207" style={{ margin: '0 auto 0.35rem auto' }} />
            )}
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isPrescription ? '#be123c' : isPaid ? '#065f46' : '#a16207' }}>
              2. {order.requiresPrescription ? 'Verifikasi Resep' : 'Pembayaran'}
            </div>
            <span style={{ fontSize: '0.7rem', color: isPrescription ? '#9f1239' : isPaid ? '#047857' : '#854d0e' }}>
              {isPrescription ? 'Menunggu Apoteker' : isPaid ? 'Lunas (PAID)' : 'Menunggu Bayar'}
            </span>
          </div>

          {/* Step 3: Preparation */}
          <div
            style={{
              padding: '0.75rem 0.5rem',
              borderRadius: 'var(--radius-md)',
              background: order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'COMPLETED' ? '#ecfdf5' : 'var(--secondary-50)',
              border: '1px solid var(--border-light)',
            }}
          >
            <PackageCheck size={20} color="var(--secondary-400)" style={{ margin: '0 auto 0.35rem auto' }} />
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary-700)' }}>3. Disiapkan Apotek</div>
            <span style={{ fontSize: '0.7rem', color: 'var(--secondary-500)' }}>Staf Apoteker</span>
          </div>

          {/* Step 4: Finished */}
          <div
            style={{
              padding: '0.75rem 0.5rem',
              borderRadius: 'var(--radius-md)',
              background: order.status === 'COMPLETED' ? '#ecfdf5' : 'var(--secondary-50)',
              border: '1px solid var(--border-light)',
            }}
          >
            <ShieldCheck size={20} color="var(--secondary-400)" style={{ margin: '0 auto 0.35rem auto' }} />
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary-700)' }}>4. Selesai</div>
            <span style={{ fontSize: '0.7rem', color: 'var(--secondary-500)' }}>Pesanan Diterima</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Details Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: '1.75rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Order Items, Delivery, Prescription */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Order Items Table Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--secondary-900)' }}>
              Daftar Obat Dipesan ({order.items.length} Jenis)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {order.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--secondary-100)',
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--secondary-100)',
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.medicineImage ? (
                      <img src={item.medicineImage} alt={item.medicineName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '1.3rem' }}>💊</span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--secondary-900)' }}>
                        {item.medicineName}
                      </strong>
                      {item.requiresPrescription && (
                        <span style={{ background: '#fff1f2', color: '#e11d48', fontSize: '0.68rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px' }}>
                          Resep Dokter
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--secondary-500)', marginTop: '2px' }}>
                      Harga Snapshot: <strong>{formatIDR(item.price)}</strong> / {item.medicineUnit || 'unit'} • Qty: <strong>{item.quantity}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--secondary-900)' }}>
                      {formatIDR(item.subtotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Customer Info Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--secondary-900)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} color="var(--primary-600)" />
              Informasi Pengiriman
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: 'var(--secondary-500)', fontSize: '0.78rem', display: 'block' }}>Alamat Tujuan:</span>
                <strong style={{ color: 'var(--secondary-900)' }}>{order.shippingAddress || 'Alamat sesuai profil'}</strong>
              </div>

              {order.notes && (
                <div>
                  <span style={{ color: 'var(--secondary-500)', fontSize: '0.78rem', display: 'block' }}>Catatan Pembeli:</span>
                  <div style={{ fontStyle: 'italic', color: 'var(--secondary-800)', background: 'var(--secondary-50)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                    "{order.notes}"
                  </div>
                </div>
              )}

              {order.customer && (
                <div style={{ borderTop: '1px solid var(--secondary-100)', paddingTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <span style={{ color: 'var(--secondary-500)', fontSize: '0.78rem', display: 'block' }}>Nama Penerima:</span>
                    <strong style={{ color: 'var(--secondary-900)' }}>{order.customer.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--secondary-500)', fontSize: '0.78rem', display: 'block' }}>Nomor Telepon:</span>
                    <strong style={{ color: 'var(--secondary-900)' }}>{order.customer.phone || '-'}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prescription Document Card (if applicable) */}
          {order.requiresPrescription && (
            <div
              style={{
                background: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                border: '1px solid #a7f3d0',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} color="#059669" />
                Dokumen Resep Dokter Terlampir
              </h3>

              {order.prescriptionUrl ? (
                <div>
                  <p style={{ fontSize: '0.825rem', color: '#047857', margin: '0 0 0.75rem 0' }}>
                    Dokumen resep telah berhasil diunggah dan disimpan pada server apotek untuk validasi staf medis.
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#f0fdf4',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={20} color="#059669" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#065f46' }}>
                        Lihat Berkas Resep Dokter
                      </span>
                    </div>

                    <a
                      href={order.prescriptionUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'var(--primary-700)',
                        textDecoration: 'none',
                        background: '#ffffff',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-light)',
                      }}
                    >
                      Buka Dokumen <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#be123c', fontSize: '0.85rem' }}>
                  Tidak ada dokumen resep yang tercatat.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Payment & Summary */}
        <div style={{ position: 'sticky', top: '5.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary & Totals */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--secondary-900)' }}>
              Rincian Pembayaran
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--secondary-600)' }}>
                <span>Total Pesanan ({order.itemCount} item)</span>
                <span>{formatIDR(order.totalAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--secondary-600)' }}>
                <span>Biaya Resep / Telaah Obat</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>GRATIS</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--secondary-600)' }}>
                <span>Ongkos Kirim</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>GRATIS</span>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--secondary-200)',
                  paddingTop: '0.75rem',
                  marginTop: '0.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <strong style={{ fontSize: '1rem', color: 'var(--secondary-900)' }}>Total Pembayaran</strong>
                <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                  {formatIDR(order.totalAmount)}
                </strong>
              </div>
            </div>

            {/* Status Info */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--secondary-500)' }}>Status Pembayaran:</span>
                <span
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    background: isPaid ? '#ecfdf5' : '#fef9c3',
                    color: isPaid ? '#059669' : '#a16207',
                    border: `1px solid ${isPaid ? '#a7f3d0' : '#fef08a'}`,
                  }}
                >
                  {isPaid ? 'LUNAS (PAID)' : 'BELUM DIBAYAR (UNPAID)'}
                </span>
              </div>
            </div>

            {/* Mock Payment Simulation (As Requested by User) */}
            <div style={{ marginTop: '1.25rem' }}>
              {!isPaid ? (
                <div>
                  <div
                    style={{
                      background: 'var(--secondary-50)',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.78rem',
                      color: 'var(--secondary-600)',
                      lineHeight: 1.4,
                      marginBottom: '0.75rem',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <strong>ℹ️ Simulasi Pembayaran:</strong> Gateway pembayaran online belum terhubung. Anda dapat menggunakan tombol simulasi di bawah ini untuk menandai pesanan ini sebagai <strong>LUNAS (PAID)</strong>.
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    disabled={isPayingMock}
                    onClick={handleSimulatePayment}
                    icon={<CreditCard size={16} />}
                    style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }}
                  >
                    {isPayingMock ? 'Memproses Simulasi...' : 'Simulasi Bayar (Konfirmasi Lunas)'}
                  </Button>
                </div>
              ) : (
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    textAlign: 'center',
                    color: '#065f46',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  ✅ Pembayaran Terverifikasi Lunas
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
