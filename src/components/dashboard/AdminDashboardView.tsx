import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  adminService,
  AdminStats,
  AdminMedicine,
  AdminCategory,
  AdminUser,
  AdminOrder,
  AdminTransaction,
} from '../../services/adminService';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { useToast } from '../../context/ToastContext';
import {
  ShieldCheck,
  Users,
  RefreshCw,
  Layers,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  Edit3,
  Trash2,
  Search,
  Lock,
  Unlock,
  CreditCard,
  Pill,
  XCircle,
  DollarSign
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  // Active Tab: 'overview' | 'medicines' | 'categories' | 'users' | 'orders' | 'transactions'
  const [activeTab, setActiveTab] = useState<'overview' | 'medicines' | 'categories' | 'users' | 'orders' | 'transactions'>('overview');

  // 1. Stats State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // 2. Medicines State
  const [medicines, setMedicines] = useState<AdminMedicine[]>([]);
  const [medLoading, setMedLoading] = useState<boolean>(true);
  const [medSearch, setMedSearch] = useState<string>('');
  const [medCategoryFilter, setMedCategoryFilter] = useState<string>('all');
  const [medStatusFilter, setMedStatusFilter] = useState<string>('all');

  // 3. Categories State
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [catLoading, setCatLoading] = useState<boolean>(true);

  // 4. Users State
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(true);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userSearch, setUserSearch] = useState<string>('');

  // 5. Orders State
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderSearch, setOrderSearch] = useState<string>('');

  // 6. Transactions State
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(true);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);

  // Modals: Medicine Form Modal
  const [isMedModalOpen, setIsMedModalOpen] = useState<boolean>(false);
  const [medFormMode, setMedFormMode] = useState<'create' | 'edit'>('create');
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [medFormData, setMedFormData] = useState({
    name: '',
    categoryId: '',
    description: '',
    price: 10000,
    stock: 50,
    unit: 'Strip',
    requiresPrescription: false,
    image: '',
    isActive: true,
  });

  // Modals: Category Form Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState<boolean>(false);
  const [catFormMode, setCatFormMode] = useState<'create' | 'edit'>('create');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catFormData, setCatFormData] = useState({
    name: '',
    description: '',
  });

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: (inputVal?: string) => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
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

  // --------------------------------------------------------------------------
  // Data Fetchers
  // --------------------------------------------------------------------------
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await adminService.getStats();
      if (res.success && res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchMedicines = async () => {
    setMedLoading(true);
    try {
      const res = await adminService.getMedicines({
        search: medSearch,
        category: medCategoryFilter,
        status: medStatusFilter,
        limit: 50,
      });
      if (res.success && res.data?.medicines) {
        setMedicines(res.data.medicines);
      }
    } catch (err) {
      console.error('Failed to load medicines:', err);
    } finally {
      setMedLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCatLoading(true);
    try {
      const res = await adminService.getCategories();
      if (res.success && res.data?.categories) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setCatLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await adminService.getUsers({
        role: userRoleFilter,
        search: userSearch,
      });
      if (res.success && res.data?.users) {
        setUsersList(res.data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await adminService.getOrders({
        status: orderStatusFilter,
        search: orderSearch,
      });
      if (res.success && res.data?.orders) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const res = await adminService.getTransactions();
      if (res.success && res.data) {
        setTransactions(res.data.transactions);
        setTotalRevenue(res.data.totalRevenue);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchCategories();
  }, []);

  // Tab switch fetcher
  useEffect(() => {
    if (activeTab === 'overview') fetchStats();
    if (activeTab === 'medicines') {
      fetchMedicines();
      fetchCategories();
    }
    if (activeTab === 'categories') fetchCategories();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'transactions') fetchTransactions();
  }, [activeTab]);

  // --------------------------------------------------------------------------
  // Medicine CRUD Actions
  // --------------------------------------------------------------------------
  const handleOpenAddMedicine = () => {
    setMedFormMode('create');
    setEditingMedId(null);
    setMedFormData({
      name: '',
      categoryId: categories.length > 0 ? categories[0].id : '',
      description: '',
      price: 15000,
      stock: 50,
      unit: 'Strip',
      requiresPrescription: false,
      image: '',
      isActive: true,
    });
    setIsMedModalOpen(true);
  };

  const handleOpenEditMedicine = (med: AdminMedicine) => {
    setMedFormMode('edit');
    setEditingMedId(med.id);
    setMedFormData({
      name: med.name,
      categoryId: med.categoryId,
      description: med.description || '',
      price: med.price,
      stock: med.stock,
      unit: med.unit,
      requiresPrescription: med.requiresPrescription,
      image: med.image || '',
      isActive: med.isActive,
    });
    setIsMedModalOpen(true);
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medFormData.name.trim()) {
      showToast('error', 'Nama obat wajib diisi.');
      return;
    }
    if (!medFormData.categoryId) {
      showToast('error', 'Silakan pilih kategori obat.');
      return;
    }

    try {
      if (medFormMode === 'create') {
        const res = await adminService.createMedicine({
          name: medFormData.name,
          categoryId: medFormData.categoryId,
          description: medFormData.description,
          price: Number(medFormData.price),
          stock: Number(medFormData.stock),
          unit: medFormData.unit,
          requiresPrescription: medFormData.requiresPrescription,
          image: medFormData.image || null,
        });

        if (res.success) {
          showToast('success', res.message || 'Obat baru berhasil ditambahkan.');
          setIsMedModalOpen(false);
          fetchMedicines();
          fetchStats();
        } else {
          showToast('error', res.message || 'Gagal menambahkan obat.');
        }
      } else if (editingMedId) {
        const res = await adminService.updateMedicine(editingMedId, {
          name: medFormData.name,
          categoryId: medFormData.categoryId,
          description: medFormData.description,
          price: Number(medFormData.price),
          stock: Number(medFormData.stock),
          unit: medFormData.unit,
          requiresPrescription: medFormData.requiresPrescription,
          image: medFormData.image || null,
          isActive: medFormData.isActive,
        });

        if (res.success) {
          showToast('success', res.message || 'Data obat berhasil diperbarui.');
          setIsMedModalOpen(false);
          fetchMedicines();
          fetchStats();
        } else {
          showToast('error', res.message || 'Gagal memperbarui obat.');
        }
      }
    } catch (err: any) {
      showToast('error', 'Terjadi kesalahan sistem: ' + err.message);
    }
  };

  const handleDeleteMedicine = (med: AdminMedicine) => {
    setConfirmDialog({
      isOpen: true,
      title: `Hapus / Arsipkan Obat: ${med.name}`,
      message: med.orderCount > 0
        ? `Obat ini pernah memiliki ${med.orderCount} riwayat transaksi pesanan. Sesuai aturan integritas data, obat akan di-SOFT DELETE (Diarsipkan) agar rekaman nota transaksi tidak rusak.`
        : `Apakah Anda yakin ingin menghapus sediaan obat "${med.name}" secara permanen dari sistem apotek?`,
      confirmText: med.orderCount > 0 ? 'Arsipkan Obat' : 'Hapus Permanen',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await adminService.deleteMedicine(med.id);
          if (res.success) {
            showToast('success', res.message || 'Operasi berhasil.');
            fetchMedicines();
            fetchStats();
          } else {
            showToast('error', res.message || 'Gagal menghapus obat.');
          }
        } catch (err: any) {
          showToast('error', err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // --------------------------------------------------------------------------
  // Category CRUD Actions
  // --------------------------------------------------------------------------
  const handleOpenAddCategory = () => {
    setCatFormMode('create');
    setEditingCatId(null);
    setCatFormData({ name: '', description: '' });
    setIsCatModalOpen(true);
  };

  const handleOpenEditCategory = (cat: AdminCategory) => {
    setCatFormMode('edit');
    setEditingCatId(cat.id);
    setCatFormData({ name: cat.name, description: cat.description || '' });
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormData.name.trim()) {
      showToast('error', 'Nama kategori tidak boleh kosong.');
      return;
    }

    try {
      if (catFormMode === 'create') {
        const res = await adminService.createCategory({
          name: catFormData.name,
          description: catFormData.description,
        });
        if (res.success) {
          showToast('success', res.message || 'Kategori berhasil dibuat.');
          setIsCatModalOpen(false);
          fetchCategories();
        } else {
          showToast('error', res.message || 'Gagal membuat kategori.');
        }
      } else if (editingCatId) {
        const res = await adminService.updateCategory(editingCatId, {
          name: catFormData.name,
          description: catFormData.description,
        });
        if (res.success) {
          showToast('success', res.message || 'Kategori berhasil diperbarui.');
          setIsCatModalOpen(false);
          fetchCategories();
        } else {
          showToast('error', res.message || 'Gagal memperbarui kategori.');
        }
      }
    } catch (err: any) {
      showToast('error', 'Kesalahan sistem: ' + err.message);
    }
  };

  const handleDeleteCategory = (cat: AdminCategory) => {
    if (cat.medicineCount > 0) {
      showToast('error', `TIDAK DAPAT DIHAPUS: Kategori "${cat.name}" masih memiliki ${cat.medicineCount} obat terdaftar. Pindahkan atau hapus obat terlebih dahulu.`);
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `Hapus Kategori: ${cat.name}`,
      message: `Apakah Anda yakin ingin menghapus kategori "${cat.name}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus Kategori',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await adminService.deleteCategory(cat.id);
          if (res.success) {
            showToast('success', res.message || 'Kategori berhasil dihapus.');
            fetchCategories();
          } else {
            showToast('error', res.message || 'Gagal menghapus kategori.');
          }
        } catch (err: any) {
          showToast('error', err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // --------------------------------------------------------------------------
  // User Management Actions
  // --------------------------------------------------------------------------
  const handleChangeRole = (u: AdminUser, newRole: string) => {
    if (u.id === user?.id && newRole !== 'ADMIN') {
      showToast('error', 'TINDAKAN DILARANG: Anda tidak dapat menurunkan role akun Administrator yang sedang aktif digunakan.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `Ubah Role Pengguna: ${u.name}`,
      message: `Ubah role akun "${u.email}" dari ${u.role} menjadi ${newRole}? Pengguna akan menerima hak akses sesuai role barunya.`,
      confirmText: `Tetapkan Sebagai ${newRole}`,
      variant: 'primary',
      onConfirm: async () => {
        try {
          const res = await adminService.updateUserRole(u.id, newRole);
          if (res.success) {
            showToast('success', res.message || 'Role berhasil diubah.');
            fetchUsers();
            fetchStats();
          } else {
            showToast('error', res.message || 'Gagal mengubah role.');
          }
        } catch (err: any) {
          showToast('error', err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleToggleUserActive = (u: AdminUser) => {
    if (u.id === user?.id && u.isActive) {
      showToast('error', 'TINDAKAN DILARANG: Anda tidak dapat menonaktifkan akun Administrator Anda sendiri.');
      return;
    }

    const nextState = !u.isActive;
    const actionWord = nextState ? 'mengaktifkan' : 'menonaktifkan';

    setConfirmDialog({
      isOpen: true,
      title: `${nextState ? 'Aktifkan' : 'Nonaktifkan'} Akun Pengguna`,
      message: `Apakah Anda yakin ingin ${actionWord} akun "${u.name}" (${u.email})? ${
        !nextState ? 'Pengguna ini tidak akan bisa login ke sistem apotek hingga diaktifkan kembali.' : 'Pengguna akan dapat kembali login dan bertransaksi.'
      }`,
      confirmText: nextState ? 'Aktifkan Akun' : 'Nonaktifkan Akun',
      variant: nextState ? 'primary' : 'danger',
      onConfirm: async () => {
        try {
          const res = await adminService.toggleUserStatus(u.id, nextState);
          if (res.success) {
            showToast('success', res.message || 'Status akun berhasil diperbarui.');
            fetchUsers();
          } else {
            showToast('error', res.message || 'Gagal mengubah status akun.');
          }
        } catch (err: any) {
          showToast('error', err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 5rem 1.25rem' }}>
      {/* Top Banner Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          color: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '2.25rem',
          boxShadow: '0 10px 25px rgba(30, 27, 75, 0.25)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '4.5rem',
              height: '4.5rem',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <ShieldCheck size={36} color="#c7d2fe" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Dashboard Administrator
              </h1>
              <span
                style={{
                  background: 'rgba(199, 210, 254, 0.2)',
                  color: '#e0e7ff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(199, 210, 254, 0.3)',
                }}
              >
                SUPER ADMIN
              </span>
            </div>
            <p style={{ color: '#c7d2fe', fontSize: '0.9rem', margin: 0 }}>
              Halo, <strong>{user?.name}</strong> • Kelola master data obat, kategori, pengguna, pesanan, dan keuangan apotek.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={() => {
              fetchStats();
              if (activeTab === 'medicines') fetchMedicines();
              if (activeTab === 'categories') fetchCategories();
              if (activeTab === 'users') fetchUsers();
              if (activeTab === 'orders') fetchOrders();
              if (activeTab === 'transactions') fetchTransactions();
              showToast('success', 'Data database disinkronkan.');
            }}
            style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
          >
            Sinkronkan
          </Button>
        </div>
      </div>

      {/* Role-Based Admin Notification Banners */}
      {stats && (
        <>
          {(stats.outOfStockMedicines > 0 || stats.lowStockMedicines > 0) && (
            <div
              style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderLeft: '5px solid #e11d48',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem 1.25rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                color: '#9f1239',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={22} color="#e11d48" />
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>Peringatan Inventaris Stok:</strong> Terdapat{' '}
                  <strong>{stats.outOfStockMedicines} obat stok habis</strong> dan{' '}
                  <strong>{stats.lowStockMedicines} obat stok menipis (≤ 10 unit)</strong>.
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('medicines')}
                style={{ background: '#e11d48', borderColor: '#e11d48' }}
              >
                Kelola Stok Obat ({stats.outOfStockMedicines + stats.lowStockMedicines})
              </Button>
            </div>
          )}

          {stats.pendingOrders > 0 && (
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
                <Clock size={22} color="#2563eb" />
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>Notifikasi Pesanan:</strong> Terdapat{' '}
                  <strong>{stats.pendingOrders} pesanan berstatus pending</strong> menunggu verifikasi staf.
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('orders')}
              >
                Lihat Antrean Pesanan ({stats.pendingOrders})
              </Button>
            </div>
          )}
        </>
      )}

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '2px solid var(--border-light)',
          marginBottom: '2rem',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: activeTab === 'overview' ? '#4338ca' : 'var(--secondary-500)',
            borderBottom: activeTab === 'overview' ? '3px solid #4338ca' : '3px solid transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <TrendingUp size={16} />
          Ringkasan Statistik
        </button>

        <button
          onClick={() => setActiveTab('medicines')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: activeTab === 'medicines' ? '#4338ca' : 'var(--secondary-500)',
            borderBottom: activeTab === 'medicines' ? '3px solid #4338ca' : '3px solid transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <Pill size={16} />
          Data Obat (CRUD)
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: activeTab === 'categories' ? '#4338ca' : 'var(--secondary-500)',
            borderBottom: activeTab === 'categories' ? '3px solid #4338ca' : '3px solid transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <Layers size={16} />
          Kategori Obat
        </button>

        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: activeTab === 'users' ? '#4338ca' : 'var(--secondary-500)',
            borderBottom: activeTab === 'users' ? '3px solid #4338ca' : '3px solid transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <Users size={16} />
          Manajemen User & Staff
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: activeTab === 'orders' ? '#4338ca' : 'var(--secondary-500)',
            borderBottom: activeTab === 'orders' ? '3px solid #4338ca' : '3px solid transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <ShoppingBag size={16} />
          Daftar Seluruh Order
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: activeTab === 'transactions' ? '#4338ca' : 'var(--secondary-500)',
            borderBottom: activeTab === 'transactions' ? '3px solid #4338ca' : '3px solid transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <CreditCard size={16} />
          Keuangan & Transaksi
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: EXECUTIVE STATS OVERVIEW                                       */}
      {/* ==================================================================== */}
      {activeTab === 'overview' && (
        <div>
          {statsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary-500)' }}>
              Memuat statistik real-time apotek...
            </div>
          ) : stats ? (
            <div>
              {/* Top KPI Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                {/* 1. Total Obat */}
                <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '1.25rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--secondary-500)', fontSize: '0.825rem', fontWeight: 600 }}>
                    <span>Total Obat Aktif</span>
                    <Pill size={18} color="#4338ca" />
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--secondary-900)', marginTop: '0.35rem' }}>
                    {stats.totalMedicines}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)', marginTop: '0.2rem' }}>
                    Sediaan katalog apotek
                  </div>
                </div>

                {/* 2. Obat Stok Habis */}
                <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '1.25rem', border: '1px solid #fecdd3', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#be123c', fontSize: '0.825rem', fontWeight: 600 }}>
                    <span>Obat Stok Habis</span>
                    <AlertTriangle size={18} color="#e11d48" />
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#e11d48', marginTop: '0.35rem' }}>
                    {stats.outOfStockMedicines}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#be123c', marginTop: '0.2rem' }}>
                    {stats.lowStockMedicines} obat menipis (≤10)
                  </div>
                </div>

                {/* 3. Total Customer */}
                <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '1.25rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--secondary-500)', fontSize: '0.825rem', fontWeight: 600 }}>
                    <span>Total Customer</span>
                    <Users size={18} color="#059669" />
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#059669', marginTop: '0.35rem' }}>
                    {stats.totalCustomers}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)', marginTop: '0.2rem' }}>
                    Pasien / pembeli terdaftar
                  </div>
                </div>

                {/* 4. Total Order */}
                <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '1.25rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--secondary-500)', fontSize: '0.825rem', fontWeight: 600 }}>
                    <span>Total Order Masuk</span>
                    <ShoppingBag size={18} color="#0284c7" />
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0284c7', marginTop: '0.35rem' }}>
                    {stats.totalOrders}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)', marginTop: '0.2rem' }}>
                    Semua status pesanan
                  </div>
                </div>

                {/* 5. Order Pending */}
                <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '1.25rem', border: '1px solid #fde68a', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#b45309', fontSize: '0.825rem', fontWeight: 600 }}>
                    <span>Order Pending</span>
                    <Clock size={18} color="#d97706" />
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#d97706', marginTop: '0.35rem' }}>
                    {stats.pendingOrders}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.2rem' }}>
                    Butuh verifikasi / bayar
                  </div>
                </div>

                {/* 6. Order Selesai */}
                <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '1.25rem', border: '1px solid #bbf7d0', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#15803d', fontSize: '0.825rem', fontWeight: 600 }}>
                    <span>Order Selesai</span>
                    <CheckCircle2 size={18} color="#16a34a" />
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#16a34a', marginTop: '0.35rem' }}>
                    {stats.completedOrders}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.2rem' }}>
                    Transaksi tuntas
                  </div>
                </div>

                {/* 7. Total Pendapatan */}
                <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '1.25rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--secondary-500)', fontSize: '0.825rem', fontWeight: 600 }}>
                    <span>Total Omzet Transaksi</span>
                    <DollarSign size={18} color="#8b5cf6" />
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4338ca', marginTop: '0.35rem' }}>
                    {formatCurrency(stats.totalRevenue)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)', marginTop: '0.2rem' }}>
                    Dari pembayaran lunas
                  </div>
                </div>
              </div>

              {/* Composition Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '1.75rem', border: '1px solid var(--border-light)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--secondary-900)' }}>
                    Komposisi Akun Pengguna
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f5f3ff', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontWeight: 600, color: '#6d28d9' }}>Administrator (Super Admin)</span>
                      <strong style={{ fontSize: '1.1rem', color: '#6d28d9' }}>{stats.totalAdmins}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#eff6ff', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontWeight: 600, color: '#1d4ed8' }}>Staf Farmasi / Apoteker</span>
                      <strong style={{ fontSize: '1.1rem', color: '#1d4ed8' }}>{stats.totalStaff}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f0fdf4', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontWeight: 600, color: '#15803d' }}>Pelanggan / Customer</span>
                      <strong style={{ fontSize: '1.1rem', color: '#15803d' }}>{stats.totalCustomers}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '1.75rem', border: '1px solid var(--border-light)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--secondary-900)' }}>
                    Distribusi Status Pesanan
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#fffbeb', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontWeight: 600, color: '#b45309' }}>Pending (Verifikasi & Pembayaran)</span>
                      <strong style={{ fontSize: '1.1rem', color: '#b45309' }}>{stats.pendingOrders}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#eff6ff', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontWeight: 600, color: '#0284c7' }}>Dalam Proses & Pengiriman</span>
                      <strong style={{ fontSize: '1.1rem', color: '#0284c7' }}>{stats.processingOrders}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f0fdf4', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontWeight: 600, color: '#15803d' }}>Pesanan Selesai (Completed)</span>
                      <strong style={{ fontSize: '1.1rem', color: '#15803d' }}>{stats.completedOrders}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#fef2f2', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontWeight: 600, color: '#b91c1c' }}>Pesanan Dibatalkan / Ditolak</span>
                      <strong style={{ fontSize: '1.1rem', color: '#b91c1c' }}>{stats.cancelledOrders}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: MEDICINES MANAGEMENT (CRUD)                                   */}
      {/* ==================================================================== */}
      {activeTab === 'medicines' && (
        <div style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '1.75rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={16} color="var(--secondary-400)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={medSearch}
                  onChange={(e) => setMedSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchMedicines()}
                  placeholder="Cari obat apotek..."
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--secondary-300)',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <select
                value={medCategoryFilter}
                onChange={(e) => {
                  setMedCategoryFilter(e.target.value);
                  setTimeout(fetchMedicines, 50);
                }}
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--secondary-300)',
                  fontSize: '0.85rem',
                  color: 'var(--secondary-800)',
                }}
              >
                <option value="all">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={medStatusFilter}
                onChange={(e) => {
                  setMedStatusFilter(e.target.value);
                  setTimeout(fetchMedicines, 50);
                }}
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--secondary-300)',
                  fontSize: '0.85rem',
                  color: 'var(--secondary-800)',
                }}
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Diarsipkan (Nonaktif)</option>
              </select>

              <Button variant="secondary" size="sm" onClick={fetchMedicines}>
                Filter
              </Button>
            </div>

            <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={handleOpenAddMedicine}>
              Tambah Obat Baru
            </Button>
          </div>

          {/* Medicines Table */}
          {medLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary-500)' }}>
              Memuat master obat...
            </div>
          ) : medicines.length === 0 ? (
            <EmptyState
              icon={<Pill size={32} />}
              title="Data Obat Tidak Ditemukan"
              description="Tidak ada data sediaan obat yang cocok dengan kriteria filter pencarian Anda."
              actionText="Tambah Obat Baru"
              onAction={handleOpenAddMedicine}
              secondaryActionText="Reset Filter"
              onSecondaryAction={() => {
                setMedSearch('');
                setMedCategoryFilter('');
                setMedStatusFilter('all');
                fetchMedicines();
              }}
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--secondary-500)', fontWeight: 700 }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Nama Obat</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Kategori</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Harga</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Stok</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Aturan Resep</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((med) => (
                    <tr key={med.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--secondary-900)' }}>{med.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)' }}>Satuan: {med.unit}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--secondary-700)' }}>
                        {med.categoryName}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#4338ca' }}>
                        {formatCurrency(med.price)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: med.stock === 0 ? '#e11d48' : med.stock <= 10 ? '#ea580c' : '#059669',
                          }}
                        >
                          {med.stock} {med.unit}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {med.requiresPrescription ? (
                          <span style={{ background: '#ffe4e6', color: '#e11d48', fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                            Resep Dokter
                          </span>
                        ) : (
                          <span style={{ background: '#f0fdf4', color: '#15803d', fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                            Bebas
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {med.isActive ? (
                          <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                            Aktif
                          </span>
                        ) : (
                          <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                            Diarsipkan
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Edit3 size={13} />}
                            onClick={() => handleOpenEditMedicine(med)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Trash2 size={13} />}
                            onClick={() => handleDeleteMedicine(med)}
                            style={{ color: '#e11d48', borderColor: '#fecdd3' }}
                          >
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: CATEGORIES MANAGEMENT (CRUD)                                  */}
      {/* ==================================================================== */}
      {activeTab === 'categories' && (
        <div style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '1.75rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--secondary-900)' }}>
                Master Kategori Obat
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--secondary-500)', margin: '0.25rem 0 0 0' }}>
                Kategori dilindungi oleh aturan relasional integritas data apotek.
              </p>
            </div>
            <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={handleOpenAddCategory}>
              Tambah Kategori
            </Button>
          </div>

          {catLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary-500)' }}>
              Memuat master kategori...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--secondary-500)', fontWeight: 700 }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Nama Kategori</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Deskripsi</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Jumlah Obat</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--secondary-900)' }}>
                        {cat.name}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--secondary-600)' }}>
                        {cat.description || '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            background: cat.medicineCount > 0 ? '#eff6ff' : '#f8fafc',
                            color: cat.medicineCount > 0 ? '#1d4ed8' : '#64748b',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          {cat.medicineCount} Obat
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Edit3 size={13} />}
                            onClick={() => handleOpenEditCategory(cat)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Trash2 size={13} />}
                            onClick={() => handleDeleteCategory(cat)}
                            style={{ color: '#e11d48', borderColor: '#fecdd3' }}
                          >
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: USER & STAFF MANAGEMENT                                       */}
      {/* ==================================================================== */}
      {activeTab === 'users' && (
        <div style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '1.75rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={16} color="var(--secondary-400)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  placeholder="Cari nama, email, atau HP..."
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--secondary-300)',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--secondary-100)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
                {['ALL', 'ADMIN', 'STAFF', 'CUSTOMER'].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setUserRoleFilter(r);
                      setTimeout(fetchUsers, 50);
                    }}
                    style={{
                      border: 'none',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: userRoleFilter === r ? '#ffffff' : 'transparent',
                      color: userRoleFilter === r ? 'var(--secondary-900)' : 'var(--secondary-600)',
                      boxShadow: userRoleFilter === r ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <Button variant="secondary" size="sm" onClick={fetchUsers}>
                Filter
              </Button>
            </div>
          </div>

          {usersLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary-500)' }}>
              Memuat data pengguna...
            </div>
          ) : usersList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary-500)' }}>
              Tidak ada pengguna yang cocok dengan pencarian.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--secondary-500)', fontWeight: 700 }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Pengguna</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Email & Kontak</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Role Saat Ini</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status Akun</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Pesanan</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Kelola Otorisasi</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => {
                    const isSelf = u.id === user?.id;
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--secondary-900)' }}>
                            {u.name} {isSelf && <span style={{ fontSize: '0.7rem', color: '#6366f1' }}>(Anda)</span>}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--secondary-500)' }}>ID: #{u.id.slice(-6)}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ color: 'var(--secondary-800)' }}>{u.email}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)' }}>{u.phone || 'No phone'}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              background: u.role === 'ADMIN' ? '#f5f3ff' : u.role === 'STAFF' ? '#eff6ff' : '#f0fdf4',
                              color: u.role === 'ADMIN' ? '#7c3aed' : u.role === 'STAFF' ? '#1d4ed8' : '#15803d',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {u.isActive ? (
                            <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                              AKTIF
                            </span>
                          ) : (
                            <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                              NONAKTIF
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--secondary-600)', fontWeight: 600 }}>
                          {u.orderCount} order
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {/* Role changer dropdown */}
                            <select
                              value={u.role}
                              disabled={isSelf}
                              onChange={(e) => handleChangeRole(u, e.target.value)}
                              style={{
                                padding: '0.35rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--secondary-300)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: isSelf ? '#f1f5f9' : '#ffffff',
                                cursor: isSelf ? 'not-allowed' : 'pointer',
                              }}
                            >
                              <option value="CUSTOMER">CUSTOMER</option>
                              <option value="STAFF">STAFF</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>

                            {/* Active Toggle Button */}
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={isSelf}
                              icon={u.isActive ? <Lock size={12} /> : <Unlock size={12} />}
                              onClick={() => handleToggleUserActive(u)}
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.3rem 0.6rem',
                                color: u.isActive ? '#e11d48' : '#059669',
                                borderColor: u.isActive ? '#fecdd3' : '#bbf7d0',
                              }}
                            >
                              {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                          </div>
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

      {/* ==================================================================== */}
      {/* TAB 5: ALL ORDERS MANAGEMENT                                         */}
      {/* ==================================================================== */}
      {activeTab === 'orders' && (
        <div style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '1.75rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={16} color="var(--secondary-400)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
                  placeholder="Cari order ID atau nama pasien..."
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--secondary-300)',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={(e) => {
                  setOrderStatusFilter(e.target.value);
                  setTimeout(fetchOrders, 50);
                }}
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--secondary-300)',
                  fontSize: '0.85rem',
                  color: 'var(--secondary-800)',
                }}
              >
                <option value="ALL">Semua Status Pesanan</option>
                <option value="PENDING_VERIFICATION">Menunggu Verifikasi Resep</option>
                <option value="PENDING_PAYMENT">Menunggu Pembayaran</option>
                <option value="PROCESSING">Diproses</option>
                <option value="READY_FOR_PICKUP">Siap Diambil</option>
                <option value="SHIPPED">Dikirim</option>
                <option value="COMPLETED">Selesai</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>

              <Button variant="secondary" size="sm" onClick={fetchOrders}>
                Cari
              </Button>
            </div>
          </div>

          {ordersLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary-500)' }}>
              Memuat data pesanan...
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary-500)' }}>
              Tidak ada pesanan yang sesuai dengan filter.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--secondary-500)', fontWeight: 700 }}>
                    <th style={{ padding: '0.75rem 1rem' }}>No. Order</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Customer / Pasien</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Item & Resep</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Total Nilai</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status Order</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status Bayar</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Waktu Pemesanan</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((ord) => (
                    <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: 'var(--secondary-800)' }}>
                        #{ord.shortId}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--secondary-900)' }}>{ord.customer?.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--secondary-500)' }}>{ord.customer?.phone || ord.customer?.email}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div>{ord.items.length} jenis obat</div>
                        {ord.requiresPrescription && (
                          <span style={{ fontSize: '0.68rem', background: '#ffe4e6', color: '#be123c', padding: '1px 5px', borderRadius: '3px', fontWeight: 800 }}>
                            Wajib Resep
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#4338ca' }}>
                        {formatCurrency(ord.totalAmount)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            background:
                              ord.status === 'COMPLETED'
                                ? '#dcfce7'
                                : ord.status === 'CANCELLED'
                                ? '#fee2e2'
                                : '#fef3c7',
                            color:
                              ord.status === 'COMPLETED'
                                ? '#166534'
                                : ord.status === 'CANCELLED'
                                ? '#991b1b'
                                : '#92400e',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            background: ord.paymentStatus === 'PAID' ? '#dcfce7' : '#fee2e2',
                            color: ord.paymentStatus === 'PAID' ? '#166534' : '#991b1b',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {ord.paymentStatus}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--secondary-500)', fontSize: '0.75rem' }}>
                        {formatDate(ord.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: FINANCIAL TRANSACTIONS                                        */}
      {/* ==================================================================== */}
      {activeTab === 'transactions' && (
        <div style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '1.75rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--secondary-900)' }}>
                Rekapitulasi Keuangan & Transaksi Lunas
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--secondary-500)', margin: '0.25rem 0 0 0' }}>
                Semua transaksi dengan status pembayaran PAID yang telah masuk ke kas apotek.
              </p>
            </div>
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-md)', textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: 700 }}>TOTAL PENDAPATAN KAS</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#4338ca' }}>{formatCurrency(totalRevenue)}</div>
            </div>
          </div>

          {transactionsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary-500)' }}>
              Memuat riwayat transaksi kas...
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary-500)' }}>
              Belum ada transaksi pembayaran lunas.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--secondary-500)', fontWeight: 700 }}>
                    <th style={{ padding: '0.75rem 1rem' }}>No. Transaksi</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Nama Pelanggan</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Item Terbayar</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Nominal Transaksi</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status Order</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Waktu Pembayaran</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((trx) => (
                    <tr key={trx.orderId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#4338ca' }}>
                        TRX-#{trx.shortId}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--secondary-900)' }}>{trx.customerName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--secondary-500)' }}>{trx.customerEmail}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--secondary-700)' }}>
                        {trx.itemCount} unit obat
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#059669' }}>
                        {formatCurrency(trx.totalAmount)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                          {trx.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--secondary-500)', fontSize: '0.75rem' }}>
                        {formatDate(trx.paidAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: MEDICINE ADD / EDIT FORM                                      */}
      {/* ==================================================================== */}
      {isMedModalOpen && (
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
          onClick={() => setIsMedModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
              padding: '2rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--secondary-900)' }}>
                {medFormMode === 'create' ? 'Tambah Obat Baru ke Apotek' : 'Perbarui Sediaan Obat'}
              </h3>
              <button
                onClick={() => setIsMedModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-400)' }}
              >
                <XCircle size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-700)', marginBottom: '0.35rem' }}>
                  Nama Sediaan Obat *
                </label>
                <input
                  type="text"
                  required
                  value={medFormData.name}
                  onChange={(e) => setMedFormData({ ...medFormData, name: e.target.value })}
                  placeholder="Contoh: Amoxicillin 500mg"
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

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-700)', marginBottom: '0.35rem' }}>
                  Kategori Obat *
                </label>
                <select
                  required
                  value={medFormData.categoryId}
                  onChange={(e) => setMedFormData({ ...medFormData, categoryId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--secondary-300)',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-700)', marginBottom: '0.35rem' }}>
                    Harga Satuan (Rp) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={medFormData.price}
                    onChange={(e) => setMedFormData({ ...medFormData, price: Number(e.target.value) })}
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-700)', marginBottom: '0.35rem' }}>
                    Stok Tersedia *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={medFormData.stock}
                    onChange={(e) => setMedFormData({ ...medFormData, stock: Number(e.target.value) })}
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
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-700)', marginBottom: '0.35rem' }}>
                  Satuan Kemasan (e.g. Strip, Botol, Box, Tube) *
                </label>
                <input
                  type="text"
                  required
                  value={medFormData.unit}
                  onChange={(e) => setMedFormData({ ...medFormData, unit: e.target.value })}
                  placeholder="Contoh: Strip / Botol / Box"
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

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-700)', marginBottom: '0.35rem' }}>
                  Deskripsi & Komposisi
                </label>
                <textarea
                  rows={2}
                  value={medFormData.description}
                  onChange={(e) => setMedFormData({ ...medFormData, description: e.target.value })}
                  placeholder="Keterangan dosis, indikasi, atau aturan pakai..."
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--secondary-300)',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '0.5rem 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#be123c', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={medFormData.requiresPrescription}
                    onChange={(e) => setMedFormData({ ...medFormData, requiresPrescription: e.target.checked })}
                  />
                  Memerlukan Resep Dokter (Obat Keras)
                </label>

                {medFormMode === 'edit' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#15803d', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={medFormData.isActive}
                      onChange={(e) => setMedFormData({ ...medFormData, isActive: e.target.checked })}
                    />
                    Status Aktif di Katalog
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <Button variant="secondary" type="button" onClick={() => setIsMedModalOpen(false)}>
                  Batal
                </Button>
                <Button variant="primary" type="submit">
                  {medFormMode === 'create' ? 'Simpan Obat Baru' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: CATEGORY ADD / EDIT FORM                                      */}
      {/* ==================================================================== */}
      {isCatModalOpen && (
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
          onClick={() => setIsCatModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '480px',
              width: '100%',
              boxShadow: 'var(--shadow-xl)',
              padding: '2rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--secondary-900)' }}>
                {catFormMode === 'create' ? 'Tambah Kategori Obat Baru' : 'Edit Kategori Obat'}
              </h3>
              <button
                onClick={() => setIsCatModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-400)' }}
              >
                <XCircle size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-700)', marginBottom: '0.35rem' }}>
                  Nama Kategori *
                </label>
                <input
                  type="text"
                  required
                  value={catFormData.name}
                  onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                  placeholder="Contoh: Antibiotik & Anti-infeksi"
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

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-700)', marginBottom: '0.35rem' }}>
                  Deskripsi Kategori
                </label>
                <textarea
                  rows={2}
                  value={catFormData.description}
                  onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
                  placeholder="Deskripsi singkat golongan atau peruntukan sediaan..."
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--secondary-300)',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <Button variant="secondary" type="button" onClick={() => setIsCatModalOpen(false)}>
                  Batal
                </Button>
                <Button variant="primary" type="submit">
                  {catFormMode === 'create' ? 'Buat Kategori' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
