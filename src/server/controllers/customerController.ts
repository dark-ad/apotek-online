import type { IncomingMessage, ServerResponse } from 'http';
import { prisma } from '../../lib/db';
import { sendJson, requireAuth } from '../utils';

export async function handleGetCustomerOrders(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const authUser = requireAuth(req, res, ['CUSTOMER', 'ADMIN']);
  if (!authUser) return;

  const orders = await prisma.order.findMany({
    where: { customerId: authUser.id },
    include: {
      items: {
        include: { medicine: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  sendJson(res, 200, {
    success: true,
    data: { orders },
  });
}
