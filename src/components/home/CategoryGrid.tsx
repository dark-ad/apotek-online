import React from 'react';
import { CATEGORIES_DATA } from '../../data/mockData';
import { 
  Pill, 
  AlertCircle, 
  FileText, 
  Sparkles, 
  Activity, 
  HeartHandshake 
} from 'lucide-react';

interface CategoryGridProps {
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Pill':
        return <Pill size={26} color="#059669" />;
      case 'AlertCircle':
        return <AlertCircle size={26} color="#0284c7" />;
      case 'FileText':
        return <FileText size={26} color="#dc2626" />;
      case 'Sparkles':
        return <Sparkles size={26} color="#d97706" />;
      case 'Activity':
        return <Activity size={26} color="#7c3aed" />;
      case 'HeartHandshake':
        return <HeartHandshake size={26} color="#db2777" />;
      default:
        return <Pill size={26} color="#059669" />;
    }
  };

  return (
    <section className="section-sm" style={{ background: '#ffffff', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <span className="section-tag">Kategori Farmasi</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Kategori Obat & Kesehatan</h2>
          </div>
          {selectedCategory && (
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => onSelectCategory(null)}
              style={{ color: 'var(--primary-700)', fontWeight: 600 }}
            >
              Reset Filter Kategori (Tampilkan Semua)
            </button>
          )}
        </div>

        <div className="categories-grid">
          {CATEGORIES_DATA.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <div
                key={cat.id}
                className={`category-card ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  if (isSelected) {
                    onSelectCategory(null);
                  } else {
                    onSelectCategory(cat.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div 
                  className="category-icon-wrapper"
                  style={{
                    backgroundColor: `${cat.color}15`,
                  }}
                >
                  {getCategoryIcon(cat.iconName)}
                </div>
                <div>
                  <h3 className="category-name">{cat.name}</h3>
                  <span className="category-count">{cat.itemCount} Produk</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
