import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

export interface AppNotification {
  id: string;
  type: 'order_status' | 'order_approved' | 'order_rejected' | 'prescription_status' | 'low_stock' | 'new_order' | 'info';
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  orderId?: string;
  actionView?: string;
  actionData?: any;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => void;
  refreshNotifications: () => Promise<void>;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const isFetchingRef = useRef(false);

  const getHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem('apotek_auth_token') || localStorage.getItem('apotek_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const headers = getHeaders();
      const res = await fetch('/api/notifications', { headers });

      if (res.ok) {
        const json = await res.json();
        const dbNotifs = json.data?.notifications || [];

        const mapped: AppNotification[] = dbNotifs.map((n: any) => {
          let severity: AppNotification['severity'] = 'info';
          if (n.type === 'order_approved') severity = 'success';
          else if (n.type === 'order_rejected') severity = 'error';
          else if (n.type === 'low_stock') severity = 'warning';
          else if (n.type === 'new_order') severity = 'info';
          else if (n.orderStatus === 'COMPLETED' || n.orderStatus === 'READY_FOR_PICKUP') severity = 'success';
          else if (n.orderStatus === 'CANCELLED') severity = 'error';

          let actionView = 'my-orders';
          let actionData: any = undefined;

          if (user.role === 'CUSTOMER') {
            if (n.orderId) {
              actionView = 'order-detail';
              actionData = { orderId: n.orderId };
            } else {
              actionView = 'my-orders';
            }
          } else if (user.role === 'STAFF') {
            actionView = 'staff-dashboard';
          } else if (user.role === 'ADMIN') {
            actionView = 'admin-dashboard';
          }

          return {
            id: n.id,
            type: n.type || 'order_status',
            title: n.title,
            message: n.message,
            severity,
            timestamp: new Date(n.createdAt),
            read: Boolean(n.isRead),
            orderId: n.orderId || undefined,
            actionView,
            actionData,
          };
        });

        // For Admin & Staff: additionally fetch real-time low-stock alerts if medicines are out of stock
        if (user.role === 'ADMIN' || user.role === 'STAFF') {
          try {
            const medsRes = await fetch('/api/medicines', { headers });
            if (medsRes.ok) {
              const medsJson = await medsRes.json();
              const medicines = medsJson.data?.medicines || [];
              const outOfStock = medicines.filter((m: any) => m.stock === 0 && m.isActive);

              if (outOfStock.length > 0) {
                const oosId = `sys-oos-alert-${outOfStock.length}`;
                // Only prepend if not already in list
                if (!mapped.some((item) => item.id === oosId)) {
                  mapped.unshift({
                    id: oosId,
                    type: 'low_stock',
                    title: `Peringatan: ${outOfStock.length} Obat Stok Habis`,
                    message: `Obat: ${outOfStock.map((m: any) => m.name).slice(0, 3).join(', ')}${outOfStock.length > 3 ? '...' : ''}. Segera lakukan restock.`,
                    severity: 'error',
                    timestamp: new Date(),
                    read: false,
                    actionView: user.role === 'ADMIN' ? 'admin-dashboard' : 'staff-dashboard',
                  });
                }
              }
            }
          } catch {
            // ignore non-critical inventory check
          }
        }

        setNotifications(mapped);
      }
    } catch (err) {
      console.warn('[Notifications] Failed to fetch:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [isAuthenticated, user, getHeaders]);

  // Initial fetch and automatic background polling every 8 seconds
  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 8000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      // Optimistic local update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );

      // If it's a persistent DB notification (not a virtual sys-* one)
      if (!id.startsWith('sys-')) {
        try {
          const headers = getHeaders();
          await fetch(`/api/notifications/${id}/read`, {
            method: 'PUT',
            headers,
          });
        } catch (err) {
          console.warn('[Notifications] Failed to mark as read on server:', err);
        }
      }
    },
    [getHeaders]
  );

  const markAllAsRead = useCallback(async () => {
    // Optimistic local update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      const headers = getHeaders();
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers,
      });
    } catch (err) {
      console.warn('[Notifications] Failed to mark all as read on server:', err);
    }
  }, [getHeaders]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const addNotification = useCallback(
    (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
      const id = `custom-notif-${Date.now()}`;
      setNotifications((prev) => [
        { ...notif, id, timestamp: new Date(), read: false },
        ...prev,
      ]);
    },
    []
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        refreshNotifications,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
