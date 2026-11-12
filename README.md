# APOTEK SEHAT - Sistem Pemesanan Obat Online

Aplikasi pemesanan obat apotek berbasis web dengan role **ADMIN**, **STAFF**, dan **CUSTOMER**. Dilengkapi dengan katalog obat, keranjang, checkout, upload resep dokter, manajemen stok obat, dashboard admin & staf, serta **Integrasi Notifikasi Telegram Otomatis**.

---

## Fitur Integrasi Notifikasi Telegram

Aplikasi terhubung dengan Telegram Bot API (`https://api.telegram.org`) untuk mengirimkan notifikasi real-time ke Admin dan Staf secara otomatis tanpa memblokir performa atau transaksi aplikasi (*non-blocking*).

### Daftar Event Notifikasi yang Didukung:
1. **`ORDER_CREATED`**  
   Dikirim ke Admin dan Staf saat customer berhasil menyelesaikan checkout pesanan baru. Berisi detail ID pesanan, nama customer, metode pembayaran, dan total pembayaran.
2. **`PRESCRIPTION_REVIEW_REQUIRED`**  
   Dikirim ke Staf saat customer mengunggah resep dokter atau membuat pesanan yang memerlukan verifikasi resep dokter.
3. **`PRESCRIPTION_APPROVED`**  
   Dikirim ke Admin dan Staf saat staf apotek menyetujui resep dokter.
4. **`PRESCRIPTION_REJECTED`**  
   Dikirim ke Admin dan Staf saat resep dokter ditolak, lengkap dengan **alasan penolakan**.
5. **`ORDER_STATUS_CHANGED`**  
   Dikirim ke Staf saat status pesanan diubah (`DIPROSES`, `SIAP DIAMBIL`, `DIKIRIM`, `SELESAI`, `DIBATALKAN`).
6. **`LOW_STOCK`**  
   Dikirim ke Admin saat stok obat menipis (di bawah ambang batas default 10 unit), baik setelah pesanan dibuat maupun saat stok diubah staf/admin.
7. **Test Notification**  
   Dapat dijalankan langsung melalui tab **Notifikasi Telegram** di Dashboard Admin untuk memvalidasi koneksi bot kapan saja.

---

## Panduan Setup Bot Telegram

### 1. Membuat Bot di Telegram
1. Buka aplikasi Telegram dan cari bot resmi **`@BotFather`**.
2. Kirim perintah `/newbot`.
3. Masukkan nama tampilan bot (contoh: `APOTEK SEHAT Notifier`).
4. Masukkan username bot berakhiran `bot` (contoh: `@APOTEK_SEHAT_Bot`).
5. Simpan **HTTP API Token** yang diberikan oleh BotFather (contoh: `8995888062:AAEwzWmPgD1CQVPWpOvxuL0abDpvcsYe7oE`).

### 2. Mendapatkan Chat ID (Pribadi atau Grup)

#### A. Chat ID Akun Pribadi (Admin / Staf)
1. Buka bot **`@APOTEK_SEHAT_Bot`** (atau bot yang baru Anda buat).
2. Tekan tombol **Start** atau ketik `/start`.
3. Buka bot **`@userinfobot`** di Telegram untuk melihat **ID** akun Anda (angka 9-10 digit, contoh: `123456789`).

#### B. Chat ID Grup / Channel Telegram
1. Buat grup Telegram baru (misal: "Apotek Sehat - Notifikasi").
2. Undang `@APOTEK_SEHAT_Bot` ke dalam grup tersebut sebagai anggota / admin.
3. Kirim satu pesan sembarang di dalam grup (misal: `Halo bot`).
4. Buka URL berikut di browser Anda:
   ```text
   https://api.telegram.org/bot<TOKEN_BOT_ANDA>/getUpdates
   ```
5. Temukan objek `"chat":{"id": -100xxxxxxxxxx}`. Salin ID tersebut (pastikan menyertakan tanda minus `-` jika ada).

---

## Konfigurasi Environment (`.env`)

Konfigurasikan variabel lingkungan pada file `.env` di direktori utama:

