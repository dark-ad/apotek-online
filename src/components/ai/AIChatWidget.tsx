import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sendAiMessage, AI_QUICK_PROMPTS, ChatMessage } from '../../services/aiService';
import {
  Bot,
  X,
  Send,
  Sparkles,
  ShieldAlert,
  Trash2,
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

// ─── Component ────────────────────────────────────────────────────────────────
interface AIChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: 'Halo! Saya **Asisten AI Apotek Sehat AI** 👋\n\nSaya siap membantu Anda:\n- Menemukan produk obat yang tersedia\n- Informasi dasar tentang produk farmasi\n- Menjawab pertanyaan tentang layanan apotek\n\n⚠️ *Catatan: Saya bukan dokter dan tidak dapat memberikan diagnosis atau resep medis. Untuk kondisi serius, selalu konsultasikan ke tenaga kesehatan.*\n\nAda yang bisa saya bantu?',
  timestamp: new Date(),
};

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendAiMessage(text, messages);

      if (response.success && response.data?.reply) {
        const aiMsg: ChatMessage = {
          id: generateId(),
          role: 'model',
          text: response.data.reply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errMsg: ChatMessage = {
          id: generateId(),
          role: 'model',
          text: response.message || 'Terjadi kesalahan. Silakan coba lagi.',
          timestamp: new Date(),
          isError: true,
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch {
      const errMsg: ChatMessage = {
        id: generateId(),
        role: 'model',
        text: 'Tidak dapat terhubung ke layanan AI. Periksa koneksi internet Anda.',
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errMsg]);
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

  const handleClearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setInputValue('');
  };

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
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
            AI Asisten Apotek
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#34d399',
                display: 'inline-block',
              }}
            />
            <span style={{ color: '#34d399', fontSize: '0.75rem' }}>Online · Gemini 1.5 Flash</span>
          </div>
        </div>
        <button
          onClick={handleClearChat}
          title="Hapus percakapan"
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
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          <Trash2 size={15} />
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
          {AI_QUICK_PROMPTS.slice(0, 4).map((prompt) => (
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