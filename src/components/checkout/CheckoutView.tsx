import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { orderService, OrderData } from '../../services/orderService';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { 
  ArrowLeft, 
  ShieldCheck, 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  MapPin, 
  MessageSquare, 
  Trash2,
  Lock,
  Clock
} from 'lucide-react';

interface CheckoutViewProps {
  onBackToCart: () => void;
  onOrderSuccess: (order: OrderData) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({ onBackToCart, onOrderSuccess }) => {
  const { user } = useAuth();
  const { items, totalAmount, totalCount, refreshCart } = useCart();
  const toast = useToast();

  // Form states
  const [shippingAddress, setShippingAddress] = useState<string>(user?.address || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [notes, setNotes] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<{ address?: string; phone?: string; rx?: string }>({});

  // Prescription states
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState<string | null>(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState<string>('');
  const [isUploadingRx, setIsUploadingRx] = useState<boolean>(false);
  const [rxUploadError, setRxUploadError] = useState<string | null>(null);

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Business check: does order need prescription?
  const needsPrescription = items.some((item) => item.medicine.requiresPrescription);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Handle Prescription File Selection & Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setRxUploadError('Ukuran file tidak boleh melebihi 10MB.');
      toast.error('Ukuran file resep tidak boleh melebihi 10MB.');
      return;
    }

    setPrescriptionFile(file);
    setRxUploadError(null);
    setFieldErrors((prev) => ({ ...prev, rx: undefined }));

    // Create local preview if image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPrescriptionPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPrescriptionPreview(null);
    }

    // Auto upload to server
    setIsUploadingRx(true);
    try {
      const res = await orderService.uploadPrescription(file);
      if (res.success && res.data?.prescriptionUrl) {
        setPrescriptionUrl(res.data.prescriptionUrl);
        toast.success('File resep berhasil diunggah!');
      } else {
        setRxUploadError(res.message || 'Gagal mengunggah file resep.');
        toast.error(res.message || 'Gagal mengunggah file resep.');
      }
    } catch (err: any) {
      setRxUploadError(err.message || 'Terjadi kesalahan saat upload resep.');
      toast.error('Terjadi kesalahan saat mengunggah resep.');
    } finally {
      setIsUploadingRx(false);
    }
  };

  const handleRemovePrescription = () => {
    setPrescriptionFile(null);
    setPrescriptionPreview(null);
    setPrescriptionUrl('');
    setRxUploadError(null);
  };

  // Handle Checkout Submission with Strict Form Validation
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const errors: { address?: string; phone?: string; rx?: string } = {};

    // Validate Phone Number
    const cleanPhone = phone.replace(/\D/g, '');
    if (!phone.trim()) {
      errors.phone = 'Nomor telepon wajib diisi untuk konfirmasi pengiriman.';
    } else if (cleanPhone.length < 10) {
      errors.phone = 'Nomor telepon minimal 10 digit angka (contoh: 081234567890).';
    }

    // Validate Address
    if (!shippingAddress.trim()) {
      errors.address = 'Alamat pengiriman wajib diisi.';
    } else if (shippingAddress.trim().length < 10) {
      errors.address = 'Alamat terlalu singkat. Mohon cantumkan nama jalan, nomor, dan kota lengkap (min. 10 karakter).';
    }

