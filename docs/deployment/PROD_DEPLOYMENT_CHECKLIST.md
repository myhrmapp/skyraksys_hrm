# SkyRakSys HRM — Production Deployment Checklist
## First-Time Setup on `skyait.skyraksys.com`

> **Server:** Ubuntu 24.04.3 LTS at `46.225.73.94`  
> **Domain:** `skyait.skyraksys.com`  
> **App dir:** `/var/www/skyraksys_hrm`  
> **Stack:** Node.js 22 · PostgreSQL 15 · Nginx · PM2 (cluster, 2 instances)  
> **PM2 app name:** `skyraksys-hrm`  
> **Backend port:** `5000` (proxied by Nginx)

---

## PHASE 1 — Pre-Deployment (Windows Machine)

### 1.1 Code Readiness

- [ ] All recent bug fixes are saved (19 bugs fixed across all modules — see `PEER_REVIEW_REPORT.md`)
- [ ] No uncommitted `.env` files exist in the source tree — verify with `git status`
- [ ] Confirm the following directories/files will be **excluded** from upload:
  - `node_modules/` (all copies — backend, frontend, e2e)
  - `.env` files (all — generated on server)
  - `frontend/build/` (built on server)
  - `backend/uploads/*` (runtime data, not code)
  - `backend/logs/*` (runtime logs)
  - `backend/coverage/`
  - `.git/`
  - `archive/` (if present)
  - `admin-debug-panel/` — **never deploy to production**

### 1.2 Upload Application to Server

**Option A — SCP (uploads the project as a zip, then extract):**
```powershell
# From PowerShell in the workspace root:
# Upload individual key directories
scp -r .\backend Rakesh@46.225.73.94:/var/www/skyraksys_hrm/
scp -r .\frontend Rakesh@46.225.73.94:/var/www/skyraksys_hrm/
scp .\ecosystem.config.js Rakesh@46.225.73.94:/var/www/skyraksys_hrm/
scp .\package.json Rakesh@46.225.73.94:/var/www/skyraksys_hrm/
```

**Option B — rsync via Git Bash / WSL (recommended — excludes correctly):**
```bash
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'build' \
  --exclude 'uploads/*' \
  --exclude 'logs/*' \
  --exclude 'coverage' \
  --exclude '.git' \
  --exclude 'archive' \
  --exclude 'admin-debug-panel' \
  /d/skyraksys_hrm1/skyraksys_hrm_app/ \
  Rakesh@46.225.73.94:/var/www/skyraksys_hrm/
```

> After upload, also upload all scripts:
> `scp -r .\scripts\deploy Rakesh@46.225.73.94:/var/www/skyraksys_hrm/scripts/`

---

## PHASE 2 — Server Setup (Run Once on Fresh Server)

SSH into the server:
```bash
ssh Rakesh@46.225.73.94
sudo su -
```

### 2.1 Install Stack — `01-server-setup.sh`

```bash
chmod +x /tmp/01-server-setup.sh
# OR if scripts are already uploaded:
chmod +x /var/www/skyraksys_hrm/scripts/deploy/01-server-setup.sh
bash /var/www/skyraksys_hrm/scripts/deploy/01-server-setup.sh
```

**What it does:** Installs Node.js 22, PostgreSQL 15, Nginx, PM2, UFW firewall, fail2ban.

- [ ] `node --version` → `v22.x.x`
- [ ] `psql --version` → `15.x`
- [ ] `nginx -v` → `1.x`
- [ ] `pm2 --version` → `5.x`

### 2.2 Create Database — `02-db-setup.sh`

```bash
bash /var/www/skyraksys_hrm/scripts/deploy/02-db-setup.sh
```

**What it does:** Creates PostgreSQL database `skyraksys_hrm_prod`, user `hrm_app`, grants privileges, configures `pg_hba.conf` for app authentication.

- [ ] Verify:
  ```bash
  sudo -u postgres psql -c "\l" | grep skyraksys_hrm_prod
  sudo -u postgres psql -c "\du" | grep hrm_app
  ```

---

## PHASE 3 — Environment Configuration

### 3.1 Backend Environment

```bash
cd /var/www/skyraksys_hrm/backend

# Copy template
cp /var/www/skyraksys_hrm/scripts/deploy/backend.env.production .env

# Generate and inject all three required secrets
JWT1=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT2=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
ENC=$(node -e  "console.log(require('crypto').randomBytes(32).toString('hex'))")
sed -i "s/REPLACE_WITH_GENERATED_SECRET_64_CHARS/$JWT1/" .env
sed -i "s/REPLACE_WITH_DIFFERENT_GENERATED_SECRET_64_CHARS/$JWT2/" .env
sed -i "s/REPLACE_WITH_64_HEX_CHAR_ENCRYPTION_KEY/$ENC/" .env
```

**Verify — none of these should say "REPLACE_WITH" after the above:**
```bash
grep -E "JWT_SECRET|ENCRYPTION_KEY" .env
```

