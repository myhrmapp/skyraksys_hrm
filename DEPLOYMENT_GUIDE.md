# SkyrakSys HRM — Deployment Guide

Generated from `docker-compose.yml`, `ecosystem.config.js`, and `server.js`.

---

## Deployment Options

### Option A: Docker Compose (Recommended)

The `docker-compose.yml` defines a fully containerized three-tier stack:

| Service | Image | Notes |
|---------|-------|-------|
| `postgres` | `postgres:17-alpine` | Internal network only — not exposed to host |
| `backend` | Built from `backend/Dockerfile` | Exposes port 5000 |
| `frontend` / `nginx` | Static build served by Nginx | Exposes port 80/443 |

**Start:** `docker compose up -d`  
**Stop:** `docker compose down`  
**Logs:** `docker compose logs -f backend`

---

### Option B: PM2 (Bare Metal / VPS)

The `ecosystem.config.js` runs the backend in **cluster mode** (2 instances):

| Setting | Value |
|---------|-------|
| Instances | 2 (cluster) |
| Max Memory | 1 GB before auto-restart |
| Node Args | `--max_old_space_size=1024` |
| Deploy Path | `/var/www/skyraksys_hrm` |
| Log Path | `./logs/combined.log` |

**Deploy command:**
```bash
pm2 deploy ecosystem.config.js production
```

---

## Required Environment Variables (`.env.production`)

### 🗄️ Database
| Variable | Default | Required |
|----------|---------|----------|
| `DB_HOST` | `postgres` (Docker) | ✅ |
| `DB_PORT` | `5432` | ✅ |
| `DB_NAME` | `skyraksys_hrm` | ✅ |
| `DB_USER` | `hrm_admin` | ✅ |
| `DB_PASSWORD` | — | ✅ **Strong password** |

### 🔐 Security & Auth
| Variable | Default | Required |
|----------|---------|----------|
| `JWT_SECRET` | — | ✅ **Min 64 chars** |
| `JWT_REFRESH_SECRET` | — | ✅ **Min 64 chars** |
| `ENCRYPTION_KEY` | — | ✅ **32-byte hex for Vault** |
| `JWT_EXPIRES_IN` | `1h` | Optional |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Optional |

### 🌐 Networking
| Variable | Default | Required |
|----------|---------|----------|
| `CORS_ORIGIN` | `https://skyait.skyraksys.com,http://46.225.73.94` | ✅ |
| `TRUST_PROXY` | `true` | ✅ (needed behind Nginx) |
| `PORT` | `5000` | Optional |

### 📧 Email (SMTP)
| Variable | Default | Required |
|----------|---------|----------|
| `SMTP_HOST` | — | ✅ For email features |
| `SMTP_PORT` | `587` | Optional |
| `SMTP_SECURE` | `false` | Optional |
| `SMTP_USER` | — | ✅ |
| `SMTP_PASSWORD` | — | ✅ |
| `EMAIL_FROM` | `noreply@skyraksys.com` | Optional |

---

## Database Migrations

**After every new deployment, run:**
```bash
bash scripts/deploy/run-migrations.sh
```

This safely applies all pending Sequelize migrations without touching existing data.

### Migration History (Prod-Release-3)

| Migration | Description |
|-----------|-------------|
| `20260209000000` | Fresh consolidated schema (base) |
| `20260719000001` | Add Project ManagerId & Salary PayFrequency |
| `20260719000002` | Invoice & InvoiceTemplate tables |
| `20260719000003` | Encrypt sensitive Invoice columns |
| `20260721000001` | Extend `photoUrl` column to `TEXT` for Base64 |
| `20260721000002` | Rename employeeId to SK-format (e.g., SK-0001) |
| `20260721000003` | Add image & popup fields to Notifications |
| `20260721000004` | Seed default Invoice Templates |
| `20260721000005` | Create Clients table |
| `20260721000006` | Create PayrollVaultConfig table |
| `20260721000007` | Add encrypted financial fields to SalaryStructures |

---

## Nginx Configuration

The `nginx/` directory contains the reverse proxy configuration. Key rules:
- Serve the React build from `/var/www/html`
- Proxy `/api/*` to `backend:5000`
- Proxy `/socket.io/*` with WebSocket upgrade headers
