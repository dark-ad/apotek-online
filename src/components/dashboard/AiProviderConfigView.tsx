import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAiProviders,
  createAiProvider,
  updateAiProvider,
  deleteAiProvider,
  setActiveAiProvider,
  testAiConnection,
  fetchAiModels,
  PROVIDER_UI_MAP,
  type AiProviderRecord,
  type AiModelOption,
  type AiTestResult,
} from '../../services/aiProviderConfigService';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
  Shield,
  RefreshCw,
  Save,
  Play,
  Cpu,
  Settings,
  Loader2,
  Eye,
  EyeOff,
  Clock,
  Radio,
  Bot,
} from 'lucide-react';

// ─── Default templates for provider types ────────────────────────────────────
const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; modelId: string; apiKeyPlaceholder: string }> = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    modelId: 'gemini-2.0-flash',
    apiKeyPlaceholder: 'AIzaSy...',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    modelId: 'gpt-4o-mini',
    apiKeyPlaceholder: 'sk-...',
  },
  nvidia: {
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    modelId: 'meta/llama-3.1-70b-instruct',
    apiKeyPlaceholder: 'nvapi-...',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    modelId: 'llama-3.1-70b-versatile',
    apiKeyPlaceholder: 'gsk_...',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    modelId: 'openai/gpt-4o-mini',
    apiKeyPlaceholder: 'sk-or-v1-...',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    modelId: 'deepseek-chat',
    apiKeyPlaceholder: 'sk-...',
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1',
    modelId: 'mistral-large-latest',
    apiKeyPlaceholder: 'sk-...',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    modelId: 'claude-3-5-sonnet-20241022',
    apiKeyPlaceholder: 'sk-ant-...',
  },
  custom: {
    baseUrl: '',
    modelId: '',
    apiKeyPlaceholder: 'Masukkan API key...',
  },
};

// ─── Inline style objects ────────────────────────────────────────────────────

