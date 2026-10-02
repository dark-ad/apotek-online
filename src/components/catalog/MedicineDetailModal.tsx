import React, { useState } from 'react';
import { DbMedicine } from '../../services/medicineService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { 
  FileText, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Package, 
  Layers, 
  AlertTriangle, 
  Info,
  ShieldCheck
} from 'lucide-react';

interface MedicineDetailModalProps {
  medicine: DbMedicine | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (medicine: DbMedicine, quantity: number) => void;
  currentCartQty?: number;
}

export const MedicineDetailModal: React.FC<MedicineDetailModalProps> = ({
  medicine,
  isOpen,
  onClose,
  onAddToCart,
  currentCartQty = 0,
}) => {
  if (!medicine) return null;

  const isOutOfStock = medicine.stock <= 0;
  const remainingPurchasable = Math.max(0, medicine.stock - currentCartQty);

  const [quantity, setQuantity] = useState<number>(isOutOfStock ? 0 : 1);

  const handleIncrement = () => {
    if (quantity < remainingPurchasable) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleAddToCartClick = () => {
    if (quantity > 0 && quantity <= remainingPurchasable) {
      onAddToCart(medicine, quantity);
      onClose();
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const defaultImage = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Informasi Rinci Produk Obat"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Top Product Hero: Image + Quick Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Product Image */}
          <div
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              background: 'var(--secondary-50)',
              border: '1px solid var(--border-light)',
              aspectRatio: '1/1',
            }}
          >
            <img
              src={medicine.image || defaultImage}
              alt={medicine.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: isOutOfStock ? 'grayscale(40%)' : 'none',
              }}
            />

            {medicine.requiresPrescription && (
              <div
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  left: '0.5rem',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.55rem',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                <FileText size={12} />
                <span>Memerlukan Resep</span>
              </div>
            )}
          </div>

          {/* Details Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--primary-700)',
                  background: 'var(--primary-50)',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  display: 'inline-block',
                  marginBottom: '0.35rem',
                }}
              >
                {medicine.category?.name || 'Katalog Apotek'}
              </span>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: 'var(--secondary-900)',
                  lineHeight: 1.3,
                }}
              >
                {medicine.name}
              </h2>
            </div>

            {/* Price */}
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary-700)' }}>
              {formatIDR(medicine.price)}
              <span style={{ fontSize: '0.8rem', color: 'var(--secondary-500)', fontWeight: 500, marginLeft: '0.35rem' }}>
                / {medicine.unit}
              </span>
            </div>

            {/* Stock & Unit Specs */}
            <div
              style={{
                background: 'var(--secondary-50)',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.825rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--secondary-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Package size={14} /> Satuan Sediaan:
                </span>
                <strong>{medicine.unit}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--secondary-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Layers size={14} /> Status Ketersediaan:
                </span>
                {isOutOfStock ? (
                  <span style={{ color: '#ef4444', fontWeight: 800, background: '#fee2e2', padding: '1px 6px', borderRadius: '4px' }}>
                    Stok Habis
                  </span>
                ) : (
                  <span style={{ color: '#059669', fontWeight: 700 }}>
                    Tersedia ({medicine.stock} {medicine.unit.split(' ')[0]})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Prescription Guidance Banner if applicable */}
        {medicine.requiresPrescription && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'flex-start',
              fontSize: '0.825rem',
              color: '#991b1b',
            }}
          >
            <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Ketentuan Pembelian Obat Keras:</strong>
              <div style={{ marginTop: '2px', lineHeight: 1.45 }}>
                Obat ini wajib menggunakan resep dokter yang valid. Anda dapat mengunggah lembar foto resep saat proses pemesanan untuk diverifikasi oleh Apoteker.
              </div>
            </div>
          </div>
        )}

        {/* Medicine Official Database Description */}
        <div>
          <h4
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--secondary-900)',
              marginBottom: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Info size={15} color="var(--primary-600)" />
            Deskripsi Resmi Sediaan Farmasi:
          </h4>
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--secondary-700)',
              lineHeight: 1.6,
              background: 'var(--secondary-50)',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
            }}
          >
            {medicine.description || 'Tidak ada deskripsi tambahan dari pabrikan farmasi.'}
          </div>
        </div>

        {/* Notice of factual database source */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--secondary-500)' }}>
          <ShieldCheck size={14} color="#059669" />
          <span>Informasi obat bersumber langsung dari database farmasi resmi apotek tanpa klaim medis di luar database.</span>
        </div>

        {/* Quantity Selector & Add to Cart Footer */}
        <div
          style={{
            borderTop: '1px solid var(--border-light)',
            paddingTop: '1rem',
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Quantity Controls */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--secondary-500)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
              Kuantitas Pembelian (Maks. {medicine.stock})
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleDecrement}
                disabled={isOutOfStock || quantity <= 1}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  background: '#ffffff',
                  cursor: isOutOfStock || quantity <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isOutOfStock || quantity <= 1 ? 0.5 : 1,
                }}
              >
                <Minus size={14} />
              </button>

              <span
                style={{
                  minWidth: '36px',
                  textAlign: 'center',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: isOutOfStock ? 'var(--secondary-400)' : 'var(--secondary-900)',
                }}
              >
                {quantity}
              </span>

              <button
                type="button"
                onClick={handleIncrement}
                disabled={isOutOfStock || quantity >= remainingPurchasable}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  background: '#ffffff',
                  cursor: isOutOfStock || quantity >= remainingPurchasable ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isOutOfStock || quantity >= remainingPurchasable ? 0.5 : 1,
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <Button variant="secondary" size="md" onClick={onClose}>
              Tutup
            </Button>

            <Button
              variant="primary"
              size="md"
              icon={<ShoppingCart size={16} />}
              disabled={isOutOfStock || remainingPurchasable === 0 || quantity === 0}
              onClick={handleAddToCartClick}
              style={{
                backgroundColor: isOutOfStock ? 'var(--secondary-300)' : undefined,
                borderColor: isOutOfStock ? 'transparent' : undefined,
              }}
            >
              {isOutOfStock
                ? 'Stok Habis'
                : remainingPurchasable === 0
                ? 'Maksimal di Keranjang'
                : `Beli ${quantity} ${medicine.unit.split(' ')[0]} (${formatIDR(medicine.price * quantity)})`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
