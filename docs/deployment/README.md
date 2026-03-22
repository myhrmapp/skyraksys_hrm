# SkyrakSys HRM — Deployment Documentation

> **Target Server:** Ubuntu 24.04.3 LTS · `46.225.73.94`  
> **Domain:** `skyait.skyraksys.com`  
> **Stack:** Node.js 22 · PostgreSQL 15 · Nginx · PM2 (cluster × 2)

---

## Where to Start

### 🚀 First-Time Production Setup
→ **[PROD_DEPLOYMENT_CHECKLIST.md](PROD_DEPLOYMENT_CHECKLIST.md)**  
Complete, step-by-step first-time deployment guide. Covers all 9 phases from upload to post-deployment security.

### 🔁 Code Update / Redeploy
```bash
# Upload changes, then on server:
bash /var/www/skyraksys_hrm/scripts/deploy/03-deploy-app.sh
```

### 🐳 Docker-Based Deployment
→ **[DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)**

---

## All Deployment Documents

| Document | Use When |
|----------|----------|
| [PROD_DEPLOYMENT_CHECKLIST.md](PROD_DEPLOYMENT_CHECKLIST.md) | Fresh first-time setup on a new server |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Detailed manual reference (PM2 + Nginx) |
| [DEPLOY_QUICK_START.md](DEPLOY_QUICK_START.md) | Quick one-page summary — upload → configure → deploy → SSL |

---

## Server Quick Reference

| Item | Value |
|------|-------|
| Server IP | `46.225.73.94` |
| Hostname | `skyait` |
| Domain | `skyait.skyraksys.com` |
| App directory | `/var/www/skyraksys_hrm` |
| Backend port | `5000` (proxied by Nginx) |
| PM2 app name | `skyraksys-hrm` |
| Database | `skyraksys_hrm_prod` |
| DB user | `hrm_app` |

---

## Deployment Scripts

Located in `scripts/deploy/` at the project root:

| Script | Purpose |
|--------|---------|
| `01-server-setup.sh` | Install Node.js 22, PostgreSQL 15, Nginx, PM2, UFW |
| `02-db-setup.sh` | Create database and user |
| `03-deploy-app.sh` | Install deps, build frontend, migrate DB, start PM2 |
| `04-nginx-config.sh` | Configure Nginx reverse proxy |
| `05-ssl-setup.sh` | Install Let's Encrypt SSL certificate |
| `redeploy.sh` | Quick redeploy for code updates |

---

## Environment Setup

After uploading code, generate all three required secrets:

```bash
cd /var/www/skyraksys_hrm/backend
cp ../scripts/deploy/backend.env.production .env

JWT1=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT2=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
ENC=$(node -e  "console.log(require('crypto').randomBytes(32).toString('hex'))")
sed -i "s/REPLACE_WITH_GENERATED_SECRET_64_CHARS/$JWT1/" .env
sed -i "s/REPLACE_WITH_DIFFERENT_GENERATED_SECRET_64_CHARS/$JWT2/" .env
sed -i "s/REPLACE_WITH_64_HEX_CHAR_ENCRYPTION_KEY/$ENC/" .env
```

> All three secrets are required. The server throws a FATAL error and will not start without `ENCRYPTION_KEY` in production.

---

## Default Seeded Accounts

After running `npx sequelize-cli db:seed:all`:

| Role | Email | Password |
|------|-------|----------|
| System Admin | `admin@skyraksys.com` | `admin123` |
| HR Manager | `hr@skyraksys.com` | `admin123` |
| Team Lead | `lead@skyraksys.com` | `admin123` |
| Employee | `employee1@skyraksys.com` | `admin123` |
| Employee | `employee2@skyraksys.com` | `admin123` |

**Change all passwords immediately after first login.**
