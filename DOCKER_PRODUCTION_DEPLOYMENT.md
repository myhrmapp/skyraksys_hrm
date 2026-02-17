# SkyRakSys HRM — Docker Production Deployment Guide

> **Last Updated:** February 17, 2026  
> **Status:** ✅ Deployed & Running  
> **URL:** http://46.225.73.94:3000

---

## Table of Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [Architecture](#2-architecture)
3. [Server Specifications](#3-server-specifications)
4. [Docker Configuration](#4-docker-configuration)
5. [Container Details](#5-container-details)
6. [Network & Firewall](#6-network--firewall)
7. [Database](#7-database)
8. [Environment Variables](#8-environment-variables)
9. [Deployment Procedure](#9-deployment-procedure)
10. [Operations & Maintenance](#10-operations--maintenance)
11. [Backup & Recovery](#11-backup--recovery)
12. [Troubleshooting](#12-troubleshooting)
13. [Security Notes](#13-security-notes)

---

## 1. Infrastructure Overview

| Component       | Technology         | Version     |
|-----------------|--------------------|-------------|
| OS              | Ubuntu             | 24.04.4 LTS |
| Docker Engine   | Docker CE          | 27.4.1      |
| Docker Compose  | Compose Plugin     | 2.32.1      |
| Backend Runtime | Node.js (Alpine)   | 18.20.8     |
| Frontend Server | Nginx (Alpine)     | 1.29.5      |
| Database        | PostgreSQL (Alpine)| 17          |
| ORM             | Sequelize          | 6.37.7      |
| CLI             | Sequelize CLI      | 6.6.3       |

**Important:** The production server has **NO internet access**. All Docker images and dependencies must be transferred offline.

---

## 2. Architecture

```
                    ┌─────────────────────────────────────────┐
                    │         Production Server               │
                    │         46.225.73.94                     │
                    │                                         │
  User Browser ───► │  ┌──────────────┐    ┌──────────────┐   │
  :3000             │  │  Nginx       │───►│  Node.js     │   │
                    │  │  (Frontend)  │    │  (Backend)   │   │
                    │  │  Port 3000   │    │  Port 5000   │   │
                    │  │  hrm_frontend│    │  hrm_backend │   │
                    │  └──────────────┘    └──────┬───────┘   │
                    │                             │           │
                    │                     ┌───────▼───────┐   │
                    │                     │  PostgreSQL   │   │
                    │                     │  Port 5432    │   │
                    │                     │  hrm_postgres │   │
                    │                     └───────────────┘   │
                    │                                         │
                    └─────────────────────────────────────────┘
```

**Request Flow:**
1. Browser → `http://46.225.73.94:3000` → Nginx container (port 3000)
2. Static files (React build) served directly by Nginx
3. API requests (`/api/*`) → proxied to Backend container (port 5000)
4. Backend → PostgreSQL container (port 5432) via Docker network

---

## 3. Server Specifications

| Property       | Value                    |
|----------------|--------------------------|
| Hostname       | 46.225.73.94             |
| OS             | Ubuntu 24.04.4 LTS       |
| Kernel         | 6.8.0-100-generic        |
| Total Disk     | 150 GB                   |
| Used Disk      | 11 GB (8%)               |
| Free Disk      | 134 GB                   |
| Total RAM      | 7.6 GB                   |
| Available RAM  | 6.5 GB                   |
| SSH User       | Rakesh                   |
| SSH Port       | 22                       |
| Internet       | ❌ No internet access    |

---

## 4. Docker Configuration

### 4.1 Docker Images (Offline)

All images were pulled offline on a local machine, saved as `.tar` files, transferred via SCP, and loaded on the server.

| Image                | Size   |
|----------------------|--------|
| postgres:17-alpine   | 279 MB |
| node:18-alpine       | 127 MB |
| nginx:alpine         | 62 MB  |

### 4.2 docker-compose-prebuilt.yml

This is the production compose file located at:  
`/home/Rakesh/skyraksys_hrm/docker-compose-prebuilt.yml`

```yaml
version: '3.8'

services:
  db:
    image: postgres:17-alpine
    container_name: hrm_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: skyraksys_hrm
      POSTGRES_USER: hrm_user
      POSTGRES_PASSWORD: hrm_secure_pass_2024
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U hrm_user -d skyraksys_hrm']
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: node:18-alpine
    container_name: hrm_backend
    restart: unless-stopped
    working_dir: /app
    command: sh -c 'node server.js'
    environment:
      NODE_ENV: production
      PORT: 5000
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: skyraksys_hrm
      DB_USER: hrm_user
      DB_PASSWORD: hrm_secure_pass_2024
      JWT_SECRET: skyraksys-hrm-jwt-secret-key-2024-production
      JWT_REFRESH_SECRET: skyraksys-hrm-refresh-secret-key-2024-production
      JWT_EXPIRES_IN: 8h
      JWT_REFRESH_EXPIRES_IN: 7d
      CORS_ORIGIN: http://46.225.73.94:3000
      FRONTEND_URL: http://46.225.73.94:3000
      ENCRYPTION_KEY: <64-char-hex-string>
    ports:
      - '5000:5000'
    volumes:
      - ./backend:/app
    depends_on:
      db:
        condition: service_healthy

  frontend:
    image: nginx:alpine
    container_name: hrm_frontend
    restart: unless-stopped
    ports:
      - '3000:3000'
    volumes:
      - ./frontend/build:/usr/share/nginx/html:ro
      - ./frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend

volumes:
  pgdata:
```

### 4.3 Nginx Configuration

Located at: `/home/Rakesh/skyraksys_hrm/frontend/nginx.conf`

- Listens on port **3000** inside the container
- Serves React static build from `/usr/share/nginx/html`
- Proxies `/api` requests to `http://backend:5000`
- Gzip compression enabled
- Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- Static asset caching (1 year with `immutable`)
- React Router SPA fallback (`try_files $uri $uri/ /index.html`)

---

## 5. Container Details

### 5.1 Container Status

| Container      | Image              | Status  | Host Port | Container Port |
|----------------|--------------------|---------|-----------|----------------|
| hrm_postgres   | postgres:17-alpine | Healthy | 5432      | 5432           |
| hrm_backend    | node:18-alpine     | Running | 5000      | 5000           |
| hrm_frontend   | nginx:alpine       | Running | 3000      | 3000           |

### 5.2 Docker Volume

| Volume Name            | Purpose                     |
|------------------------|-----------------------------|
| skyraksys_hrm_pgdata   | PostgreSQL persistent data  |

### 5.3 Docker Network

| Network Name              | Driver | Purpose              |
|---------------------------|--------|----------------------|
| skyraksys_hrm_default     | bridge | Inter-container comm |

---

## 6. Network & Firewall

### 6.1 UFW Firewall Rules

UFW is **ENABLED** on the server.

| Port     | Protocol | Action | From     |
|----------|----------|--------|----------|
| 22/tcp   | TCP      | ALLOW  | Anywhere |
| 3000/tcp | TCP      | ALLOW  | Anywhere |
| 3030/tcp | TCP      | ALLOW  | Anywhere |
| Nginx Full (80,443) | TCP | ALLOW | Anywhere |

### 6.2 Port Mapping

| Service    | Host Port | Container Port | Externally Accessible |
|------------|-----------|----------------|-----------------------|
| Frontend   | 3000      | 3000           | ✅ Yes                |
| Backend    | 5000      | 5000           | ✅ Yes (via Docker)   |
| PostgreSQL | 5432      | 5432           | ✅ Yes (via Docker)   |

> **Note:** Docker bypasses UFW for published ports. The backend (5000) and database (5432) are technically accessible externally through Docker's iptables rules. For hardened security, consider removing the `ports` mapping from `db` and `backend` services and relying solely on the Docker internal network.

---

## 7. Database

### 7.1 Connection Details

| Property  | Value              |
|-----------|--------------------|
| Host      | db (Docker network) / localhost (from host) |
| Port      | 5432               |
| Database  | skyraksys_hrm      |
| User      | hrm_user           |
| Password  | hrm_secure_pass_2024 |

### 7.2 Migrations

18 migrations applied successfully:

| # | Migration | Description |
|---|-----------|-------------|
| 1 | 20260209000000-fresh-consolidated-schema | Base schema (19 tables) |
| 2 | 20260209100000-gap-fixes-module-2-3-5-6 | Payroll data PK to UUID |
| 3 | 20260210000000-gap-fixes-module-9-10-11 | Module 9-11 gap fixes |
| 4 | 20260210000001-normalize-audit-log-actions | Audit log normalization |
| 5 | 20260210000002-fix-approvedby-fk-consistency | FK consistency fix |
| 6 | 20260210000003-create-password-reset-tokens | Password reset tokens table |
| 7 | 20260210000004-create-holidays | Holidays table |
| 8 | 20260210000005-create-attendances | Attendances table |
| 9 | 20260210100000-fix-pk-type-mismatches | PK type UUID conversion |
| 10 | 20260211000001-payroll-data-id-to-uuid | Payroll data UUID |
| 11 | 20260211000002-salary-structures-composite-unique | Composite unique index |
| 12 | 20260211000003-add-missing-indexes | Performance indexes |
| 13 | 20260211000004-add-soft-deletes | Soft delete columns |
| 14 | 20260211000005-add-check-constraints | Data integrity constraints |
| 15 | 20260211000006-add-unique-constraints | Business logic constraints |
| 16 | 20260211000007-standardize-fk-ondelete | FK cascade standardization |
| 17 | 20260216000001-fix-approvedby-fk-to-employees | ApprovedBy FK fix |
| 18 | 20260216100000-fix-critical-model-db-mismatches | Model-DB alignment |

### 7.3 Seed Data

| Entity           | Count |
|------------------|-------|
| Departments      | 5     |
| Positions        | 11    |
| Users            | 5     |
| Employees        | 5     |
| Leave Types      | 5     |
| Leave Balances   | 25    |
| Projects         | 3     |
| Tasks            | 6     |
| Salary Structures| 5     |
| Payslip Templates| 4     |

### 7.4 Default Login Credentials

| Email                     | Role     | Password  |
|---------------------------|----------|-----------|
| admin@skyraksys.com       | Admin    | admin123  |
| hr@skyraksys.com          | HR       | admin123  |
| lead@skyraksys.com        | Manager  | admin123  |
| employee1@skyraksys.com   | Employee | admin123  |
| employee2@skyraksys.com   | Employee | admin123  |

> ⚠️ **Change all default passwords immediately in production!**

---

## 8. Environment Variables

### 8.1 Backend Environment

| Variable             | Value | Description |
|----------------------|-------|-------------|
| NODE_ENV             | production | Runtime environment |
| PORT                 | 5000 | Backend server port |
| DB_HOST              | db | PostgreSQL container hostname |
| DB_PORT              | 5432 | Database port |
| DB_NAME              | skyraksys_hrm | Database name |
| DB_USER              | hrm_user | Database user |
| DB_PASSWORD          | hrm_secure_pass_2024 | Database password |
| JWT_SECRET           | (set in compose) | JWT signing key |
| JWT_REFRESH_SECRET   | (set in compose) | Refresh token key |
| JWT_EXPIRES_IN       | 8h | Access token TTL |
| JWT_REFRESH_EXPIRES_IN | 7d | Refresh token TTL |
| CORS_ORIGIN          | http://46.225.73.94:3000 | Allowed CORS origin |
| FRONTEND_URL         | http://46.225.73.94:3000 | Frontend URL |
| ENCRYPTION_KEY       | (64-char hex) | Field encryption key |

### 8.2 PostgreSQL Environment

| Variable          | Value              |
|-------------------|--------------------|
| POSTGRES_DB       | skyraksys_hrm      |
| POSTGRES_USER     | hrm_user           |
| POSTGRES_PASSWORD | hrm_secure_pass_2024 |

---

## 9. Deployment Procedure

### 9.1 Prerequisites

- Local machine with Node.js 18+ installed
- PuTTY tools (pscp, plink) or equivalent SCP/SSH client
- Docker images saved as `.tar` files (if not already on server)

### 9.2 Full Deployment (From Scratch)

#### Step 1: Build Frontend Locally

```bash
cd skyraksys_hrm_app/frontend
set CI=
npx react-scripts build
```

#### Step 2: Create Deploy Archive

```bash
cd skyraksys_hrm_app
tar -czf deploy-prebuilt.tar.gz \
  --exclude='.git' \
  --exclude='frontend/node_modules' \
  --exclude='frontend/src' \
  --exclude='backend/tests' \
  --exclude='backend/coverage' \
  frontend/build \
  frontend/nginx.conf \
  backend \
  docker-compose.yml \
  .env.production
```

#### Step 3: Upload to Server

```bash
pscp deploy-prebuilt.tar.gz Rakesh@46.225.73.94:/tmp/
```

#### Step 4: Extract on Server

```bash
ssh Rakesh@46.225.73.94
cd /home/Rakesh/skyraksys_hrm
tar -xzf /tmp/deploy-prebuilt.tar.gz
```

#### Step 5: Upload Docker Compose File

```bash
pscp docker-compose-prebuilt.yml Rakesh@46.225.73.94:/home/Rakesh/skyraksys_hrm/
```

#### Step 6: Start Services

```bash
cd /home/Rakesh/skyraksys_hrm
docker compose -f docker-compose-prebuilt.yml up -d
```

#### Step 7: Run Migrations & Seed

```bash
docker exec hrm_backend sh -c 'chmod +x node_modules/.bin/* && npx sequelize-cli db:migrate'
docker exec hrm_backend sh -c 'npx sequelize-cli db:seed:all'
```

#### Step 8: Verify

```bash
docker ps -a
curl -s http://localhost:3000    # Frontend
curl -s http://localhost:5000/api/health  # Backend API
```

### 9.3 Code-Only Update (No Schema Changes)

```bash
# 1. Build frontend locally
cd frontend && set CI= && npx react-scripts build

# 2. Create archive
tar -czf deploy-update.tar.gz frontend/build backend --exclude='backend/tests' --exclude='.git'

# 3. Upload
pscp deploy-update.tar.gz Rakesh@46.225.73.94:/tmp/

# 4. Extract & restart
ssh Rakesh@46.225.73.94
cd /home/Rakesh/skyraksys_hrm
tar -xzf /tmp/deploy-update.tar.gz
docker compose -f docker-compose-prebuilt.yml restart backend frontend
```

### 9.4 Schema Update (New Migrations)

```bash
# After uploading new backend code:
docker exec hrm_backend sh -c 'npx sequelize-cli db:migrate'
docker compose -f docker-compose-prebuilt.yml restart backend
```

---

## 10. Operations & Maintenance

### 10.1 Common Commands

```bash
# View all containers
docker ps -a

# View logs
docker logs hrm_backend --tail 50
docker logs hrm_frontend --tail 50
docker logs hrm_postgres --tail 50

# Follow logs in real-time
docker logs -f hrm_backend

# Restart a single service
docker compose -f docker-compose-prebuilt.yml restart backend

# Restart all services
docker compose -f docker-compose-prebuilt.yml restart

# Stop all services
docker compose -f docker-compose-prebuilt.yml down

# Start all services
docker compose -f docker-compose-prebuilt.yml up -d

# Stop and remove everything INCLUDING data
docker compose -f docker-compose-prebuilt.yml down -v   # ⚠️ DELETES DATABASE

# Enter a container shell
docker exec -it hrm_backend sh
docker exec -it hrm_postgres psql -U hrm_user -d skyraksys_hrm

# Check disk usage
docker system df
```

### 10.2 Health Checks

```bash
# Backend health
curl http://localhost:5000/api/health

# Frontend health
curl http://localhost:3000/health

# Database health
docker exec hrm_postgres pg_isready -U hrm_user -d skyraksys_hrm
```

### 10.3 Resource Monitoring

```bash
# Container resource usage
docker stats --no-stream

# Disk usage
df -h /
docker system df
```

---

## 11. Backup & Recovery

### 11.1 Database Backup

```bash
# Create backup
docker exec hrm_postgres pg_dump -U hrm_user -d skyraksys_hrm > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
docker exec hrm_postgres pg_dump -U hrm_user -d skyraksys_hrm | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 11.2 Database Restore

```bash
# Stop backend first
docker compose -f docker-compose-prebuilt.yml stop backend

# Restore
cat backup_file.sql | docker exec -i hrm_postgres psql -U hrm_user -d skyraksys_hrm

# Restart backend
docker compose -f docker-compose-prebuilt.yml start backend
```

### 11.3 Full System Backup

```bash
# Backup database volume
docker run --rm -v skyraksys_hrm_pgdata:/data -v $(pwd):/backup alpine tar czf /backup/pgdata_backup.tar.gz -C /data .

# Backup application code
tar -czf app_backup_$(date +%Y%m%d).tar.gz /home/Rakesh/skyraksys_hrm
```

---

## 12. Troubleshooting

### 12.1 Container Won't Start

```bash
# Check logs
docker logs hrm_backend 2>&1 | tail -50

# Common fixes:
# - Port conflict: kill existing process using the port
ss -tlnp | grep 5000
kill -9 <PID>

# - Permission issues on node_modules/.bin
docker exec hrm_backend sh -c 'chmod +x node_modules/.bin/*'
```

### 12.2 Database Connection Refused

```bash
# Verify postgres is healthy
docker ps | grep postgres
docker exec hrm_postgres pg_isready -U hrm_user

# Check if backend waits for healthy postgres
docker logs hrm_backend | grep -i "database\|connect\|error"
```

### 12.3 Frontend Not Accessible

```bash
# Check UFW
sudo ufw status
sudo ufw allow 3000/tcp   # If not listed

# Check Docker port mapping
docker ps | grep frontend
# Should show: 0.0.0.0:3000->3000/tcp

# Test locally
curl http://localhost:3000
```

### 12.4 CORS Errors

Ensure `CORS_ORIGIN` in docker-compose matches the exact URL users access:
```yaml
CORS_ORIGIN: http://46.225.73.94:3000
```

### 12.5 PM2 Conflict

If PM2 was previously running and occupies port 5000:
```bash
# Find and kill PM2
ps aux | grep PM2
kill -9 <PID>

# Or if pm2 is in PATH
pm2 kill
```

---

## 13. Security Notes

### 13.1 Immediate Actions Required

- [ ] **Change all default passwords** (admin123) via the application
- [ ] **Change JWT secrets** to unique, randomly generated strings
- [ ] **Change ENCRYPTION_KEY** to a unique 64-char hex string
- [ ] **Change database password** and update in docker-compose
- [ ] **Remove external port mapping** for PostgreSQL (remove `ports: - '5432:5432'` from db service)
- [ ] **Consider removing** backend port mapping (`ports: - '5000:5000'`) — Nginx already proxies to it internally

### 13.2 Recommended Security Hardening

```yaml
# In docker-compose-prebuilt.yml, remove external ports for db and backend:
services:
  db:
    # Remove the ports section entirely
    # ports:
    #   - '5432:5432'
  
  backend:
    # Remove the ports section entirely  
    # ports:
    #   - '5000:5000'
```

This ensures only the frontend (port 3000) is externally accessible, and all backend/database traffic stays within the Docker network.

### 13.3 SSL/HTTPS (Future)

To enable HTTPS, update the nginx.conf to handle SSL termination:
1. Obtain SSL certificate
2. Mount certificate files into the nginx container
3. Update nginx.conf with SSL configuration
4. Map port 443 instead of/in addition to 3000

---

## File Locations Summary

| File | Path on Server |
|------|----------------|
| Docker Compose | `/home/Rakesh/skyraksys_hrm/docker-compose-prebuilt.yml` |
| Backend Code | `/home/Rakesh/skyraksys_hrm/backend/` |
| Frontend Build | `/home/Rakesh/skyraksys_hrm/frontend/build/` |
| Nginx Config | `/home/Rakesh/skyraksys_hrm/frontend/nginx.conf` |
| DB Data Volume | Docker volume: `skyraksys_hrm_pgdata` |
| Migrations | `/home/Rakesh/skyraksys_hrm/backend/migrations/` |
| Seeders | `/home/Rakesh/skyraksys_hrm/backend/seeders/` |

---

*Document generated on February 17, 2026 — SkyRakSys HRM Production Deployment*
