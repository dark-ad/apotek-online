import React, { useState, useRef, useEffect } from 'react';
import { useNotifications, AppNotification } from '../../context/NotificationContext';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CheckCheck,
  ChevronRight,
  Package,
  FileText,
  Boxes,
} from 'lucide-react';

interface NotificationDropdownProps {
  onNavigate: (view: any, data?: any) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onNavigate }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.actionView) {
      onNavigate(notif.actionView, notif.actionData);
      setIsOpen(false);
    }
  };

  const getSeverityIcon = (notif: AppNotification) => {
    switch (notif.severity) {
      case 'success':
        return <CheckCircle2 size={16} color="#059669" />;
      case 'error':
        return <AlertCircle size={16} color="#dc2626" />;
      case 'warning':
        return <AlertTriangle size={16} color="#d97706" />;
      default:
        if (notif.type === 'prescription_status') return <FileText size={16} color="#2563eb" />;
        if (notif.type === 'low_stock') return <Boxes size={16} color="#d97706" />;
        return <Package size={16} color="#2563eb" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'success':
        return '#ecfdf5';
      case 'error':
        return '#fef2f2';
      case 'warning':
        return '#fffbeb';
      default:
        return '#eff6ff';
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    if (diffSec < 60) return 'Baru saja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="btn btn-secondary btn-icon-only"
        title="Notifikasi"
        aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
        aria-expanded={isOpen}
        style={{
          position: 'relative',
          background: isOpen ? 'var(--secondary-100)' : undefined,
        }}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 800,
              minWidth: '18px',
              height: '18px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid #ffffff',
              boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
              animation: 'pulse 2s infinite',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Daftar Notifikasi"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            width: '380px',
            maxWidth: 'calc(100vw - 2rem)',
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-light)',
            boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.15), 0 10px 15px -5px rgba(0, 0, 0, 0.08)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-light)',
              background: 'var(--secondary-50)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--secondary-900)' }}>
                Notifikasi
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '999px',
                  }}
                >
                  {unreadCount} baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary-600)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 6px',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                <CheckCheck size={14} />
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  color: 'var(--secondary-400)',
                }}
              >
                <Bell size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.3 }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--secondary-600)', marginBottom: '4px' }}>
                  Belum Ada Notifikasi
                </div>
                <div style={{ fontSize: '0.8rem' }}>
                  Pemberitahuan perubahan status pesanan atau informasi apotek akan tampil di sini.
                </div>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.875rem 1.25rem',
                    borderBottom: '1px solid var(--border-light)',
                    background: notif.read ? '#ffffff' : 'rgba(16, 185, 129, 0.04)',
                    cursor: notif.actionView ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--secondary-50)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = notif.read
                      ? '#ffffff'
                      : 'rgba(16, 185, 129, 0.04)';
                  }}
                >
                  {/* Icon Indicator */}
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: getSeverityBg(notif.severity),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {getSeverityIcon(notif)}
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        marginBottom: '2px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: notif.read ? 600 : 700,
                          color: 'var(--secondary-900)',
                        }}
                      >
                        {notif.title}
                      </div>
                      {!notif.read && (
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: 'var(--primary-600)',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--secondary-600)',
                        lineHeight: 1.35,
                        marginBottom: '4px',
                      }}
                    >
                      {notif.message}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--secondary-400)' }}>
                      {formatRelativeTime(notif.timestamp)}
                    </div>
                  </div>

                  {notif.actionView && (
                    <ChevronRight
                      size={16}
                      color="var(--secondary-400)"
                      style={{ flexShrink: 0, marginTop: '8px' }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
