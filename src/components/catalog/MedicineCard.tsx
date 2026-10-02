import React from 'react';
import { DbMedicine } from '../../services/medicineService';
import { Button } from '../common/Button';
import { 
  FileText, 
  ShoppingCart, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  PackageX
} from 'lucide-react';

interface MedicineCardProps {
  medicine: DbMedicine;
  onViewDetail: (medicine: DbMedicine) => void;
  onAddToCart: (medicine: DbMedicine) => void;
  currentCartQty?: number;
}

export const MedicineCard: React.FC<MedicineCardProps> = ({
  medicine,
  onViewDetail,
  onAddToCart,
  currentCartQty = 0,
}) => {
  const isOutOfStock = medicine.stock <= 0;
  const isMaxInCart = currentCartQty >= medicine.stock;

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const defaultImage = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80';

  return (
    <div
      className="medicine-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        opacity: isOutOfStock ? 0.88 : 1,
      }}
    >
      {/* Product Image & Badges */}
      <div style={{ position: 'relative', height: '180px', background: 'var(--secondary-50)', overflow: 'hidden' }}>
        <img
          src={medicine.image || defaultImage}
          alt={medicine.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s ease',
            filter: isOutOfStock ? 'grayscale(40%)' : 'none',
          }}
          loading="lazy"
        />

        {/* Prescription Requirement Badge */}
        {medicine.requiresPrescription && (
          <div
            style={{
              position: 'absolute',
              top: '0.65rem',
              left: '0.65rem',
              background: 'rgba(220, 38, 38, 0.92)',
              backdropFilter: 'blur(4px)',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.25rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            <FileText size={11} />
            <span>Memerlukan Resep</span>
          </div>
        )}

        {/* Out of Stock Overlay Ribbon */}
        {isOutOfStock && (
          <div
            style={{
              position: 'absolute',
              top: '0.65rem',
              right: '0.65rem',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <PackageX size={12} />
            <span>Stok Habis</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Category & Unit */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.75rem' }}>
          <span
            style={{
              color: 'var(--primary-700)',
              fontWeight: 600,
              background: 'var(--primary-50)',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
            }}
          >
            {medicine.category?.name || 'Katalog Apotek'}
          </span>
          <span style={{ color: 'var(--secondary-500)' }}>
            {medicine.unit}
          </span>
        </div>

        {/* Medicine Name */}
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--secondary-900)',
            marginBottom: '0.35rem',
            lineHeight: 1.35,
            minHeight: '2.7rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          title={medicine.name}
        >
          {medicine.name}
        </h3>

        {/* Short Description */}
        <p
          style={{
            fontSize: '0.8rem',
            color: 'var(--secondary-600)',
            lineHeight: 1.45,
            marginBottom: '0.85rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.3rem',
          }}
        >
          {medicine.description || 'Sediaan farmasi resmi terdaftar BPOM.'}
        </p>

        {/* Price & Stock Indicator */}
        <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-700)' }}>
              {formatIDR(medicine.price)}
            </div>

            {/* Stock status indicator */}
            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              {isOutOfStock ? (
                <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <AlertCircle size={12} /> Stok Habis
                </span>
              ) : medicine.stock <= 10 ? (
                <span style={{ color: '#d97706' }}>
                  Sisa {medicine.stock} {medicine.unit.split(' ')[0]}
                </span>
              ) : (
                <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <CheckCircle2 size={12} /> Stok: {medicine.stock}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Eye size={14} />}
              onClick={() => onViewDetail(medicine)}
              style={{ fontSize: '0.8rem', padding: '0.45rem' }}
            >
              Detail
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={<ShoppingCart size={14} />}
              disabled={isOutOfStock || isMaxInCart}
              onClick={() => onAddToCart(medicine)}
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem',
                backgroundColor: isOutOfStock ? 'var(--secondary-300)' : isMaxInCart ? 'var(--secondary-400)' : undefined,
                borderColor: isOutOfStock || isMaxInCart ? 'transparent' : undefined,
              }}
              title={
                isOutOfStock
                  ? 'Stok habis, tidak dapat dipesan'
                  : isMaxInCart
                  ? `Maksimal pembelian ${medicine.stock} unit sesuai stok`
                  : 'Tambah ke Keranjang Belanja'
              }
            >
              {isOutOfStock ? 'Habis' : isMaxInCart ? 'Maksimal' : '+ Keranjang'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
