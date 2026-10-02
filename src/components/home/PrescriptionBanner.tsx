import React from 'react';
import { Button } from '../common/Button';
import { 
  FileUp, 
  ShieldCheck, 
  UploadCloud, 
  Stethoscope, 
  Truck 
} from 'lucide-react';

interface PrescriptionBannerProps {
  onOpenUploadModal: () => void;
}

export const PrescriptionBanner: React.FC<PrescriptionBannerProps> = ({
  onOpenUploadModal,
}) => {
  return (
    <section id="upload-resep" className="section-sm">
      <div className="container">
        <div className="prescription-banner">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.18)', padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              <ShieldCheck size={16} />
              <span>Layanan Resep Dokter Sah</span>
            </div>

            <h2 style={{ color: '#ffffff', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, marginBottom: '0.75rem' }}>
              Punya Resep dari Dokter? <br />
              Tebus Obat Tanpa Perlu Antre
            </h2>

            <p style={{ color: '#d1fae5', fontSize: '1rem', lineHeight: 1.6, maxWidth: '600px' }}>
              Cukup foto lembar resep dari dokter Anda, unggah melalui portal kami, dan tim Apoteker profesional kami akan memverifikasi takaran dosis serta menyiapkannya dengan aman.
            </p>

            <div className="prescription-steps">
              <div className="pres-step-item">
                <span className="pres-step-num">Langkah 1</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <UploadCloud size={16} color="#a7f3d0" />
                  <span className="pres-step-text">Foto & Upload Resep Dokter</span>
                </div>
              </div>

              <div className="pres-step-item">
                <span className="pres-step-num">Langkah 2</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Stethoscope size={16} color="#a7f3d0" />
                  <span className="pres-step-text">Apoteker Periksa & Konfirmasi</span>
                </div>
              </div>

              <div className="pres-step-item">
                <span className="pres-step-num">Langkah 3</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Truck size={16} color="#a7f3d0" />
                  <span className="pres-step-text">Obat Dikirim Sampai Rumah</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.1)', border: '1px dashed rgba(255, 255, 255, 0.4)', borderRadius: 'var(--radius-lg)', padding: '2.5rem 1.5rem', textAlign: 'center', gap: '1rem' }}>
            <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: '#ffffff', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileUp size={32} />
            </div>
            <div>
              <h3 style={{ color: '#ffffff', fontSize: '1.15rem', fontWeight: 700 }}>Upload Lembar Resep</h3>
              <p style={{ color: '#d1fae5', fontSize: '0.825rem', marginTop: '0.25rem' }}>
                Mendukung file JPG, PNG, atau PDF (Maks. 10MB)
              </p>
            </div>
            <Button
              variant="secondary"
              size="lg"
              onClick={onOpenUploadModal}
              icon={<UploadCloud size={18} />}
              style={{ width: '100%', maxWidth: '240px', fontWeight: 700 }}
            >
              Upload Resep Sekarang
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
