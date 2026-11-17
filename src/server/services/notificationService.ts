import { prisma } from '../../lib/db';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: 'new_order' | 'order_approved' | 'order_rejected' | 'order_status' | 'low_stock' | 'prescription_status' | 'info';
  orderId?: string;
}

/**
 * Creates a single persistent notification in the database for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'order_status',
        orderId: params.orderId || null,
        isRead: false,
      },
    });
  } catch (error: any) {
    console.error('[NotificationService] Failed to create notification:', error?.message);
    return null;
  }
}

/**
 * Creates notifications for all active ADMIN and STAFF accounts
 */
export async function notifyAdminsAndStaff(params: Omit<CreateNotificationParams, 'userId'>) {
  try {
    const staffAndAdmins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'STAFF'] },
        isActive: true,
      },
      select: { id: true, role: true, name: true },
    });

    if (staffAndAdmins.length === 0) return [];

    const promises = staffAndAdmins.map((staff) =>
      prisma.notification.create({
        data: {
          userId: staff.id,
          title: params.title,
          message: params.message,
          type: params.type || 'new_order',
          orderId: params.orderId || null,
          isRead: false,
        },
      })
    );

    return await Promise.all(promises);
  } catch (error: any) {
    console.error('[NotificationService] Failed to notify admins & staff:', error?.message);
    return [];
  }
}

/**
 * Trigger: When a customer places a new order
 * Creates in-app notifications for Admin and all Staff members
 */
export async function notifyOrderCreatedInApp(order: {
  id: string;
  shortId: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
  status: string;
}) {
  const formattedTotal = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(order.totalAmount);

  return await notifyAdminsAndStaff({
    title: 'Pesanan Baru Masuk',
    message: `Pembeli ${order.customerName} telah melakukan pemesanan obat dengan nomor pesanan #${order.shortId}. Total: ${formattedTotal} (${order.itemCount} jenis obat). Status: ${order.status}.`,
    type: 'new_order',
    orderId: order.id,
  });
}

/**
 * Trigger: When Admin or Staff approves an order / prescription
 * Creates in-app notification for the customer who placed the order
 */
export async function notifyOrderApprovedInApp(order: {
  id: string;
  shortId: string;
  customerId: string;
  nextStatus?: string;
}) {
  return await createNotification({
    userId: order.customerId,
    title: 'Pesanan Anda Telah Disetujui',
    message: `Pesanan Anda dengan nomor #${order.shortId} telah disetujui dan sedang diproses oleh pihak apotek.`,
    type: 'order_approved',
    orderId: order.id,
  });
}

/**
 * Trigger: When Admin or Staff rejects an order / prescription
 * Creates in-app notification for the customer
 */
export async function notifyOrderRejectedInApp(order: {
  id: string;
  shortId: string;
  customerId: string;
  reason?: string;
}) {
  const reasonText = order.reason ? ` Alasan penolakan: "${order.reason}".` : '';
  return await createNotification({
    userId: order.customerId,
    title: 'Pesanan Tidak Dapat Diproses',
    message: `Mohon maaf, pesanan Anda dengan nomor #${order.shortId} tidak dapat diproses.${reasonText} Silakan periksa detail pesanan atau hubungi pihak apotek.`,
    type: 'order_rejected',
    orderId: order.id,
  });
}

/**
 * Trigger: When order status changes
 * Creates in-app notification for the customer according to the new status
 */
export async function notifyOrderStatusChangedInApp(order: {
  id: string;
  shortId: string;
  customerId: string;
  oldStatus?: string;
  newStatus: string;
  reason?: string;
}) {
  if (order.oldStatus === order.newStatus) return null;

  let title = 'Pembaruan Status Pesanan';
  let message = `Status pesanan #${order.shortId} telah diperbarui menjadi ${order.newStatus}.`;
  let type: CreateNotificationParams['type'] = 'order_status';

  switch (order.newStatus) {
    case 'PROCESSING':
      title = 'Pesanan Sedang Diproses';
      message = `Pesanan #${order.shortId} sedang diracik dan disiapkan oleh tim farmasi apotek.`;
      break;
    case 'READY_FOR_PICKUP':
      title = 'Pesanan Siap Diambil';
      message = `Pesanan obat #${order.shortId} sudah selesai disiapkan dan siap diambil di Apotek Sehat.`;
      break;
    case 'SHIPPED':
      title = 'Pesanan Sedang Dikirim';
      message = `Kurir sedang mengantarkan pesanan obat #${order.shortId} ke alamat pengiriman Anda.`;
      break;
    case 'COMPLETED':
      title = 'Pesanan Selesai';
      message = `Pesanan #${order.shortId} telah selesai diterima. Terima kasih telah berbelanja di Apotek Sehat AI!`;
      break;
    case 'CANCELLED':
      title = 'Pesanan Dibatalkan';
      message = `Pesanan #${order.shortId} telah dibatalkan.${order.reason ? ` Alasan: "${order.reason}".` : ''}`;
      type = 'order_rejected';
      break;
    default:
      title = 'Pembaruan Status Pesanan';
      message = `Status pesanan #${order.shortId} kini telah diperbarui menjadi ${order.newStatus}.`;
      break;
  }

  return await createNotification({
    userId: order.customerId,
    title,
    message,
    type,
    orderId: order.id,
  });
}
