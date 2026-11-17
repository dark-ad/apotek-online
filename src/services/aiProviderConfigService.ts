// Frontend service for Admin AI Provider Configuration
// All API keys are handled server-side only — never exposed to browser

const API_BASE = '/api/admin/ai-providers';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('apotek_auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export interface AiProviderRecord {
  id: string;
  providerType: string;
  name: string;
  baseUrl: string;
  apiKeyMasked: string | null;
  modelId: string;
  isActive: boolean;
  isVerified: boolean;
  connectionStatus: string; // CONNECTED | FAILED | UNVERIFIED
  lastTestedAt: string | null;
  lastError: string | null;
  isFallback: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiModelOption {
  id: string;
  name: string;
  description?: string;
}

export interface AiTestResult {
  success: boolean;
  latencyMs: number;
  message: string;
  sampleReply?: string;
  modelTested?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

/** GET /api/admin/ai-providers */
export async function getAiProviders(): Promise<ApiResponse<AiProviderRecord[]>> {
  const res = await fetch(API_BASE, { headers: getAuthHeaders() });
  return res.json();
}

/** GET /api/admin/ai-providers/:id */
export async function getAiProviderDetail(id: string): Promise<ApiResponse<AiProviderRecord>> {
  const res = await fetch(`${API_BASE}/${id}`, { headers: getAuthHeaders() });
  return res.json();
}

/** POST /api/admin/ai-providers */
export async function createAiProvider(data: {
  providerType: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  modelId: string;
  isActive?: boolean;
  isFallback?: boolean;
}): Promise<ApiResponse<AiProviderRecord>> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

/** PUT /api/admin/ai-providers/:id */
export async function updateAiProvider(
  id: string,
  data: {
    providerType?: string;
    name?: string;
    baseUrl?: string;
    apiKey?: string;
    modelId?: string;
    isActive?: boolean;
    isFallback?: boolean;
  }
): Promise<ApiResponse<AiProviderRecord>> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

/** DELETE /api/admin/ai-providers/:id */
export async function deleteAiProvider(id: string): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return res.json();
}

/** POST /api/admin/ai-providers/:id/set-active */
export async function setActiveAiProvider(id: string): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE}/${id}/set-active`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return res.json();
}

/** POST /api/admin/ai-providers/:id/set-fallback */
export async function setFallbackAiProvider(id: string): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE}/${id}/set-fallback`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return res.json();
}

/** POST /api/admin/ai-providers/test-connection */
export async function testAiConnection(data: {
  id?: string;
  providerType: string;
  baseUrl: string;
  apiKey?: string;
  modelId: string;
}): Promise<ApiResponse<AiTestResult>> {
  const res = await fetch(`${API_BASE}/test-connection`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

/** POST /api/admin/ai-providers/fetch-models */
export async function fetchAiModels(data: {
  id?: string;
  providerType: string;
  baseUrl?: string;
  apiKey?: string;
}): Promise<ApiResponse<AiModelOption[]>> {
  const res = await fetch(`${API_BASE}/fetch-models`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

/** Provider type metadata for UI display */
export const PROVIDER_UI_MAP: Record<string, {
  label: string;
  icon: string;
  color: string;
  gradient: string;
}> = {
  gemini: {
    label: 'Google Gemini',
    icon: '✦',
    color: '#4285F4',
    gradient: 'linear-gradient(135deg, #4285F4, #34A853)',
  },
  openai: {
    label: 'OpenAI',
    icon: '◎',
    color: '#10a37f',
    gradient: 'linear-gradient(135deg, #10a37f, #1a7f5a)',
  },
  nvidia: {
    label: 'NVIDIA NIM',
    icon: '▲',
    color: '#76b900',
    gradient: 'linear-gradient(135deg, #76b900, #4a8500)',
  },
  groq: {
    label: 'Groq',
    icon: '⚡',
    color: '#f55036',
    gradient: 'linear-gradient(135deg, #f55036, #ff8c00)',
  },
  openrouter: {
    label: 'OpenRouter',
    icon: '🔀',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  },
  deepseek: {
    label: 'DeepSeek',
    icon: '🔭',
    color: '#0066ff',
    gradient: 'linear-gradient(135deg, #0066ff, #00ccff)',
  },
  mistral: {
    label: 'Mistral AI',
    icon: '🌀',
    color: '#ff7000',
    gradient: 'linear-gradient(135deg, #ff7000, #ff9a00)',
  },
  anthropic: {
    label: 'Anthropic Claude',
    icon: '🧠',
    color: '#d4a574',
    gradient: 'linear-gradient(135deg, #d4a574, #c0956e)',
  },
  custom: {
    label: 'Custom API',
    icon: '⚙️',
    color: '#6b7280',
    gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)',
  },
};

