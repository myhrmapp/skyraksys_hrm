# SkyRakSys HRM - Production Database Setup Guide

**Last Updated**: February 16, 2026  
**Database**: PostgreSQL 12+  
**Status**: ✅ Production-ready (18 migrations, 22 tables, all model-aligned)

---

## Quick Reference

| Item | Value |
|------|-------|
| **Total Migrations** | 18 files |
| **Total Tables** | 22 |
| **Seeder** | 1 (creates admin + demo data) |
| **All PKs** | UUID |
| **Soft Deletes** | 15 of 22 tables |

---

## Prerequisites

### 1. PostgreSQL Installation
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# RHEL/CentOS
sudo dnf install postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database User
```sql
-- Connect as postgres superuser
sudo -u postgres psql

-- Create production user
CREATE USER hrm_app WITH PASSWORD 'your_secure_password_here';

-- Create production database
CREATE DATABASE skyraksys_hrm_prod OWNER hrm_app;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE skyraksys_hrm_prod TO hrm_app;

-- Connect to the new database
\c skyraksys_hrm_prod

-- Grant schema privileges (PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO hrm_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO hrm_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO hrm_app;

\q
```

---

## Environment Configuration

### 1. Copy and Configure `.env`
```bash
cd /path/to/skyraksys_hrm_app/backend
cp .env.example .env
```

### 2. Required Environment Variables
```bash
# Application
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skyraksys_hrm_prod
DB_USER=hrm_app
DB_PASSWORD=your_secure_password_here
DB_DIALECT=postgres
DB_SSL=false  # Set to 'true' if using SSL
DB_POOL_MAX=10
DB_POOL_MIN=2

# JWT (CRITICAL - Generate unique secrets)
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<different-64-char-random-string>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_ENABLED=true

# CORS (adjust for your frontend URL)
CORS_ORIGIN=https://your-frontend-domain.com
FRONTEND_URL=https://your-frontend-domain.com

# Seeding (set to true only for initial setup, then false)
SEED_DEMO_DATA=true
```

### 3. Generate Secrets
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_REFRESH_SECRET (different value)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Migration Execution

### 1. Run All Migrations
```bash
cd /path/to/skyraksys_hrm_app/backend

# Install dependencies (if not already done)
npm install

# Run migrations
NODE_ENV=production npx sequelize-cli db:migrate
```

**Expected output**: `18 migrations executed successfully`

### 2. Migration List (Execution Order)
| # | Migration | Purpose |
|---|-----------|---------|
| 1 | `20260209000000-fresh-consolidated-schema` | Creates 19 base tables |
| 2 | `20260209100000-gap-fixes-module-2-3-5-6` | Unique constraints, payroll_data→UUID |
| 3 | `20260210000000-gap-fixes-module-9-10-11` | Indexes, CHECK constraints |
| 4 | `20260210000001-normalize-audit-log-actions` | Data normalization |
| 5 | `20260210000002-fix-approvedby-fk-consistency` | FK adjustments |
| 6 | `20260210000003-create-password-reset-tokens` | Password reset table |
| 7 | `20260210000004-create-holidays` | Holidays table |
| 8 | `20260210000005-create-attendances` | Attendances table |
| 9 | `20260210100000-fix-pk-type-mismatches` | UUID conversions |
| 10 | `20260211000001-payroll-data-id-to-uuid` | Payroll UUID conversion |
| 11 | `20260211000002-salary-structures-composite-unique` | Composite unique |
| 12 | `20260211000003-add-missing-indexes` | Performance indexes |
| 13 | `20260211000004-add-soft-deletes` | Soft delete support |
| 14 | `20260211000005-add-check-constraints` | Data validation |
| 15 | `20260211000006-add-unique-constraints` | Unique constraints |
| 16 | `20260211000007-standardize-fk-ondelete` | FK cascade rules |
| 17 | `20260216000001-fix-approvedby-fk-to-employees` | Revert approvedBy FKs |
| 18 | `20260216100000-fix-critical-model-db-mismatches` | **Model alignment fixes** |

---

## Seeding Initial Data

