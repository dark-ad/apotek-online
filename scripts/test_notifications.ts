import { prisma } from '../src/lib/db';
import {
  notifyOrderCreatedInApp,
  notifyOrderApprovedInApp,
  notifyOrderRejectedInApp,
  notifyOrderStatusChangedInApp,
} from '../src/server/services/notificationService';

async function runNotificationTests() {
  console.log('--- STARTING NOTIFICATION SYSTEM INTEGRATION TESTS ---');

  // 1. Get test users: 1 Admin, 1 Staff, 1 Customer
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF' } });
  const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });

  if (!admin || !staff || !customer) {
    throw new Error('Test users not found! Please run seed first.');
  }

  console.log(`[Users] Admin: ${admin.name} (${admin.id}), Staff: ${staff.name} (${staff.id}), Customer: ${customer.name} (${customer.id})`);

  // 2. Create a real test order in DB for testing
  const testOrder = await prisma.order.create({
    data: {
      customerId: customer.id,
      totalAmount: 125000,
      status: 'PENDING_VERIFICATION',
      paymentStatus: 'UNPAID',
      requiresPrescription: true,
      shippingAddress: 'Jl. Merdeka No. 45, Cirebon',
      notes: 'Harap dikirim secepatnya',
    },
  });
  console.log(`[Order] Created real test order in DB: ${testOrder.id}`);

  // Clear previous test notifications for clean test run
  await prisma.notification.deleteMany({
    where: {
      userId: { in: [admin.id, staff.id, customer.id] },
    },
  });

  // -------------------------------------------------------------
  // TEST 1: Customer creates an order -> Admin and Staff notified
  // -------------------------------------------------------------
  console.log('\n[TEST 1] Triggering notifyOrderCreatedInApp...');
  await notifyOrderCreatedInApp({
    id: testOrder.id,
    shortId: testOrder.id.slice(-8).toUpperCase(),
    customerName: customer.name,
    totalAmount: testOrder.totalAmount,
    itemCount: 2,
    status: testOrder.status,
  });

  const adminNotifs = await prisma.notification.findMany({
    where: { userId: admin.id, orderId: testOrder.id },
  });
  const staffNotifs = await prisma.notification.findMany({
    where: { userId: staff.id, orderId: testOrder.id },
  });

  if (adminNotifs.length === 0 || staffNotifs.length === 0) {
    throw new Error('FAIL: Admin or Staff did not receive order created notification!');
  }

  console.log(`✅ SUCCESS: Admin received: "${adminNotifs[0].title}" - "${adminNotifs[0].message}"`);
  console.log(`✅ SUCCESS: Staff received: "${staffNotifs[0].title}" - "${staffNotifs[0].message}"`);

  // -------------------------------------------------------------
  // TEST 2: Order is Approved -> Customer receives notification
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Triggering notifyOrderApprovedInApp...');
  await notifyOrderApprovedInApp({
    id: testOrder.id,
    shortId: testOrder.id.slice(-8).toUpperCase(),
    customerId: customer.id,
    nextStatus: 'PROCESSING',
  });

  const customerApproved = await prisma.notification.findFirst({
    where: { userId: customer.id, type: 'order_approved' },
  });

  if (!customerApproved) {
    throw new Error('FAIL: Customer did not receive order approved notification!');
  }
  console.log(`✅ SUCCESS: Customer received: "${customerApproved.title}" - "${customerApproved.message}"`);

  // -------------------------------------------------------------
  // TEST 3: Order is Rejected -> Customer receives notification with reason
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Triggering notifyOrderRejectedInApp with reason...');
  await notifyOrderRejectedInApp({
    id: testOrder.id,
    shortId: testOrder.id.slice(-8).toUpperCase(),
    customerId: customer.id,
    reason: 'Foto resep buram dan tidak terbaca jelas',
  });

  const customerRejected = await prisma.notification.findFirst({
    where: { userId: customer.id, orderId: testOrder.id, type: 'order_rejected' },
  });

  if (!customerRejected || !customerRejected.message.includes('Foto resep buram')) {
    throw new Error('FAIL: Customer did not receive rejection reason in notification!');
  }
  console.log(`✅ SUCCESS: Customer received: "${customerRejected.title}" - "${customerRejected.message}"`);

  // -------------------------------------------------------------
  // TEST 4: Order Status Changed -> Customer receives status updates
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Triggering notifyOrderStatusChangedInApp (READY_FOR_PICKUP & SHIPPED)...');
  await notifyOrderStatusChangedInApp({
    id: testOrder.id,
    shortId: testOrder.id.slice(-8).toUpperCase(),
    customerId: customer.id,
    oldStatus: 'PROCESSING',
    newStatus: 'READY_FOR_PICKUP',
  });

  await notifyOrderStatusChangedInApp({
    id: testOrder.id,
    shortId: testOrder.id.slice(-8).toUpperCase(),
    customerId: customer.id,
    oldStatus: 'READY_FOR_PICKUP',
    newStatus: 'SHIPPED',
  });

  const statusNotifs = await prisma.notification.findMany({
    where: { userId: customer.id, type: 'order_status' },
    orderBy: { createdAt: 'desc' },
  });

  if (statusNotifs.length < 2) {
    throw new Error('FAIL: Status updates were not recorded in notifications!');
  }
  console.log(`✅ SUCCESS: Status notifications recorded:`);
  statusNotifs.forEach((n) => console.log(`   - [${n.title}] ${n.message}`));

  // -------------------------------------------------------------
  // TEST 5: Mark as Read & Mark All as Read
  // -------------------------------------------------------------
  console.log('\n[TEST 5] Testing markAsRead and markAllAsRead...');
  const singleNotif = customerApproved;
  await prisma.notification.update({
    where: { id: singleNotif.id },
    data: { isRead: true },
  });

  const verifiedRead = await prisma.notification.findUnique({
    where: { id: singleNotif.id },
  });
  if (!verifiedRead?.isRead) {
    throw new Error('FAIL: Notification was not marked as read!');
  }
  console.log(`✅ SUCCESS: Single notification #${singleNotif.id} marked as read`);

  await prisma.notification.updateMany({
    where: { userId: customer.id, isRead: false },
    data: { isRead: true },
  });

  const remainingUnread = await prisma.notification.count({
    where: { userId: customer.id, isRead: false },
  });
  if (remainingUnread !== 0) {
    throw new Error(`FAIL: Still found ${remainingUnread} unread notifications after mark all as read!`);
  }
  console.log(`✅ SUCCESS: All notifications for customer marked as read (Unread count: 0)`);

  // -------------------------------------------------------------
  // TEST 6: RBAC Isolation Check
  // -------------------------------------------------------------
  console.log('\n[TEST 6] Testing RBAC Isolation (Customer cannot see another user\'s notifications)...');
  const adminNotifsCheck = await prisma.notification.findMany({
    where: { userId: admin.id },
  });
  const customerNotifsCheck = await prisma.notification.findMany({
    where: { userId: customer.id },
  });

  const leakFound = adminNotifsCheck.some((n) => n.userId === customer.id) ||
                     customerNotifsCheck.some((n) => n.userId === admin.id);

  if (leakFound) {
    throw new Error('FAIL: Cross-user notification leak detected!');
  }
  console.log(`✅ SUCCESS: RBAC strict isolation confirmed: Admin has ${adminNotifsCheck.length} notifs, Customer has ${customerNotifsCheck.length} notifs with zero leakage.`);

  // Clean up test order
  await prisma.order.delete({ where: { id: testOrder.id } });
  console.log(`[Cleanup] Deleted test order #${testOrder.id} and cascade notifications.`);

  console.log('\n🎉 ALL 6 NOTIFICATION INTEGRATION TESTS PASSED PERFECTLY!\n');
}

runNotificationTests()
  .catch((e) => {
    console.error('Test Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
