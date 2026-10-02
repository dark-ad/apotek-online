import React from 'react';
import { MedicineGolongan } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'bebas' | 'terbatas' | 'keras' | 'suplemen' | 'alkes' | 'role' | 'default';
  golongan?: MedicineGolongan;
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  golongan,
  className = '',
  icon
}) => {
  // Compute variant from golongan if provided
  let computedVariant = variant || 'default';
  if (golongan) {
    if (golongan.includes('Bebas Terbatas')) {
      computedVariant = 'terbatas';
    } else if (golongan.includes('Bebas')) {
      computedVariant = 'bebas';
    } else if (golongan.includes('Keras') || golongan.includes('Resep')) {
      computedVariant = 'keras';
    } else if (golongan.includes('Suplemen')) {
      computedVariant = 'suplemen';
    } else if (golongan.includes('Alkes')) {
      computedVariant = 'alkes';
    }
  }

  const badgeClass = `badge badge-${computedVariant} ${className}`.trim();

  return (
    <span className={badgeClass}>
      {icon && <span className="badge-icon">{icon}</span>}
      {children}
    </span>
  );
};
