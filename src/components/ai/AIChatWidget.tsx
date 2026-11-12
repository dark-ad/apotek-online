import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sendAiMessage, getAiQuickPrompts, getAiAccessLabel, ChatMessage } from '../../services/aiService';
import { useAuth, AuthUser } from '../../context/AuthContext';
import {
  Bot,
  RotateCcw,
  X,
  Send,
  Sparkles,
  ShieldAlert,
    MessageCircle,
  ChevronDown,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// Simple markdown → HTML renderer for bold/italic/bullets
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\n/g, '<br/>');
}

// ─── Per-User Chat Isolation & Auto-Refresh (Anti-Numpuk) ───────────────────
const MAX_ACTIVE_MESSAGES = 8; // Maksimal 8 pesan aktif (4 pasang Q&A) agar obrolan tidak menumpuk
const SESSION_EXPIRY_MS = 5 * 60 * 1000; // 5 menit tidak aktif -> otomatis refresh sesi baru
const AUTOREFRESH_KEY = 'apotek_ai_autorefresh_enabled';

interface StoredChatPayload {
  messages: any[];
  lastActive: number;
}

function getInitialMessageForUser(user: AuthUser | null): ChatMessage {
  if (user?.role === 'ADMIN') {
    return {
      id: `welcome-${user.id}`,
      role: 'model',
      text: `Halo **${user.name}**! Saya **Asisten AI Apotek Sehat AI** 👨‍⚕️💊\n\nAnda login sebagai **ADMIN** dengan **akses penuh**:\n- Seluruh katalog obat (termasuk produk nonaktif), stok & harga live\n- Seluruh data pengguna (ADMIN/STAFF/CUSTOMER) dan profilnya\n- Seluruh pesanan, transaksi, omzet, dan insight operasional\n- Konsultasi obat & panduan alur website\n\nAda data atau obat yang ingin Anda periksa hari ini, Kak **${user.name}**?`,
      timestamp: new Date(),
    };
  }

  if (user?.role === 'STAFF') {
    return {
      id: `welcome-${user.id}`,
      role: 'model',
      text: `Halo **${user.name}**! Saya **Asisten AI Apotek Sehat AI** 👨‍⚕️💊\n\nAnda login sebagai **STAFF** dengan **akses terbatas**:\n- Katalog obat, stok, harga & aturan resep\n- Antrean pesanan dan status verifikasi resep\n- Daftar pelanggan (nama, kontak tersamar, jumlah pesanan)\n- Insight operasional (omzet & data akun ADMIN hanya untuk Admin)\n\nAda yang bisa saya bantu, Kak **${user.name}**?`,
      timestamp: new Date(),
    };
  }

  if (user) {
    return {
      id: `welcome-${user.id}`,
      role: 'model',
      text: `Halo **${user.name}**! Saya **Asisten AI Apotek Sehat AI** 👨‍⚕️💊\n\nSaya siap membantu Anda:\n- Konsultasi gejala ringan & rekomendasi obat ready stock\n- Info obat resmi, harga & ketersediaan stok live\n- Cek keranjang belanja & status pesanan **milik Anda sendiri**\n- Panduan alur pemesanan dan resep dokter\n\n🔒 *Data pengguna lain dan data operasional toko tidak dapat diakses dari akun pelanggan.*\n\nAda yang bisa saya bantu hari ini, Kak **${user.name}**?`,
      timestamp: new Date(),
    };
  }

  return {
    id: 'welcome-guest',
    role: 'model',
    text: 'Halo! Saya **Asisten AI Apotek Sehat AI** 👨‍⚕️💊\n\nSaya terhubung ke katalog obat apotek dan bisa membantu:\n- Konsultasi gejala ringan & rekomendasi obat ready stock\n- Menemukan produk obat, indikasi, harga & stok live\n- Informasi obat bebas & obat wajib resep dokter\n- Panduan alur website, upload resep dokter & pemesanan\n\n💡 *Silakan **Login** untuk memeriksa keranjang belanja & status pesanan Anda. Data pengguna lain hanya dapat diakses Admin/Staff.*\n\nAda yang bisa saya bantu hari ini?',
    timestamp: new Date(),
  };
}

