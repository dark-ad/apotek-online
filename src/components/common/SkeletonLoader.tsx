import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '0.375rem',
  style,
  className = '',
}) => {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%)',
        backgroundSize: '400% 100%',
        animation: 'skeletonShimmer 1.4s ease infinite',
        ...style,
      }}
    />
  );
};

export const MedicineCardSkeleton: React.FC = () => {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-light)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      <Skeleton height="150px" borderRadius="var(--radius-lg)" />
      <Skeleton width="40%" height="0.75rem" />
      <Skeleton width="85%" height="1.1rem" />
      <Skeleton width="60%" height="0.8rem" />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
        <Skeleton width="45%" height="1.25rem" />
        <Skeleton width="35%" height="1.25rem" />
      </div>
      <Skeleton height="2.25rem" borderRadius="var(--radius-md)" style={{ marginTop: '0.5rem' }} />
    </div>
  );
};

export const OrderCardSkeleton: React.FC = () => {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-light)',
        padding: '1.5rem',
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width="30%" height="1rem" />
        <Skeleton width="20%" height="1rem" />
      </div>
      <Skeleton width="70%" height="0.85rem" />
      <div style={{ display: 'flex', gap: '1rem', margin: '0.5rem 0' }}>
        <Skeleton width="50px" height="50px" borderRadius="0.5rem" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <Skeleton width="60%" height="0.9rem" />
          <Skeleton width="40%" height="0.75rem" />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
        <Skeleton width="25%" height="1.1rem" />
        <Skeleton width="20%" height="2rem" borderRadius="0.375rem" />
      </div>
    </div>
  );
};

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} style={{ padding: '1rem' }}>
          <Skeleton height="1rem" width={i === 0 ? '60%' : '80%'} />
        </td>
      ))}
    </tr>
  );
};
