import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { AlertTriangle, AlertCircle, HelpCircle, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  requireInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputRequired?: boolean;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  variant = 'primary',
  requireInput = false,
  inputLabel = 'Alasan / Catatan',
  inputPlaceholder = 'Ketik alasan di sini...',
  inputRequired = true,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setInputError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireInput && inputRequired && !inputValue.trim()) {
      setInputError('Kolom ini wajib diisi sebelum melanjutkan.');
      return;
    }
    onConfirm(inputValue.trim());
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertCircle size={28} color="#dc2626" />,
          iconBg: '#fef2f2',
          btnVariant: 'primary' as const,
          btnStyle: { background: '#dc2626', borderColor: '#dc2626' },
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={28} color="#d97706" />,
          iconBg: '#fffbeb',
          btnVariant: 'primary' as const,
          btnStyle: { background: '#d97706', borderColor: '#d97706' },
        };
      case 'primary':
      default:
        return {
          icon: <HelpCircle size={28} color="#0284c7" />,
          iconBg: '#f0f9ff',
          btnVariant: 'primary' as const,
          btnStyle: {},
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-light)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-light)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: vStyles.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {vStyles.icon}
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--secondary-900)' }}>
              {title}
            </h3>
          </div>

          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--secondary-400)',
              cursor: 'pointer',
              padding: '0.35rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--secondary-600)', lineHeight: 1.5 }}>
            {message}
          </p>

          {requireInput && (
            <div style={{ marginTop: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--secondary-700)',
                  marginBottom: '0.4rem',
                }}
              >
                {inputLabel} {inputRequired && <span style={{ color: '#dc2626' }}>*</span>}
              </label>
              <textarea
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (inputError) setInputError(null);
                }}
                placeholder={inputPlaceholder}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: inputError ? '1px solid #dc2626' : '1px solid var(--secondary-300)',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              {inputError && (
                <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                  {inputError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: 'var(--secondary-50)',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>

          <Button
            variant={vStyles.btnVariant}
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading}
            style={vStyles.btnStyle}
          >
            {isLoading ? 'Memproses...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
