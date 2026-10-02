import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface AppNotification {
  id: string;
  type: 'order_status' | 'prescription_status' | 'low_stock' | 'new_order' | 'info';
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  actionView?: string;
  actionData?: any;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  refreshNotifications: () => Promise<void>;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const getStorageKey = useCallback(() => {
    return user ? `apotek_notifications_${user.id}` : 'apotek_notifications_guest';
  }, [user]);

  // Load read status from localStorage
  const loadReadIds = useCallback((): Set<string> => {
    try {
      const raw = localStorage.getItem(`${getStorageKey()}_read`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }, [getStorageKey]);

  const saveReadIds = useCallback((readIds: Set<string>) => {
    try {
      localStorage.setItem(`${getStorageKey()}_read`, JSON.stringify(Array.from(readIds)));
    } catch {
      // ignore
    }
  }, [getStorageKey]);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      return;
    }

    const token = localStorage.getItem('apotek_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const readIds = loadReadIds();
    const generated: AppNotification[] = [];

    try {
      if (user.role === 'CUSTOMER') {
        // Fetch customer's orders
        const res = await fetch('/api/orders', { headers });
        if (res.ok) {
          const json = await res.json();
          const orders = json.data?.orders || [];

          orders.forEach((order: any) => {
            const date = new Date(order.updatedAt || order.createdAt);
            const shortId = order.shortId || order.id.slice(-8).toUpperCase();

            // 1. Prescription status
            if (order.requiresPrescription) {
              if (order.status === 'PENDING_VERIFICATION') {
                const id = `notif-order-pv-${order.id}`;
                generated.push({
                  id,
                  type: 'prescription_status',
                  title: `Resep Sedang Diverifikasi (#${shortId})`,
                  message: 'Resep dokter Anda sedang diperiksa oleh tim apoteker kami.',
                  severity: 'info',
                  timestamp: date,
                  read: readIds.has(id),
                  actionView: 'order-detail',
                  actionData: { orderId: order.id },
                });
              } else if (order.status === 'PROCESSING' || order.status === 'READY_FOR_PICKUP' || order.status === 'SHIPPED') {
                const id = `notif-order-rx-ok-${order.id}`;
                generated.push({
                  id,
                  type: 'prescription_status',
                  title: `Resep Disetujui Apoteker (#${shortId})`,
                  message: 'Resep dokter Anda telah diverifikasi dan pesanan sedang disiapkan.',
                  severity: 'success',
                  timestamp: date,
                  read: readIds.has(id),
                  actionView: 'order-detail',
                  actionData: { orderId: order.id },
                });
              } else if (order.status === 'CANCELLED' && order.rejectionReason) {
                const id = `notif-order-rx-rej-${order.id}`;
                generated.push({
                  id,
                  type: 'prescription_status',
                  title: `Resep Ditolak Apoteker (#${shortId})`,
                  message: `Alasan: "${order.rejectionReason}". Harap periksa detail pesanan.`,
                  severity: 'error',
                  timestamp: date,
                  read: readIds.has(id),
                  actionView: 'order-detail',
                  actionData: { orderId: order.id },
                });
              }
            }

            // 2. Order status updates
            if (order.status === 'READY_FOR_PICKUP') {
              const id = `notif-order-pickup-${order.id}`;
              generated.push({
                id,
                type: 'order_status',
                title: `Pesanan Siap Diambil (#${shortId})`,
                message: 'Pesanan obat Anda sudah selesai dikemas dan siap diambil di apotek.',
                severity: 'success',
                timestamp: date,
                read: readIds.has(id),
                actionView: 'order-detail',
                actionData: { orderId: order.id },
              });
            } else if (order.status === 'SHIPPED') {
              const id = `notif-order-shipped-${order.id}`;
              generated.push({
                id,
                type: 'order_status',
                title: `Pesanan Sedang Dikirim (#${shortId})`,
                message: 'Kurir apotek sedang mengantarkan pesanan obat ke alamat Anda.',
                severity: 'info',
                timestamp: date,
                read: readIds.has(id),
                actionView: 'order-detail',
                actionData: { orderId: order.id },
              });
            } else if (order.status === 'COMPLETED') {
              const id = `notif-order-comp-${order.id}`;
              generated.push({
                id,
                type: 'order_status',
                title: `Pesanan Selesai (#${shortId})`,
                message: 'Terima kasih telah berbelanja di Apotek Sehat AI.',
                severity: 'success',
                timestamp: date,
                read: readIds.has(id),
                actionView: 'order-detail',
                actionData: { orderId: order.id },
              });
            }
          });
        }
      } else if (user.role === 'STAFF') {
        // Fetch staff orders
        const res = await fetch('/api/staff/orders', { headers });
        if (res.ok) {
          const json = await res.json();
          const orders = json.data?.orders || [];

          // Pending verification
          const pendingVerif = orders.filter((o: any) => o.status === 'PENDING_VERIFICATION');
          if (pendingVerif.length > 0) {
            const id = `notif-staff-pending-verif-${pendingVerif.length}-${orders[0]?.id}`;
            generated.push({
              id,
              type: 'prescription_status',
              title: `${pendingVerif.length} Resep Menunggu Verifikasi`,
              message: 'Terdapat resep dokter baru dari pelanggan yang perlu diperiksa keabsahannya.',
              severity: 'warning',
              timestamp: new Date(),
              read: readIds.has(id),
              actionView: 'staff-dashboard',
            });
          }

          // New incoming orders (PENDING_PAYMENT or PROCESSING)
          const newOrders = orders.filter((o: any) => o.status === 'PROCESSING');
          if (newOrders.length > 0) {
            const id = `notif-staff-new-orders-${newOrders.length}-${orders[0]?.id}`;
            generated.push({
              id,
              type: 'new_order',
              title: `${newOrders.length} Pesanan Baru Siap Diproses`,
              message: 'Pesanan telah dikonfirmasi dan menunggu peracikan/pengemasan.',
              severity: 'info',
              timestamp: new Date(),
              read: readIds.has(id),
              actionView: 'staff-dashboard',
            });
          }
        }
      } else if (user.role === 'ADMIN') {
        // Fetch admin stats & low stock medicines
        const [statsRes, medsRes] = await Promise.all([
          fetch('/api/admin/stats', { headers }),
          fetch('/api/admin/medicines?limit=50', { headers }),
        ]);

        if (statsRes.ok && medsRes.ok) {
          const statsJson = await statsRes.json();
          const medsJson = await medsRes.json();
          const stats = statsJson.data?.stats;
          const medicines = medsJson.data?.medicines || [];

          // Low stock / out of stock
          const outOfStock = medicines.filter((m: any) => m.stock === 0 && m.isActive);
          const lowStock = medicines.filter((m: any) => m.stock > 0 && m.stock <= 10 && m.isActive);

          if (outOfStock.length > 0) {
            const id = `notif-admin-oos-${outOfStock.length}`;
            generated.push({
              id,
              type: 'low_stock',
              title: `Peringatan: ${outOfStock.length} Obat Stok Habis`,
              message: `Obat: ${outOfStock.map((m: any) => m.name).slice(0, 3).join(', ')}${outOfStock.length > 3 ? '...' : ''}. Segera lakukan restock.`,
              severity: 'error',
              timestamp: new Date(),
              read: readIds.has(id),
              actionView: 'admin-dashboard',
            });
          }

          if (lowStock.length > 0) {
            const id = `notif-admin-lowstock-${lowStock.length}`;
            generated.push({
              id,
              type: 'low_stock',
              title: `Peringatan: ${lowStock.length} Obat Stok Menipis`,
              message: `Stok sisa ≤ 10 unit: ${lowStock.map((m: any) => `${m.name} (${m.stock})`).slice(0, 3).join(', ')}.`,
              severity: 'warning',
              timestamp: new Date(),
              read: readIds.has(id),
              actionView: 'admin-dashboard',
            });
          }

          // New orders
          if (stats?.pendingOrders > 0) {
            const id = `notif-admin-pending-${stats.pendingOrders}`;
            generated.push({
              id,
              type: 'new_order',
              title: `${stats.pendingOrders} Pesanan Memerlukan Tindakan`,
              message: 'Ada pesanan baru menunggu verifikasi atau proses staf.',
              severity: 'info',
              timestamp: new Date(),
              read: readIds.has(id),
              actionView: 'admin-dashboard',
            });
          }
        }
      }

      setNotifications(generated);
    } catch (err) {
      console.warn('[Notifications] Error fetching notifications:', err);
    }
  }, [isAuthenticated, user, loadReadIds]);

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const markAsRead = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      const readIds = loadReadIds();
      readIds.add(id);
      saveReadIds(readIds);
    },
    [loadReadIds, saveReadIds]
  );

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const readIds = loadReadIds();
    notifications.forEach((n) => readIds.add(n.id));
    saveReadIds(readIds);
  }, [loadReadIds, saveReadIds, notifications]);

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
