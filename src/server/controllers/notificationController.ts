import type { IncomingMessage, ServerResponse } from 'http';
import { prisma } from '../../lib/db';
import { sendJson, requireAuth } from '../utils';

/**
 * GET /api/notifications — Retrieve notifications for the current authenticated user
 */
export async function handleGetNotifications(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const user = requireAuth(req, res, ['CUSTOMER', 'STAFF', 'ADMIN']);
  if (!user) return;

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: { userId: user.id, isRead: false },
      }),
    ]);

    const formatted = notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      orderId: n.orderId,
      orderShortId: n.orderId ? n.orderId.slice(-8).toUpperCase() : null,
      orderStatus: n.order?.status || null,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));

    sendJson(res, 200, {
      success: true,
      data: {
        notifications: formatted,
        unreadCount,
      },
    });
  } catch (error: any) {
    console.error('[NotificationController] Error fetching notifications:', error?.message);
    sendJson(res, 500, {
      success: false,
      message: 'Gagal memuat daftar notifikasi.',
    });
  }
}

/**
 * PUT /api/notifications/:id/read — Mark a specific notification as read
 */
export async function handleMarkNotificationAsRead(
  req: IncomingMessage,
  res: ServerResponse,
  notificationId: string
): Promise<void> {
  const user = requireAuth(req, res, ['CUSTOMER', 'STAFF', 'ADMIN']);
  if (!user) return;

  const id = (notificationId || '').trim();
  if (!id) {
    sendJson(res, 400, {
      success: false,
      message: 'ID notifikasi tidak valid.',
    });
    return;
  }

  try {
    const existing = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existing) {
      sendJson(res, 404, {
        success: false,
        message: 'Notifikasi tidak ditemukan.',
      });
      return;
    }

    if (existing.userId !== user.id) {
      sendJson(res, 403, {
        success: false,
        message: 'Anda tidak memiliki akses ke notifikasi ini.',
      });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    sendJson(res, 200, {
      success: true,
      message: 'Notifikasi berhasil ditandai sudah dibaca.',
      data: {
        notification: updated,
        unreadCount,
      },
    });
  } catch (error: any) {
    console.error('[NotificationController] Error marking notification as read:', error?.message);
    sendJson(res, 500, {
      success: false,
      message: 'Gagal memperbarui status notifikasi.',
    });
  }
}

/**
 * PUT /api/notifications/read-all — Mark all notifications as read for current user
 */
export async function handleMarkAllNotificationsAsRead(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const user = requireAuth(req, res, ['CUSTOMER', 'STAFF', 'ADMIN']);
  if (!user) return;

  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    sendJson(res, 200, {
      success: true,
      message: `Berhasil menandai ${result.count} notifikasi sebagai sudah dibaca.`,
      data: {
        updatedCount: result.count,
        unreadCount: 0,
      },
    });
  } catch (error: any) {
    console.error('[NotificationController] Error marking all notifications as read:', error?.message);
    sendJson(res, 500, {
      success: false,
      message: 'Gagal memperbarui seluruh notifikasi.',
    });
  }
}

/**
 * DELETE /api/notifications/:id — Delete a notification
 */
export async function handleDeleteNotification(
  req: IncomingMessage,
  res: ServerResponse,
  notificationId: string
): Promise<void> {
  const user = requireAuth(req, res, ['CUSTOMER', 'STAFF', 'ADMIN']);
  if (!user) return;

  const id = (notificationId || '').trim();
  if (!id) {
    sendJson(res, 400, {
      success: false,
      message: 'ID notifikasi tidak valid.',
    });
    return;
  }

  try {
    const existing = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existing) {
      sendJson(res, 404, {
        success: false,
        message: 'Notifikasi tidak ditemukan.',
      });
      return;
    }

    if (existing.userId !== user.id) {
      sendJson(res, 403, {
        success: false,
        message: 'Anda tidak memiliki hak untuk menghapus notifikasi ini.',
      });
      return;
    }

    await prisma.notification.delete({
      where: { id },
    });

    sendJson(res, 200, {
      success: true,
      message: 'Notifikasi berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('[NotificationController] Error deleting notification:', error?.message);
    sendJson(res, 500, {
      success: false,
      message: 'Gagal menghapus notifikasi.',
    });
  }
}
