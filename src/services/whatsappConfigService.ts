// Frontend service for WhatsApp (Fonnte) Notification Configuration
// All API tokens are kept server-side & masked in UI

const API_BASE = '/api/admin/whatsapp';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('apotek_auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export interface FonnteDevice {
  status: boolean;
  device?: string;
  name?: string;
  device_status?: string;
  quota?: string | number;
  package?: string;
  expired?: string;
  reason?: string;
}

export interface WhatsappSettingsRecord {
  id: string;
  provider: string;
  apiTokenMasked: string | null;
  adminPhone: string;
  isEnabled: boolean;
  notifyOnNewOrder: boolean;
  notifyOnStatusChange: boolean;
  notifyCustomer: boolean;
  senderName: string;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastTestMessage: string | null;
  liveDevice?: FonnteDevice | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

/** GET /api/admin/whatsapp/settings */
export async function getWhatsappSettings(): Promise<ApiResponse<WhatsappSettingsRecord>> {
  const res = await fetch(`${API_BASE}/settings`, { headers: getAuthHeaders() });
  return res.json();
}

/** PUT /api/admin/whatsapp/settings */
export async function updateWhatsappSettings(data: {
  adminPhone?: string;
  apiToken?: string;
  isEnabled?: boolean;
  notifyOnNewOrder?: boolean;
  notifyOnStatusChange?: boolean;
  notifyCustomer?: boolean;
  senderName?: string;
}): Promise<ApiResponse<WhatsappSettingsRecord>> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

/** POST /api/admin/whatsapp/test */
export async function sendTestWhatsappMessage(data: {
  targetPhone?: string;
  message?: string;
  apiToken?: string;
}): Promise<ApiResponse<any>> {
  const res = await fetch(`${API_BASE}/test`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