function getChatStorageKey(userId?: string | null): string {
  return `apotek_ai_chat_v3_${userId || 'guest'}`;
}

// Otomatis pangkas pesan lama agar obrolan tidak menumpuk (Anti-Numpuk Sliding Window)
function pruneMessages(msgs: ChatMessage[], user: AuthUser | null): ChatMessage[] {
  if (msgs.length <= MAX_ACTIVE_MESSAGES) return msgs;
  const initial = getInitialMessageForUser(user);
  const recent = msgs.slice(-(MAX_ACTIVE_MESSAGES - 1));
  return [initial, ...recent.filter((m) => m.id !== initial.id)];
}

function saveChatForUser(userId: string | null | undefined, msgs: ChatMessage[], user: AuthUser | null) {
  try {
    const key = getChatStorageKey(userId);
    const pruned = pruneMessages(msgs, user);
    const payload: StoredChatPayload = {
      messages: pruned,
      lastActive: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save chat history:', err);
  }
}

function loadChatForUser(user: AuthUser | null): ChatMessage[] {
  try {
    const key = getChatStorageKey(user?.id);
    const saved = localStorage.getItem(key);
    const autoRefreshOn = localStorage.getItem(AUTOREFRESH_KEY) !== 'false';
    if (saved) {
      let rawMsgs: any[] = [];
      let lastActive: number | undefined;

      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          rawMsgs = parsed;
        } else if (parsed && typeof parsed === 'object') {
          rawMsgs = parsed.messages || [];
          lastActive = parsed.lastActive;
        }
      } catch {}

      // Jika Auto-Refresh aktif dan sesi terakhir sudah lebih dari SESSION_EXPIRY_MS (5 menit)
      if (autoRefreshOn && lastActive && Date.now() - lastActive > SESSION_EXPIRY_MS) {
        localStorage.removeItem(key);
        return [getInitialMessageForUser(user)];
      }

      if (Array.isArray(rawMsgs) && rawMsgs.length > 0) {
        const mapped = rawMsgs.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp || Date.now()),
        }));
        return pruneMessages(mapped, user);
      }
    }
  } catch (err) {
    console.error('Failed to load chat history:', err);
  }
  return [getInitialMessageForUser(user)];
}