```env
# ==========================================
# KONFIGURASI TELEGRAM NOTIFICATION
# ==========================================
TELEGRAM_BOT_TOKEN="8995888062:AAEwzWmPgD1CQVPWpOvxuL0abDpvcsYe7oE"
TELEGRAM_BOT_USERNAME="@APOTEK_SEHAT_Bot"
TELEGRAM_ADMIN_CHAT_ID="YOUR_ADMIN_CHAT_ID"
TELEGRAM_STAFF_CHAT_ID="YOUR_STAFF_CHAT_ID"
TELEGRAM_NOTIFICATIONS_ENABLED="true"
```

> **Keamanan Token:**
> - File `.env` sudah masuk ke dalam `.gitignore` sehingga tidak akan terunggah ke Git.
> - Token bot dikelola eksklusif di server-side (`src/server/services/telegramService.ts`) dan **tidak pernah dikirim ke browser / frontend**.
> - Dashboard Admin hanya menampilkan status bot dan Chat ID yang disamarkan (masked) seperti `-1***01`.

---

## Menjalankan Automated Test Suite

Untuk memvalidasi integrasi notifikasi (termasuk sanitasi HTML, proteksi timeout 5000ms, deduplikasi event, non-blocking execution, dan RBAC endpoint), jalankan perintah:

```bash
node scripts/test_telegram.mjs
```

Hasil pengujian otomatis:
- `Test 1`: Sanitasi HTML mencegah karakter berbahaya (XSS / invalid tag error)
- `Test 2`: Kerahasiaan Token & masking Chat ID
- `Test 3`: Deduplikasi event (mencegah duplikasi pesan berulang dalam 60 detik)
- `Test 4`: Penanganan konfigurasi kosong/nonaktif (skip aman tanpa error)
- `Test 5`: Mock dispatch payload formatting
- `Test 6`: Penanganan error Telegram API (400, 401, 500)
- `Test 7`: Timeout prevention via `AbortController` (maksimal 5000ms)
- `Test 8`: Non-blocking execution (kegagalan Telegram tidak membatalkan transaksi DB)
- `Test 9`: Validasi hak akses RBAC (hanya ADMIN yang dapat mengakses endpoint status/test)

---

## Hak Akses Chatbot AI (RBAC)

Chatbot AI menerapkan pembatasan akses berbasis peran di **sisi server** (bukan hanya UI), sehingga tidak dapat dibypass melalui prompt injection:

| Peran | Hak Akses Chatbot |
| --- | --- |
| **ADMIN** | **Akses penuh**: seluruh katalog (termasuk produk nonaktif), seluruh akun & profil pengguna, seluruh pesanan/transaksi, omzet, stok, dan insight operasional. |
| **STAFF** | **Akses terbatas**: katalog, antrean pesanan & verifikasi resep, stok, serta daftar **pelanggan** (email/telepon disamarkan, alamat tidak ditampilkan). Data akun ADMIN/STAFF, omzet, dan laporan keuangan **tidak dapat diakses**. |
| **CUSTOMER** | **Konsultasi obat**: info obat, harga, stok, aturan resep, serta profil/keranjang/riwayat pesanan **milik sendiri**. Dilarang melihat daftar pengguna, data pengguna lain, omzet, atau transaksi toko. |
| **TAMU** | Hanya info katalog publik dan panduan umum. Data pribadi/pesanan memerlukan login. |

Password, hash password, token JWT, API key, dan secret sistem **tidak pernah** ditampilkan oleh chatbot.

### Menjalankan Test RBAC Chatbot

```bash
node scripts/test_ai_rbac.mjs
```

Test ini memverifikasi 16 skenario: penolakan akses CUSTOMER/TAMU, pembatasan data STAFF (kontak tersamar & tanpa omzet), akses penuh ADMIN, proteksi kredensial, serta respons `/api/ai/summary` yang role-aware.

---

## Menguji Notifikasi dari Dashboard Admin

1. Login sebagai **Admin** di aplikasi.
2. Buka menu **Kelola Telegram** (ikon lonceng) di tab navigasi Admin Dashboard.
3. Anda akan melihat:
   - Status bot (`@APOTEK_SEHAT_Bot`) & status Token (Terkonfigurasi).
   - Pengaturan Chat ID Admin & Staf (dapat diedit dan disimpan langsung dari UI).
   - Toggle aktivasi notifikasi.
   - Tombol **"Kirim Pesan Uji Coba"** untuk memvalidasi pesan masuk langsung ke Telegram Anda.
