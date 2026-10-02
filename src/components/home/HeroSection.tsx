import React from 'react';
import { Button } from '../common/Button';
import { 
  Sparkles, 
  Search, 
  ShieldCheck, 
  Clock, 
  Truck, 
  Bot, 
  CheckCircle2, 
  ArrowRight,
  Pill
} from 'lucide-react';

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectAiPrompt: (promptIndex: number) => void;
  onOpenUploadModal: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  onSearchChange,
  onSelectAiPrompt,
  onOpenUploadModal
}) => {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-grid">
          {/* Left Column: Headline & Search */}
          <div className="hero-content">
            <div className="hero-pill">
              <Sparkles size={16} color="#059669" />
              <span>Teknologi Farmasi Digital + AI Cerdas</span>
            </div>

            <h1 className="hero-title">
              Pesan Obat Resmi & <br />
              <span className="gradient-text-emerald">Konsultasi AI</span> Terpercaya
            </h1>

            <p className="hero-desc">
              Solusi apotek online lengkap dengan bantuan <strong>AI Health Assistant</strong> untuk rekomendasi awal gejala, verifikasi resep dokter oleh <strong>Apoteker berlisensi SIPA</strong>, dan pengiriman aman langsung ke rumah Anda.
            </p>

            {/* Quick Medicine & Symptom Search */}
            <div className="hero-search-wrapper">
              <Search size={20} color="#64748b" style={{ marginLeft: '0.5rem' }} />
              <input
                type="text"
                className="hero-search-input"
                placeholder="Cari nama obat (cth: Paracetamol, Vitamin C, Antasida) atau gejala..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <a href="#katalog" className="btn btn-primary btn-md">
                <span>Cari Obat</span>
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hero-cta-group">
              <a href="#ai-assistant" className="btn btn-ai btn-lg">
                <Sparkles size={18} />
                <span>Konsultasi AI Gratis</span>
              </a>
              <Button
                variant="secondary"
                size="lg"
                onClick={onOpenUploadModal}
                icon={<ArrowRight size={18} />}
                iconPosition="right"
              >
                Upload Resep Dokter
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="trust-badges">
              <div className="trust-item">
                <ShieldCheck size={18} className="trust-icon" />
                <span>100% Obat Asli BPOM</span>
              </div>
              <div className="trust-item">
                <Clock size={18} className="trust-icon" />
                <span>Apoteker Siaga 24 Jam</span>
              </div>
              <div className="trust-item">
                <Truck size={18} className="trust-icon" />
                <span>Kirim Cepat Tersegel</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive AI & Pharmacy Simulation Card */}
          <div className="hero-visual-container">
            {/* Top Floating Card */}
            <div className="floating-stat-card floating-stat-top animate-float">
              <div style={{ background: '#dcfce7', padding: '0.5rem', borderRadius: '8px', color: '#059669' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary-900)' }}>Resep Terverifikasi</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)' }}>Oleh Apoteker Resmi SIPA</div>
              </div>
            </div>

            {/* Main Interactive Preview Card */}
            <div className="hero-main-card">
              <div className="ai-assistant-badge-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Bot size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Apotek Sehat AI Assistant</div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                      Aktif Siaga
                    </div>
                  </div>
                </div>
                <span className="badge badge-role" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                  AI Guidance
                </span>
              </div>

              {/* Sample Chat Flow */}
              <div className="chat-bubble chat-bubble-user">
                "Halo AI, saya merasa demam dan kepala agak pusing sejak semalam. Obat apa yang aman?"
              </div>

              <div className="chat-bubble chat-bubble-ai">
                <div>
                  Halo! Untuk meredakan demam dan sakit kepala ringan, Anda dapat menggunakan antipiretik seperti <strong>Paracetamol 500mg</strong>.
                </div>
                <div className="ai-pill-rec">
                  <Pill size={14} />
                  <span>Rekomendasi: Paracetamol 500mg (Rp6.500)</span>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  *Dosis: 1 kaplet sesudah makan (3x sehari). Jika demam &gt; 3 hari, konsultasikan ke dokter.
                </div>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--secondary-500)' }}>Coba tanya AI sekarang</span>
                <a 
                  href="#ai-assistant" 
                  className="btn btn-ai btn-sm"
                  onClick={() => onSelectAiPrompt(0)}
                >
                  <Sparkles size={14} />
                  <span>Buka Konsultasi</span>
                </a>
              </div>
            </div>

            {/* Bottom Floating Card */}
            <div className="floating-stat-card floating-stat-bottom animate-float" style={{ animationDelay: '1.5s' }}>
              <div style={{ background: '#e0f2fe', padding: '0.5rem', borderRadius: '8px', color: '#0284c7' }}>
                <Pill size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary-900)' }}>250+ Jenis Obat</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)' }}>Stok Real-time Terkoneksi</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
