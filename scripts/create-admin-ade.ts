import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../src/server/auth';

const prisma = new PrismaClient();

async function createOrUpdateAdmin() {
  console.log('================================================================');
  console.log('🚀 PEMBUATAN AKUN ADMINISTRATOR UTAMA: APOTEK SEHAT AI');
  console.log('================================================================\n');

  const adminData = {
    name: 'Ade Irawan',
    email: 'ade.irawan@gmail.com'.toLowerCase().trim(),
    role: 'ADMIN',
    plainPassword: 'AdminSehat2026!',
    phone: '081234567890',
    address: 'Kantor Pusat Administrator Apotek Sehat AI, Jakarta',
  };

  console.log(`📌 Memeriksa akun dengan email: ${adminData.email}...`);

  // 1. Hash password dengan bcrypt (10 rounds salt)
  const hashedPassword = await hashPassword(adminData.plainPassword);
  console.log('🔒 Password berhasil di-hash dengan Bcrypt (10 salt rounds).');

  // 2. Gunakan upsert agar idempoten (tidak duplikasi jika dijalankan berulang)
  const adminUser = await prisma.user.upsert({
    where: { email: adminData.email },
    update: {
      name: adminData.name,
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      phone: adminData.phone,
      address: adminData.address,
    },
    create: {
      name: adminData.name,
      email: adminData.email,
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      phone: adminData.phone,
      address: adminData.address,
    },
  });

  console.log('\n✅ AKUN ADMINISTRATOR BERHASIL DISIMPAN DI DATABASE:');
  console.log(`   - ID Akun      : ${adminUser.id}`);
  console.log(`   - Nama Lengkap : ${adminUser.name}`);
  console.log(`   - Email        : ${adminUser.email}`);
  console.log(`   - Role         : ${adminUser.role}`);
  console.log(`   - Status Aktif : ${adminUser.isActive ? 'AKTIF (true)' : 'NON-AKTIF'}`);
  console.log(`   - No. Telepon  : ${adminUser.phone}`);
  console.log(`   - Alamat       : ${adminUser.address}`);
  console.log(`   - Dibuat Pada  : ${adminUser.createdAt}`);
  console.log(`   - Hash Password: ${adminUser.password.slice(0, 20)}... (tersimpan aman di DB)`);

  // 3. Verifikasi Keabsahan Autentikasi & Login
  console.log('\n🔍 MELAKUKAN PENGUJIAN AUTENTIKASI & VERIFIKASI LOGIN...');

  // A. Verifikasi Komparasi Password
  const isPasswordValid = await comparePassword(adminData.plainPassword, adminUser.password);
  if (!isPasswordValid) {
    throw new Error('❌ GAGAL: Komparasi password dengan bcrypt tidak cocok!');
  }
  console.log('   ✅ Verifikasi Password: Match (Bcrypt valid)');

  // B. Verifikasi Password Salah harus Ditolak
  const isWrongPasswordRejected = !(await comparePassword('SalahPassword123!', adminUser.password));
  if (!isWrongPasswordRejected) {
    throw new Error('❌ GAGAL: Password salah malah diterima!');
  }
  console.log('   ✅ Verifikasi Proteksi: Password salah berhasil ditolak secara aman');

  // C. Verifikasi Pembuatan & Dekode Token JWT
  const token = generateToken({
    id: adminUser.id,
    name: adminUser.name,
    email: adminUser.email,
    role: adminUser.role as any,
    phone: adminUser.phone,
    address: adminUser.address,
  });

  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'ADMIN' || decoded.email !== adminData.email) {
    throw new Error('❌ GAGAL: Verifikasi JWT Token gagal atau role bukan ADMIN!');
  }
  console.log('   ✅ Verifikasi JWT Token: Valid');
  console.log(`   ✅ Token Payload Role  : ${decoded.role} (Super Admin Authority)`);
  console.log(`   ✅ Token Payload Name  : ${decoded.name}`);

  // D. Ringkasan Hak Akses Administrator
  console.log('\n📋 HAK AKSES ADMINISTRATOR UNTUK ADE IRAWAN:');
  console.log('   [✓] Akses Penuh Dashboard Admin (/api/admin/*)');
  console.log('   [✓] Manajemen Data Pengguna & Ubah Role Akun');
  console.log('   [✓] Manajemen Data Staf Apotek & Apoteker');
  console.log('   [✓] CRUD Master Obat & Kategori Farmasi');
  console.log('   [✓] Manajemen Stok Obat Real-Time (Add/Subtract/Set)');
  console.log('   [✓] Monitoring & Kelola Semua Pesanan Pembeli');
  console.log('   [✓] Verifikasi Resep Dokter (Approve / Reject)');
  console.log('   [✓] Laporan Transaksi Keuangan & Rekapitulasi Omzet');
  console.log('   [✓] Akses Notifikasi Telegram & WhatsApp');
  console.log('   [✓] Akses Database Komprehensif di AI Chatbot');

  console.log('\n================================================================');
  console.log('🎉 SELURUH PROSES SELESAI DENGAN SUKSES!');
  console.log('================================================================');
}

createOrUpdateAdmin()
  .catch((err) => {
    console.error('❌ Terjadi kesalahan saat membuat akun admin:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