const styles = {
  container: {
    display: 'flex',
    gap: '1.5rem',
    minHeight: 'calc(100vh - 120px)',
    padding: '1.5rem',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  containerMobile: {
    flexDirection: 'column' as const,
  },

  // ── Left panel ──
  leftPanel: {
    width: '380px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  } as React.CSSProperties,

  leftPanelMobile: {
    width: '100%',
  },

  headerCard: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    color: '#ffffff',
  } as React.CSSProperties,

  headerTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  } as React.CSSProperties,

  headerSub: {
    margin: '0.25rem 0 0',
    fontSize: '0.82rem',
    opacity: 0.85,
  } as React.CSSProperties,

  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.25)',
    borderRadius: '9999px',
    padding: '0.1rem 0.55rem',
    fontSize: '0.75rem',
    fontWeight: 700,
    marginLeft: '0.35rem',
  } as React.CSSProperties,

  listContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  } as React.CSSProperties,

  providerCard: (isActive: boolean, isSelected: boolean): React.CSSProperties => ({
    background: '#ffffff',
    border: isSelected ? '2px solid #6366f1' : '1px solid var(--border-light)',
    borderLeft: isActive ? '4px solid #10b981' : isSelected ? '2px solid #6366f1' : '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    padding: '0.85rem 1rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: isSelected ? '0 2px 12px rgba(99,102,241,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
  }),

  providerIcon: (gradient: string): React.CSSProperties => ({
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: gradient,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    flexShrink: 0,
  }),

  statusBadge: (bg: string, color: string, border?: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.2rem',
    padding: '0.12rem 0.45rem',
    borderRadius: '9999px',
    fontSize: '0.68rem',
    fontWeight: 700,
    background: bg,
    color: color,
    border: border || 'none',
    whiteSpace: 'nowrap' as const,
  }),

  // ── Right panel ──
  rightPanel: {
    flex: 1,
    background: '#ffffff',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-light)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  } as React.CSSProperties,

  formSection: {
    padding: '1.5rem',
    overflowY: 'auto' as const,
    flex: 1,
  } as React.CSSProperties,

  formGroup: {
    marginBottom: '1.15rem',
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: 700,
    color: 'var(--text-primary, #1e293b)',
    marginBottom: '0.35rem',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-light, #e2e8f0)',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    background: 'var(--bg-primary, #ffffff)',
    color: 'var(--text-primary, #1e293b)',
    boxSizing: 'border-box' as const,
    outline: 'none',
    transition: 'border-color 0.15s',
  } as React.CSSProperties,

  select: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-light, #e2e8f0)',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    background: 'var(--bg-primary, #ffffff)',
    color: 'var(--text-primary, #1e293b)',
    boxSizing: 'border-box' as const,
    cursor: 'pointer',
    outline: 'none',
  } as React.CSSProperties,

  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    color: 'var(--text-primary, #1e293b)',
    cursor: 'pointer',
    marginBottom: '0.75rem',
  } as React.CSSProperties,

  modelListContainer: {
    maxHeight: '240px',
    overflowY: 'auto' as const,
    border: '1px solid var(--border-light, #e2e8f0)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-secondary, #f8fafc)',
  } as React.CSSProperties,

  modelItem: (isSelected: boolean): React.CSSProperties => ({
    padding: '0.6rem 0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    background: isSelected ? '#eef2ff' : 'transparent',
    borderBottom: '1px solid var(--border-light, #e2e8f0)',
    transition: 'background 0.1s',
  }),

  radioCircle: (isSelected: boolean): React.CSSProperties => ({
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: isSelected ? '5px solid #6366f1' : '2px solid #cbd5e1',
    flexShrink: 0,
    transition: 'all 0.15s',
  }),

  testResultPanel: (success: boolean): React.CSSProperties => ({
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${success ? '#bbf7d0' : '#fecaca'}`,
    background: success ? '#f0fdf4' : '#fef2f2',
    padding: '1rem',
    marginTop: '1rem',
  }),

  placeholderPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    textAlign: 'center' as const,
    color: 'var(--text-secondary, #64748b)',
  } as React.CSSProperties,

  actionBar: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid var(--border-light, #e2e8f0)',
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
    background: 'var(--bg-secondary, #f8fafc)',
  } as React.CSSProperties,

  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  } as React.CSSProperties,

  note: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary, #64748b)',
    marginTop: '0.3rem',
    fontStyle: 'italic' as const,
  } as React.CSSProperties,
};

// ─── Keyframe injection ──────────────────────────────────────────────────────
const KEYFRAMES_ID = 'ai-provider-config-keyframes';
function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes fadeInUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  `;
  document.head.appendChild(style);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ─── Interface for form state ────────────────────────────────────────────────

interface FormData {
  providerType: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  modelId: string;
  isActive: boolean;
  isFallback: boolean;
}

const emptyForm: FormData = {
  providerType: 'gemini',
  name: PROVIDER_UI_MAP.gemini?.label ?? 'Google Gemini',
  baseUrl: PROVIDER_DEFAULTS.gemini?.baseUrl ?? '',
  apiKey: '',
  modelId: PROVIDER_DEFAULTS.gemini?.modelId ?? '',
  isActive: false,
  isFallback: false,
};

// ═════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════

export const AiProviderConfigView: React.FC = () => {
  const toast = useToast();

  // ── Core state ──
  const [providers, setProviders] = useState<AiProviderRecord[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<FormData>({ ...emptyForm });
  const [models, setModels] = useState<AiModelOption[]>([]);
  const [modelSearch, setModelSearch] = useState('');
  const [testResult, setTestResult] = useState<AiTestResult | null>(null);

  // ── Loading states ──
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingActiveId, setSettingActiveId] = useState<string | null>(null);

  // ── Delete confirm ──
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });

  // ── UI ──
  const [showApiKey, setShowApiKey] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // ── Responsive listener ──
  useEffect(() => {
    injectKeyframes();
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── Fetch providers ──
  const refreshProviders = useCallback(async () => {
    setLoadingProviders(true);
    try {
      const res = await getAiProviders();
      if (res.success && res.data) {
        setProviders(res.data);
      } else {
        toast.error(res.message || 'Gagal memuat daftar provider.');
      }
    } catch (err: any) {
      toast.error('Gagal terhubung ke server.');
    } finally {
      setLoadingProviders(false);
    }
  }, [toast]);

  useEffect(() => {
    refreshProviders();
  }, [refreshProviders]);

  // ── Derived ──
  const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return models;
    const q = modelSearch.toLowerCase();
    return models.filter(
      (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    );
  }, [models, modelSearch]);

  // ── Handlers ──

  const handleSelectProvider = useCallback(
    (provider: AiProviderRecord) => {
      setIsAdding(false);
      setSelectedProviderId(provider.id);
      setTestResult(null);
      setModels([]);
      setModelSearch('');
      setShowApiKey(false);
      setFormData({
        providerType: provider.providerType,
        name: provider.name,
        baseUrl: provider.baseUrl,
        apiKey: '',
        modelId: provider.modelId,
        isActive: provider.isActive,
        isFallback: provider.isFallback,
      });
    },
    []
  );

  const handleAddNew = useCallback(() => {
    setSelectedProviderId(null);
    setIsAdding(true);
    setTestResult(null);
    setModels([]);
    setModelSearch('');
    setShowApiKey(false);
    setFormData({ ...emptyForm });
  }, []);

  const handleProviderTypeChange = useCallback((type: string) => {
    const uiInfo = PROVIDER_UI_MAP[type];
    const defaults = PROVIDER_DEFAULTS[type];
    setFormData((prev) => ({
      ...prev,
      providerType: type,
      name: uiInfo?.label ?? type,
      baseUrl: defaults?.baseUrl ?? '',
      modelId: defaults?.modelId ?? '',
    }));
    setModels([]);
    setModelSearch('');
    setTestResult(null);
  }, []);

  const handleFormChange = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleFetchModels = useCallback(async () => {
    setLoadingModels(true);
    setModels([]);
    setModelSearch('');
    try {
      const res = await fetchAiModels({
        id: selectedProviderId ?? undefined,
        providerType: formData.providerType,
        baseUrl: formData.baseUrl || undefined,
        apiKey: formData.apiKey || undefined,
      });
      if (res.success && res.data) {
        setModels(res.data);
        toast.success(`${res.data.length} model ditemukan.`);
      } else {
        toast.error(res.message || 'Gagal memuat daftar model.');
      }
    } catch (err: any) {
      toast.error('Gagal mengambil daftar model dari API.');
    } finally {
      setLoadingModels(false);
    }
  }, [formData.providerType, formData.baseUrl, formData.apiKey, selectedProviderId, toast]);

  const handleSelectModel = useCallback((modelId: string) => {
    setFormData((prev) => ({ ...prev, modelId }));
  }, []);

  const handleSave = useCallback(async () => {
    // Validation
    if (!formData.providerType) {
      toast.error('Pilih tipe provider terlebih dahulu.');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Nama provider wajib diisi.');
      return;
    }
    if (!formData.modelId.trim()) {
      toast.error('Model ID wajib diisi.');
      return;
    }
    if (isAdding && !formData.apiKey.trim()) {
      toast.error('API Key wajib diisi untuk provider baru.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        providerType: formData.providerType,
        name: formData.name.trim(),
        baseUrl: formData.baseUrl.trim(),
        modelId: formData.modelId.trim(),
        isActive: formData.isActive,
        isFallback: formData.isFallback,
      };
      if (formData.apiKey.trim()) {
        payload.apiKey = formData.apiKey.trim();
      }

      let res;
      if (isAdding) {
        res = await createAiProvider(payload);
      } else if (selectedProviderId) {
        res = await updateAiProvider(selectedProviderId, payload);
      } else {
        return;
      }

      if (res.success) {
        toast.success(isAdding ? 'Provider berhasil ditambahkan!' : 'Provider berhasil diperbarui!');
        await refreshProviders();
        if (isAdding && res.data) {
          setIsAdding(false);
          setSelectedProviderId(res.data.id);
        }
      } else {
        toast.error(res.message || 'Gagal menyimpan konfigurasi.');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  }, [formData, isAdding, selectedProviderId, refreshProviders, toast]);

  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConnection({
        id: selectedProviderId ?? undefined,
        providerType: formData.providerType,
        baseUrl: formData.baseUrl,
        apiKey: formData.apiKey || undefined,
        modelId: formData.modelId,
      });
      if (res.success && res.data) {
        setTestResult(res.data);
        if (res.data.success) {
          toast.success('Koneksi berhasil!');
        } else {
          toast.error(res.data.message || 'Koneksi gagal.');
        }
      } else {
        toast.error(res.message || 'Gagal menguji koneksi.');
      }
    } catch (err: any) {
      toast.error('Gagal menguji koneksi ke server.');
    } finally {
      setTesting(false);
    }
  }, [formData, selectedProviderId, toast]);

  const handleSetActive = useCallback(
    async (id: string) => {
      setSettingActiveId(id);
      try {
        const res = await setActiveAiProvider(id);
        if (res.success) {
          toast.success('Provider aktif berhasil diubah!');
          await refreshProviders();
        } else {
          toast.error(res.message || 'Gagal mengubah provider aktif.');
        }
      } catch (err: any) {
        toast.error('Gagal mengubah provider aktif.');
      } finally {
        setSettingActiveId(null);
      }
    },
    [refreshProviders, toast]
  );

  const handleDeleteConfirm = useCallback(
    async () => {
      const id = deleteConfirm.id;
      if (!id) return;
      setDeletingId(id);
      try {
        const res = await deleteAiProvider(id);
        if (res.success) {
          toast.success('Provider berhasil dihapus.');
          if (selectedProviderId === id) {
            setSelectedProviderId(null);
            setIsAdding(false);
          }
          await refreshProviders();
        } else {
          toast.error(res.message || 'Gagal menghapus provider.');
        }
      } catch (err: any) {
        toast.error('Gagal menghapus provider.');
      } finally {
        setDeletingId(null);
        setDeleteConfirm({ isOpen: false, id: '', name: '' });
      }
    },
    [deleteConfirm.id, selectedProviderId, refreshProviders, toast]
  );

  const handleCancelForm = useCallback(() => {
    setIsAdding(false);
    setSelectedProviderId(null);
    setModels([]);
    setModelSearch('');
    setTestResult(null);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Render helpers
  // ═══════════════════════════════════════════════════════════════════════════

  const renderStatusBadges = (provider: AiProviderRecord) => {
    const badges: React.ReactNode[] = [];

    if (provider.isActive) {
      badges.push(
        <span key="active" style={styles.statusBadge('#dcfce7', '#166534')}>
          <Zap size={10} /> AKTIF
        </span>
      );
    }
    if (provider.isFallback) {
      badges.push(
        <span key="fallback" style={styles.statusBadge('#dbeafe', '#1e40af')}>
          <Shield size={10} /> Fallback
        </span>
      );
    }

    if (provider.connectionStatus === 'CONNECTED') {
      badges.push(
        <span key="verified" style={styles.statusBadge('transparent', '#16a34a', '1px solid #bbf7d0')}>
          <CheckCircle2 size={10} /> Terverifikasi
        </span>
      );
    } else if (provider.connectionStatus === 'FAILED') {
      badges.push(
        <span key="failed" style={styles.statusBadge('#fef2f2', '#dc2626')}>
          <XCircle size={10} /> Gagal
        </span>
      );
    } else {
      badges.push(
        <span key="unverified" style={styles.statusBadge('transparent', '#d97706', '1px solid #fed7aa')}>
          <AlertCircle size={10} /> Belum Diverifikasi
        </span>
      );
    }

    return badges;
  };

  const renderProviderCard = (provider: AiProviderRecord) => {
    const uiInfo = PROVIDER_UI_MAP[provider.providerType] ?? PROVIDER_UI_MAP.custom!;
    const isSelected = provider.id === selectedProviderId;

    return (
      <div
        key={provider.id}
        style={{
          ...styles.providerCard(provider.isActive, isSelected),
          animation: 'fadeInUp 0.2s ease-out',
        }}
        onClick={() => handleSelectProvider(provider)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleSelectProvider(provider)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={styles.providerIcon(uiInfo.gradient)}>{uiInfo.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary, #1e293b)' }}>
              {provider.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.1rem' }}>
              {uiInfo.label} • <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{provider.modelId}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
              {renderStatusBadges(provider)}
            </div>
            {provider.lastTestedAt && (
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary, #94a3b8)',
                  marginTop: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <Clock size={10} />
                Terakhir diuji: {formatDate(provider.lastTestedAt)}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            marginTop: '0.65rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-light, #f1f5f9)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="secondary"
            size="sm"
            icon={<Edit3 size={13} />}
            onClick={() => handleSelectProvider(provider)}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
          >
            Edit
          </Button>
          {!provider.isActive && (
            <Button
              variant="secondary"
              size="sm"
              icon={settingActiveId === provider.id ? <Loader2 size={13} style={styles.spinner} /> : <Radio size={13} />}
              disabled={settingActiveId === provider.id}
              onClick={() => handleSetActive(provider.id)}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
            >
              Set Aktif
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={deletingId === provider.id ? <Loader2 size={13} style={styles.spinner} /> : <Trash2 size={13} />}
            disabled={deletingId === provider.id}
            onClick={() => setDeleteConfirm({ isOpen: true, id: provider.id, name: provider.name })}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: '#dc2626' }}
          >
            Hapus
          </Button>
        </div>
      </div>
    );
  };

  // ── Right panel: form ──
  const renderForm = () => {
    const isEditing = !isAdding && !!selectedProviderId;
    const currentDefaults = PROVIDER_DEFAULTS[formData.providerType] ?? PROVIDER_DEFAULTS.custom!;

    return (
      <>
        {/* Form Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-light, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)' }}>
            {isEditing ? `Edit: ${formData.name}` : 'Tambah Provider Baru'}
          </h3>
          <button
            onClick={handleCancelForm}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #64748b)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              textDecoration: 'underline',
            }}
          >
            Batal
          </button>
        </div>

        <div style={styles.formSection}>
          {/* Provider type */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Tipe Provider</label>
            <div style={{ position: 'relative' }}>
              <select
                value={formData.providerType}
                onChange={(e) => handleProviderTypeChange(e.target.value)}
                style={styles.select}
              >
                {Object.entries(PROVIDER_UI_MAP).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.icon} {info.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Name */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Nama Provider</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="Nama provider..."
              style={styles.input}
            />
          </div>

          {/* Base URL */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Base URL</label>
            <input
              type="text"
              value={formData.baseUrl}
              onChange={(e) => handleFormChange('baseUrl', e.target.value)}
              placeholder={currentDefaults.baseUrl || 'https://api.example.com/v1'}
              style={{ ...styles.input, fontFamily: 'monospace', fontSize: '0.82rem' }}
            />
          </div>

          {/* API Key */}
          <div style={styles.formGroup}>
            <label style={styles.label}>API Key</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => handleFormChange('apiKey', e.target.value)}
                placeholder={currentDefaults.apiKeyPlaceholder}
                style={{ ...styles.input, paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary, #64748b)',
                  padding: '0.25rem',
                  display: 'flex',
                }}
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {isEditing && (
              <p style={styles.note}>
                💡 Biarkan kosong untuk menggunakan key tersimpan.
              </p>
            )}
          </div>

          {/* Model ID */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Model ID</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={formData.modelId}
                onChange={(e) => handleFormChange('modelId', e.target.value)}
                placeholder={currentDefaults.modelId || 'model-id'}
                style={{ ...styles.input, flex: 1, fontFamily: 'monospace', fontSize: '0.82rem' }}
              />
              <Button
                variant="secondary"
                size="sm"
                icon={loadingModels ? <Loader2 size={14} style={styles.spinner} /> : <RefreshCw size={14} />}
                disabled={loadingModels}
                onClick={handleFetchModels}
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Muat Model
              </Button>
            </div>
          </div>

          {/* Model list */}
          {models.length > 0 && (
            <div style={{ ...styles.formGroup, animation: 'fadeInUp 0.2s ease-out' }}>
              <label style={styles.label}>
                Model Tersedia
                <span
                  style={{
                    fontWeight: 400,
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary, #94a3b8)',
                    marginLeft: '0.4rem',
                  }}
                >
                  ({filteredModels.length} dari {models.length})
                </span>
              </label>
              {/* Search */}
              <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary, #94a3b8)',
                  }}
                />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Cari model..."
                  style={{ ...styles.input, paddingLeft: '2rem' }}
                />
              </div>
              <div style={styles.modelListContainer}>
                {filteredModels.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.82rem' }}>
                    Tidak ada model yang cocok.
                  </div>
                ) : (
                  filteredModels.map((model) => {
                    const isSelected = formData.modelId === model.id;
                    return (
                      <div
                        key={model.id}
                        style={styles.modelItem(isSelected)}
                        onClick={() => handleSelectModel(model.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleSelectModel(model.id)}
                      >
                        <div style={styles.radioCircle(isSelected)} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: '0.82rem',
                              color: 'var(--text-primary, #1e293b)',
                              fontFamily: 'monospace',
                            }}
                          >
                            {model.id}
                          </div>
                          {model.name && model.name !== model.id && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.1rem' }}>
                              {model.name}
                            </div>
                          )}
                          {model.description && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '0.15rem' }}>
                              {model.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Checkboxes */}
          <div style={{ marginTop: '0.5rem' }}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleFormChange('isActive', e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }}
              />
              <span>
                <strong>Jadikan Provider Aktif</strong> Setelah Disimpan
              </span>
            </label>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={formData.isFallback}
                onChange={(e) => handleFormChange('isFallback', e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }}
              />
              <span>
                <strong>Jadikan Provider Fallback</strong> Cadangan
              </span>
            </label>
          </div>

          {/* Test result */}
          {testResult && (
            <div style={styles.testResultPanel(testResult.success)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {testResult.success ? (
                  <CheckCircle2 size={20} color="#16a34a" />
                ) : (
                  <XCircle size={20} color="#dc2626" />
                )}
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: testResult.success ? '#166534' : '#991b1b',
                  }}
                >
                  {testResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.6 }}>
                <div>
                  <strong>Latensi:</strong> {testResult.latencyMs} ms
                </div>
                <div>
                  <strong>Pesan:</strong> {testResult.message}
                </div>
                {testResult.modelTested && (
                  <div>
                    <strong>Model:</strong>{' '}
                    <code
                      style={{
                        background: 'rgba(0,0,0,0.06)',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                      }}
                    >
                      {testResult.modelTested}
                    </code>
                  </div>
                )}
                {testResult.sampleReply && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>Contoh Balasan AI:</strong>
                    <div
                      style={{
                        marginTop: '0.3rem',
                        padding: '0.65rem',
                        background: 'rgba(0,0,0,0.04)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.82rem',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        fontStyle: 'italic',
                      }}
                    >
                      {testResult.sampleReply}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action bar */}
        <div style={styles.actionBar}>
          <Button
            variant="primary"
            size="md"
            icon={saving ? <Loader2 size={16} style={styles.spinner} /> : <Save size={16} />}
            disabled={saving || testing}
            onClick={handleSave}
            style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={testing ? <Loader2 size={16} style={styles.spinner} /> : <Play size={16} />}
            disabled={testing || saving || !formData.modelId}
            onClick={handleTestConnection}
          >
            {testing ? 'Menguji...' : 'Uji Koneksi'}
          </Button>
        </div>
      </>
    );
  };

  // ── Right panel: placeholder ──
  const renderPlaceholder = () => (
    <div style={styles.placeholderPanel}>
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <Bot size={36} color="#6366f1" />
      </div>
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>
        Konfigurasi AI Chatbot
      </h3>
      <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, maxWidth: '380px' }}>
        Pilih provider dari daftar di sebelah kiri untuk melihat atau mengedit konfigurasinya,
        atau klik <strong>"Tambah Provider"</strong> untuk menambahkan provider AI baru.
      </p>
      <div
        style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'var(--bg-secondary, #f8fafc)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.82rem',
          lineHeight: 1.7,
          textAlign: 'left',
          maxWidth: '380px',
          border: '1px solid var(--border-light, #e2e8f0)',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary, #334155)' }}>
          💡 Tips Konfigurasi:
        </div>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          <li>Siapkan API key dari provider yang dipilih</li>
          <li>Gunakan "Uji Koneksi" untuk memverifikasi</li>
          <li>Tetapkan satu provider sebagai <strong>Aktif</strong></li>
          <li>Opsional: tetapkan provider <strong>Fallback</strong></li>
        </ul>
      </div>
    </div>
  );

  // ── Loading skeleton for left panel ──
  const renderLoadingSkeleton = () => (
    <>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-light, #e2e8f0)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: '14px',
                  width: '60%',
                  background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                  borderRadius: '4px',
                  marginBottom: '0.4rem',
                }}
              />
              <div
                style={{
                  height: '10px',
                  width: '80%',
                  background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Main Render
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <>
      <div
        style={{
          ...styles.container,
          ...(isMobile ? styles.containerMobile : {}),
        }}
      >
        {/* ──── LEFT PANEL ──── */}
        <div
          style={{
            ...styles.leftPanel,
            ...(isMobile ? styles.leftPanelMobile : {}),
          }}
        >
          {/* Header */}
          <div style={styles.headerCard}>
            <h2 style={styles.headerTitle}>
              <Cpu size={22} />
              Konfigurasi AI Chatbot
              <span style={styles.badge}>{providers.length}</span>
            </h2>
            <p style={styles.headerSub}>Kelola provider dan model AI untuk chatbot apotek</p>
          </div>

          {/* Add button */}
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
            onClick={handleAddNew}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              borderColor: 'transparent',
              justifyContent: 'center',
            }}
          >
            Tambah Provider
          </Button>

          {/* Provider list */}
          <div style={styles.listContainer}>
            {loadingProviders ? (
              renderLoadingSkeleton()
            ) : providers.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2rem 1rem',
                  color: 'var(--text-secondary, #94a3b8)',
                  fontSize: '0.85rem',
                }}
              >
                <Settings size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                <div>Belum ada provider dikonfigurasi.</div>
                <div style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
                  Klik "Tambah Provider" untuk memulai.
                </div>
              </div>
            ) : (
              providers.map(renderProviderCard)
            )}
          </div>
        </div>

        {/* ──── RIGHT PANEL ──── */}
        <div style={styles.rightPanel}>
          {isAdding || selectedProviderId ? renderForm() : renderPlaceholder()}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Hapus Provider"
        message={`Apakah Anda yakin ingin menghapus provider "${deleteConfirm.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: '', name: '' })}
        isLoading={!!deletingId}
      />
    </>
  );
};

export default AiProviderConfigView;
