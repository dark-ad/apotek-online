import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  CartItemData,
  CartResponseData,
  CartValidationResult,
  getCart,
  addToCart as apiAddToCart,
  updateCartItemQuantity as apiUpdateQuantity,
  removeCartItem as apiRemoveItem,
  validateCart as apiValidateCart,
} from '../services/cartService';

interface CartContextType {
  items: CartItemData[];
  totalAmount: number;
  totalCount: number;
  hasStockIssue: boolean;
  isLoading: boolean;
  error: string | null;
  addItem: (medicineId: string, quantity?: number) => Promise<{ success: boolean; message?: string }>;
  updateItemQty: (cartItemId: string, quantity: number) => Promise<{ success: boolean; message?: string }>;
  removeItem: (cartItemId: string) => Promise<{ success: boolean; message?: string }>;
  validateBeforeCheckout: () => Promise<CartValidationResult | null>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();

  const [items, setItems] = useState<CartItemData[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [hasStockIssue, setHasStockIssue] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state with server response
  const applyCartData = (data: CartResponseData) => {
    setItems(data.items);
    setTotalAmount(data.totalAmount);
    setTotalCount(data.totalCount);
    setHasStockIssue(data.hasStockIssue);
    setError(null);
  };

  // Fetch cart from server
  const refreshCart = useCallback(async () => {
    if (!token || !isAuthenticated || user?.role !== 'CUSTOMER') {
      setItems([]);
      setTotalAmount(0);
      setTotalCount(0);
      setHasStockIssue(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getCart(token);
      applyCartData(data);
    } catch (err: any) {
      setError(err.message || 'Gagal menyinkronkan keranjang.');
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated, user?.role]);

  // Load cart on auth change
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Add Item to Cart
  const addItem = async (medicineId: string, quantity: number = 1): Promise<{ success: boolean; message?: string }> => {
    if (!token || !isAuthenticated) {
      return {
        success: false,
        message: 'Silakan masuk ke akun Pembeli terlebih dahulu untuk menambahkan produk ke keranjang.',
      };
    }
    if (user?.role !== 'CUSTOMER') {
      return {
        success: false,
        message: `Akun role '${user?.role}' tidak dapat bertransaksi. Keranjang belanja khusus akun CUSTOMER.`,
      };
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await apiAddToCart(token, medicineId, quantity);
      applyCartData(res.cart);
      return { success: true, message: res.message };
    } catch (err: any) {
      const msg = err.message || 'Gagal menambahkan ke keranjang.';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  };

  // Update Item Quantity
  const updateItemQty = async (cartItemId: string, quantity: number): Promise<{ success: boolean; message?: string }> => {
    if (!token || user?.role !== 'CUSTOMER') {
      return { success: false, message: 'Tidak terotentikasi sebagai Customer.' };
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await apiUpdateQuantity(token, cartItemId, quantity);
      applyCartData(res.cart);
      return { success: true, message: res.message };
    } catch (err: any) {
      const msg = err.message || 'Gagal mengubah kuantitas item.';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  };

  // Remove Item from Cart
  const removeItem = async (cartItemId: string): Promise<{ success: boolean; message?: string }> => {
    if (!token || user?.role !== 'CUSTOMER') {
      return { success: false, message: 'Tidak terotentikasi sebagai Customer.' };
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRemoveItem(token, cartItemId);
      applyCartData(res.cart);
      return { success: true, message: res.message };
    } catch (err: any) {
      const msg = err.message || 'Gagal menghapus item.';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  };

  // Validate entire cart against real-time database stock
  const validateBeforeCheckout = async (): Promise<CartValidationResult | null> => {
    if (!token || user?.role !== 'CUSTOMER') {
      setError('Hanya akun CUSTOMER yang dapat melanjutkan ke checkout.');
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await apiValidateCart(token);
      // Re-fetch cart to update any state
      await refreshCart();
      return result;
    } catch (err: any) {
      setError(err.message || 'Gagal memvalidasi keranjang.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totalAmount,
        totalCount,
        hasStockIssue,
        isLoading,
        error,
        addItem,
        updateItemQty,
        removeItem,
        validateBeforeCheckout,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart harus digunakan di dalam CartProvider');
  }
  return context;
};
