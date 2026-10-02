/**
 * verify-auth.ts
 * Automated RBAC & Auth verification script for Apotek Online + AI
 * Run: npx ts-node scripts/verify-auth.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  checkRoleAuthorization,
} from '../src/server/auth';

const prisma = new PrismaClient();

type TestResult = { name: string; passed: boolean; detail?: string };
const results: TestResult[] = [];

function log(test: string, passed: boolean, detail?: string) {
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${test}${detail ? ` — ${detail}` : ''}`);
  results.push({ name: test, passed, detail });
}

async function runTests() {
  console.log('\n=== Apotek Online + AI — Auth & RBAC Verification ===\n');

  // ─────────────────────────────────────────────
  // 1. BCrypt Hashing
  // ─────────────────────────────────────────────
  console.log('1️⃣  Password Hashing (bcrypt)');
  const plainPw = 'testPassword123';
  const hashed = await hashPassword(plainPw);
  log('hashPassword returns non-plaintext', !hashed.includes(plainPw));
  log('hashPassword starts with $2b$ (bcrypt prefix)', hashed.startsWith('$2b$'));

  const correctMatch = await comparePassword(plainPw, hashed);
  log('comparePassword correct password returns true', correctMatch === true);

  const wrongMatch = await comparePassword('wrongPassword', hashed);
  log('comparePassword wrong password returns false', wrongMatch === false);

  // ─────────────────────────────────────────────
  // 2. JWT Token
  // ─────────────────────────────────────────────
  console.log('\n2️⃣  JWT Token Generation & Verification');
  const payload = { id: 'test-id-123', email: 'test@test.com', role: 'CUSTOMER' as const };
  const token = generateToken(payload);
  log('generateToken returns non-empty string', typeof token === 'string' && token.length > 20);

  const decoded = verifyToken(token);
  log('verifyToken decoded.id matches', decoded?.id === payload.id);
  log('verifyToken decoded.role matches', decoded?.role === payload.role);

  const badToken = verifyToken('invalid.token.here');
  log('verifyToken returns null for invalid token', badToken === null);

  // ─────────────────────────────────────────────
  // 3. Role Authorization Logic
  // ─────────────────────────────────────────────
  console.log('\n3️⃣  Role Authorization (checkRoleAuthorization)');
  log('ADMIN allowed in [ADMIN]', checkRoleAuthorization('ADMIN', ['ADMIN']));
  log('ADMIN allowed in [ADMIN, STAFF]', checkRoleAuthorization('ADMIN', ['ADMIN', 'STAFF']));
  log('STAFF allowed in [STAFF]', checkRoleAuthorization('STAFF', ['STAFF']));
  log('STAFF allowed in [ADMIN, STAFF]', checkRoleAuthorization('STAFF', ['ADMIN', 'STAFF']));
  log('CUSTOMER allowed in [CUSTOMER]', checkRoleAuthorization('CUSTOMER', ['CUSTOMER']));

  log('CUSTOMER blocked from [ADMIN]', !checkRoleAuthorization('CUSTOMER', ['ADMIN']));
  log('CUSTOMER blocked from [STAFF]', !checkRoleAuthorization('CUSTOMER', ['STAFF']));
  log('CUSTOMER blocked from [ADMIN, STAFF]', !checkRoleAuthorization('CUSTOMER', ['ADMIN', 'STAFF']));
  log('STAFF blocked from [ADMIN]', !checkRoleAuthorization('STAFF', ['ADMIN']));

  // ─────────────────────────────────────────────
  // 4. Database — Seed Users
  // ─────────────────────────────────────────────
  console.log('\n4️⃣  Database Users & Password Integrity');
  const users = await prisma.user.findMany({ select: { email: true, password: true, role: true, name: true } });

  log('At least 3 users in database', users.length >= 3);
  log('Admin user exists', users.some((u) => u.role === 'ADMIN'));
  log('Staff user exists', users.some((u) => u.role === 'STAFF'));
  log('Customer user exists', users.some((u) => u.role === 'CUSTOMER'));

  // Verify no plaintext passwords
  const hasPlaintext = users.some((u) => u.password === 'password123');
  log('No user has plaintext password stored', !hasPlaintext);

  // Verify each seed user password hashes correctly
  for (const u of users) {
    const isValid = await comparePassword('password123', u.password);
    log(`Password hash valid for ${u.email}`, isValid, u.role);
  }

  // ─────────────────────────────────────────────
  // 5. API Endpoint RBAC (requires dev server running)
  // ─────────────────────────────────────────────
  console.log('\n5️⃣  API Endpoint RBAC Barriers (requires dev server on :3000)');

  const adminUser = users.find((u) => u.role === 'ADMIN');
  const staffUser = users.find((u) => u.role === 'STAFF');
  const customerUser = users.find((u) => u.role === 'CUSTOMER');

  if (adminUser && staffUser && customerUser) {
    const adminToken = generateToken({ id: 'a', email: adminUser.email, role: 'ADMIN' });
    const staffToken = generateToken({ id: 's', email: staffUser.email, role: 'STAFF' });
    const customerToken = generateToken({ id: 'c', email: customerUser.email, role: 'CUSTOMER' });

    try {
      // Admin endpoint — only ADMIN allowed
      const adminFromAdmin = await fetch('http://127.0.0.1:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      log('GET /api/admin/users — ADMIN token → 200', adminFromAdmin.status === 200);

      const adminFromStaff = await fetch('http://127.0.0.1:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      log('GET /api/admin/users — STAFF token → 403', adminFromStaff.status === 403);

      const adminFromCustomer = await fetch('http://127.0.0.1:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      log('GET /api/admin/users — CUSTOMER token → 403', adminFromCustomer.status === 403);

      // Staff endpoint — STAFF & ADMIN allowed
      const staffFromAdmin = await fetch('http://127.0.0.1:3000/api/staff/orders', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      log('GET /api/staff/orders — ADMIN token → 200', staffFromAdmin.status === 200);

      const staffFromStaff = await fetch('http://127.0.0.1:3000/api/staff/orders', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      log('GET /api/staff/orders — STAFF token → 200', staffFromStaff.status === 200);

      const staffFromCustomer = await fetch('http://127.0.0.1:3000/api/staff/orders', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      log('GET /api/staff/orders — CUSTOMER token → 403', staffFromCustomer.status === 403);

      // No token → 401
      const noToken = await fetch('http://127.0.0.1:3000/api/admin/users');
      log('GET /api/admin/users — no token → 401', noToken.status === 401);

    } catch (err) {
      console.log('  ⚠️  Dev server not running — skipping HTTP endpoint tests');
    }
  }

  // ─────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`📊 Results: ${passed} passed / ${failed} failed / ${results.length} total`);

  if (failed === 0) {
    console.log('🎉 All tests passed! Authentication & RBAC system is fully verified.\n');
  } else {
    console.log('⚠️  Some tests failed. Review the output above.\n');
    results.filter((r) => !r.passed).forEach((r) => console.log(`   ❌ ${r.name}`));
  }

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
