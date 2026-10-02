import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { staffService, StaffOrder, StaffMedicine } from '../../services/staffService';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { 
  Stethoscope, 
  FileCheck, 
  Package, 
  CheckCircle2, 
  Eye, 
  RefreshCw,
  AlertTriangle,
  XCircle,
  TrendingUp,
  MapPin,
  User,
  Plus,
  Minus,
  Edit3,
  Search,
  ExternalLink,
  ChevronRight,
  Truck,
  CheckCircle
} from 'lucide-react';

export const StaffDashboardView: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  // Active Tab: 'overview' | 'orders' | 'inventory'
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'inventory'>('overview');

  // Orders State
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(true);
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Inventory State
  const [medicines, setMedicines] = useState<StaffMedicine[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState<boolean>(true);
  const [medSearch, setMedSearch] = useState<string>('');

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<StaffOrder | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // Prescription Preview Modal
  const [previewPrescriptionUrl, setPreviewPrescriptionUrl] = useState<string | null>(null);

  // Stock Edit Modal State
  const [selectedMedForStock, setSelectedMedForStock] = useState<StaffMedicine | null>(null);
  const [stockAction, setStockAction] = useState<'ADD' | 'SUBTRACT' | 'SET'>('ADD');
  const [stockAmount, setStockAmount] = useState<number>(10);
  const [stockNotes, setStockNotes] = useState<string>('');

  // Confirmation Dialog States
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    requireInput?: boolean;
    inputLabel?: string;
    inputPlaceholder?: string;
    onConfirm: (val?: string) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  // Feedback banner
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await staffService.getOrders();
      if (res.success && res.data?.orders) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error('Failed to load staff orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchInventory = async () => {
    setInventoryLoading(true);
    try {
      const res = await staffService.getMedicines(medSearch);
      if (res.success && res.data?.medicines) {
        setMedicines(res.data.medicines);
      }
    } catch (err) {
      console.error('Failed to load medicines:', err);
    } finally {
      setInventoryLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchInventory();
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

  // Metrics calculation
  const totalOrders = orders.length;
  const pendingRxCount = orders.filter((o) => o.status === 'PENDING_VERIFICATION').length;
  const processingCount = orders.filter((o) => o.status === 'PROCESSING' || o.status === 'READY_FOR_PICKUP').length;
  const lowStockCount = medicines.filter((m) => m.isLowStock || m.isOutOfStock).length;

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.shortId.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.customer?.name || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.customer?.email || '').toLowerCase().includes(orderSearch.toLowerCase());

    if (!matchSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING_VERIFICATION') return o.status === 'PENDING_VERIFICATION';
    if (statusFilter === 'PENDING_PAYMENT') return o.status === 'PENDING_PAYMENT';
    if (statusFilter === 'PROCESSING') return o.status === 'PROCESSING';
    if (statusFilter === 'READY_FOR_PICKUP') return o.status === 'READY_FOR_PICKUP';
    if (statusFilter === 'SHIPPED') return o.status === 'SHIPPED';
    if (statusFilter === 'COMPLETED') return o.status === 'COMPLETED';
    if (statusFilter === 'CANCELLED') return o.status === 'CANCELLED';
    return true;
  });

  // Open Order Detail Modal
  const handleOpenOrderDetail = async (orderId: string) => {
    setIsDetailLoading(true);
    try {
      const res = await staffService.getOrderDetail(orderId);
      if (res.success && res.data?.order) {
        setSelectedOrder(res.data.order);
      }
    } catch (err) {
      console.error('Failed to load order detail:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // 1. Approve Prescription
  const handleApprovePrescription = async (order: StaffOrder) => {
    setIsProcessingAction(true);
    try {
      const res = await staffService.verifyPrescription(order.id, 'APPROVE');
      if (res.success) {
        setAlertMessage({ type: 'success', text: `Resep pesanan #${order.shortId} berhasil disetujui (Approved)!` });
        await fetchOrders();
        handleOpenOrderDetail(order.id);
      } else {
        setAlertMessage({ type: 'error', text: res.message || 'Gagal menyetujui resep.' });
      }
    } catch (err: any) {
      setAlertMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 2. Reject Prescription (with Confirmation Dialog & Required Reason)
  const handleTriggerRejectPrescription = (order: StaffOrder) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Tolak Resep Dokter',
      message: `Anda akan menolak resep dokter untuk pesanan #${order.shortId}. Sesuai regulasi farmasi, alasan penolakan wajib dicantumkan untuk pasien. Pesanan akan otomatis dibatalkan.`,
      confirmText: 'Tolak Resep & Batalkan Order',
      variant: 'danger',
      requireInput: true,
      inputLabel: 'Alasan Penolakan Resep (Wajib)',
      inputPlaceholder: 'Contoh: Tulisan resep tidak terbaca / resep kedaluwarsa / dosis melebihi batas aman.',
      onConfirm: async (reason) => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setIsProcessingAction(true);
        try {
          const res = await staffService.verifyPrescription(order.id, 'REJECT', reason);
          if (res.success) {
            setAlertMessage({ type: 'success', text: `Resep pesanan #${order.shortId} berhasil ditolak. Pesanan dibatalkan.` });
            await fetchOrders();
            handleOpenOrderDetail(order.id);
          } else {
            setAlertMessage({ type: 'error', text: res.message || 'Gagal menolak resep.' });
          }
        } catch (err: any) {
          setAlertMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
        } finally {
          setIsProcessingAction(false);
        }
      },
    });
  };

  // 3. Update Order Status
  const handleUpdateStatus = async (order: StaffOrder, newStatus: string) => {
    // If cancelling order -> show confirmation dialog
    if (newStatus === 'CANCELLED') {
      setConfirmDialog({
        isOpen: true,
        title: 'Batalkan Pesanan Ini?',
        message: `Apakah Anda yakin ingin membatalkan pesanan #${order.shortId}? Aksi ini tidak dapat diurungkan.`,
        confirmText: 'Ya, Batalkan Pesanan',
        variant: 'danger',
        requireInput: true,
        inputLabel: 'Alasan Pembatalan Pesanan',
        inputPlaceholder: 'Contoh: Pasien meminta pembatalan / stok obat tidak mencukupi.',
        onConfirm: async (reason) => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          executeStatusChange(order.id, newStatus, reason);
        },
      });
      return;
    }

    executeStatusChange(order.id, newStatus);
  };

  const executeStatusChange = async (orderId: string, status: string, reason?: string) => {
    setIsProcessingAction(true);
    try {
      const res = await staffService.updateOrderStatus(orderId, status, reason);
      if (res.success) {
        setAlertMessage({ type: 'success', text: `Status pesanan berhasil diperbarui menjadi ${status}!` });
        await fetchOrders();
        handleOpenOrderDetail(orderId);
      } else {
        setAlertMessage({ type: 'error', text: res.message || 'Gagal mengubah status pesanan.' });
      }
    } catch (err: any) {
      setAlertMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 4. Update Medicine Stock (with Confirmation Dialog)
  const handleConfirmStockChange = () => {
    if (!selectedMedForStock) return;

    let targetStock = selectedMedForStock.stock;
    if (stockAction === 'ADD') targetStock += stockAmount;
    if (stockAction === 'SUBTRACT') targetStock -= stockAmount;
    if (stockAction === 'SET') targetStock = stockAmount;

    if (targetStock < 0) {
      toast.error('Stok obat tidak boleh bernilai negatif!');
      return;
    }

    const actionText = stockAction === 'ADD' ? `menambah ${stockAmount}` : stockAction === 'SUBTRACT' ? `mengurangi ${stockAmount}` : `mengatur stok menjadi ${stockAmount}`;

    setConfirmDialog({
      isOpen: true,
      title: 'Konfirmasi Perubahan Stok Obat',
      message: `Anda akan ${actionText} unit untuk obat "${selectedMedForStock.name}". Stok akan berubah dari ${selectedMedForStock.stock} menjadi ${targetStock} ${selectedMedForStock.unit}. Lanjutkan?`,
      confirmText: 'Ya, Perbarui Stok',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setIsProcessingAction(true);
        try {
          const res = await staffService.updateStock(
            selectedMedForStock.id,
            stockAction,
            stockAmount,
            stockNotes
          );
          if (res.success) {
            setAlertMessage({ type: 'success', text: res.message || 'Stok berhasil diperbarui!' });
            setSelectedMedForStock(null);
            await fetchInventory();
          } else {
            setAlertMessage({ type: 'error', text: res.message || 'Gagal memperbarui stok.' });
          }
        } catch (err: any) {
          setAlertMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
        } finally {
          setIsProcessingAction(false);
        }
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_VERIFICATION':
        return { label: 'Verifikasi Resep', bg: '#fff1f2', color: '#be123c', border: '#fecdd3' };
      case 'PENDING_PAYMENT':
        return { label: 'Menunggu Bayar', bg: '#fef9c3', color: '#a16207', border: '#fef08a' };
      case 'PROCESSING':
        return { label: 'Sedang Diracik', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
      case 'READY_FOR_PICKUP':
        return { label: 'Siap Diambil', bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' };
      case 'SHIPPED':
        return { label: 'Dalam Pengiriman', bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' };
      case 'COMPLETED':
        return { label: 'Selesai', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      case 'CANCELLED':
        return { label: 'Dibatalkan', bg: '#fef2f2', color: '#991b1b', border: '#fecaca' };
      default:
        return { label: status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 5rem 1.25rem' }}>
      {/* Top Banner */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '1.75rem 2rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '4rem',
              height: '4rem',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #0284c7, #0d9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            }}
          >
            <Stethoscope size={32} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--secondary-900)' }}>
                Portal Staf Apotek & Apoteker
              </h1>
              <span
                style={{
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '0.2rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                }}
              >
                SIPA RESMI
              </span>
            </div>
            <p style={{ color: 'var(--secondary-500)', fontSize: '0.85rem', margin: 0 }}>
              Petugas Bertugas: <strong>{user?.name}</strong> ({user?.email}) • Standar Operasional Farmasi BPOM
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={() => {
              fetchOrders();
              fetchInventory();
            }}
          >
            Segarkan Data
          </Button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: alertMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${alertMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: alertMessage.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {alertMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{alertMessage.text}</span>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Role-Based Staff Notification Banners */}
      {(() => {
        const pendingRxCount = orders.filter((o) => o.status === 'PENDING_VERIFICATION').length;
        const newProcessingCount = orders.filter((o) => o.status === 'PROCESSING').length;
        return (
          <>
            {pendingRxCount > 0 && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderLeft: '5px solid #d97706',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.875rem 1.25rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  color: '#92400e',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileCheck size={22} color="#d97706" />
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>Perhatian Apoteker:</strong> Terdapat{' '}
                    <strong>{pendingRxCount} resep dokter</strong> menunggu verifikasi Anda sebelum dapat diracik.
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setActiveTab('orders');
                    setStatusFilter('PENDING_VERIFICATION');
                  }}
                  style={{ background: '#d97706', borderColor: '#d97706' }}
                >
                  Verifikasi Resep Sekarang ({pendingRxCount})
                </Button>
              </div>
            )}

            {newProcessingCount > 0 && (
              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderLeft: '5px solid #2563eb',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.875rem 1.25rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  color: '#1e40af',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Package size={22} color="#2563eb" />
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>Pesanan Masuk:</strong> Terdapat{' '}
                    <strong>{newProcessingCount} pesanan</strong> telah dikonfirmasi dan siap untuk disiapkan/dikemas.
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setActiveTab('orders');
                    setStatusFilter('PROCESSING');
                  }}
                >
                  Lihat Pesanan ({newProcessingCount})
                </Button>
              </div>
            )}
          </>
        );
      })()}

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-light)',
          marginBottom: '1.75rem',
        }}
      >
        {[
          { key: 'overview', label: 'Ringkasan & Metrik', icon: <TrendingUp size={16} /> },
          { key: 'orders', label: `Antrean Pesanan Masuk (${orders.length})`, icon: <Package size={16} /> },
          { key: 'inventory', label: `Inventaris Stok Obat (${medicines.length})`, icon: <Edit3 size={16} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid var(--primary-600)' : '3px solid transparent',
              background: activeTab === tab.key ? '#ffffff' : 'transparent',
              color: activeTab === tab.key ? 'var(--primary-700)' : 'var(--secondary-600)',
              fontWeight: activeTab === tab.key ? 800 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === 'overview' && (
        <div>
          {/* Top 4 Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--secondary-500)', fontSize: '0.825rem', fontWeight: 600 }}>
                <span>Total Antrean Masuk</span>
                <Package size={20} color="#0284c7" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--secondary-900)', marginTop: '0.4rem' }}>
                {totalOrders}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.25rem' }}>
                Pesanan terdaftar di sistem
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #fecdd3', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#be123c', fontSize: '0.825rem', fontWeight: 700 }}>
                <span>Menunggu Verifikasi Resep</span>
                <FileCheck size={20} color="#be123c" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#be123c', marginTop: '0.4rem' }}>
                {pendingRxCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9f1239', marginTop: '0.25rem' }}>
                Wajib telaah dosis apoteker
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--secondary-500)', fontSize: '0.825rem', fontWeight: 600 }}>
                <span>Sedang Diracik / Siap Kirim</span>
                <Truck size={20} color="#0d9488" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0d9488', marginTop: '0.4rem' }}>
                {processingCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
                Siap dikemas & diserahkan
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#c2410c', fontSize: '0.825rem', fontWeight: 700 }}>
                <span>Peringatan Stok Menipis (&lt;10)</span>
                <AlertTriangle size={20} color="#ea580c" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ea580c', marginTop: '0.4rem' }}>
                {lowStockCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9a3412', marginTop: '0.25rem' }}>
                Perlu restock segera
              </div>
            </div>
          </div>

          {/* Quick Action: Urgent Prescription Queue */}
          <div style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '1.5rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary-900)', margin: 0 }}>
                  🚨 Pesanan Memerlukan Telaah Resep Dokter Segera
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--secondary-500)', margin: '0.2rem 0 0 0' }}>
                  Peraturan Apotek: Order obat resep tidak boleh masuk status PROCESSING sebelum Anda menyetujui resep.
                </p>
              </div>

              <Button variant="secondary" size="sm" onClick={() => { setActiveTab('orders'); setStatusFilter('PENDING_VERIFICATION'); }}>
                Lihat Semua Antrean Resep
              </Button>
            </div>

            {orders.filter((o) => o.status === 'PENDING_VERIFICATION').length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary-500)', background: 'var(--secondary-50)', borderRadius: 'var(--radius-md)' }}>
                <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 0.5rem auto' }} />
                <strong style={{ display: 'block', color: 'var(--secondary-800)' }}>Semua Resep Telah Diverifikasi!</strong>
                <span style={{ fontSize: '0.8rem' }}>Tidak ada antrean telaah resep dokter yang tertunda saat ini.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {orders.filter((o) => o.status === 'PENDING_VERIFICATION').map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem',
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      borderRadius: 'var(--radius-md)',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.95rem', color: '#9f1239' }}>#{ord.shortId}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#be123c' }}>• {formatDate(ord.createdAt)}</span>
                        <span style={{ background: '#be123c', color: '#ffffff', fontSize: '0.68rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                          RESEP DOKTER
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#881337', marginTop: '0.2rem' }}>
                        Pasien: <strong>{ord.customer?.name}</strong> ({ord.customer?.phone || ord.customer?.email}) • {ord.itemCount} jenis obat
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {ord.prescriptionUrl && (
                        <button
                          onClick={() => setPreviewPrescriptionUrl(ord.prescriptionUrl || null)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #fca5a5',
                            color: '#e11d48',
                            padding: '0.4rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={14} /> Lihat Resep
                        </button>
                      )}

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenOrderDetail(ord.id)}
                      >
                        Buka & Verifikasi
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS MANAGEMENT QUEUE */}
      {activeTab === 'orders' && (
        <div style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '1.75rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          {/* Controls: Search & Status Filter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '260px', maxWidth: '400px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} color="var(--secondary-400)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Cari ID Pesanan, Nama, atau Email Pasien..."
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--secondary-300)',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '2px' }}>
              {[
                { key: 'ALL', label: `Semua (${orders.length})` },
                { key: 'PENDING_VERIFICATION', label: `Verifikasi Resep (${pendingRxCount})` },
                { key: 'PROCESSING', label: 'Diproses' },
                { key: 'READY_FOR_PICKUP', label: 'Siap Diambil' },
                { key: 'SHIPPED', label: 'Dikirim' },
                { key: 'COMPLETED', label: 'Selesai' },
                { key: 'CANCELLED', label: 'Dibatalkan' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: statusFilter === f.key ? '1px solid var(--primary-600)' : '1px solid var(--border-light)',
                    background: statusFilter === f.key ? 'var(--primary-50)' : '#ffffff',
                    color: statusFilter === f.key ? 'var(--primary-700)' : 'var(--secondary-600)',
                    fontSize: '0.78rem',
                    fontWeight: statusFilter === f.key ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table */}
          {ordersLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary-500)' }}>
              Memuat antrean pesanan...
            </div>
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={<Package size={32} />}
              title="Antrean Pesanan Kosong"
              description="Tidak ada pesanan masuk yang sesuai dengan kriteria filter yang Anda pilih."
              secondaryActionText="Reset Filter"
              onSecondaryAction={() => {
                setStatusFilter('ALL');
                setOrderSearch('');
              }}
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--secondary-600)', fontWeight: 700 }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Order ID</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Pasien (Customer)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Item Obat</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Total Nilai</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Resep Dokter</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((ord) => {
                    const badge = getStatusBadge(ord.status);
                    return (
                      <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--secondary-900)' }}>
                          #{ord.shortId}
                          <div style={{ fontSize: '0.72rem', color: 'var(--secondary-500)', fontWeight: 400 }}>
                            {formatDate(ord.createdAt)}
                          </div>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <strong style={{ color: 'var(--secondary-900)' }}>{ord.customer?.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)' }}>
                            {ord.customer?.phone || ord.customer?.email}
                          </div>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <div style={{ maxWidth: '240px' }}>
                            {ord.items.slice(0, 2).map((it) => (
                              <div key={it.id} style={{ fontSize: '0.78rem', color: 'var(--secondary-800)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                • {it.medicineName} ({it.quantity}x)
                              </div>
                            ))}
                            {ord.items.length > 2 && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--secondary-500)', fontStyle: 'italic' }}>
                                + {ord.items.length - 2} obat lainnya
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                          {formatIDR(ord.totalAmount)}
                        </td>

                        <td style={{ padding: '1rem' }}>
                          {ord.requiresPrescription ? (
                            ord.prescriptionUrl ? (
                              <button
                                onClick={() => setPreviewPrescriptionUrl(ord.prescriptionUrl || null)}
                                style={{
                                  background: '#fff1f2',
                                  border: '1px solid #fecdd3',
                                  color: '#be123c',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Eye size={12} /> Resep Terlampir
                              </button>
                            ) : (
                              <span style={{ color: '#be123c', fontSize: '0.75rem', fontWeight: 700 }}>Resep Belum Diunggah</span>
                            )
                          ) : (
                            <span style={{ color: 'var(--secondary-500)', fontSize: '0.75rem' }}>Obat Bebas</span>
                          )}
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <span
                            style={{
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              padding: '0.2rem 0.55rem',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<ChevronRight size={14} />}
                            onClick={() => handleOpenOrderDetail(ord.id)}
                          >
                            Buka Detail
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVENTORY MANAGEMENT */}
      {activeTab === 'inventory' && (
        <div style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '1.75rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--secondary-900)' }}>
                Manajemen Inventaris & Kontrol Stok Obat
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--secondary-500)', margin: '0.2rem 0 0 0' }}>
                Perbarui kuantitas stok sediaan apotek, tambah penerimaan obat baru, atau sesuaikan stok retur/rusak.
              </p>
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} color="var(--secondary-400)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={medSearch}
                onChange={(e) => {
                  setMedSearch(e.target.value);
                  fetchInventory();
                }}
                placeholder="Cari obat atau kategori..."
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--secondary-300)',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {inventoryLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary-500)' }}>
              Memuat data inventaris apotek...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--secondary-600)', fontWeight: 700 }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Obat</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Kategori</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Harga Satuan</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Kategori Regulasi</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Stok Saat Ini</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Aksi Kelola Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((med) => (
                    <tr key={med.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--secondary-100)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            {med.image ? (
                              <img src={med.image} alt={med.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span>💊</span>
                            )}
                          </div>
                          <div>
                            <strong style={{ color: 'var(--secondary-900)' }}>{med.name}</strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--secondary-500)' }}>Satuan: {med.unit}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: 'var(--secondary-700)' }}>
                        {med.category}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--secondary-900)' }}>
                        {formatIDR(med.price)}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        {med.requiresPrescription ? (
                          <span style={{ background: '#fff1f2', color: '#be123c', fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                            Wajib Resep Dokter
                          </span>
                        ) : (
                          <span style={{ background: '#ecfdf5', color: '#047857', fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                            Obat Bebas
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '1rem',
                              fontWeight: 800,
                              color: med.isOutOfStock ? '#dc2626' : med.isLowStock ? '#ea580c' : '#059669',
                            }}
                          >
                            {med.stock} {med.unit}
                          </span>

                          {med.isOutOfStock ? (
                            <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '0.68rem', fontWeight: 800, padding: '1px 5px', borderRadius: '3px' }}>
                              HABIS
                            </span>
                          ) : med.isLowStock ? (
                            <span style={{ background: '#fff7ed', color: '#ea580c', fontSize: '0.68rem', fontWeight: 800, padding: '1px 5px', borderRadius: '3px' }}>
                              MENIPIS
                            </span>
                          ) : (
                            <span style={{ background: '#f0fdf4', color: '#059669', fontSize: '0.68rem', fontWeight: 800, padding: '1px 5px', borderRadius: '3px' }}>
                              AMAN
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Edit3 size={13} />}
                          onClick={() => {
                            setSelectedMedForStock(med);
                            setStockAction('ADD');
                            setStockAmount(10);
                            setStockNotes('');
                          }}
                        >
                          Kelola Stok
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DETAIL LOADING OVERLAY */}
      {isDetailLoading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ background: '#ffffff', padding: '1rem 1.75rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: 'var(--shadow-lg)' }}>
            <RefreshCw size={20} className="spin" color="var(--primary-600)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--secondary-800)' }}>Memuat data pesanan...</span>
          </div>
        </div>
      )}

      {/* MODAL 1: ORDER DETAIL & STAFF ACTIONS */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--border-light)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--secondary-50)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--secondary-900)' }}>
                    Detail Pesanan #{selectedOrder.shortId}
                  </h3>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: getStatusBadge(selectedOrder.status).bg,
                      color: getStatusBadge(selectedOrder.status).color,
                      border: `1px solid ${getStatusBadge(selectedOrder.status).border}`,
                    }}
                  >
                    {getStatusBadge(selectedOrder.status).label}
                  </span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--secondary-500)' }}>
                  Tanggal: {formatDate(selectedOrder.createdAt)} • ID: {selectedOrder.id}
                </span>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--secondary-400)',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Customer & Delivery Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', background: 'var(--secondary-50)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--secondary-500)', marginBottom: '0.35rem' }}>
                    <User size={13} /> DATA PASIEN (CUSTOMER)
                  </div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--secondary-900)', display: 'block' }}>
                    {selectedOrder.customer?.name}
                  </strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--secondary-600)' }}>
                    {selectedOrder.customer?.email}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--secondary-600)' }}>
                    Telp: {selectedOrder.customer?.phone || 'Belum diisi'}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--secondary-500)', marginBottom: '0.35rem' }}>
                    <MapPin size={13} /> TUJUAN PENGIRIMAN
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--secondary-800)', lineHeight: 1.4 }}>
                    {selectedOrder.shippingAddress || 'Alamat sesuai profil pasien'}
                  </div>
                  {selectedOrder.notes && (
                    <div style={{ fontSize: '0.78rem', color: '#0369a1', marginTop: '0.35rem', fontStyle: 'italic' }}>
                      Catatan: "{selectedOrder.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items Table */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--secondary-900)', margin: '0 0 0.75rem 0' }}>
                  Daftar Obat & Snapshot Harga ({selectedOrder.items.length} Jenis)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedOrder.items.map((it) => (
                    <div
                      key={it.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.75rem',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>💊</span>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--secondary-900)' }}>{it.medicineName}</strong>
                          {it.requiresPrescription && (
                            <span style={{ background: '#fff1f2', color: '#be123c', fontSize: '0.65rem', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', marginLeft: '6px' }}>
                              Resep
                            </span>
                          )}
                          <div style={{ fontSize: '0.72rem', color: 'var(--secondary-500)' }}>
                            {it.quantity} {it.medicineUnit || 'unit'} × {formatIDR(it.price)} (Stok sisa: {it.medicineStock ?? '-'})
                          </div>
                        </div>
                      </div>

                      <strong style={{ fontSize: '0.875rem', color: 'var(--secondary-900)' }}>
                        {formatIDR(it.subtotal)}
                      </strong>
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary-700)' }}>Total Tagihan Server-Side:</span>
                    <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                      {formatIDR(selectedOrder.totalAmount)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Prescription Section (Approve / Reject) */}
              {selectedOrder.requiresPrescription && (
                <div
                  style={{
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileCheck size={20} color="#be123c" />
                      <strong style={{ fontSize: '0.95rem', color: '#9f1239' }}>
                        Verifikasi Resep Dokter Apoteker
                      </strong>
                    </div>

                    {selectedOrder.prescriptionUrl && (
                      <button
                        onClick={() => setPreviewPrescriptionUrl(selectedOrder.prescriptionUrl || null)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #fca5a5',
                          color: '#be123c',
                          padding: '0.3rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ExternalLink size={13} /> Buka Berkas Resep
                      </button>
                    )}
                  </div>

                  {selectedOrder.rejectionReason && (
                    <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #fca5a5', marginBottom: '1rem', color: '#991b1b', fontSize: '0.8rem' }}>
                      <strong>Alasan Penolakan Resep:</strong> "{selectedOrder.rejectionReason}"
                    </div>
                  )}

                  {selectedOrder.status === 'PENDING_VERIFICATION' ? (
                    <div>
                      <p style={{ fontSize: '0.8rem', color: '#881337', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                        Pesanan ini tertahan di status <strong>PENDING_VERIFICATION</strong>. Silakan periksa keabsahan resep dokter. Anda dapat menyetujui resep untuk melanjutkan ke pembayaran, atau menolaknya dengan menyertakan alasan.
                      </p>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<CheckCircle2 size={15} />}
                          disabled={isProcessingAction}
                          onClick={() => handleApprovePrescription(selectedOrder)}
                        >
                          Setujui Resep (Approve)
                        </Button>

                        <button
                          onClick={() => handleTriggerRejectPrescription(selectedOrder)}
                          disabled={isProcessingAction}
                          style={{
                            background: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.45rem 0.9rem',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <XCircle size={15} /> Tolak Resep (Reject)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#065f46', background: '#ecfdf5', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)' }}>
                      ✅ Resep telah diverifikasi oleh staf apoteker.
                    </div>
                  )}
                </div>
              )}

              {/* Order Status Management Control */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--secondary-900)', marginBottom: '0.75rem' }}>
                  Kontrol Alur Status Pesanan
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { key: 'PROCESSING', label: 'Sedang Diracik (PROCESSING)', color: '#0284c7' },
                    { key: 'READY_FOR_PICKUP', label: 'Siap Diambil (READY_FOR_PICKUP)', color: '#7e22ce' },
                    { key: 'SHIPPED', label: 'Dikirim Kurir (SHIPPED)', color: '#0e7490' },
                    { key: 'COMPLETED', label: 'Selesai (COMPLETED)', color: '#059669' },
                    { key: 'CANCELLED', label: 'Batalkan Pesanan (CANCELLED)', color: '#dc2626' },
                  ].map((st) => (
                    <button
                      key={st.key}
                      onClick={() => handleUpdateStatus(selectedOrder, st.key)}
                      disabled={isProcessingAction || selectedOrder.status === st.key}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: selectedOrder.status === st.key ? `2px solid ${st.color}` : '1px solid var(--secondary-300)',
                        background: selectedOrder.status === st.key ? `${st.color}15` : '#ffffff',
                        color: selectedOrder.status === st.key ? st.color : 'var(--secondary-700)',
                        fontSize: '0.8rem',
                        fontWeight: selectedOrder.status === st.key ? 800 : 600,
                        cursor: selectedOrder.status === st.key ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {selectedOrder.status === st.key ? `✓ ${st.label}` : st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.75rem',
                borderTop: '1px solid var(--border-light)',
                background: 'var(--secondary-50)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Button variant="secondary" size="sm" onClick={() => setSelectedOrder(null)}>
                Tutup Rincian
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: STOCK UPDATE DIALOG */}
      {selectedMedForStock && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setSelectedMedForStock(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '460px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--border-light)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--secondary-900)' }}>
              Kelola Stok: {selectedMedForStock.name}
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--secondary-500)', margin: '0 0 1.25rem 0' }}>
              Stok saat ini: <strong style={{ color: 'var(--primary-700)' }}>{selectedMedForStock.stock} {selectedMedForStock.unit}</strong>
            </p>

            {/* Action Select */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {[
                { key: 'ADD', label: '+ Tambah Stok', icon: <Plus size={14} /> },
                { key: 'SUBTRACT', label: '- Kurangi Stok', icon: <Minus size={14} /> },
                { key: 'SET', label: 'Set Stok Baru', icon: <Edit3 size={14} /> },
              ].map((act) => (
                <button
                  key={act.key}
                  type="button"
                  onClick={() => setStockAction(act.key as any)}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: stockAction === act.key ? '2px solid var(--primary-600)' : '1px solid var(--secondary-300)',
                    background: stockAction === act.key ? 'var(--primary-50)' : '#ffffff',
                    color: stockAction === act.key ? 'var(--primary-700)' : 'var(--secondary-600)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  {act.icon} {act.label}
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-700)', marginBottom: '0.35rem' }}>
                Jumlah Unit ({selectedMedForStock.unit})
              </label>
              <input
                type="number"
                min="1"
                value={stockAmount}
                onChange={(e) => setStockAmount(Math.max(0, parseInt(e.target.value || '0', 10)))}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--secondary-300)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-700)', marginBottom: '0.35rem' }}>
                Catatan Perubahan (Opsional)
              </label>
              <input
                type="text"
                value={stockNotes}
                onChange={(e) => setStockNotes(e.target.value)}
                placeholder="Contoh: Penerimaan dari PBF Kimia Farma / Obat rusak"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--secondary-300)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" size="sm" onClick={() => setSelectedMedForStock(null)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmStockChange}>
                Lanjut ke Konfirmasi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PRESCRIPTION IMAGE VIEWER */}
      {previewPrescriptionUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 2500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setPreviewPrescriptionUrl(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '1.5rem',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--secondary-900)' }}>
                Lembar Resep Dokter Pasien
              </h4>
              <button
                onClick={() => setPreviewPrescriptionUrl(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--secondary-500)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'var(--secondary-100)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
              <img
                src={previewPrescriptionUrl}
                alt="Berkas Resep Dokter"
                style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--secondary-600)' }}>
                Path Berkas: <code style={{ wordBreak: 'break-all' }}>{previewPrescriptionUrl}</code>
              </div>
            </div>

            <Button variant="secondary" size="sm" onClick={() => setPreviewPrescriptionUrl(null)}>
              Tutup Pratinjau
            </Button>
          </div>
        </div>
      )}

      {/* REUSABLE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        requireInput={confirmDialog.requireInput}
        inputLabel={confirmDialog.inputLabel}
        inputPlaceholder={confirmDialog.inputPlaceholder}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        isLoading={isProcessingAction}
      />
    </div>
  );
};