### 1. Run Seeder (First-Time Only)
```bash
# Ensure SEED_DEMO_DATA=true in .env
NODE_ENV=production npx sequelize-cli db:seed:all
```

### 2. What Gets Created
| Entity | Count | Details |
|--------|-------|---------|
| **Users** | 5 | Admin, HR, Manager, 2 Employees |
| **Departments** | 5 | HR, Engineering, Sales, Marketing, Finance |
| **Positions** | 11 | Various roles across departments |
| **Employees** | 5 | Linked 1:1 with users (EMP0001-EMP0005) |
| **Leave Types** | 5 | Sick, Casual, Annual, Maternity, Paternity |
| **Leave Balances** | 25 | 5 employees × 5 types |
| **Projects** | 3 | HRM, E-commerce, Mobile App projects |
| **Tasks** | 6 | Backend, Frontend, DB, API, QA, Docs |
| **Salary Structures** | 5 | All employees (₹55K-₹100K) |
| **Payslip Templates** | 4 | Standard, Executive, Consultant, Intern |

### 3. Default Login Credentials
| Email | Password | Role |
|-------|----------|------|
| admin@skyraksys.com | `admin123` | admin |
| hr@skyraksys.com | `admin123` | hr |
| lead@skyraksys.com | `admin123` | manager |
| employee1@skyraksys.com | `admin123` | employee |
| employee2@skyraksys.com | `admin123` | employee |

**⚠️ CRITICAL**: Change all passwords immediately after first login!

---

## Schema Overview

### Complete Table List (22 Tables)

| # | Table | Records | Soft Delete | Purpose |
|---|-------|---------|-------------|---------|
| 1 | users | 5 | ✅ | System authentication |
| 2 | departments | 5 | ✅ | Organization structure |
| 3 | positions | 11 | ✅ | Job roles |
| 4 | employees | 5 | ✅ | Employee master data (40+ fields) |
| 5 | refresh_tokens | 0 | ❌ | JWT refresh tokens |
| 6 | leave_types | 5 | ✅ | Leave categories |
| 7 | leave_balances | 25 | ✅ | Employee leave allowances |
| 8 | leave_requests | 0 | ✅ | Leave applications |
| 9 | projects | 3 | ✅ | Project management |
| 10 | tasks | 6 | ✅ | Task assignments |
| 11 | timesheets | 0 | ✅ | Weekly time tracking |
| 12 | salary_structures | 5 | ✅ | Employee compensation |
| 13 | payslip_templates | 4 | ❌ | Payslip layouts |
| 14 | payroll_data | 0 | ❌ | Monthly payroll |
| 15 | payslips | 0 | ✅ | Generated payslips |
| 16 | payslip_audit_logs | 0 | ❌ | Payslip change tracking |
| 17 | audit_logs | 0 | ❌ | System audit trail |
| 18 | system_configs | 0 | ❌ | Application settings |
| 19 | employee_reviews | 0 | ✅ | Performance reviews |
| 20 | password_reset_tokens | 0 | ❌ | Password recovery |
| 21 | holidays | 0 | ❌ | Company holidays |
| 22 | attendances | 0 | ✅ | Daily attendance |

---

## Critical Fixes in Migration #18

**Migration**: `20260216100000-fix-critical-model-db-mismatches.js`

### Fix 1: Salary Structures History Support
**Problem**: Single-column unique constraint on `employeeId` blocked salary history.  
**Solution**: Removed `uq_salary_structures_employee_id`, kept composite unique on `(employeeId, effectiveFrom)`.  
**Result**: ✅ Multiple salary structures per employee now allowed.

### Fix 2: Payslips-PayrollData Integrity
**Problem**: Model enforces `payrollDataId NOT NULL + ON DELETE RESTRICT`, but DB had nullable + SET NULL.  
**Solution**: 
- Set `payrollDataId` to `NOT NULL`
- Changed FK to `ON DELETE RESTRICT`

**Result**: ✅ Prevents orphaned payslips without payroll data.

---

## Verification