- [ ] `JWT_SECRET` — shows a long hex string (128 chars)
- [ ] `JWT_REFRESH_SECRET` — shows a different long hex string
- [ ] `ENCRYPTION_KEY` — shows a 64-character hex string
- [ ] `DB_NAME=skyraksys_hrm_prod`
- [ ] `DB_USER=hrm_app`
- [ ] `DB_PASSWORD=HrM_Pr0d_S3cur3_2026!`
- [ ] `DB_HOST=localhost`
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN=http://skyait.skyraksys.com` (update to `https://` after SSL)
- [ ] `SEED_DEMO_DATA=false` (the seeder has its own prompt — this is correct)

> **⚠️ SMTP Note:** Email features (welcome emails, forgot-password) are disabled until SMTP is configured.
> Edit `.env` and fill in the `SMTP_*` block if you need email on day one. Otherwise leave commented out.

### 3.2 Frontend Environment

```bash
cp /var/www/skyraksys_hrm/scripts/deploy/frontend.env.production \
   /var/www/skyraksys_hrm/frontend/.env.production
```

- [ ] Confirm content: `REACT_APP_API_URL=http://skyait.skyraksys.com/api`
  (update to `https://` after SSL — requires a frontend rebuild)

### 3.3 Create Required Runtime Directories

The app writes to these at runtime — PM2 will NOT create them automatically:
```bash
mkdir -p /var/www/skyraksys_hrm/backend/uploads
mkdir -p /var/www/skyraksys_hrm/backend/logs
chmod 755 /var/www/skyraksys_hrm/backend/uploads
chmod 755 /var/www/skyraksys_hrm/backend/logs
```

- [ ] `uploads/` exists and is writable (needed for profile photos, documents)
- [ ] `logs/` exists (PM2 writes combined.log and error.log here)

---

## PHASE 4 — Application Deployment

### 4.1 Run the Deploy Script

```bash
bash /var/www/skyraksys_hrm/scripts/deploy/03-deploy-app.sh
```

The script will:
1. Validate `.env` exists and contains no placeholder values
2. `npm ci --production` (backend dependencies)
3. `npm ci && npm run build` (frontend)
4. `npx sequelize-cli db:migrate` (runs all 19 migrations)
5. Prompt to seed (answer **Y** on first-time setup)
6. Start PM2

**When prompted `Run database seed? (y/N):`** — type `y` and press Enter.  
The seeder is idempotent — it checks if users exist first and skips if data is already present.

- [ ] Migrations ran without errors (19 migrations total, listed as "migrated")
- [ ] Seed ran without errors (creates 5 users, 5 depts, 5 employees, salary structures, etc.)
- [ ] PM2 shows 2 instances online after `pm2 status`

**Expected seed output summary:**
```
✓ Departments: 5
✓ Positions: 11
✓ Users: 5
✓ Employees: 5
✓ Leave types: 5
✓ Leave balances: 25
✓ Projects: 3
✓ Tasks: 6
✓ Salary structures: 5
✓ Payslip templates: 4
```

---

## PHASE 5 — Nginx & Network

### 5.1 Configure Nginx — `04-nginx-config.sh`

```bash
bash /var/www/skyraksys_hrm/scripts/deploy/04-nginx-config.sh
nginx -t
systemctl reload nginx
```

- [ ] `nginx -t` → `syntax is ok` / `test is successful`
- [ ] Port 80 responds: `curl -I http://skyait.skyraksys.com/`

---

## PHASE 6 — Verification Before SSL

### 6.1 API Health Check

```bash
# Direct to backend (bypass Nginx):
curl http://localhost:5000/api/health

# Through Nginx:
curl http://skyait.skyraksys.com/api/health
```

- [ ] Both return `{"success":true,...}`

### 6.2 PM2 Status

```bash
pm2 status
pm2 logs skyraksys-hrm --lines 30
```

