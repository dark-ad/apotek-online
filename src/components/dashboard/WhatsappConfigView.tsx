import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  getWhatsappSettings,
  updateWhatsappSettings,
  sendTestWhatsappMessage,
  type WhatsappSettingsRecord,
  type FonnteDevice,
} from '../../services/whatsappConfigService';
import {
  MessageSquare,
  Smartphone,
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Save,
  Send,
  Eye,
  EyeOff,
  Loader2,
  Zap,
} from 'lucide-react';

/* ─── Styling helpers ─── */
const cssVar = (v: string, fallback: string) => `var(${v}, ${fallback})`;
const BG = () => cssVar('--bg-primary', '#ffffff');
const BG2 = () => cssVar('--bg-secondary', '#f8fafc');
const TEXT = () => cssVar('--secondary-900', '#1e293b');
const TEXT2 = () => cssVar('--secondary-600', '#64748b');
const TEXT3 = () => cssVar('--secondary-500', '#94a3b8');
const BORDER = () => cssVar('--border-light', '#e2e8f0');
const RADIUS = () => cssVar('--radius-lg', '12px');
const SHADOW = () => cssVar('--shadow-sm', '0 1px 3px rgba(0,0,0,0.08)');
const WA_GREEN = '#25D366';
const WA_DARK = '#128C7E';
const PRIMARY = '#4338ca';