### 1. Check Migration Status
```bash
NODE_ENV=production npx sequelize-cli db:migrate:status
```
**Expected**: All 18 migrations show `up` status.

### 2. Verify Table Count
```sql
psql -U hrm_app -d skyraksys_hrm_prod

SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name != 'SequelizeMeta';
```
**Expected**: `22 tables`

### 3. Verify Seeded Data
```sql
-- Check users
SELECT COUNT(*) as user_count FROM users; -- Should be 5

-- Check departments
SELECT COUNT(*) as dept_count FROM departments; -- Should be 5

-- Check employees
SELECT COUNT(*) as emp_count FROM employees; -- Should be 5

-- Check leave types
SELECT COUNT(*) as leave_types_count FROM leave_types; -- Should be 5
```

### 4. Test Admin Login
```bash
# Via curl (adjust URL to your backend)
curl -X POST http://your-server:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@skyraksys.com",
    "password": "admin123"
  }'
```
**Expected**: JSON response with `token` and `refreshToken`.

---

## Post-Deployment Checklist

- [ ] All 18 migrations executed successfully
- [ ] Seeder ran and created 5 users
- [ ] Admin login works with default credentials
- [ ] All passwords changed from `admin123` to secure passwords
- [ ] `SEED_DEMO_DATA=false` set in `.env` (prevents re-seeding)
- [ ] JWT secrets are unique and secured
- [ ] CORS_ORIGIN matches your frontend URL
- [ ] Database backups configured
- [ ] SSL enabled for production (if applicable)
- [ ] Firewall rules configured (allow only backend to access DB)

---

## Backup & Restore

### Backup
```bash
# Full database backup
pg_dump -U hrm_app -h localhost skyraksys_hrm_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump -U hrm_app -h localhost skyraksys_hrm_prod | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore
```bash
# From plain SQL
psql -U hrm_app -d skyraksys_hrm_prod < backup_20260216_120000.sql

# From compressed
gunzip -c backup_20260216_120000.sql.gz | psql -U hrm_app -d skyraksys_hrm_prod
```

---

## Troubleshooting

### Issue: Migrations Fail
**Check**:
1. Database credentials in `.env`
2. Database user has sufficient privileges
3. PostgreSQL version (requires 12+)
4. Network connectivity to DB server

### Issue: Seeder Fails
**Solution**:
```bash
# Check if tables are empty
psql -U hrm_app -d skyraksys_hrm_prod -c "SELECT COUNT(*) FROM users;"

# If not empty, seeder will skip (safety feature)
# To force reseed (⚠️ DESTROYS DATA):
NODE_ENV=production npx sequelize-cli db:seed:undo:all
NODE_ENV=production npx sequelize-cli db:seed:all
```

### Issue: Login Fails After Seeding
**Check**:
1. Bcrypt rounds match (should be 12)
2. Default password is exactly `admin123`
3. Check backend logs for specific error

---

## Migration Rollback (Emergency Only)

**⚠️ WARNING**: Rolling back in production can cause data loss!

```bash
# Rollback last migration
NODE_ENV=production npx sequelize-cli db:migrate:undo

# Rollback to specific migration
NODE_ENV=production npx sequelize-cli db:migrate:undo:all --to 20260216000001-fix-approvedby-fk-to-employees.js
```

---

## Support

For issues, refer to:
- [ARCHITECTURE_AND_DESIGN_DOCUMENT.md](../ARCHITECTURE_AND_DESIGN_DOCUMENT.md)
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)
- Backend logs: `backend/logs/combined.log`

---

## Change Log

| Date | Change | Migration |
|------|--------|-----------|
| 2026-02-16 | Fixed salary structures unique constraint | `20260216100000` |
| 2026-02-16 | Fixed payslips.payrollDataId nullability | `20260216100000` |
| 2026-02-16 | Reverted approvedBy FKs to employees | `20260216000001` |
| 2026-02-11 | Added soft deletes to 4 tables | `20260211000004` |
| 2026-02-10 | Created holidays & attendances tables | `20260210000004-5` |
| 2026-02-09 | Initial consolidated schema | `20260209000000` |
