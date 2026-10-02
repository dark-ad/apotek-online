import React from 'react';
import { Pill, ShieldCheck, Heart, Phone, Mail, MapPin, Clock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Col 1: Brand & SIA Info */}
          <div className="footer-brand">
            <div className="footer-brand-title">
              <div className="brand-icon-box" style={{ width: '2rem', height: '2rem' }}>
                <Pill size={16} />
              </div>
              <span>Apotek Sehat AI</span>
            </div>
            <p className="footer-desc">
              Layanan farmasi digital terstandar dengan integrasi kecerdasan buatan (AI) untuk membantu konsultasi gejala ringan, verifikasi resep dokter oleh Apoteker resmi, serta pengiriman obat terpercaya ke seluruh Indonesia.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontSize: '0.825rem', fontWeight: 600 }}>
              <ShieldCheck size={18} />
              <span>SIA: 442/089/SIA/DPMPTSP/2026 • SIPA Apoteker Aktif</span>
            </div>
          </div>

          {/* Col 2: Kategori Layanan */}
          <div>
            <h4 className="footer-col-title">Kategori Farmasi</h4>
            <ul className="footer-links">
              <li><a href="#katalog">Obat Bebas & P3K</a></li>
              <li><a href="#katalog">Obat Bebas Terbatas</a></li>
              <li><a href="#katalog">Obat Resep Dokter</a></li>
              <li><a href="#katalog">Vitamin & Nutrisi Imunitas</a></li>
              <li><a href="#katalog">Alat Kesehatan & Diagnostik</a></li>
              <li><a href="#katalog">Ibu, Bayi & Anak</a></li>
            </ul>
          </div>

          {/* Col 3: Portal 3 Role */}
          <div>
            <h4 className="footer-col-title">Portal Pengguna</h4>
            <ul className="footer-links">
              <li><a href="#alur-role">Portal Pembeli (Pasien)</a></li>
              <li><a href="#alur-role">Portal Staf Apotek & Apoteker</a></li>
              <li><a href="#alur-role">Portal Admin & Manajemen</a></li>
              <li><a href="#ai-assistant">AI Health Assistant Guide</a></li>
              <li><a href="#upload-resep">Panduan Upload Resep</a></li>
              <li><a href="#">Ketentuan Golongan Obat BPOM</a></li>
            </ul>
          </div>

          {/* Col 4: Kontak & Jam Operasional */}
          <div>
            <h4 className="footer-col-title">Kontak & Apotek</h4>
            <ul className="footer-links" style={{ color: 'var(--secondary-400)' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <MapPin size={16} color="#38bdf8" style={{ marginTop: '3px', flexShrink: 0 }} />
                <span>Jl. Farmasi Sehat No. 88, Kebayoran, Jakarta Selatan 12150</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
                <span>Layanan Online 24 Jam • Pengiriman 08.00 - 22.00</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
                <span>Hotline Apotek: (021) 7890-1234 / 0812-9988-7766</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
                <span>layanan@apoteksehat-ai.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div>
            &copy; 2026 Apotek Online + AI. Seluruh Hak Cipta Dilindungi.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Didesain dengan standar farmasi modern &</span>
            <Heart size={14} color="#ef4444" fill="#ef4444" />
            <span>untuk kesehatan keluarga.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
