/**
 * reset-db-admin-only.js
 * ----------------------
 * GO-LIVE PREP SCRIPT — run this once before going live.
 *
 * What it does:
 *   1. Generates new JWT_SECRET + JWT_REFRESH_SECRET.
 *   2. Truncates ALL application tables (preserves schema/migrations).
 *   3. Inserts a single admin user so you can log in and set up the system.
 *
 * ── HOW TO RUN (on the server) ──────────────────────────────────────────────
 *
 *   Step 1 — Run inside the backend container (required: DB is only accessible
 *             inside the Docker network):
 *
 *     cd /home/Rakesh/skyraksys_hrm
 *     docker compose exec backend node scripts/reset-db-admin-only.js
 *
 *   Step 2 — Apply the new JWT secrets to .env.production and restart
 *             (run on the HOST, not inside Docker):
 *
 *     source backend/logs/new-jwt-secrets.env && \
 *       sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env.production && \
 *       sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" .env.production && \
 *       rm backend/logs/new-jwt-secrets.env && \
 *       docker compose down && docker compose up -d
 *
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Admin user env vars (optional overrides, set before running):
 *   ADMIN_EMAIL         (default: admin@skyraksys.com)
 *   ADMIN_PASSWORD      (default: ChangeMe@2024!)
 *   ADMIN_FIRST_NAME    (default: System)
 *   ADMIN_LAST_NAME     (default: Admin)
 *
 * IMPORTANT: Run this ONCE before go-live. It is destructive.
 *            Back up your database first if you have any data worth keeping.
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const crypto = require('crypto');

// Load the env file that matches NODE_ENV before anything else.
// production → .env.production, development → .env, etc.
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: path.resolve(__dirname, '..', envFile) });
// Fallback to plain .env if the environment-specific file doesn't exist.
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ── JWT Secret Rotation ────────────────────────────────────────────────────────
// When running inside Docker, .env.production is not accessible directly.
// New secrets are written to /app/logs/new-jwt-secrets.env which maps to
// ./backend/logs/new-jwt-secrets.env on the host (mounted volume).
// The host-side apply command (in the header above) reads that file and
// patches .env.production, then restarts containers.
const SECRETS_OUTPUT_FILE = path.resolve(__dirname, '../logs/new-jwt-secrets.env');

// Also check for a directly-accessible .env.production (e.g. local dev or
// if someone intentionally runs outside Docker with DB exposed).
const ENV_FILE_CANDIDATES = [
  path.resolve(__dirname, '../../.env.production'),   // repo root
  path.resolve(__dirname, '../.env.production'),      // backend/
  path.resolve(__dirname, '../.env'),                 // dev fallback
];

function rotateJwtSecrets() {
  console.log('\n── JWT Secret Rotation ───────────────────────────────────────');
  const newJwtSecret     = crypto.randomBytes(64).toString('hex');
  const newRefreshSecret = crypto.randomBytes(64).toString('hex');

  const envFilePath = ENV_FILE_CANDIDATES.find(f => fs.existsSync(f));

  if (envFilePath) {
    // .env file is directly reachable — update it in place.
    let content = fs.readFileSync(envFilePath, 'utf8');

    content = /^JWT_SECRET=.*/m.test(content)
      ? content.replace(/^JWT_SECRET=.*/m, `JWT_SECRET=${newJwtSecret}`)
      : content + `\nJWT_SECRET=${newJwtSecret}`;

    content = /^JWT_REFRESH_SECRET=.*/m.test(content)
      ? content.replace(/^JWT_REFRESH_SECRET=.*/m, `JWT_REFRESH_SECRET=${newRefreshSecret}`)
      : content + `\nJWT_REFRESH_SECRET=${newRefreshSecret}`;

    fs.writeFileSync(envFilePath, content, 'utf8');
    console.log(`✓ JWT secrets updated in: ${envFilePath}`);
    console.log('  Restart containers after this script finishes:');
    console.log('  docker compose down && docker compose up -d\n');
  } else {
    // Running inside Docker — write secrets to the mounted logs volume so the
    // host can read and apply them without losing them if the terminal closes.
    const secretsContent = `JWT_SECRET=${newJwtSecret}\nJWT_REFRESH_SECRET=${newRefreshSecret}\n`;
    try {
      fs.mkdirSync(path.dirname(SECRETS_OUTPUT_FILE), { recursive: true });
      fs.writeFileSync(SECRETS_OUTPUT_FILE, secretsContent, { encoding: 'utf8', mode: 0o600 });
      console.log('✓ New JWT secrets saved to: backend/logs/new-jwt-secrets.env');
      console.log('\n  On the HOST (not inside Docker), run this to apply and restart:');
      console.log('');
      console.log('  source backend/logs/new-jwt-secrets.env && \\');
      console.log('    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env.production && \\');
      console.log('    sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" .env.production && \\');
      console.log('    rm backend/logs/new-jwt-secrets.env && \\');
      console.log('    docker compose down && docker compose up -d\n');
    } catch (writeErr) {
      // Logs dir not writable — last resort: print to console.
      console.log('⚠  Could not write secrets file. Copy these into .env.production manually:\n');
      console.log('─────────────────────────────────────────────────────────────');
      console.log(`JWT_SECRET=${newJwtSecret}`);
      console.log(`JWT_REFRESH_SECRET=${newRefreshSecret}`);
      console.log('─────────────────────────────────────────────────────────────');
      console.log('  Then run: docker compose down && docker compose up -d\n');
    }
  }
}

