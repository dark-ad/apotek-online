import React, { useState } from 'react';
import { Medicine } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { 
  ShoppingCart, 
  Star, 
  FileText, 
  Info, 
  Check, 
  AlertTriangle,
  Pill
} from 'lucide-react';

interface FeaturedProductsProps {
  medicines: Medicine[];
  searchQuery: string;
  selectedCategory: string | null;
  onAddToCart: (medicine: Medicine) => void;
}

export const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  medicines,
  searchQuery,
  selectedCategory,
  onAddToCart,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'bebas' | 'terbatas' | 'keras' | 'suplemen'>('all');
  const [selectedMedicineForDetail, setSelectedMedicineForDetail] = useState<Medicine | null>(null);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const handleAdd = (medicine: Medicine) => {
    onAddToCart(medicine);
    setAddedItemIds((prev) => ({ ...prev, [medicine.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [medicine.id]: false }));
    }, 1500);
  };

  // Filter medicines based on search query, selected category, and active tab
  const filteredMedicines = medicines.filter((med) => {
    // Search query filter
    const matchesSearch =
      searchQuery.trim() === '' ||
      med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (med.genericName && med.genericName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      med.indication.toLowerCase().includes(searchQuery.toLowerCase());

    // Category grid filter
    const matchesCategory =
      !selectedCategory || med.category === selectedCategory;

    // Tab filter
    let matchesTab = true;
    if (activeTab === 'bebas') {
      matchesTab = med.golongan.includes('Bebas') && !med.golongan.includes('Terbatas');
    } else if (activeTab === 'terbatas') {
      matchesTab = med.golongan.includes('Bebas Terbatas');
    } else if (activeTab === 'keras') {
      matchesTab = med.golongan.includes('Keras') || med.requiresPrescription;
    } else if (activeTab === 'suplemen') {
      matchesTab = med.golongan.includes('Suplemen') || med.golongan.includes('Alkes');
    }

    return matchesSearch && matchesCategory && matchesTab;
  });

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <section id="katalog" className="section">
      <div className="container">
        {/* Section Header */}
        <div className="section-header">
          <span className="section-tag">Katalog Obat Resmi</span>
          <h2 className="section-title">Daftar Obat & Suplemen Pilihan</h2>
          <p className="section-desc">
            Seluruh obat terjamin 100% original, tersimpan sesuai standar CPFB (Cara Pembuatan Farmasi yang Baik), dan disertai informasi indikasi serta dosis yang jelas.
          </p>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[
            { id: 'all', label: 'Semua Produk' },
            { id: 'bebas', label: 'Obat Bebas (Hijau)' },
            { id: 'terbatas', label: 'Bebas Terbatas (Biru)' },
            { id: 'keras', label: 'Obat Resep (Merah K)' },
            { id: 'suplemen', label: 'Vitamin & Alkes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {filteredMedicines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)' }}>
            <Pill size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Obat tidak ditemukan</h3>
            <p style={{ color: 'var(--secondary-500)', maxWidth: '400px', margin: '0 auto' }}>
              Tidak ada produk yang cocok dengan pencarian "{searchQuery}". Coba kata kunci lain atau gunakan konsultasi AI.
            </p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredMedicines.map((med) => {
              const isAdded = !!addedItemIds[med.id];

              return (
                <div key={med.id} className="product-card">
                  {/* Image Container with Badges */}
                  <div className="product-image-container">
                    <img src={med.image} alt={med.name} className="product-image" loading="lazy" />
                    
                    {med.badge && (
                      <div className="product-badge-float">
                        <span className="badge" style={{ background: 'rgba(15, 23, 42, 0.85)', color: '#ffffff' }}>
                          {med.badge}
                        </span>
                      </div>
                    )}

                    {med.requiresPrescription && (
                      <div className="product-rx-badge">
                        <span className="badge badge-keras">
                          <FileText size={12} />
                          Wajib Resep
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content Area */}
                  <div className="product-content">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <Badge golongan={med.golongan}>
                        {med.golongan}
                      </Badge>
                      <div className="product-rating">
                        <Star size={14} fill="#d97706" color="#d97706" />
                        <span>{med.rating}</span>
                        <span style={{ color: 'var(--secondary-400)', fontSize: '0.75rem' }}>({med.reviewCount})</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="product-title" title={med.name}>
                        {med.name}
                      </h3>
                      {med.genericName && (
                        <p className="product-generic">{med.genericName}</p>
                      )}
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--secondary-600)', lineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.55rem' }}>
                      {med.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        onClick={() => setSelectedMedicineForDetail(med)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent-600)',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '0'
                        }}
                      >
                        <Info size={14} />
                        Lihat Dosis & Indikasi
                      </button>
                      <span style={{ fontSize: '0.78rem', color: med.stock > 20 ? 'var(--primary-700)' : '#d97706', fontWeight: 600 }}>
                        Stok: {med.stock} {med.unit.split(' ')[0]}
                      </span>
                    </div>

                    {/* Footer / Price & Add */}
                    <div className="product-footer">
                      <div className="product-price-box">
                        <span className="product-price">{formatIDR(med.price)}</span>
                        {med.originalPrice && (
                          <span className="product-original-price">{formatIDR(med.originalPrice)}</span>
                        )}
                        <span className="product-unit">per {med.unit}</span>
                      </div>

                      <Button
                        variant={isAdded ? 'secondary' : 'primary'}
                        size="sm"
                        icon={isAdded ? <Check size={16} color="#059669" /> : <ShoppingCart size={16} />}
                        onClick={() => handleAdd(med)}
                      >
                        {isAdded ? 'Ditambahkan' : 'Tambah'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Medicine Detail Modal */}
        <Modal
          isOpen={!!selectedMedicineForDetail}
          onClose={() => setSelectedMedicineForDetail(null)}
          title={selectedMedicineForDetail?.name || 'Detail Obat'}
        >
          {selectedMedicineForDetail && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '80px', background: 'var(--secondary-100)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img src={selectedMedicineForDetail.image} alt={selectedMedicineForDetail.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedMedicineForDetail.name}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--secondary-500)' }}>{selectedMedicineForDetail.genericName}</p>
                  <div style={{ marginTop: '0.4rem' }}>
                    <Badge golongan={selectedMedicineForDetail.golongan}>
                      {selectedMedicineForDetail.golongan}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedMedicineForDetail.requiresPrescription && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '0.85rem', display: 'flex', gap: '0.75rem', alignItems: 'center', color: '#991b1b', fontSize: '0.85rem' }}>
                  <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Obat Keras (Resep Dokter):</strong> Pembelian obat ini memerlukan resep dokter yang sah dan akan diverifikasi oleh Apoteker kami sebelum diserahkan.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
                <div>
                  <strong style={{ color: 'var(--secondary-800)', display: 'block', marginBottom: '0.2rem' }}>Indikasi Medis:</strong>
                  <p>{selectedMedicineForDetail.indication}</p>
                </div>
                <div>
                  <strong style={{ color: 'var(--secondary-800)', display: 'block', marginBottom: '0.2rem' }}>Petunjuk Dosis & Pemakaian:</strong>
                  <p>{selectedMedicineForDetail.dosage}</p>
                </div>
                {selectedMedicineForDetail.sideEffects && (
                  <div>
                    <strong style={{ color: 'var(--secondary-800)', display: 'block', marginBottom: '0.2rem' }}>Perhatian & Efek Samping:</strong>
                    <p style={{ color: 'var(--secondary-600)' }}>{selectedMedicineForDetail.sideEffects}</p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <div>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                    {formatIDR(selectedMedicineForDetail.price)}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--secondary-500)', display: 'block' }}>/{selectedMedicineForDetail.unit}</span>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  icon={<ShoppingCart size={16} />}
                  onClick={() => {
                    handleAdd(selectedMedicineForDetail);
                    setSelectedMedicineForDetail(null);
                  }}
                >
                  Tambahkan ke Keranjang
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </section>
  );
};
