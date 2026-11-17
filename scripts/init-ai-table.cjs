const { DatabaseSync } = require('node:sqlite');
const path = 'C:\\laragon\\www\\belajar 1\\prisma\\dev.db';

try {
  const db = new DatabaseSync(path);
  console.log('Opened database with built-in node:sqlite!');

  db.exec(`
    CREATE TABLE IF NOT EXISTS "ai_providers" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "provider_type" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "base_url" TEXT NOT NULL,
      "api_key_encrypted" TEXT,
      "api_key_masked" TEXT,
      "model_id" TEXT NOT NULL,
      "is_active" INTEGER NOT NULL DEFAULT 0,
      "is_verified" INTEGER NOT NULL DEFAULT 0,
      "connection_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
      "last_tested_at" DATETIME,
      "last_error" TEXT,
      "is_fallback" INTEGER NOT NULL DEFAULT 0,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS "ai_providers_is_active_idx" ON "ai_providers"("is_active");`);
  db.exec(`CREATE INDEX IF NOT EXISTS "ai_providers_provider_type_idx" ON "ai_providers"("provider_type");`);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_providers'").all();
  console.log('Tables found:', tables);
  db.close();
} catch (err) {
  console.error('Error with node:sqlite:', err);
}

