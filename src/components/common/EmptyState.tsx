import React from 'react';
import { Button } from './Button';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionVariant?: 'primary' | 'secondary' | 'ghost';
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionVariant = 'primary',
  secondaryActionText,
  onSecondaryAction,
  compact = false,
}) => {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: compact ? '2rem 1rem' : '3.5rem 1.5rem',
        background: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        border: '1px dashed var(--border-light)',
        margin: '1rem 0',
      }}
    >
      {/* Icon Circle */}
      <div
        style={{
          width: compact ? '48px' : '64px',
          height: compact ? '48px' : '64px',
          borderRadius: '50%',
          background: 'var(--primary-50)',
          color: 'var(--primary-600)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          border: '1px solid var(--primary-100)',
        }}
      >
        {icon || <Inbox size={compact ? 24 : 32} />}
      </div>

      <h3
        style={{
          fontSize: compact ? '1rem' : '1.25rem',
          fontWeight: 700,
          color: 'var(--secondary-900)',
          margin: '0 0 0.5rem 0',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: compact ? '0.85rem' : '0.95rem',
          color: 'var(--secondary-600)',
          maxWidth: '440px',
          margin: '0 0 1.5rem 0',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      {/* Actions */}
      {(actionText || secondaryActionText) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {actionText && onAction && (
            <Button variant={actionVariant} size={compact ? 'sm' : 'md'} onClick={onAction}>
              {actionText}
            </Button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <Button variant="secondary" size={compact ? 'sm' : 'md'} onClick={onSecondaryAction}>
              {secondaryActionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
