import React, { useState } from 'react';
import { AI_CHAT_SAMPLES } from '../../data/mockData';
import { 
  Bot, 
  Sparkles, 
  Send, 
  ShieldAlert, 
  Zap,
  HeartPulse
} from 'lucide-react';

interface AIAssistantTeaserProps {
  onSelectMedicine?: (medicineId: string) => void;
  activePromptIndex?: number;
  onOpenChat?: () => void;
}

export const AIAssistantTeaser: React.FC<AIAssistantTeaserProps> = ({
  activePromptIndex = 0,
  onOpenChat,
}) => {
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number>(activePromptIndex);
  const [customInput, setCustomInput] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [customChat, setCustomChat] = useState<{
    symptom: string;
    recommendation: string;
    caution: string;
  } | null>(null);

  const currentChat = customChat || AI_CHAT_SAMPLES[selectedSampleIndex];

  const handleSelectSample = (idx: number) => {
    setSelectedSampleIndex(idx);
    setCustomChat(null);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    // Open the real AI chat with the typed question
    if (onOpenChat) {
      onOpenChat();
    } else {
      // Fallback simulation if no real chat is wired
      setIsSimulating(true);
      const userQuery = customInput;
      setCustomInput('');
      setTimeout(() => {
        setCustomChat({
          symptom: userQuery,
          recommendation: `Berdasarkan keluhan "${userQuery}", silakan gunakan AI Assistant kami untuk mendapatkan rekomendasi produk yang tersedia di katalog kami secara real-time.`,
          caution: 'Catatan AI: Asisten AI memberikan panduan awal berdasarkan katalog produk apotek. Bila timbul gejala berat, harap segera periksa ke dokter.'
        });
        setIsSimulating(false);
      }, 600);
    }
  };

  return (
    <section id="ai-assistant" className="section" style={{ background: 'transparent' }}>
      <div className="container">
        <div className="ai-section">
          <div className="ai-grid">
            {/* Left Column: Value Proposition & Information */}
            <div>
              <div className="ai-tag">
                <Sparkles size={15} />
                <span>AI Health Assistant 24/7</span>
              </div>

              <h2 className="ai-heading">
                Konsultasi Gejala Awal Jadi Lebih Cepat & Terarah
              </h2>

              <p className="ai-desc">
                Teknologi AI apotek kami menganalisis keluhan fisik ringan yang Anda alami dan memberikan rekomendasi obat bebas yang tepat, dosis yang dianjurkan, serta batasan kehati-hatian sebelum membeli.
              </p>

              <div className="ai-feature-list">
                <div className="ai-feature-item">
                  <div className="ai-feature-icon">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600 }}>Rekomendasi Cepat & Akurat</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Dicocokkan dengan basis data obat resmi BPOM dan literatur farmasi klinis.</p>
                  </div>
                </div>

                <div className="ai-feature-item">
                  <div className="ai-feature-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600 }}>Protokol Keselamatan Farmasi</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>AI tidak memberikan resep obat keras tanpa supervisi dokter demi keselamatan pasien.</p>
                  </div>
                </div>

                <div className="ai-feature-item">
                  <div className="ai-feature-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                    <HeartPulse size={18} />
                  </div>
                  <div>
                    <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600 }}>Terintegrasi Langsung ke Keranjang</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Temukan obat yang direkomendasikan langsung dalam satu klik.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive AI Demo Screen */}
            <div className="ai-interactive-card">
              <div className="ai-card-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Bot size={18} />
                  </div>
                  <div>
                    <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 700 }}>Simulasi AI Apoteker</h4>
                    <span style={{ color: '#34d399', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }}></span>
                      Model Farmasi Aktif
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.08)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                  Interaktif Demo
                </span>
              </div>

              {/* Sample Prompt Chips */}
              <div style={{ marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>
                  Pilih contoh keluhan gejala:
                </span>
                <div className="ai-sample-pills">
                  {AI_CHAT_SAMPLES.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectSample(idx)}
                      className={`ai-sample-btn ${!customChat && selectedSampleIndex === idx ? 'active' : ''}`}
                    >
                      {idx === 0 ? 'Demam & Pusing' : idx === 1 ? 'Maag & Perih Ulu Hati' : 'Flu & Bersin Alergi'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Interaction Display */}
              <div className="ai-response-box">
                {/* User Message */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.75rem', flexShrink: 0 }}>
                    User
                  </div>
                  <div style={{ background: 'rgba(51, 65, 85, 0.6)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: '#e2e8f0', flex: 1 }}>
                    "{currentChat.symptom}"
                  </div>
                </div>

                {/* AI Response */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.5rem' }}>
                  <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', flexShrink: 0 }}>
                    <Bot size={14} />
                  </div>
                  <div style={{ background: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(139, 92, 246, 0.25)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: '#ffffff', flex: 1, lineHeight: 1.55 }}>
                    {isSimulating ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a78bfa' }}>
                        <Sparkles size={16} className="animate-spin" />
                        <span>AI sedang menganalisis gejala Anda...</span>
                      </div>
                    ) : (
                      <>
                        <p>{currentChat.recommendation}</p>

                        <div className="ai-caution-box" style={{ marginTop: '0.75rem' }}>
                          {currentChat.caution}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Custom Query Input Box */}
              <form onSubmit={handleCustomSubmit} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Ketik keluhan atau gejala lain (cth: batuk kering)..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.9rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-ai btn-sm"
                  disabled={isSimulating || !customInput.trim()}
                  style={{ padding: '0.65rem 1rem' }}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