    // Business Rule: Prescription required check
    if (needsPrescription && !prescriptionUrl) {
      errors.rx = 'Pesanan ini mengandung obat resep keras. Anda wajib mengunggah foto resep dokter.';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error('Mohon lengkapi formulir pengiriman dengan benar sebelum melanjutkan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullAddress = `${shippingAddress.trim()}${phone ? ` [No. Telp/WA: ${phone.trim()}]` : ''}`;
      const res = await orderService.checkout({
        shippingAddress: fullAddress,
        notes: notes.trim() || undefined,
        prescriptionUrl: prescriptionUrl || undefined,
      });

      if (res.success && res.data?.order) {
        toast.success(`Pesanan #${res.data.order.shortId} berhasil dibuat!`);
        await refreshCart();
        onOrderSuccess(res.data.order);
      } else {
        setSubmitError(res.message || 'Gagal membuat pesanan. Silakan periksa kembali keranjang Anda.');
        toast.error(res.message || 'Gagal membuat pesanan.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Terjadi gangguan koneksi server.');
      toast.error('Gangguan koneksi server saat membuat pesanan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header with Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={onBackToCart}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--secondary-100)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '0.6rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--secondary-700)',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Keranjang</span>
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--secondary-900)', margin: 0 }}>
            Checkout Pemesanan Obat
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--secondary-500)', margin: '0.25rem 0 0 0' }}>
            Lengkapi data pengiriman dan periksa kembali obat pesanan Anda sebelum konfirmasi.
          </p>
        </div>
      </div>

      {submitError && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            color: '#991b1b',
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Pemesanan Tidak Dapat Diproses:</strong>
            <span style={{ fontSize: '0.875rem' }}>{submitError}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitOrder}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
            gap: '2rem',
            alignItems: 'start',
          }}
        >
          {/* LEFT COLUMN: Customer info, Address, Prescription */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 1. Customer Information */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <User size={18} color="var(--primary-600)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--secondary-900)' }}>
                  1. Informasi Pembeli
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: 'var(--secondary-500)', display: 'block', fontSize: '0.78rem' }}>Nama Lengkap</span>
                  <strong style={{ color: 'var(--secondary-900)' }}>{user?.name || '-'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--secondary-500)', display: 'block', fontSize: '0.78rem' }}>Email Terdaftar</span>
                  <strong style={{ color: 'var(--secondary-900)' }}>{user?.email || '-'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--secondary-500)', display: 'block', fontSize: '0.78rem' }}>Nomor Telepon</span>
                  <strong style={{ color: 'var(--secondary-900)' }}>{user?.phone || 'Belum diisi di profil'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--secondary-500)', display: 'block', fontSize: '0.78rem' }}>Role Pengguna</span>
                  <span
                    style={{
                      background: 'var(--primary-50)',
                      color: 'var(--primary-700)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    CUSTOMER
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Shipping Address */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <MapPin size={18} color="var(--primary-600)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--secondary-900)' }}>
                  2. Alamat Pengiriman Obat <span style={{ color: '#ef4444' }}>*</span>
                </h3>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary-700)', marginBottom: '0.4rem' }}>
                  Alamat Lengkap (Jalan, No. Rumah, Kelurahan, Kecamatan, Kota, Kode Pos) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={shippingAddress}
                  onChange={(e) => {
                    setShippingAddress(e.target.value);
                    if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: undefined }));
                  }}
                  placeholder="Contoh: Jl. Sudirman No. 45, RT 02 / RW 05, Menteng, Jakarta Pusat, 10310"
                  rows={3}
                  required
                  aria-invalid={!!fieldErrors.address}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: fieldErrors.address ? '2px solid #ef4444' : '1px solid var(--secondary-300)',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.address && (
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>
                    ⚠️ {fieldErrors.address}
                  </p>
                )}
              </div>

              {/* Recipient Phone Number */}
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary-700)', marginBottom: '0.4rem' }}>
                  Nomor Telepon / WhatsApp Penerima <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  placeholder="Contoh: 081234567890"
                  required
                  aria-invalid={!!fieldErrors.phone}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: fieldErrors.phone ? '2px solid #ef4444' : '1px solid var(--secondary-300)',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.phone && (
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>
                    ⚠️ {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <MessageSquare size={14} color="var(--secondary-500)" />
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary-700)' }}>
                    Catatan untuk Apoteker / Kurir (Opsional)
                  </label>
                </div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Tolong bungkus rapat / hubungi via WA saat kurir sampai"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--secondary-300)',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* 3. Prescription Upload Card */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-sm)',
                border: needsPrescription
                  ? prescriptionUrl
                    ? '2px solid #059669'
                    : '2px solid #e11d48'
                  : '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <FileText size={18} color={needsPrescription ? '#e11d48' : 'var(--primary-600)'} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--secondary-900)' }}>
                    3. Upload Resep Dokter {needsPrescription ? <span style={{ color: '#e11d48' }}>(Wajib *)</span> : '(Opsional)'}
                  </h3>
                </div>

                {needsPrescription ? (
                  <span
                    style={{
                      background: prescriptionUrl ? '#ecfdf5' : '#fff1f2',
                      color: prescriptionUrl ? '#059669' : '#e11d48',
                      padding: '0.25rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {prescriptionUrl ? (
                      <>
                        <CheckCircle size={14} /> Resep Terunggah
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={14} /> Resep Wajib
                      </>
                    )}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--secondary-500)', background: 'var(--secondary-100)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                    Obat Bebas (Tanpa Resep)
                  </span>
                )}
              </div>

              {needsPrescription && (
                <div
                  style={{
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    marginBottom: '1rem',
                    fontSize: '0.825rem',
                    color: '#9f1239',
                    lineHeight: 1.5,
                  }}
                >
                  <strong>⚠️ Regulasi Apotek:</strong> Keranjang belanja Anda mengandung obat yang membutuhkan resep dokter resmi. Pesanan <strong>hanya dapat diproses</strong> setelah Anda mengunggah resep yang valid untuk diverifikasi oleh staf apoteker berlisensi.
                </div>
              )}

              {/* Upload Dropzone / File Picker */}
              {!prescriptionUrl ? (
                <div>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2rem 1.5rem',
                      borderRadius: 'var(--radius-md)',
                      border: '2px dashed var(--secondary-300)',
                      background: 'var(--secondary-50)',
                      cursor: isUploadingRx ? 'wait' : 'pointer',
                      textAlign: 'center',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <UploadCloud size={36} color="var(--primary-600)" style={{ marginBottom: '0.75rem' }} />
                    <strong style={{ fontSize: '0.95rem', color: 'var(--secondary-800)', marginBottom: '0.25rem' }}>
                      {isUploadingRx ? 'Sedang Mengunggah Resep...' : 'Klik untuk Pilih File Foto / Scan Resep'}
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--secondary-500)', maxWidth: '350px' }}>
                      Mendukung format PNG, JPG, JPEG, WebP, atau PDF (Maksimal 10MB). Pastikan tulisan dokter, nama pasien, dan tanggal resep terbaca jelas.
                    </span>

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                      onChange={handleFileChange}
                      disabled={isUploadingRx}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {(rxUploadError || fieldErrors.rx) && (
                    <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <AlertTriangle size={14} /> {fieldErrors.rx || rxUploadError}
                    </div>
                  )}
                </div>
              ) : (
                /* Uploaded Preview Card */
                <div
                  style={{
                    border: '1px solid #a7f3d0',
                    background: '#f0fdf4',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-sm)',
                          background: '#d1fae5',
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={20} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.875rem', color: '#065f46', display: 'block' }}>
                          {prescriptionFile?.name || 'resep-dokter.jpg'}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: '#047857' }}>
                          {prescriptionFile ? `${(prescriptionFile.size / 1024).toFixed(1)} KB` : 'Tersimpan di server'}
                          {' • '}
                          <span style={{ color: '#059669', fontWeight: 600 }}>Siap Diverifikasi Apoteker</span>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemovePrescription}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      <Trash2 size={16} /> Ganti File
                    </button>
                  </div>

                  {prescriptionPreview && (
                    <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                      <img
                        src={prescriptionPreview}
                        alt="Preview Resep Dokter"
                        style={{
                          maxHeight: '160px',
                          maxWidth: '100%',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #d1fae5',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Review Order Items & Summary */}
          <div style={{ position: 'sticky', top: '5.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Review Order Items Card */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-light)',
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--secondary-900)' }}>
                Ringkasan Obat ({totalCount} Item)
              </h3>

              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  paddingRight: '0.25rem',
                  marginBottom: '1rem',
                }}
              >
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'center',
                      paddingBottom: '0.75rem',
                      borderBottom: '1px solid var(--secondary-100)',
                    }}
                  >
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--secondary-100)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.medicine.image ? (
                        <img
                          src={item.medicine.image}
                          alt={item.medicine.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '1.2rem' }}>💊</span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary-900)' }}>
                          {item.medicine.name}
                        </span>
                        {item.medicine.requiresPrescription && (
                          <span
                            style={{
                              background: '#fff1f2',
                              color: '#e11d48',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            Resep
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)' }}>
                        {item.quantity} {item.medicine.unit || 'unit'} × {formatIDR(item.unitPrice)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <strong style={{ fontSize: '0.875rem', color: 'var(--secondary-900)' }}>
                        {formatIDR(item.subtotal)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Calculation */}
              <div
                style={{
                  background: 'var(--secondary-50)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--secondary-600)' }}>
                  <span>Subtotal Obat</span>
                  <span>{formatIDR(totalAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--secondary-600)' }}>
                  <span>Biaya Verifikasi Farmasi</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>GRATIS</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--secondary-600)' }}>
                  <span>Estimasi Ongkir</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>GRATIS</span>
                </div>

                <div
                  style={{
                    borderTop: '1px dashed var(--secondary-300)',
                    paddingTop: '0.6rem',
                    marginTop: '0.2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <strong style={{ fontSize: '1rem', color: 'var(--secondary-900)' }}>Total Pembayaran</strong>
                  <strong style={{ fontSize: '1.35rem', color: 'var(--primary-700)', fontWeight: 800 }}>
                    {formatIDR(totalAmount)}
                  </strong>
                </div>
              </div>

              {/* Status Preview Notice */}
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: needsPrescription ? '#fff1f2' : '#f0fdf4',
                  border: needsPrescription ? '1px solid #fecdd3' : '1px solid #bbf7d0',
                  fontSize: '0.75rem',
                  color: needsPrescription ? '#9f1239' : '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Clock size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Status Awal:</strong>{' '}
                  {needsPrescription
                    ? 'PENDING_VERIFICATION (Menunggu verifikasi resep oleh staf apoteker)'
                    : 'PENDING_PAYMENT (Menunggu konfirmasi pembayaran manual)'}
                </span>
              </div>

              {/* Confirm Checkout Button */}
              <div style={{ marginTop: '1.25rem' }}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isSubmitting || isUploadingRx || (needsPrescription && !prescriptionUrl)}
                  style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }}
                  icon={<Lock size={16} />}
                >
                  {isSubmitting
                    ? 'Memproses Pesanan...'
                    : needsPrescription && !prescriptionUrl
                    ? 'Wajib Upload Resep Dokter'
                    : 'Konfirmasi & Buat Pesanan'}
                </Button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '0.75rem',
                  fontSize: '0.72rem',
                  color: 'var(--secondary-500)',
                }}
              >
                <ShieldCheck size={14} color="#059669" />
                <span>Transaksi Terenkripsi & Terverifikasi Apoteker Resmi</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
