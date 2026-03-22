# SkyRakSys HRM â€” Ubuntu Server Deployment Guide

> **Target Server:** Ubuntu 24.04.3 LTS  
> **Server IP:** `46.225.73.94`  
> **Hostname:** `skyait`  
> **Domain:** `skyait.skyraksys.com`  
> **Stack:** Node.js 22 LTS Â· PostgreSQL 15 Â· Nginx Â· PM2 Â· React (CRA)

---

## Quick Reference

| Item | Value |
|------|-------|
| Server IP | `46.225.73.94` |
| Domain | `skyait.skyraksys.com` |
| App Directory | `/var/www/skyraksys_hrm` |
| Backend Port | `5000` (proxied by Nginx) |
| Database | `skyraksys_hrm_prod` |
| DB User | `hrm_app` |
| PM2 App Name | `skyraksys-hrm` |

---

## Table of Contents

- [Part A â€” First-Time Full Deployment](#part-a--first-time-full-deployment)
- [Part B â€” Incremental Updates (Redeploy)](#part-b--incremental-updates-redeploy)
- [Part C â€” SSL Setup](#part-c--ssl-setup)
- [Part D â€” Maintenance & Troubleshooting](#part-d--maintenance--troubleshooting)

---

## Part A â€” First-Time Full Deployment

### Step 1 â€” SSH into the Server

```bash
ssh Rakesh@46.225.73.94
# Then switch to root:
sudo su -
```

### Step 2 â€” Server Setup (Node.js, PostgreSQL, Nginx, PM2)

```bash
# Upload the setup script first (from your Windows machine):
scp scripts/deploy/01-server-setup.sh Rakesh@46.225.73.94:/tmp/

# On the server:
chmod +x /tmp/01-server-setup.sh
bash /tmp/01-server-setup.sh
```

This installs: Node.js 22, PostgreSQL 15, Nginx, PM2, UFW firewall, fail2ban.

### Step 3 â€” Database Setup

```bash
# Upload and run:
scp scripts/deploy/02-db-setup.sh Rakesh@46.225.73.94:/tmp/
# On the server:
chmod +x /tmp/02-db-setup.sh
bash /tmp/02-db-setup.sh
```

Creates database `skyraksys_hrm_prod` with user `hrm_app`.

### Step 4 â€” Upload Application Files

**From your Windows machine (PowerShell / CMD):**

```powershell
# Option A: SCP (simple)
scp -r skyraksys_hrm_app/backend Rakesh@46.225.73.94:/var/www/skyraksys_hrm/
scp -r skyraksys_hrm_app/frontend Rakesh@46.225.73.94:/var/www/skyraksys_hrm/
scp skyraksys_hrm_app/ecosystem.config.js Rakesh@46.225.73.94:/var/www/skyraksys_hrm/
scp skyraksys_hrm_app/package.json Rakesh@46.225.73.94:/var/www/skyraksys_hrm/

# Option B: rsync (faster for updates, needs WSL or Git Bash)
rsync -avz --exclude 'node_modules' --exclude '.env' --exclude 'build' \
  --exclude 'uploads/*' --exclude 'logs/*' --exclude 'coverage' \
  --exclude '.git' --exclude 'archive' \
  skyraksys_hrm_app/ Rakesh@46.225.73.94:/var/www/skyraksys_hrm/
```

> **Important:** Do NOT upload `node_modules/` â€” install on server instead.

### Step 5 â€” Configure Environment Variables

```bash
# On the server:
# Copy the production .env template to backend
cp /var/www/skyraksys_hrm/scripts/deploy/backend.env.production /var/www/skyraksys_hrm/backend/.env

# Copy frontend production env
cp /var/www/skyraksys_hrm/scripts/deploy/frontend.env.production /var/www/skyraksys_hrm/frontend/.env.production

# CRITICAL: Generate real secrets (all three are required — server will crash without them)
cd /var/www/skyraksys_hrm/backend
JWT1=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT2=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
ENC=$(node -e  "console.log(require('crypto').randomBytes(32).toString('hex'))")
sed -i "s/REPLACE_WITH_GENERATED_SECRET_64_CHARS/$JWT1/" .env
sed -i "s/REPLACE_WITH_DIFFERENT_GENERATED_SECRET_64_CHARS/$JWT2/" .env
sed -i "s/REPLACE_WITH_64_HEX_CHAR_ENCRYPTION_KEY/$ENC/" .env

# Verify — all three must show real values, not placeholder text:
grep -E "JWT_SECRET|ENCRYPTION_KEY" .env
```

### Step 6 â€” Deploy Application

```bash
scp scripts/deploy/03-deploy-app.sh Rakesh@46.225.73.94:/tmp/
# On the server:
chmod +x /tmp/03-deploy-app.sh
bash /tmp/03-deploy-app.sh
```

This runs: `npm ci` â†’ frontend build â†’ DB migrate â†’ seed (optional) â†’ PM2 start.

### Step 7 â€” Configure Nginx

```bash
scp scripts/deploy/04-nginx-config.sh Rakesh@46.225.73.94:/tmp/
# On the server (as root):
chmod +x /tmp/04-nginx-config.sh
bash /tmp/04-nginx-config.sh
```

### Step 8 â€” Verify Deployment

```bash
# Check PM2 status
pm2 status
pm2 logs skyraksys-hrm --lines 20

# Test API health
curl http://localhost:5000/api/health

# Test through Nginx
curl http://skyait.skyraksys.com/api/health

# Test frontend
curl -I http://skyait.skyraksys.com/
```

Open in browser: `http://skyait.skyraksys.com`

---

## Part B â€” Incremental Updates (Redeploy)

For code-only updates (no server setup needed):

```powershell
# From Windows â€” upload changed files:
rsync -avz --exclude 'node_modules' --exclude '.env' --exclude 'build' \
  --exclude 'uploads/*' --exclude 'logs/*' --exclude 'coverage' \
  --exclude '.git' --exclude 'archive' \
  skyraksys_hrm_app/ Rakesh@46.225.73.94:/var/www/skyraksys_hrm/

# On the server:
bash /var/www/skyraksys_hrm/scripts/deploy/redeploy.sh
```

Or manually:
```bash
cd /var/www/skyraksys_hrm
cd backend && npm ci --production
cd ../frontend && npm ci && npm run build
cd ../backend && npx sequelize-cli db:migrate
cd .. && pm2 restart skyraksys-hrm
```

---

## Part C â€” SSL Setup

**Prerequisite:** DNS A record for `skyait.skyraksys.com` must point to `46.225.73.94`.

```bash
# On the server (as root):
bash /tmp/05-ssl-setup.sh

# After SSL is active, update the URLs:
cd /var/www/skyraksys_hrm/backend
sed -i 's|http://skyait.skyraksys.com|https://skyait.skyraksys.com|g' .env

cd /var/www/skyraksys_hrm/frontend
sed -i 's|http://skyait.skyraksys.com|https://skyait.skyraksys.com|g' .env.production
npm run build

cd /var/www/skyraksys_hrm
pm2 restart skyraksys-hrm
```

---

## Part D â€” Maintenance & Troubleshooting

### Useful Commands

```bash
# PM2
pm2 status                          # App status
pm2 logs skyraksys-hrm --lines 50   # Recent logs
pm2 restart skyraksys-hrm           # Restart
pm2 reload skyraksys-hrm            # Zero-downtime reload
pm2 monit                           # Real-time monitor

# Nginx
nginx -t                            # Test config
systemctl reload nginx              # Reload
tail -f /var/log/nginx/skyraksys_hrm_error.log

# PostgreSQL
sudo -u postgres psql -d skyraksys_hrm_prod   # Connect to DB
sudo -u postgres pg_dump skyraksys_hrm_prod > backup_$(date +%Y%m%d).sql  # Backup

# Database migration status
cd /var/www/skyraksys_hrm/backend
npx sequelize-cli db:migrate:status
```

### Common Issues

| Issue | Fix |
|-------|-----|
| 502 Bad Gateway | PM2 not running: `pm2 restart skyraksys-hrm` |
| CORS errors | Check `CORS_ORIGIN` and `FRONTEND_URL` in backend `.env` match the domain |
| DB connection refused | `systemctl status postgresql` â†’ `systemctl start postgresql` |
| Frontend shows old version | Rebuild: `cd frontend && npm run build` |
| Upload permission denied | `chown -R deploy:deploy /var/www/skyraksys_hrm/uploads` |

### Database Backup (Cron)

```bash
# Add daily backup cron (as postgres user):
sudo crontab -u postgres -e
# Add this line:
0 2 * * * pg_dump skyraksys_hrm_prod | gzip > /var/backups/postgresql/hrm_$(date +\%Y\%m\%d).sql.gz
```
