import type { IncomingMessage, ServerResponse } from 'http';
import { sendJson } from './utils';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from './rateLimiter';

// Controllers
import {
  handleRegister,
  handleLogin,
  handleGetMe,
  handleUpdateProfile,
} from './controllers/authController';
import {
  handleGetAdminStats,
  handleAdminGetMedicines,
  handleAdminCreateMedicine,
  handleAdminUpdateMedicine,
  handleAdminDeleteMedicine,
  handleAdminGetCategories,
  handleAdminCreateCategory,
  handleAdminUpdateCategory,
  handleAdminDeleteCategory,
  handleGetAdminUsers,
  handleAdminUpdateUserRole,
  handleAdminToggleUserStatus,
  handleAdminGetOrders,
  handleAdminGetTransactions,
} from './controllers/adminController';
import { 
  handleGetStaffOrders,
  handleGetStaffOrderDetail,
  handleVerifyPrescription,
  handleUpdateOrderStatus,
  handleGetStaffMedicines,
  handleUpdateMedicineStock,
} from './controllers/staffController';
import { handleGetCustomerOrders } from './controllers/customerController';
import {
  handleGetCategories,
  handleGetMedicines,
  handleGetMedicineById,
} from './controllers/medicineController';
import {
  handleGetCart,
  handleAddToCart,
  handleUpdateCartItem,
  handleDeleteCartItem,
  handleValidateCart,
} from './controllers/cartController';
import {
  handleCheckout,
  handleGetOrders,
  handleGetOrderDetail,
  handleMockPayment,
  handleUploadPrescription,
} from './controllers/orderController';
import { handleAiChat } from './controllers/aiController';

export * from './types';
export * from './utils';

/**
 * Central API Request Dispatcher for Vite dev server middleware
 */