// ─── Component ────────────────────────────────────────────────────────────────
interface AIChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const quickPrompts = getAiQuickPrompts(user?.role ?? null);
  const accessInfo = getAiAccessLabel(user?.role ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatForUser(user));
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(() => {
    return localStorage.getItem(AUTOREFRESH_KEY) !== 'false';
  });
  const [refreshToast, setRefreshToast] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Switch chat conversation when user changes (BEDA USER = BEDA CHAT)
  const prevUserIdRef = useRef<string | undefined>(user?.id);
  useEffect(() => {
    if (prevUserIdRef.current !== user?.id) {
      prevUserIdRef.current = user?.id;
      setMessages(loadChatForUser(user));
      setInputValue('');
    }
  }, [user]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToBottom('instant');
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    if (!isLoading) scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollBtn(!isNearBottom);
  };

  const handleSend = async (msg?: string) => {
    const text = (msg ?? inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      text,
      timestamp: new Date(),
    };

    const newMessages = pruneMessages([...messages, userMsg], user);
    setMessages(newMessages);
    saveChatForUser(user?.id, newMessages, user);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendAiMessage(text, newMessages);

      if (response.success && response.data?.reply) {
        const aiMsg: ChatMessage = {
          id: generateId(),
          role: 'model',
          text: response.data.reply,
          timestamp: new Date(),
        };
        const updated = pruneMessages([...newMessages, aiMsg], user);
        setMessages(updated);
        saveChatForUser(user?.id, updated, user);
      } else {
        const errMsg: ChatMessage = {
          id: generateId(),
          role: 'model',
          text: response.message || 'Terjadi kesalahan. Silakan coba lagi.',
          timestamp: new Date(),
          isError: true,
        };
        const updated = pruneMessages([...newMessages, errMsg], user);
        setMessages(updated);
        saveChatForUser(user?.id, updated, user);
      }
    } catch {
      const errMsg: ChatMessage = {
        id: generateId(),
        role: 'model',
        text: 'Tidak dapat terhubung ke layanan AI. Periksa koneksi internet Anda.',
        timestamp: new Date(),
        isError: true,
      };
      const updated = pruneMessages([...newMessages, errMsg], user);
      setMessages(updated);
      saveChatForUser(user?.id, updated, user);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleAutoRefresh = () => {
    const nextVal = !autoRefreshEnabled;
    setAutoRefreshEnabled(nextVal);
    localStorage.setItem(AUTOREFRESH_KEY, nextVal ? 'true' : 'false');
    setRefreshToast(nextVal ? '🔄 Auto-Refresh diaktifkan (otomatis bersihkan chat lama)' : '⏸️ Auto-Refresh dinonaktifkan');
    setTimeout(() => setRefreshToast(null), 2500);
  };

  const handleClearChat = (silent = false, customMsg?: string) => {
    setIsRefreshing(true);
    const key = getChatStorageKey(user?.id);
    localStorage.removeItem(key);
    const initial = [getInitialMessageForUser(user)];
    setMessages(initial);
    setInputValue('');
    setTimeout(() => setIsRefreshing(false), 300);
    if (!silent) {
      setRefreshToast(customMsg || '✨ Obrolan berhasil disegarkan!');
      setTimeout(() => setRefreshToast(null), 2500);
    }
  };

  // Otomatis refresh saat modal dibuka kembali setelah jeda (agar chat tidak numpuk)
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (autoRefreshEnabled) {
        const key = getChatStorageKey(user?.id);
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const lastActive = parsed?.lastActive;
            // Jika chat lama ditutup lebih dari 2 menit lalu, otomatis mulai percakapan baru
            if (lastActive && Date.now() - lastActive > 2 * 60 * 1000) {
              handleClearChat(false, '✨ Obrolan otomatis disegarkan agar tidak menumpuk');
            }
          } catch {}
        }
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, autoRefreshEnabled, user]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        width: 'min(420px, calc(100vw - 2rem))',
        height: 'min(600px, calc(100vh - 5rem))',
        background: 'var(--secondary-900)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '1rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1001,
        overflow: 'hidden',
        animation: 'slideUpIn 0.25s ease',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '1rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(14, 165, 233, 0.2))',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6, #0ea5e9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <Bot size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
              AI Asisten Apotek
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '0.75rem',
                background: user ? 'rgba(139, 92, 246, 0.28)' : 'rgba(255, 255, 255, 0.1)',
                color: user ? '#c4b5fd' : '#94a3b8',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                maxWidth: '130px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={user ? `Sesi akun: ${user.name} (${user.role})` : 'Sesi Tamu (Belum Login)'}
            >
              👤 {user ? user.name : 'Tamu'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#34d399',
                display: 'inline-block',
              }}
            />
            <span style={{ color: '#34d399', fontSize: '0.75rem' }}>Online</span>
            <span
              title={accessInfo.description}
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                color: accessInfo.color,
                background: 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${accessInfo.color}55`,
                borderRadius: '0.6rem',
                padding: '0.05rem 0.4rem',
                whiteSpace: 'nowrap',
              }}
            >
              🔐 {accessInfo.label}
            </span>
          </div>
        </div>
        <button
          onClick={() => handleClearChat(false)}
          title="Segarkan Chat / Mulai Sesi Baru"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: isRefreshing ? '#38bdf8' : '#cbd5e1',
            cursor: 'pointer',
            padding: '0.35rem 0.55rem',
            borderRadius: '0.45rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.72rem',
            fontWeight: 600,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#38bdf8';
            e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = isRefreshing ? '#38bdf8' : '#cbd5e1';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
        >
          <RotateCcw size={13} style={{ transform: isRefreshing ? 'rotate(-180deg)' : 'none', transition: 'transform 0.3s' }} />
          <span>Refresh</span>
        </button>
        <button
          onClick={toggleAutoRefresh}
          title={autoRefreshEnabled ? 'Auto-Refresh Aktif (Otomatis bersihkan obrolan lama agar tidak menumpuk). Klik untuk mematikan.' : 'Auto-Refresh Nonaktif. Klik untuk mengaktifkan.'}
          style={{
            background: autoRefreshEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: autoRefreshEnabled ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
            color: autoRefreshEnabled ? '#34d399' : '#94a3b8',
            cursor: 'pointer',
            padding: '0.3rem 0.45rem',
            borderRadius: '0.45rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.68rem',
            fontWeight: 600,
          }}
        >
          <Sparkles size={11} />
          <span>Auto {autoRefreshEnabled ? 'ON' : 'OFF'}</span>
        </button>
        <button
          onClick={onClose}
          title="Tutup"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '0.35rem',
            borderRadius: '0.35rem',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          <X size={18} />
        </button>
      </div>

      {refreshToast && (
        <div
          style={{
            padding: '0.45rem 1rem',
            background: 'rgba(16, 185, 129, 0.22)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#a7f3d0',
            fontSize: '0.74rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            animation: 'fadeIn 0.2s ease',
            flexShrink: 0,
          }}
        >
          <Sparkles size={13} />
          <span>{refreshToast}</span>
        </div>
      )}
      {/* ── Safety Notice ── */}
      <div
        style={{
          padding: '0.5rem 1rem',
          background: 'rgba(245, 158, 11, 0.08)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexShrink: 0,
        }}
      >
        <ShieldAlert size={13} color="#fbbf24" />
        <span style={{ fontSize: '0.72rem', color: '#fbbf24', lineHeight: 1.4 }}>
          AI ini tidak dapat mendiagnosis penyakit. Untuk kondisi darurat, hubungi dokter segera.
        </span>
      </div>

      {/* ── Messages ── */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(139, 92, 246, 0.3) transparent',
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'flex-start',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: '1.9rem',
                height: '1.9rem',
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 700,
                background:
                  msg.role === 'user'
                    ? 'linear-gradient(135deg, #334155, #475569)'
                    : 'linear-gradient(135deg, #8b5cf6, #0ea5e9)',
                color: '#fff',
              }}
            >
              {msg.role === 'user' ? 'U' : <Bot size={12} />}
            </div>

            {/* Bubble */}
            <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  padding: '0.6rem 0.9rem',
                  borderRadius:
                    msg.role === 'user'
                      ? '1rem 0.25rem 1rem 1rem'
                      : '0.25rem 1rem 1rem 1rem',
                  background: msg.isError
                    ? 'rgba(239, 68, 68, 0.15)'
                    : msg.role === 'user'
                    ? 'linear-gradient(135deg, #7c3aed, #0369a1)'
                    : 'rgba(30, 41, 59, 0.9)',
                  border: msg.isError
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : msg.role === 'model'
                    ? '1px solid rgba(139, 92, 246, 0.2)'
                    : 'none',
                  color: msg.isError ? '#fca5a5' : '#e2e8f0',
                  fontSize: '0.85rem',
                  lineHeight: 1.55,
                }}
              >
                {msg.isError && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.3rem', color: '#f87171' }}>
                    <AlertCircle size={13} /> Gagal
                  </span>
                )}
                <div
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                  style={{ wordBreak: 'break-word' }}
                />
              </div>
              <span style={{ fontSize: '0.68rem', color: '#475569', paddingInline: '0.25rem' }}>
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '1.9rem',
                height: '1.9rem',
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #8b5cf6, #0ea5e9)',
                color: '#fff',
              }}
            >
              <Bot size={12} />
            </div>
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '0.25rem 1rem 1rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#a78bfa',
                fontSize: '0.82rem',
              }}
            >
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Sedang memproses...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          style={{
            position: 'absolute',
            bottom: '5rem',
            right: '1rem',
            width: '2rem',
            height: '2rem',
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.8)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <ChevronDown size={16} />
        </button>
      )}

      {/* ── Banner Obrolan Panjang (Anti-Numpuk) ── */}
      {messages.length >= 6 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '0.35rem 1rem 0.15rem',
            padding: '0.35rem 0.65rem',
            background: 'rgba(139, 92, 246, 0.12)',
            border: '1px dashed rgba(139, 92, 246, 0.3)',
            borderRadius: '0.5rem',
            fontSize: '0.72rem',
            color: '#c4b5fd',
            flexShrink: 0,
          }}
        >
          <span>💬 ${messages.length} pesan aktif · Auto-refresh aktif</span>
          <button
            onClick={() => handleClearChat(false)}
            style={{
              background: 'rgba(139, 92, 246, 0.25)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              color: '#fff',
              borderRadius: '0.35rem',
              padding: '0.2rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <RotateCcw size={11} />
            <span>Segarkan</span>
          </button>
        </div>
      )}

      {/* ── Quick Prompts ── */}
      {messages.length <= 2 && !isLoading && (
        <div
          style={{
            padding: '0.5rem 1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            gap: '0.4rem',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          {quickPrompts.slice(0, 4).map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              disabled={isLoading}
              style={{
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '1rem',
                color: '#a78bfa',
                fontSize: '0.72rem',
                padding: '0.25rem 0.65rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)';
                e.currentTarget.style.color = '#c4b5fd';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.12)';
                e.currentTarget.style.color = '#a78bfa';
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* ── Input ── */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          flexShrink: 0,
          background: 'rgba(15, 23, 42, 0.5)',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ketik pertanyaan Anda... (maks. 500 karakter)"
          maxLength={500}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '0.6rem 0.9rem',
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '0.65rem',
            color: '#e2e8f0',
            fontSize: '0.85rem',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(139, 92, 246, 0.7)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)')}
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !inputValue.trim()}
          style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '0.65rem',
            background:
              isLoading || !inputValue.trim()
                ? 'rgba(139, 92, 246, 0.3)'
                : 'linear-gradient(135deg, #7c3aed, #0369a1)',
            border: 'none',
            color: '#fff',
            cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};

// ─── Floating Trigger Button ───────────────────────────────────────────────────
interface AIFloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
  hasUnread?: boolean;
}

export const AIFloatingButton: React.FC<AIFloatingButtonProps> = ({ onClick, isOpen, hasUnread }) => {
  return (
    <button
      id="ai-chat-trigger"
      className="ai-floating-btn"
      onClick={onClick}
      title={isOpen ? 'Tutup AI Assistant' : 'Buka AI Assistant'}
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        width: '3.5rem',
        height: '3.5rem',
        borderRadius: '50%',
        background: isOpen
          ? 'rgba(30, 41, 59, 0.95)'
          : 'linear-gradient(135deg, #7c3aed, #0369a1)',
        border: isOpen ? '2px solid rgba(139, 92, 246, 0.5)' : 'none',
        color: '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 30px rgba(124, 58, 237, 0.5)',
        zIndex: 1000,
        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: isOpen ? 'rotate(0deg) scale(1)' : 'scale(1)',
      }}
      onMouseEnter={(e) => {
        if (!isOpen) e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      {/* Unread badge */}
      {hasUnread && !isOpen && (
        <span
          style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: '#ef4444',
            border: '2px solid var(--secondary-900)',
            fontSize: '0.6rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
          }}
        >
          <Sparkles size={8} />
        </span>
      )}
    </button>
  );
};