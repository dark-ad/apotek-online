import React from 'react';
import { useToast, ToastType } from '../../context/ToastContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const toastConfig: Record<
  ToastType,
  {
    icon: React.ReactNode;
    bg: string;
    border: string;
    text: string;
    iconColor: string;
  }
> = {
  success: {
    icon: <CheckCircle2 size={18} />,
    bg: '#ffffff',
    border: '#10b981',
    text: '#065f46',
    iconColor: '#059669',
  },
  error: {
    icon: <AlertCircle size={18} />,
    bg: '#ffffff',
    border: '#ef4444',
    text: '#991b1b',
    iconColor: '#dc2626',
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    bg: '#ffffff',
    border: '#f59e0b',
    text: '#92400e',
    iconColor: '#d97706',
  },
  info: {
    icon: <Info size={18} />,
    bg: '#ffffff',
    border: '#3b82f6',
    text: '#1e40af',
    iconColor: '#2563eb',
  },
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifikasi Sistem"
      style={{
        position: 'fixed',
        top: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '420px',
        width: 'calc(100% - 3rem)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const conf = toastConfig[toast.type];
        return (
          <div
            key={toast.id}
            role="alert"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              borderRadius: '0.75rem',
              background: conf.bg,
              border: `1px solid ${conf.border}`,
              borderLeft: `5px solid ${conf.border}`,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              color: 'var(--secondary-900)',
            }}
          >
            <div style={{ color: conf.iconColor, flexShrink: 0, marginTop: '2px' }}>
              {conf.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: conf.text, marginBottom: '2px' }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: '0.85rem', color: 'var(--secondary-700)', lineHeight: 1.4 }}>
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Tutup notifikasi"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--secondary-400)',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--secondary-700)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--secondary-400)')}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
