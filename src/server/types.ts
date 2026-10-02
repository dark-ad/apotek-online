export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string>;
}

export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface AuthenticatedUserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  address?: string | null;
}
