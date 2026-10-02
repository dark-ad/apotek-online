import type { IncomingMessage, ServerResponse } from 'http';
import { prisma } from '../../lib/db';
import { hashPassword, comparePassword, generateToken } from '../auth';
import { validateUser } from '../../lib/validations';
import { sendJson, parseJsonBody, requireAuth } from '../utils';

export async function handleRegister(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await parseJsonBody(req);

  // Validate inputs
  const validation = validateUser({
    name: body.name,
    email: body.email,
    password: body.password,
    phone: body.phone,
    address: body.address,
    role: 'CUSTOMER',
  });

  if (!validation.success) {
    sendJson(res, 400, {
      success: false,
      message: 'Validasi form gagal.',
      errors: validation.errors,
    });
    return;
  }

  // Check unique email
  const existingUser = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase().trim() },
  });

  if (existingUser) {
    sendJson(res, 409, {
      success: false,
      message: 'Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.',
      errors: { email: 'Email sudah digunakan oleh akun lain.' },
    });
    return;
  }

  // Hash password
  const hashedPassword = await hashPassword(body.password);

  // Create user
  const newUser = await prisma.user.create({
    data: {
      name: body.name.trim(),
      email: body.email.toLowerCase().trim(),
      password: hashedPassword,
      phone: body.phone ? body.phone.trim() : null,
      address: body.address ? body.address.trim() : null,
      role: 'CUSTOMER',
    },
  });

  // Generate token
  const token = generateToken({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role as any,
    phone: newUser.phone,
    address: newUser.address,
  });

  sendJson(res, 201, {
    success: true,
    message: 'Registrasi akun berhasil!',
    data: {
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        address: newUser.address,
        createdAt: newUser.createdAt,
      },
    },
  });
}

export async function handleLogin(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await parseJsonBody(req);
  const email = (body.email || '').toLowerCase().trim();
  const password = body.password || '';

  if (!email || !password) {
    sendJson(res, 400, {
      success: false,
      message: 'Email dan password wajib diisi.',
      errors: {
        email: !email ? 'Email wajib diisi.' : '',
        password: !password ? 'Password wajib diisi.' : '',
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    sendJson(res, 401, {
      success: false,
      message: 'Kombinasi email atau password salah.',
      errors: { credentials: 'Email atau password yang Anda masukkan tidak sesuai.' },
    });
    return;
  }

  const passwordMatch = await comparePassword(password, user.password);
  if (!passwordMatch) {
    sendJson(res, 401, {
      success: false,
      message: 'Kombinasi email atau password salah.',
      errors: { credentials: 'Email atau password yang Anda masukkan tidak sesuai.' },
    });
    return;
  }

  // Check if account is active (User Management rule)
  if (user.isActive === false) {
    sendJson(res, 403, {
      success: false,
      message: 'AKUN DINONAKTIFKAN: Akun Anda telah dinonaktifkan oleh Administrator. Silakan hubungi pihak apotek.',
      errors: { account: 'Status akun tidak aktif.' },
    });
    return;
  }

  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as any,
    phone: user.phone,
    address: user.address,
  });

  sendJson(res, 200, {
    success: true,
    message: `Selamat datang kembali, ${user.name}!`,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt,
      },
    },
  });
}

export async function handleGetMe(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const authUser = requireAuth(req, res);
  if (!authUser) return;

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
  });

  if (!user) {
    sendJson(res, 404, {
      success: false,
      message: 'Data pengguna tidak ditemukan.',
    });
    return;
  }

  sendJson(res, 200, {
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt,
      },
    },
  });
}

export async function handleUpdateProfile(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const authUser = requireAuth(req, res);
  if (!authUser) return;

  const body = await parseJsonBody(req);
  const errors: Record<string, string> = {};

  if (body.name !== undefined) {
    const trimmedName = String(body.name).trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      errors.name = 'Nama harus memiliki panjang antara 2 hingga 100 karakter.';
    }
  }

  if (body.phone !== undefined && body.phone !== null && String(body.phone).trim() !== '') {
    const phoneStr = String(body.phone).trim();
    if (!/^[0-9+\-\s]{8,18}$/.test(phoneStr)) {
      errors.phone = 'Format nomor telepon tidak valid (8-18 digit angka/tanda hubung).';
    }
  }

  if (body.address !== undefined && body.address !== null) {
    const addressStr = String(body.address).trim();
    if (addressStr.length > 500) {
      errors.address = 'Alamat maksimal 500 karakter.';
    }
  }

  if (Object.keys(errors).length > 0) {
    sendJson(res, 400, {
      success: false,
      message: 'Validasi perbaruan profil gagal.',
      errors,
    });
    return;
  }

  const updatedUser = await prisma.user.update({
    where: { id: authUser.id },
    data: {
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      phone: body.phone !== undefined ? (body.phone ? String(body.phone).trim() : null) : undefined,
      address: body.address !== undefined ? (body.address ? String(body.address).trim() : null) : undefined,
    },
  });

  sendJson(res, 200, {
    success: true,
    message: 'Profil berhasil diperbarui!',
    data: {
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        address: updatedUser.address,
        createdAt: updatedUser.createdAt,
      },
    },
  });
}