- [ ] 2 instances show `online` status
- [ ] No `FATAL` errors in logs (especially no "ENCRYPTION_KEY must be set" — would mean `.env` wasn't read)
- [ ] No DB connection errors in logs

### 6.3 Browser Test (HTTP)

Open: `http://skyait.skyraksys.com`

- [ ] Login page loads
- [ ] Login with `admin@skyraksys.com` / `admin123` → Dashboard appears
- [ ] Login with `hr@skyraksys.com` / `admin123` → HR Dashboard appears
- [ ] Basic navigation works (Employees list, Attendance, etc.)

---

## PHASE 7 — SSL Setup

**Prerequisite:** DNS A record for `skyait.skyraksys.com` must point to `46.225.73.94`.  
Verify: `nslookup skyait.skyraksys.com` (from anywhere) → returns `46.225.73.94`.

```bash
bash /var/www/skyraksys_hrm/scripts/deploy/05-ssl-setup.sh
```

### 7.1 After SSL Is Active — Update URLs to HTTPS

```bash
# Backend .env
cd /var/www/skyraksys_hrm/backend
sed -i 's|http://skyait.skyraksys.com|https://skyait.skyraksys.com|g' .env

# Frontend .env.production (then rebuild)
cd /var/www/skyraksys_hrm/frontend
sed -i 's|http://skyait.skyraksys.com|https://skyait.skyraksys.com|g' .env.production
npm run build

# Restart backend to reload env
cd /var/www/skyraksys_hrm
pm2 restart skyraksys-hrm
```

### 7.2 HTTPS Verification

```bash
curl https://skyait.skyraksys.com/api/health
```

- [ ] Returns `{"success":true,...}` over HTTPS
- [ ] Browser shows padlock — `https://skyait.skyraksys.com` loads
- [ ] HTTP (`http://`) redirects to HTTPS automatically

---

## PHASE 8 — Post-Deployment Security

### 8.1 Change All Default Passwords IMMEDIATELY

Log in as each user and change their password via profile settings, or run from the DB:

**Default accounts (all password: `admin123` — change all of them):**

| Email | Role |
|-------|------|
| `admin@skyraksys.com` | System Admin |
| `hr@skyraksys.com` | HR Manager |
| `lead@skyraksys.com` | Team Lead |
| `employee1@skyraksys.com` | Employee |
| `employee2@skyraksys.com` | Employee |

- [ ] All 5 default passwords changed
- [ ] New admin password stored in a password manager

### 8.2 System Settings (Company Info)

Log in as `admin@skyraksys.com` → **Administration → System Settings**:

- [ ] Company name set (appears on payslips)
- [ ] Company address set
- [ ] Company logo uploaded (optional)
- [ ] Leave year start/end dates configured (used by leave balance calculations)

### 8.3 Firewall Verification

```bash
ufw status verbose
```

- [ ] Port 22 (SSH) — open
- [ ] Port 80 (HTTP) — open
- [ ] Port 443 (HTTPS) — open
- [ ] Port 5000 (backend) — **closed to public** (accessible only via Nginx proxy to localhost)

### 8.4 PM2 Auto-Restart on Reboot

```bash
pm2 save
pm2 startup systemd
# Run the command that pm2 prints (starts with "sudo env PATH=...")
```

- [ ] `pm2 save` ran
- [ ] Startup command executed (so the app restarts automatically after server reboot)

---

## PHASE 9 — Smoke Test (All Roles)

| Test | Expected |
|------|----------|
| Admin login | Dashboard with admin menus |
| HR login | HR dashboard, employee list visible |
| Lead login | My Tasks, team attendance visible |
| Employee login | My profile, leave requests, payslips visible |
| Submit leave request (employee) | Appears in HR pending queue |
| Approve leave (HR) | Status updates for employee |
| Run payroll (HR) | Payroll summary calculated correctly |
| Download payslip (employee) | PDF downloads |
| Mark attendance (employee) | Clock-in/out recorded |

---

## REFERENCE — Database

### Migration Status Check
```bash
cd /var/www/skyraksys_hrm/backend
npx sequelize-cli db:migrate:status
```
All 19 migrations should show `up`. If any show `down`, run `db:migrate` again.

### Re-seed (if needed — safe to re-run, idempotent)
```bash
cd /var/www/skyraksys_hrm/backend
npx sequelize-cli db:seed:all
```
The seeder skips if users already exist — safe to call again.

### Database Backup
```bash
sudo -u postgres pg_dump skyraksys_hrm_prod | gzip > ~/hrm_backup_$(date +%Y%m%d).sql.gz
```

---

## REFERENCE — Key File Locations on Server

| File | Path |
|------|------|
| Backend `.env` | `/var/www/skyraksys_hrm/backend/.env` |
| Frontend `.env.production` | `/var/www/skyraksys_hrm/frontend/.env.production` |
| Frontend build | `/var/www/skyraksys_hrm/frontend/build/` |
| PM2 config | `/var/www/skyraksys_hrm/ecosystem.config.js` |
| Nginx site config | `/etc/nginx/sites-available/skyraksys_hrm` |
| PM2 logs | `/var/www/skyraksys_hrm/backend/logs/` |
| Upload files | `/var/www/skyraksys_hrm/backend/uploads/` |
| Nginx error log | `/var/log/nginx/skyraksys_hrm_error.log` |

---

## REFERENCE — Useful Commands

```bash
# App status
pm2 status
pm2 logs skyraksys-hrm --lines 50
pm2 monit

# Restart / reload
pm2 restart skyraksys-hrm          # Hard restart
pm2 reload skyraksys-hrm           # Zero-downtime reload (preferred)

# Nginx
nginx -t && systemctl reload nginx

# Database
sudo -u postgres psql -d skyraksys_hrm_prod

# Migration status
cd /var/www/skyraksys_hrm/backend
npx sequelize-cli db:migrate:status
```

---

## Known Limitations at Launch

| Feature | Status | Action Required |
|---------|--------|-----------------|
| Email (welcome, forgot-password) | Disabled | Configure `SMTP_*` in `backend/.env` when a mail server is available |
| SSL | Optional (recommended) | Run `05-ssl-setup.sh` after DNS propagates |
| File storage | Local disk | `uploads/` on server — set up S3 or external NFS for HA |
| Backups | Manual | Set up cron job for automated `pg_dump` |

---

*Generated for SkyRakSys HRM — reflect all 19 bug fixes (Sessions 1–4) and ENCRYPTION_KEY fix (Session 5).*