export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const rawUrl = req.url || '';
  const parsedUrl = new URL(rawUrl, 'http://localhost');
  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
  const method = req.method || 'GET';

  // Only intercept /api/* paths
  if (!pathname.startsWith('/api')) {
    return false;
  }

  // Handle CORS preflight OPTIONS request
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end();
    return true;
  }

  // Apply general API rate limiting to all /api/* requests
  if (!checkRateLimit(req, res, 'general', RATE_LIMIT_CONFIGS.GENERAL)) return true;

  try {
    // -----------------------------------------------------------------
    // 1. Authentication Routes
    // -----------------------------------------------------------------
    if (pathname === '/api/auth/register' && method === 'POST') {
      if (!checkRateLimit(req, res, 'register', RATE_LIMIT_CONFIGS.REGISTER)) return true;
      await handleRegister(req, res);
      return true;
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      if (!checkRateLimit(req, res, 'login', RATE_LIMIT_CONFIGS.LOGIN)) return true;
      await handleLogin(req, res);
      return true;
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      await handleGetMe(req, res);
      return true;
    }

    if (pathname === '/api/auth/profile' && method === 'PUT') {
      await handleUpdateProfile(req, res);
      return true;
    }

    // -----------------------------------------------------------------
    // 2. Admin Routes (Admin Only)
    // -----------------------------------------------------------------
    if (pathname === '/api/admin/stats' && method === 'GET') {
      await handleGetAdminStats(req, res);
      return true;
    }

    // Admin Medicine CRUD
    if (pathname === '/api/admin/medicines' && method === 'GET') {
      await handleAdminGetMedicines(req, res, parsedUrl.searchParams);
      return true;
    }

    if (pathname === '/api/admin/medicines' && method === 'POST') {
      await handleAdminCreateMedicine(req, res);
      return true;
    }

    if (pathname.startsWith('/api/admin/medicines/') && method === 'PUT') {
      const id = pathname.slice('/api/admin/medicines/'.length);
      await handleAdminUpdateMedicine(req, res, id);
      return true;
    }

    if (pathname.startsWith('/api/admin/medicines/') && method === 'DELETE') {
      const id = pathname.slice('/api/admin/medicines/'.length);
      await handleAdminDeleteMedicine(req, res, id);
      return true;
    }

    // Admin Category CRUD
    if (pathname === '/api/admin/categories' && method === 'GET') {
      await handleAdminGetCategories(req, res);
      return true;
    }

    if (pathname === '/api/admin/categories' && method === 'POST') {
      await handleAdminCreateCategory(req, res);
      return true;
    }

    if (pathname.startsWith('/api/admin/categories/') && method === 'PUT') {
      const id = pathname.slice('/api/admin/categories/'.length);
      await handleAdminUpdateCategory(req, res, id);
      return true;
    }

    if (pathname.startsWith('/api/admin/categories/') && method === 'DELETE') {
      const id = pathname.slice('/api/admin/categories/'.length);
      await handleAdminDeleteCategory(req, res, id);
      return true;
    }

    // Admin User Management
    if (pathname === '/api/admin/users' && method === 'GET') {
      await handleGetAdminUsers(req, res);
      return true;
    }

    if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/role') && method === 'PUT') {
      const id = pathname.slice('/api/admin/users/'.length, -'/role'.length);
      await handleAdminUpdateUserRole(req, res, id);
      return true;
    }

    if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/status') && method === 'PUT') {
      const id = pathname.slice('/api/admin/users/'.length, -'/status'.length);
      await handleAdminToggleUserStatus(req, res, id);
      return true;
    }

    // Admin Orders & Transactions
    if (pathname === '/api/admin/orders' && method === 'GET') {
      await handleAdminGetOrders(req, res, parsedUrl.searchParams);
      return true;
    }

    if (pathname === '/api/admin/transactions' && method === 'GET') {
      await handleAdminGetTransactions(req, res);
      return true;
    }

    // -----------------------------------------------------------------
    // 3. Staff Routes (Staff & Admin)
    // -----------------------------------------------------------------
    if (pathname === '/api/staff/orders' && method === 'GET') {
      await handleGetStaffOrders(req, res);
      return true;
    }

    if (pathname.startsWith('/api/staff/orders/') && pathname.endsWith('/verify-prescription') && method === 'POST') {
      const id = pathname.slice('/api/staff/orders/'.length, -'/verify-prescription'.length);
      await handleVerifyPrescription(req, res, id);
      return true;
    }

    if (pathname.startsWith('/api/staff/orders/') && pathname.endsWith('/status') && method === 'PUT') {
      const id = pathname.slice('/api/staff/orders/'.length, -'/status'.length);
      await handleUpdateOrderStatus(req, res, id);
      return true;
    }

    if (pathname.startsWith('/api/staff/orders/') && method === 'GET') {
      const id = pathname.slice('/api/staff/orders/'.length);
      await handleGetStaffOrderDetail(req, res, id);
      return true;
    }

    if (pathname === '/api/staff/medicines' && method === 'GET') {
      await handleGetStaffMedicines(req, res, parsedUrl.searchParams);
      return true;
    }

    if (pathname.startsWith('/api/staff/medicines/') && pathname.endsWith('/stock') && method === 'PUT') {
      const id = pathname.slice('/api/staff/medicines/'.length, -'/stock'.length);
      await handleUpdateMedicineStock(req, res, id);
      return true;
    }

    // -----------------------------------------------------------------
    // 4. Customer History Routes
    // -----------------------------------------------------------------
    if (pathname === '/api/customer/orders' && method === 'GET') {
      await handleGetCustomerOrders(req, res);
      return true;
    }

    // -----------------------------------------------------------------
    // 5. Medicine Catalog Routes (Public / Customer)
    // -----------------------------------------------------------------
    if (pathname === '/api/categories' && method === 'GET') {
      await handleGetCategories(req, res);
      return true;
    }

    if (pathname === '/api/medicines' && method === 'GET') {
      await handleGetMedicines(req, res, parsedUrl.searchParams);
      return true;
    }

    if (pathname.startsWith('/api/medicines/') && method === 'GET') {
      const id = pathname.slice('/api/medicines/'.length);
      await handleGetMedicineById(req, res, id);
      return true;
    }

    // -----------------------------------------------------------------
    // 6. Shopping Cart Routes (Customer Only)
    // -----------------------------------------------------------------
    if (pathname === '/api/cart' && method === 'GET') {
      await handleGetCart(req, res);
      return true;
    }

    if (pathname === '/api/cart/items' && method === 'POST') {
      await handleAddToCart(req, res);
      return true;
    }

    if (pathname.startsWith('/api/cart/items/') && method === 'PUT') {
      const id = pathname.slice('/api/cart/items/'.length);
      await handleUpdateCartItem(req, res, id);
      return true;
    }

    if (pathname.startsWith('/api/cart/items/') && method === 'DELETE') {
      const id = pathname.slice('/api/cart/items/'.length);
      await handleDeleteCartItem(req, res, id);
      return true;
    }

    if (pathname === '/api/cart/validate' && method === 'POST') {
      await handleValidateCart(req, res);
      return true;
    }

    // -----------------------------------------------------------------
    // 7. Orders & Prescription Routes (Customer Only)
    // -----------------------------------------------------------------
    if (pathname === '/api/orders/checkout' && method === 'POST') {
      await handleCheckout(req, res);
      return true;
    }

    if (pathname === '/api/orders' && method === 'GET') {
      await handleGetOrders(req, res);
      return true;
    }

    if (pathname.startsWith('/api/orders/') && pathname.endsWith('/mock-pay') && method === 'POST') {
      const id = pathname.slice('/api/orders/'.length, -'/mock-pay'.length);
      await handleMockPayment(req, res, id);
      return true;
    }

    if (pathname.startsWith('/api/orders/') && method === 'GET') {
      const id = pathname.slice('/api/orders/'.length);
      await handleGetOrderDetail(req, res, id);
      return true;
    }

    if (pathname === '/api/upload/prescription' && method === 'POST') {
      if (!checkRateLimit(req, res, 'upload', RATE_LIMIT_CONFIGS.UPLOAD)) return true;
      await handleUploadPrescription(req, res);
      return true;
    }

    // -----------------------------------------------------------------
    // 8. AI Assistant Routes (Rate-limited, no auth required)
    // -----------------------------------------------------------------
    if (pathname === '/api/ai/chat' && method === 'POST') {
      if (!checkRateLimit(req, res, 'ai_chat', RATE_LIMIT_CONFIGS.AI_CHAT)) return true;
      await handleAiChat(req, res);
      return true;
    }

    // -----------------------------------------------------------------
    // Unrecognized /api/* endpoint
    // -----------------------------------------------------------------
    sendJson(res, 404, {
      success: false,
      message: `Endpoint API '${rawUrl}' tidak ditemukan.`,
    });
    return true;
  } catch (err: any) {
    // Log full error server-side but NEVER expose internal messages/stack traces to clients
    console.error('[API ERROR]', err?.name, err?.message, err?.stack?.split('\n')[1]?.trim());

    // Handle payload too large specifically
    if (err?.name === 'PayloadTooLargeError') {
      sendJson(res, 413, {
        success: false,
        message: err.message,
      });
      return true;
    }

    // Generic 500 — do NOT reveal internal details to client
    sendJson(res, 500, {
      success: false,
      message: 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.',
    });
    return true;
  }
}
