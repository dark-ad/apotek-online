import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  address?: string | null;
  createdAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; errors?: Record<string, string> }>;
  register: (data: { name: string; email: string; password: string; phone?: string; address?: string }) => Promise<{ success: boolean; message?: string; errors?: Record<string, string> }>;
  logout: () => void;
  updateProfile: (data: { name?: string; phone?: string; address?: string }) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'apotek_auth_token';
const AUTH_USER_KEY = 'apotek_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const savedUser = localStorage.getItem(AUTH_USER_KEY);

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify with server in background
        fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` },
        })
          .then((res) => res.json())
          .then((resData) => {
            if (resData.success && resData.data?.user) {
              setUser(resData.data.user);
              localStorage.setItem(AUTH_USER_KEY, JSON.stringify(resData.data.user));
            } else {
              // Token expired or invalid
              logout();
            }
          })
          .catch(() => {
            // Keep offline stored user if network hiccup
          });
      }
    } catch (err) {
      console.error('Error restoring auth state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'Login gagal. Periksa kembali email dan kata sandi Anda.',
          errors: data.errors,
        };
      }

      const authToken = data.data.token;
      const authUser = data.data.user;

      setToken(authToken);
      setUser(authUser);
      localStorage.setItem(AUTH_TOKEN_KEY, authToken);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));

      return { success: true, message: data.message };
    } catch (err: any) {
      return {
        success: false,
        message: 'Gagal terhubung ke server. Pastikan koneksi server aktif.',
        errors: { network: err.message },
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (formData: { name: string; email: string; password: string; phone?: string; address?: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'Registrasi gagal.',
          errors: data.errors,
        };
      }

      const authToken = data.data.token;
      const authUser = data.data.user;

      setToken(authToken);
      setUser(authUser);
      localStorage.setItem(AUTH_TOKEN_KEY, authToken);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));

      return { success: true, message: data.message };
    } catch (err: any) {
      return {
        success: false,
        message: 'Gagal terhubung ke server.',
        errors: { network: err.message },
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  const updateProfile = async (updateData: { name?: string; phone?: string; address?: string }) => {
    if (!token) return { success: false, message: 'Tidak terotentikasi.' };

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      if (data.success && data.data?.user) {
        setUser(data.data.user);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.data.user));
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Gagal memperbarui profil.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
};
