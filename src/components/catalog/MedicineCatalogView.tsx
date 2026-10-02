import React, { useState, useEffect, useCallback } from 'react';
import { 
  DbMedicine, 
  DbCategory, 
  fetchMedicines, 
  fetchCategories, 
  PaginationMeta 
} from '../../services/medicineService';
import { MedicineCard } from './MedicineCard';
import { MedicineDetailModal } from './MedicineDetailModal';
import { Button } from '../common/Button';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  FileText, 
  AlertCircle, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Pill, 
  PackageX
} from 'lucide-react';

interface MedicineCatalogViewProps {
  onAddToCart: (medicine: DbMedicine, quantity?: number) => void;
  cartItems?: Array<{ medicineId: string; quantity: number }>;
}

export const MedicineCatalogView: React.FC<MedicineCatalogViewProps> = ({
  onAddToCart,
  cartItems = [],
}) => {
  // Data State
  const [medicines, setMedicines] = useState<DbMedicine[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 8,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPrescription, setSelectedPrescription] = useState<'all' | 'true' | 'false'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'stock_desc'>('name_asc');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Status States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedMedicine, setSelectedMedicine] = useState<DbMedicine | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // Debounce search query input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Categories on mount
  useEffect(() => {
    fetchCategories()
      .then((cats) => setCategories(cats))
      .catch((err) => console.error('Gagal mengambil kategori obat:', err));
  }, []);

  // Fetch Medicines whenever filters change
  const loadMedicines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMedicines({
        search: debouncedSearch,
        category: selectedCategory,
        prescription: selectedPrescription,
        sort: sortBy,
        page: currentPage,
        limit: 8,
      });
      setMedicines(data.medicines);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat katalog obat.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedPrescription, sortBy, currentPage]);

  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategory('all');
    setSelectedPrescription('all');
    setSortBy('name_asc');
    setCurrentPage(1);
  };

  const handleOpenDetail = (med: DbMedicine) => {
    setSelectedMedicine(med);
    setIsDetailOpen(true);
  };

  const getCartQuantityForMedicine = (medId: string) => {
    const item = cartItems.find((ci) => ci.medicineId === medId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 5rem 1.25rem' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--primary-700), #0284c7)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem 2rem',
          color: '#ffffff',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '680px', position: 'relative', zIndex: 1 }}>
          <span
            style={{
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(6px)',
              padding: '0.3rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '0.75rem',
            }}
          >
            <Pill size={14} /> Katalog Resmi Farmasi
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '0.5rem' }}>
            Daftar Obat & Produk Kesehatan
          </h1>
          <p style={{ fontSize: '0.95rem', opacity: 0.92, lineHeight: 1.6 }}>
            Temukan obat bebas, suplemen kesehatan, hingga obat dengan resep dokter bersertifikat resmi BPOM. Dilengkapi informasi ketersediaan stok real-time.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar Controls */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Row 1: Search Input + Sorting + Prescription filter */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Cari obat berdasarkan nama atau deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                fontSize: '0.9rem',
              }}
            />
            <Search
              size={16}
              color="#94a3b8"
              style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>

          {/* Prescription Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} color="var(--secondary-500)" />
            <select
              value={selectedPrescription}
              onChange={(e) => {
                setSelectedPrescription(e.target.value as any);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                fontSize: '0.85rem',
                background: '#ffffff',
              }}
            >
              <option value="all">Semua Jenis Obat</option>
              <option value="false">Obat Bebas (Tanpa Resep)</option>
              <option value="true">Obat Keras (Wajib Resep)</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowUpDown size={16} color="var(--secondary-500)" />
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                fontSize: '0.85rem',
                background: '#ffffff',
              }}
            >
              <option value="name_asc">Nama Obat (A - Z)</option>
              <option value="name_desc">Nama Obat (Z - A)</option>
              <option value="price_asc">Harga (Terendah)</option>
              <option value="price_desc">Harga (Tertinggi)</option>
              <option value="stock_desc">Stok Terbanyak</option>
            </select>
          </div>
        </div>

        {/* Row 2: Category Filter Pills */}
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={13} /> Kategori:
          </span>

          <button
            type="button"
            className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setSelectedCategory('all');
              setCurrentPage(1);
            }}
            style={{ borderRadius: 'var(--radius-full)', fontSize: '0.78rem', padding: '0.25rem 0.75rem' }}
          >
            Semua Kategori
          </button>

          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setCurrentPage(1);
                }}
                style={{ borderRadius: 'var(--radius-full)', fontSize: '0.78rem', padding: '0.25rem 0.75rem' }}
              >
                {cat.name} {cat.medicineCount !== undefined && `(${cat.medicineCount})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Content Area */}
      {/* 1. Error State */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            textAlign: 'center',
            color: '#991b1b',
            marginBottom: '2rem',
          }}
        >
          <AlertCircle size={40} style={{ margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Terjadi Kesalahan</h3>
          <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{error}</p>
          <Button
            variant="primary"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={loadMedicines}
            style={{ marginTop: '1rem' }}
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* 2. Loading State (Skeleton Grid) */}
      {loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2.5rem',
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              style={{
                background: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-light)',
                overflow: 'hidden',
                height: '350px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ height: '170px', background: 'var(--secondary-100)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <div style={{ height: '14px', width: '40%', background: 'var(--secondary-200)', borderRadius: '4px' }} />
                <div style={{ height: '18px', width: '85%', background: 'var(--secondary-200)', borderRadius: '4px' }} />
                <div style={{ height: '14px', width: '100%', background: 'var(--secondary-100)', borderRadius: '4px' }} />
                <div style={{ height: '24px', width: '50%', background: 'var(--secondary-200)', borderRadius: '4px', marginTop: 'auto' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Empty State */}
      {!loading && !error && medicines.length === 0 && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              background: 'var(--secondary-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              color: 'var(--secondary-500)',
            }}
          >
            <PackageX size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary-900)' }}>
            Obat Tidak Ditemukan
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--secondary-500)', maxWidth: '420px', margin: '0.4rem auto 1.5rem auto' }}>
            Tidak ada obat yang cocok dengan kata kunci <strong>"{debouncedSearch}"</strong> atau filter kategori yang dipilih.
          </p>
          <Button variant="secondary" size="md" onClick={handleResetFilters}>
            Reset Semua Filter Pencarian
          </Button>
        </div>
      )}

      {/* 4. Products Grid */}
      {!loading && !error && medicines.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--secondary-600)' }}>
            <span>
              Menampilkan <strong>{medicines.length}</strong> dari <strong>{pagination.total}</strong> produk obat
            </span>
            <span>
              Halaman {pagination.page} dari {pagination.totalPages}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2.5rem',
            }}
          >
            {medicines.map((med) => (
              <MedicineCard
                key={med.id}
                medicine={med}
                onViewDetail={handleOpenDetail}
                onAddToCart={(m) => onAddToCart(m, 1)}
                currentCartQty={getCartQuantityForMedicine(med.id)}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '1rem',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!pagination.hasPrev}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ opacity: pagination.hasPrev ? 1 : 0.4 }}
              >
                <ChevronLeft size={16} /> Sebelumnya
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`btn btn-sm ${pageNum === pagination.page ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    minWidth: '36px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: pageNum === pagination.page ? 800 : 500,
                  }}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!pagination.hasNext}
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                style={{ opacity: pagination.hasNext ? 1 : 0.4 }}
              >
                Selanjutnya <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Medicine Detail Modal */}
      <MedicineDetailModal
        medicine={selectedMedicine}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedMedicine(null);
        }}
        onAddToCart={onAddToCart}
        currentCartQty={selectedMedicine ? getCartQuantityForMedicine(selectedMedicine.id) : 0}
      />
    </div>
  );
};
