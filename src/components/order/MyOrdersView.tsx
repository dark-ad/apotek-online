import React, { useState, useEffect } from 'react';
import { orderService, OrderData } from '../../services/orderService';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { OrderCardSkeleton } from '../common/SkeletonLoader';
import { 
  Package, 
  Clock, 
  FileText, 
  CheckCircle, 
  ShoppingBag, 
  AlertCircle,
  ChevronRight
} from 'lucide-react';

interface MyOrdersViewProps {
  onViewOrderDetail: (orderId: string) => void;
  onExploreCatalog: () => void;
}

export const MyOrdersView: React.FC<MyOrdersViewProps> = ({
  onViewOrderDetail,
  onExploreCatalog,
}) => {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING_VERIFICATION' | 'PENDING_PAYMENT' | 'CONFIRMED'>('ALL');

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await orderService.getMyOrders();
      if (res.success && res.data?.orders) {
        setOrders(res.data.orders);
      } else {
        setError(res.message || 'Gagal memuat daftar pesanan.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat data pesanan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter((order) => {
    if (filterTab === 'ALL') return true;
    if (filterTab === 'PENDING_VERIFICATION') return order.status === 'PENDING_VERIFICATION';
    if (filterTab === 'PENDING_PAYMENT') return order.status === 'PENDING_PAYMENT';
    if (filterTab === 'CONFIRMED') return order.status === 'CONFIRMED' || order.paymentStatus === 'PAID';
    return true;
  });

  const getStatusBadge = (order: OrderData) => {
    switch (order.status) {
      case 'PENDING_VERIFICATION':
        return {
          label: 'Menunggu Verifikasi Resep',
          bg: '#fff1f2',
          color: '#be123c',
          border: '#fecdd3',
          icon: <FileText size={13} />,
        };
      case 'PENDING_PAYMENT':
        return {
          label: 'Menunggu Pembayaran',
          bg: '#fef9c3',
          color: '#a16207',
          border: '#fef08a',
          icon: <Clock size={13} />,
        };
      case 'CONFIRMED':
        return {
          label: 'Pesanan Terkonfirmasi',
          bg: '#ecfdf5',
          color: '#059669',
          border: '#a7f3d0',
          icon: <CheckCircle size={13} />,
        };
      default:
        return {
          label: order.status,
          bg: 'var(--secondary-100)',
          color: 'var(--secondary-800)',
          border: 'var(--border-light)',
          icon: <Package size={13} />,
        };
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--secondary-900)', margin: 0 }}>
            Pesanan Saya
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--secondary-500)', margin: '0.25rem 0 0 0' }}>
            Pantau status pesanan, verifikasi resep dokter, dan riwayat belanja obat Anda.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<ShoppingBag size={15} />}
          onClick={onExploreCatalog}
        >
          Belanja Obat Baru
        </Button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-light)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {[
          { key: 'ALL', label: `Semua (${orders.length})` },
          { key: 'PENDING_VERIFICATION', label: `Verifikasi Resep (${orders.filter((o) => o.status === 'PENDING_VERIFICATION').length})` },
          { key: 'PENDING_PAYMENT', label: `Menunggu Bayar (${orders.filter((o) => o.status === 'PENDING_PAYMENT').length})` },
          { key: 'CONFIRMED', label: `Lunas / Diproses (${orders.filter((o) => o.status === 'CONFIRMED' || o.paymentStatus === 'PAID').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key as any)}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              border: 'none',
              borderBottom: filterTab === tab.key ? '2px solid var(--primary-600)' : '2px solid transparent',
              background: filterTab === tab.key ? 'var(--primary-50)' : 'transparent',
              color: filterTab === tab.key ? 'var(--primary-700)' : 'var(--secondary-600)',
              fontWeight: filterTab === tab.key ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {/* Loading Skeleton State */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <OrderCardSkeleton />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={22} color="#dc2626" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Gagal Memuat Pesanan</div>
              <div style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>{error}</div>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={fetchOrders}>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredOrders.length === 0 && (
        <EmptyState
          icon={<Package size={32} />}
          title={filterTab === 'ALL' ? 'Belum Ada Pesanan' : 'Tidak Ada Pesanan pada Kategori Ini'}
          description={
            filterTab === 'ALL'
              ? 'Anda belum pernah melakukan pemesanan obat. Jelajahi katalog obat apotek kami untuk memesan kebutuhan kesehatan Anda dengan mudah.'
              : 'Tidak ditemukan pesanan dengan filter status yang dipilih. Silakan pilih tab filter lain.'
          }
          actionText="Jelajahi Katalog Obat"
          onAction={onExploreCatalog}
        />
      )}

      {/* Orders List */}
      {!isLoading && !error && filteredOrders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredOrders.map((order) => {
            const statusConfig = getStatusBadge(order);

            return (
              <div
                key={order.id}
                style={{
                  background: '#ffffff',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-sm)',
                  overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Order Card Header */}
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    background: 'var(--secondary-50)',
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontWeight: 800, color: 'var(--secondary-900)', fontSize: '1rem' }}>
                      #{order.shortId}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--secondary-500)' }}>
                      • {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Status Badge */}
                    <span
                      style={{
                        background: statusConfig.bg,
                        color: statusConfig.color,
                        border: `1px solid ${statusConfig.border}`,
                        padding: '0.25rem 0.65rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>

                    {/* Payment Status Badge */}
                    <span
                      style={{
                        background: order.paymentStatus === 'PAID' ? '#ecfdf5' : '#f8fafc',
                        color: order.paymentStatus === 'PAID' ? '#059669' : '#64748b',
                        border: `1px solid ${order.paymentStatus === 'PAID' ? '#a7f3d0' : '#e2e8f0'}`,
                        padding: '0.25rem 0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      {order.paymentStatus === 'PAID' ? 'LUNAS (PAID)' : 'BELUM BAYAR (UNPAID)'}
                    </span>
                  </div>
                </div>

                {/* Prescription Status Banner */}
                {order.requiresPrescription && (
                  <>
                    {order.rejectionReason || order.status === 'CANCELLED' ? (
                      <div
                        style={{
                          margin: '0.75rem 1.25rem 0',
                          padding: '0.45rem 0.75rem',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: 'var(--radius-md)',
                          color: '#991b1b',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <AlertCircle size={14} color="#dc2626" />
                        <span><strong>Resep Ditolak:</strong> "{order.rejectionReason || 'Tidak memenuhi syarat apotek'}"</span>
                      </div>
                    ) : order.status === 'PROCESSING' || order.status === 'READY_FOR_PICKUP' || order.status === 'SHIPPED' || order.status === 'COMPLETED' ? (
                      <div
                        style={{
                          margin: '0.75rem 1.25rem 0',
                          padding: '0.45rem 0.75rem',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: 'var(--radius-md)',
                          color: '#065f46',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle size={14} color="#059669" />
                        <span>Resep Dokter Telah Diverifikasi & Disetujui Apoteker</span>
                      </div>
                    ) : null}
                  </>
                )}

                {/* Order Items Preview */}
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {order.items.slice(0, 2).map((item) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: 'var(--radius-sm)',
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
                            <span style={{ fontSize: '1.1rem' }}>💊</span>
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <strong style={{ fontSize: '0.875rem', color: 'var(--secondary-900)' }}>
                              {item.medicineName}
                            </strong>
                            {item.requiresPrescription && (
                              <span style={{ background: '#fff1f2', color: '#e11d48', fontSize: '0.65rem', fontWeight: 700, padding: '1px 4px', borderRadius: '4px' }}>
                                Resep
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--secondary-500)' }}>
                            {item.quantity} {item.medicineUnit || 'unit'} × {formatIDR(item.price)}
                          </span>
                        </div>

                        <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.875rem', color: 'var(--secondary-800)' }}>
                          {formatIDR(item.subtotal)}
                        </div>
                      </div>
                    ))}

                    {order.items.length > 2 && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--secondary-500)', fontStyle: 'italic', paddingLeft: '50px' }}>
                        + {order.items.length - 2} obat lainnya...
                      </div>
                    )}
                  </div>

                  {/* Order Footer with Total & CTA */}
                  <div
                    style={{
                      marginTop: '1.25rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-light)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--secondary-500)', display: 'block' }}>
                        Total Pembayaran (Server Snapshot)
                      </span>
                      <strong style={{ fontSize: '1.15rem', color: 'var(--primary-700)', fontWeight: 800 }}>
                        {formatIDR(order.totalAmount)}
                      </strong>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<ChevronRight size={16} />}
                      onClick={() => onViewOrderDetail(order.id)}
                    >
                      Lihat Detail Pesanan
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