export const WhatsappConfigView: React.FC = () => {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<WhatsappSettingsRecord | null>(null);
  const [adminPhone, setAdminPhone] = useState('085767646273');
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [senderName, setSenderName] = useState('APOTEK SEHAT');
  const [isEnabled, setIsEnabled] = useState(true);
  const [notifyOnNewOrder, setNotifyOnNewOrder] = useState(true);
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  // Test state
  const [testPhone, setTestPhone] = useState('085767646273');
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Live device status
  const [liveDevice, setLiveDevice] = useState<FonnteDevice | null>(null);
  const [refreshingDevice, setRefreshingDevice] = useState(false);

  /* ─── Fetch settings from server ─── */
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await getWhatsappSettings();
      if (resp.success && resp.data) {
        setSettings(resp.data);
        setAdminPhone(resp.data.adminPhone || '085767646273');
        setTestPhone(resp.data.adminPhone || '085767646273');
        setSenderName(resp.data.senderName || 'APOTEK SEHAT');
        setIsEnabled(resp.data.isEnabled);
        setNotifyOnNewOrder(resp.data.notifyOnNewOrder);
        setNotifyOnStatusChange(resp.data.notifyOnStatusChange);
        setNotifyCustomer(resp.data.notifyCustomer);
        if (resp.data.liveDevice) {
          setLiveDevice(resp.data.liveDevice);
        }
      } else {
        toast.error(resp.message || 'Gagal memuat pengaturan WhatsApp');
      }
    } catch (err: any) {
      toast.error('Kesalahan jaringan: ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /* ─── Refresh live device ─── */
  const handleRefreshDevice = async () => {
    setRefreshingDevice(true);
    try {
      const resp = await getWhatsappSettings();
      if (resp.success && resp.data) {
        setSettings(resp.data);
        if (resp.data.liveDevice) {
          setLiveDevice(resp.data.liveDevice);
          if (resp.data.liveDevice.status) {
            toast.success(`Fonnte Device terhubung (${resp.data.liveDevice.device || 'Online'})`);
          } else {
            toast.warning(`Fonnte Device: ${resp.data.liveDevice.reason || 'Terputus'}`);
          }
        }
      }
    } catch (err: any) {
      toast.error('Gagal memperbarui status device: ' + err?.message);
    } finally {
      setRefreshingDevice(false);
    }
  };

  /* ─── Save configuration ─── */
  const handleSaveSettings = async () => {
    if (!adminPhone.trim()) {
      toast.error('Nomor WhatsApp admin tidak boleh kosong');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        adminPhone: adminPhone.trim(),
        senderName: senderName.trim(),
        isEnabled,
        notifyOnNewOrder,
        notifyOnStatusChange,
        notifyCustomer,
      };

      if (apiToken.trim()) {
        payload.apiToken = apiToken.trim();
      }

      const resp = await updateWhatsappSettings(payload);
      if (resp.success) {
        toast.success('Pengaturan WhatsApp berhasil disimpan!');
        setApiToken('');
        await loadSettings();
      } else {
        toast.error(resp.message || 'Gagal menyimpan pengaturan');
      }
    } catch (err: any) {
      toast.error('Error: ' + err?.message);
    } finally {
      setSaving(false);
    }
  };

  /* ─── Send Test Message ─── */
  const handleSendTest = async () => {
    const target = testPhone.trim() || adminPhone.trim();
    if (!target) {
      toast.error('Masukkan nomor WhatsApp tujuan uji coba');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const resp = await sendTestWhatsappMessage({
        targetPhone: target,
        message: testMessage.trim() || undefined,
        apiToken: apiToken.trim() || undefined,
      });

      if (resp.success) {
        setTestResult({
          success: true,
          message: resp.message || `Pesan uji coba berhasil terkirim ke ${target}!`,
        });
        toast.success(`Pesan WA terkirim ke ${target}`);
      } else {
        setTestResult({
          success: false,
          message: resp.message || 'Gagal mengirim pesan uji coba',
        });
        toast.error(resp.message || 'Pengiriman gagal');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Terjadi kesalahan sistem saat kirim pesan',
      });
      toast.error('Error: ' + err?.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: TEXT3() }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>Memuat konfigurasi gateway WhatsApp...</p>
      </div>
    );
  }

  const isDeviceConnected = liveDevice?.status === true;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* ─── Header ─── */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${WA_GREEN}, ${WA_DARK})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
            }}
          >
            <MessageSquare size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: TEXT() }}>
              Konfigurasi Notifikasi WhatsApp (Fonnte)
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: TEXT2() }}>
              Kirim notifikasi otomatis saat pesanan masuk, resep diverifikasi, dan pesanan selesai
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: isDeviceConnected ? '#dcfce7' : '#fee2e2',
              color: isDeviceConnected ? '#166534' : '#991b1b',
              border: `1px solid ${isDeviceConnected ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            {isDeviceConnected ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {isDeviceConnected ? 'Fonnte Terhubung' : 'Fonnte Belum Terhubung'}
          </span>

          <button
            onClick={handleRefreshDevice}
            disabled={refreshingDevice}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: `1px solid ${BORDER()}`,
              background: BG2(),
              color: TEXT(),
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: refreshingDevice ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={13} style={{ animation: refreshingDevice ? 'spin 1s linear infinite' : 'none' }} />
            Cek Status
          </button>
        </div>
      </div>

      {/* ─── Live Device Status Card ─── */}
      {liveDevice && (
        <div
          style={{
            background: BG(),
            borderRadius: RADIUS(),
            border: `1px solid ${BORDER()}`,
            padding: '1.25rem',
            marginBottom: '1.5rem',
            boxShadow: SHADOW(),
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: TEXT3() }}>NOMOR PERANGKAT</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: TEXT(), marginTop: '2px' }}>
              {liveDevice.device || adminPhone}
            </div>
            <div style={{ fontSize: '0.72rem', color: TEXT2() }}>Nama: {liveDevice.name || 'apotek'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: TEXT3() }}>STATUS KONEKSI</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isDeviceConnected ? '#16a34a' : '#dc2626', marginTop: '2px' }}>
              {isDeviceConnected ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}
            </div>
            <div style={{ fontSize: '0.72rem', color: TEXT2() }}>Device: {liveDevice.device_status || 'siap'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: TEXT3() }}>SISA KUOTA PESAN</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: PRIMARY, marginTop: '2px' }}>
              {liveDevice.quota ?? '1000'} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>pesan</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: TEXT2() }}>Paket: {liveDevice.package || 'Free'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: TEXT3() }}>MASA BERLAKU</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: TEXT(), marginTop: '2px' }}>
              {liveDevice.expired || '14 Desember 2026'}
            </div>
            <div style={{ fontSize: '0.72rem', color: TEXT2() }}>Gateway Fonnte Aktif</div>
          </div>
        </div>
      )}

      {/* ─── Two-Column Grid: Form & Test ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }} className="wa-config-grid">
        {/* ═══════════ LEFT: Settings Form ═══════════ */}
        <div
          style={{
            background: BG(),
            borderRadius: RADIUS(),
            border: `1px solid ${BORDER()}`,
            boxShadow: SHADOW(),
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: `1px solid ${BORDER()}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <ShieldCheck size={18} color={PRIMARY} />
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: TEXT() }}>
              Pengaturan Gateway & Target Notifikasi
            </span>
          </div>

          <div style={{ padding: '1.25rem' }}>
            {/* Nomor WhatsApp Admin */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: TEXT(), marginBottom: '0.4rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Smartphone size={14} color={PRIMARY} />
                  Nomor WhatsApp Penerima Notifikasi Admin *
                </span>
              </label>
              <input
                type="text"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="085767646273"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${BORDER()}`,
                  background: BG(),
                  fontSize: '0.9rem',
                  color: TEXT(),
                  fontWeight: 600,
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '0.73rem', color: TEXT3(), marginTop: '4px', display: 'block' }}>
                Setiap kali ada pesanan baru masuk dari pembeli, notifikasi instan akan dikirim ke nomor ini.
              </span>
            </div>

            {/* API Token Fonnte */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: TEXT(), marginBottom: '0.4rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Key size={14} color={PRIMARY} />
                  API Token Fonnte
                  {settings?.apiTokenMasked && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 400, color: TEXT3() }}>
                      (Tersimpan: {settings.apiTokenMasked})
                    </span>
                  )}
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showToken ? 'text' : 'password'}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder={settings?.apiTokenMasked ? '•••••••••••••••••••• (kosongkan jika tidak ingin mengubah)' : 'Masukkan Token Fonnte'}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: `1px solid ${BORDER()}`,
                    background: BG(),
                    fontSize: '0.88rem',
                    color: TEXT(),
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: TEXT3(),
                  }}
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span style={{ fontSize: '0.73rem', color: TEXT3(), marginTop: '4px', display: 'block' }}>
                Dapatkan atau cek token Anda di dashboard{' '}
                <a href="https://fonnte.com" target="_blank" rel="noreferrer" style={{ color: PRIMARY, textDecoration: 'underline' }}>
                  fonnte.com
                </a>
                . Token disimpan dengan enkripsi AES-256-GCM.
              </span>
            </div>

            {/* Nama Pengirim Notifikasi */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: TEXT(), marginBottom: '0.4rem' }}>
                Nama Pengirim di Pesan WA
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="APOTEK SEHAT"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${BORDER()}`,
                  background: BG(),
                  fontSize: '0.88rem',
                  color: TEXT(),
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* ─── Notification Rule Checkboxes ─── */}
            <div style={{ borderTop: `1px solid ${BORDER()}`, paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: TEXT(), marginBottom: '0.75rem' }}>
                Pemicu Notifikasi Otomatis
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Master Enable */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: TEXT(), cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: WA_GREEN }}
                  />
                  <span>Aktifkan Seluruh Notifikasi WhatsApp</span>
                </label>

                {/* New Order to Admin */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', color: TEXT2(), cursor: 'pointer', marginLeft: '1.5rem' }}>
                  <input
                    type="checkbox"
                    checked={notifyOnNewOrder}
                    disabled={!isEnabled}
                    onChange={(e) => setNotifyOnNewOrder(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: PRIMARY }}
                  />
                  <span>Kirim Notifikasi Pesanan Baru ke WhatsApp Admin ({adminPhone || '0857...'})</span>
                </label>

                {/* New Order Confirmation to Customer */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', color: TEXT2(), cursor: 'pointer', marginLeft: '1.5rem' }}>
                  <input
                    type="checkbox"
                    checked={notifyCustomer}
                    disabled={!isEnabled}
                    onChange={(e) => setNotifyCustomer(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: PRIMARY }}
                  />
                  <span>Kirim Konfirmasi Pesanan Baru ke WhatsApp Pembeli/Customer</span>
                </label>

                {/* Status change to Customer */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', color: TEXT2(), cursor: 'pointer', marginLeft: '1.5rem' }}>
                  <input
                    type="checkbox"
                    checked={notifyOnStatusChange}
                    disabled={!isEnabled}
                    onChange={(e) => setNotifyOnStatusChange(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: PRIMARY }}
                  />
                  <span>Kirim Notifikasi saat Resep Disetujui / Pesanan Selesai (COMPLETED) ke Pembeli</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              style={{
                width: '100%',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: PRIMARY,
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: saving ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(67, 56, 202, 0.25)',
              }}
            >
              {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
              Simpan Perubahan Pengaturan
            </button>
          </div>
        </div>

        {/* ═══════════ RIGHT: Test WhatsApp Message ═══════════ */}
        <div
          style={{
            background: BG(),
            borderRadius: RADIUS(),
            border: `1px solid ${BORDER()}`,
            boxShadow: SHADOW(),
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: `1px solid ${BORDER()}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Send size={18} color={WA_DARK} />
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: TEXT() }}>
              Uji Coba Pengiriman Pesan WhatsApp
            </span>
          </div>

          <div style={{ padding: '1.25rem' }}>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: TEXT2() }}>
              Gunakan formulir ini untuk menguji apakah pesan WhatsApp benar-benar terkirim ke ponsel Anda melalui gateway Fonnte.
            </p>

            {/* Target phone */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: TEXT(), marginBottom: '0.35rem' }}>
                Nomor Tujuan Uji Coba *
              </label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="085767646273"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${BORDER()}`,
                  background: BG(),
                  fontSize: '0.88rem',
                  color: TEXT(),
                  fontWeight: 600,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Message custom */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: TEXT(), marginBottom: '0.35rem' }}>
                Pesan Uji Coba (Opsional)
              </label>
              <textarea
                rows={3}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Kosongkan untuk menggunakan template pesan tes resmi Apotek Sehat..."
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${BORDER()}`,
                  background: BG(),
                  fontSize: '0.82rem',
                  color: TEXT(),
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Test Result Box */}
            {testResult && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                  background: testResult.success ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
                  color: testResult.success ? '#166534' : '#991b1b',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                  {testResult.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  {testResult.success ? 'Pesan Terkirim!' : 'Pengiriman Gagal'}
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.78rem' }}>{testResult.message}</div>
              </div>
            )}

            {/* Test Button */}
            <button
              onClick={handleSendTest}
              disabled={testing}
              style={{
                width: '100%',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: `linear-gradient(135deg, ${WA_GREEN}, ${WA_DARK})`,
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: testing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: testing ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
              }}
            >
              {testing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
              Kirim Pesan Uji Coba WhatsApp
            </button>

            {/* Format Info Preview */}
            <div
              style={{
                marginTop: '1.5rem',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                background: BG2(),
                border: `1px solid ${BORDER()}`,
                fontSize: '0.75rem',
                color: TEXT2(),
              }}
            >
              <div style={{ fontWeight: 700, color: TEXT(), marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={13} color={WA_DARK} /> Contoh Pesan Notifikasi Baru:
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', whiteSpace: 'pre-wrap', color: TEXT3() }}>
{`🔔 *NOTIFIKASI PESANAN MASUK*
📦 Kode: #A1B2C3D4
👤 Pelanggan: Budi Santoso
💰 Total: Rp 45.000
💊 Paracetamol 500mg x2 Strip`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 860px) {
          .wa-config-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default WhatsappConfigView;