const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ── Load DB config from the shared config/config.js (single source of truth) ──
const allDbConfigs = require('../config/config.js');
const dbConfig = allDbConfigs[env];

if (!dbConfig) {
  console.error(`✗ No DB config found for NODE_ENV="${env}" in config/config.js`);
  process.exit(1);
}

console.log(`Using environment : ${env}`);
console.log(`Database host     : ${dbConfig.host}:${dbConfig.port || 5432}`);
console.log(`Database name     : ${dbConfig.database}`);
console.log(`Database user     : ${dbConfig.username}`);
console.log(`SSL               : ${dbConfig.dialectOptions?.ssl ? 'enabled' : 'disabled'}\n`);

// ── DB connection ──────────────────────────────────────────────────────────────
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: parseInt(dbConfig.port) || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: dbConfig.dialectOptions || {}
  }
);

// ── Tables to truncate (child → parent order to respect FK constraints) ────────
// All tables are truncated with CASCADE so order is mostly a safety net.
const TABLES_TO_TRUNCATE = [
  'payslip_audit_logs',
  'payslips',
  'payroll_data',
  'salary_structures',
  'payslip_templates',
  'timesheets',
  'attendance',
  'tasks',
  'projects',
  'leave_balances',
  'leave_requests',
  'leave_types',
  'employee_reviews',
  'audit_logs',
  'refresh_tokens',
  'password_reset_tokens',
  'employees',
  'positions',
  'departments',
  'holidays',
  'system_configs',
  'users'
];

// ── Admin user config ──────────────────────────────────────────────────────────
const ADMIN_EMAIL      = process.env.ADMIN_EMAIL      || 'admin@skyraksys.com';
const ADMIN_PASSWORD   = process.env.ADMIN_PASSWORD   || 'ChangeMe@2024!';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'System';
const ADMIN_LAST_NAME  = process.env.ADMIN_LAST_NAME  || 'Admin';
const BCRYPT_ROUNDS    = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== SkyRakSys HRM — Go-Live Prep: JWT Rotation + DB Reset ===\n');

  // ------------------------------------------------------------------
  // 0. Rotate JWT secrets
  // ------------------------------------------------------------------
  rotateJwtSecrets();

  await sequelize.authenticate();
  console.log('✓ Connected to database:', dbConfig.database);

  const transaction = await sequelize.transaction();

  try {
    // ------------------------------------------------------------------
    // 1. Truncate all tables
    // ------------------------------------------------------------------
    console.log('\nTruncating tables...');
    for (const table of TABLES_TO_TRUNCATE) {
      try {
        await sequelize.query(
          `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`,
          { transaction }
        );
        console.log(`  ✓ ${table}`);
      } catch (err) {
        // Table may not exist yet (migration not run); warn and continue.
        console.warn(`  ⚠  ${table} — skipped (${err.message.split('\n')[0]})`);
      }
    }

    // ------------------------------------------------------------------
    // 2. Insert admin user
    // ------------------------------------------------------------------
    console.log('\nCreating admin user...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
    const now = new Date();

    await sequelize.query(
      `INSERT INTO users
         (id, "firstName", "lastName", email, password, role,
          "isActive", "failedLoginAttempts", "createdAt", "updatedAt")
       VALUES
         (:id, :firstName, :lastName, :email, :password, 'admin',
          true, 0, :now, :now);`,
      {
        replacements: {
          id:        uuidv4(),
          firstName: ADMIN_FIRST_NAME,
          lastName:  ADMIN_LAST_NAME,
          email:     ADMIN_EMAIL,
          password:  hashedPassword,
          now
        },
        transaction
      }
    );

    await transaction.commit();

    console.log('\n✓ Done!\n');
    console.log('Admin login credentials:');
    console.log(`  Email   : ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log('\nChange the admin password after your first login.\n');

  } catch (err) {
    await transaction.rollback();
    console.error('\n✗ Error — transaction rolled back.\n', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
