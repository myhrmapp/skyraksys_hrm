# SkyrakSys HRM — Deployment Guide

> **Stack:** Docker · PostgreSQL 17 · Node.js/Express · React · Expo Web · Nginx
> **Server:** `skyait.skyraksys.com` (`46.225.73.94`) — Ubuntu 24.04 LTS
> **User:** `Rakesh`
> **App directory on server:** `/home/Rakesh/skyraksys_hrm`

---

## Architecture

```
Internet
   │
   ▼
Nginx :80/:443 (SSL — Let's Encrypt)
   ├── /api/*          → backend:5000  (Node.js/Express)
   ├── desktop browser → frontend:3000 (React SPA)
   └── mobile browser  → mobile:3001  (Expo web build)

backend:5000 → postgres:5432 (PostgreSQL 17)
```

All five containers are defined in `docker-compose.yml` and managed together.

---

## Scripts Reference

All scripts live in `scripts/deploy/`.

| Script | Purpose | Run from |
|---|---|---|
| `deploy-docker-from-windows.ps1` | **First-time full deploy** — uses PuTTY (plink/pscp) to upload `server-full-setup.sh` to `/tmp/`, execute it as root, then verify API health | Windows |
| `deploy-from-linux.sh` | **First-time full deploy** — SSHes into server and runs each provisioning step inline (install Docker, clone repo, build containers). Does NOT call `server-full-setup.sh` | WSL / Linux / Mac |
| `server-full-setup.sh` | Full server-side provisioning — removes PM2/system Nginx/PostgreSQL, installs Docker, clones repo, auto-generates all secrets, builds 5 containers, runs migrations + seeds, issues SSL cert, configures UFW firewall, sets up systemd auto-start and SSL renewal cron | Server (root) |
| `redeploy.sh` | **Day-to-day code update** — git pull → db:migrate → validate schema → rebuild images → restart containers | Server |
| `validate-schema.sh` | **Post-migration schema check** — verifies all 25 migrations applied, all 23 tables exist, key incremental columns present, key indexes exist. Called automatically by `redeploy.sh`; can also run standalone | Server |
| `setup-ssh-key.ps1` | One-time SSH public key install — copies `~/.ssh/id_rsa_skyraksys.pub` into `authorized_keys` on server for passwordless auth | Windows |
| `check-server-status.ps1` | Pre/post-deploy environment check — verifies Docker installed, Docker Compose installed, repo cloned at `~/skyraksys_hrm`, disk space. Does **not** check running containers or HTTP | Windows |
| `check-docker-status.ps1` | Quick Docker installation check — runs `docker --version` and `docker compose version` on server | Windows |
| `backend.env.production` | Backend environment variable template | Reference |
| `frontend.env.production` | Frontend environment variable template | Reference |
| `all-migrations.sql` | Manual SQL migration fallback (migrations 2–16) — use only if `sequelize-cli db:migrate` fails | Server (psql) |
| `database/init/schema_dump.sql` | Full local schema snapshot (`pg_dump`, 2026-03-31) — reference for diffing against prod schema | Reference |

---

## First-Time Deployment (fresh server)

### Prerequisite (Windows machine)
- [PuTTY](https://www.putty.org/) installed — provides `plink` and `pscp` commands
- Network access to `46.225.73.94` on port 22

### Run from PowerShell
```powershell
cd d:\skyraksys_hrm1\skyraksys_hrm_app
.\scripts\deploy\deploy-docker-from-windows.ps1
```

This automatically:
1. SSHes into `46.225.73.94` as `Rakesh`
2. Uploads `server-full-setup.sh` to `/tmp/`
3. Executes it as root, which:
   - Removes any old PM2/Nginx/PostgreSQL setup
   - Installs Docker and Docker Compose
   - Clones repo from GitHub (branch: `skyraksys_hrm`)
   - **Auto-generates all secrets:** `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `DB_PASSWORD`
   - Writes `.env` to `/home/Rakesh/skyraksys_hrm/.env`
   - Builds Docker images: `postgres`, `backend`, `frontend`, `mobile`, `nginx`
   - Starts all containers: `docker compose up -d`
   - Runs DB migrations and seeds initial data
   - Obtains SSL certificate via Let's Encrypt (Certbot)
   - Configures UFW firewall (ports 22, 80, 443 open)
   - Creates systemd service for auto-start on reboot
   - Sets up monthly SSL auto-renewal cron

**Duration:** ~15–20 minutes on first run.

Generated credentials are saved on the server at:
```
/home/Rakesh/.deployment-credentials.txt   (chmod 600 — Rakesh only)
```
Read with: `cat ~/.deployment-credentials.txt`

---

## Day-to-Day Redeploy (code updates)

After pushing changes to GitHub:

```bash
ssh Rakesh@46.225.73.94
cd skyraksys_hrm
bash scripts/deploy/redeploy.sh
```

This: pulls latest code → runs migrations → **validates schema** → rebuilds images → restarts containers.

If schema validation fails (missing table, column, or index), the deploy **stops before rebuilding** so you can diagnose the issue without serving broken code.

---

## Environment Variables

The `.env` file at `/home/Rakesh/skyraksys_hrm/.env` is auto-generated on first deploy.

| Variable | Value | Auto-generated |
|---|---|---|
| `DB_NAME` | `skyraksys_hrm` | ✅ |
| `DB_USER` | `hrm_admin` | ✅ |
| `DB_PASSWORD` | Secure random | ✅ |
| `DB_HOST` | `postgres` (Docker service) | ✅ |
| `JWT_SECRET` | 48-byte base64 | ✅ |
| `JWT_REFRESH_SECRET` | 48-byte base64 | ✅ |
| `ENCRYPTION_KEY` | 32-byte hex | ✅ |
| `CORS_ORIGIN` | `https://skyait.skyraksys.com` | ✅ |
| `REACT_APP_API_URL` | `/api` | ✅ |
| `EMAIL_FROM` | `noreply@skyraksys.com` | ✅ |
| `SMTP_HOST` | Empty — configure via Admin panel post-deploy | ❌ |

To update a value after first deploy:
```bash
nano ~/.ssh/../skyraksys_hrm/.env   # or: nano ~/skyraksys_hrm/.env
docker compose restart backend       # apply without full rebuild
```

---

## Container Management

```bash
ssh Rakesh@46.225.73.94 && cd skyraksys_hrm

# Status
docker compose ps

# Logs (live)
docker compose logs -f backend
docker compose logs -f nginx

# Restart one service
docker compose restart backend

# Full rebuild
docker compose build --no-cache && docker compose up -d

# Stop all
docker compose down

# Stop and wipe DB volume (DESTRUCTIVE)
docker compose down -v
```

---

## Container Ports

| Container | Port | Public |
|---|---|---|
| `nginx` | 80, 443 | ✅ |
| `backend` | 5000 | Internal only |
| `frontend` | 3000 | Internal only |
| `mobile` | 3001 | Internal only |
| `postgres` | 5432 | Internal only |
| `pgadmin` | 8081 | Via `server:8081` |

---

## Mobile vs Desktop Routing

Nginx switches automatically based on the browser User-Agent:

| Visitor | Served |
|---|---|
| Desktop browser | React SPA — `frontend:3000` |
| Mobile phone browser | Expo web build — `mobile:3001` |
| Any client → `/api/*` | Backend API — `backend:5000` |

No App Store needed. The mobile build is the Expo app exported to static HTML/JS via `expo export --platform web`, served directly in the phone browser.

---

## SSL Certificate

- Issued by **Let's Encrypt** (Certbot) via `--standalone` during first deploy
- Covers `skyait.skyraksys.com` and `www.skyait.skyraksys.com`
- Stored at `/etc/letsencrypt/live/skyait.skyraksys.com/`
- Copied to `nginx/ssl/` for Docker nginx to mount
- Auto-renewed monthly via cron (1st of each month at midnight)

**How the cron works:** `--standalone` mode needs port 80 free, so the cron stops the nginx container first, renews, then starts nginx again — even if renewal fails, nginx always comes back up:
```
0 0 1 * * cd /home/Rakesh/skyraksys_hrm && docker compose stop nginx && certbot renew --quiet; docker compose start nginx
```

To renew manually:
```bash
cd ~/skyraksys_hrm
docker compose stop nginx
sudo certbot renew
sudo cp /etc/letsencrypt/live/skyait.skyraksys.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/skyait.skyraksys.com/privkey.pem nginx/ssl/
docker compose start nginx
```

---

## Database

```bash
# Connect
docker compose exec postgres psql -U hrm_admin -d skyraksys_hrm

# Run migrations
docker compose exec backend npx sequelize-cli db:migrate

# Seed (first deploy only)
docker compose exec backend npx sequelize-cli db:seed:all

# Backup
docker compose exec postgres pg_dump -U hrm_admin skyraksys_hrm > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260331.sql | docker compose exec -T postgres psql -U hrm_admin -d skyraksys_hrm
```

---

## Schema Validation

`scripts/deploy/validate-schema.sh` runs automatically inside `redeploy.sh` after migrations. It checks:

| Check | What it validates |
|---|---|
| **Migration count** | All 25 migrations applied (matches local) |
| **All 23 tables exist** | No table missing from `SequelizeMeta` run |
| **Key incremental columns** | `leave_types.isPaid`, `timesheets.rejectedBy`, `tasks.dueDate`, `employees.country`, soft-delete `deletedAt` columns, etc. |
| **Key indexes** | All performance indexes from migrations 20260327/20260329 |

### Run manually after first deploy
```bash
ssh Rakesh@46.225.73.94
cd skyraksys_hrm
bash scripts/deploy/validate-schema.sh
```

### Compare prod schema against local reference
```bash
# On prod server — dump prod schema
docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --schema-only --no-owner --no-acl \
  > /tmp/prod_schema.sql

# Copy to local (run from your machine)
scp Rakesh@46.225.73.94:/tmp/prod_schema.sql ./prod_schema.sql

# Diff against the local reference snapshot
diff --unified \
  <(grep -E '^(CREATE|ALTER|COMMENT)' database/init/schema_dump.sql | sort) \
  <(grep -E '^(CREATE|ALTER|COMMENT)' prod_schema.sql | sort)
# No output = schemas match
```

### If validation fails
| Problem | Fix |
|---|---|
| Migration count wrong | `docker compose exec backend npx sequelize-cli db:migrate --debug` |
| Missing column/table | Check migration logs, apply `database/init/schema_dump.sql` as fallback |
| DB connection error | Verify `.env` credentials, `docker compose ps` |

---

## Health Checks

```bash
curl https://skyait.skyraksys.com/health
curl https://skyait.skyraksys.com/api/health

# From Windows
.\scripts\deploy\check-server-status.ps1
```

---

## Manual Deployment (step by step)

Use this if you cannot run the deploy scripts (PuTTY not available, script fails midway, or you prefer full control).

### Step 1 — SSH into server
```bash
ssh Rakesh@46.225.73.94
# enter password when prompted
```

### Step 2 — Install Docker (skip if already installed)
```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git ufw certbot python3-certbot-nginx

# Add Docker's GPG key and repo
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker Rakesh
sudo systemctl enable docker && sudo systemctl start docker

# Verify
docker --version && docker compose version
```

### Step 3 — Clone the repository
```bash
cd ~
git clone -b skyraksys_hrm https://github.com/myhrmapp/skyraksys_hrm.git skyraksys_hrm
cd skyraksys_hrm
```

### Step 4 — Create the .env file
```bash
# Generate secrets
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
ENCRYPTION_KEY=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)

cat > .env << EOF
DB_NAME=skyraksys_hrm
DB_USER=hrm_admin
DB_PASSWORD=${DB_PASSWORD}
DB_HOST=postgres
DB_PORT=5432
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=${ENCRYPTION_KEY}
CORS_ORIGIN=https://skyait.skyraksys.com
REACT_APP_API_URL=/api
NODE_ENV=production
PORT=5000
EMAIL_FROM=noreply@skyraksys.com
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
EOF

# Save credentials somewhere safe
echo "DB_PASSWORD=${DB_PASSWORD}" >> ~/.deployment-credentials.txt
echo "ENCRYPTION_KEY=${ENCRYPTION_KEY}" >> ~/.deployment-credentials.txt
chmod 600 ~/.deployment-credentials.txt
```

### Step 5 — Build and start all containers
```bash
docker compose build --no-cache
docker compose up -d

# Watch startup (Ctrl+C to stop watching)
docker compose logs -f

# Verify all containers are Up
docker compose ps
```

Expected output — all 5 should show `Up` or `healthy`:
```
skyraksys_hrm_postgres   Up (healthy)
skyraksys_hrm_backend    Up (healthy)
skyraksys_hrm_frontend   Up (healthy)
skyraksys_hrm_mobile     Up (healthy)
skyraksys_hrm_nginx      Up
```

### Step 6 — Run migrations and seed
```bash
# Wait ~20s for postgres to be fully ready, then:
docker compose exec backend npx sequelize-cli db:migrate
docker compose exec backend npx sequelize-cli db:seed:all

# Validate schema
bash scripts/deploy/validate-schema.sh
```

### Step 7 — SSL certificate
```bash
# Stop nginx so certbot can bind port 80
docker compose stop nginx

sudo certbot certonly --standalone \
  -d skyait.skyraksys.com \
  -d www.skyait.skyraksys.com \
  --non-interactive --agree-tos \
  --email admin@skyraksys.com

# Copy certs into the nginx ssl mount
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/skyait.skyraksys.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/skyait.skyraksys.com/privkey.pem nginx/ssl/
sudo chown -R Rakesh:Rakesh nginx/ssl

# Start nginx with SSL
docker compose start nginx
```

### Step 8 — Firewall
```bash
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw --force enable
sudo ufw status
```

### Step 9 — Auto-start on reboot
```bash
sudo tee /etc/systemd/system/skyraksys-hrm.service > /dev/null << EOF
[Unit]
Description=SkyrakSys HRM Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/Rakesh/skyraksys_hrm
ExecStart=/usr/bin/docker compose -f /home/Rakesh/skyraksys_hrm/docker-compose.yml up -d
ExecStop=/usr/bin/docker compose -f /home/Rakesh/skyraksys_hrm/docker-compose.yml down
User=Rakesh
Group=Rakesh

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable skyraksys-hrm.service
```

### Step 10 — SSL auto-renewal cron
```bash
# Stop nginx before renewal (certbot --standalone needs port 80), always restart after
(crontab -l 2>/dev/null | grep -v "certbot renew"; \
 echo "0 0 1 * * cd /home/Rakesh/skyraksys_hrm && docker compose stop nginx && certbot renew --quiet; docker compose start nginx") \
 | crontab -

crontab -l   # confirm the cron is set
```

### Step 11 — Verify everything
```bash
# Containers
docker compose ps

# API health
curl http://localhost:5000/health
curl https://skyait.skyraksys.com/api/health

# Frontend (desktop)
curl -I https://skyait.skyraksys.com

# Check logs for errors
docker compose logs backend --tail=50
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Container not starting | `docker compose logs <service>` |
| Backend crashes immediately | Check `ENCRYPTION_KEY` is set in `.env` |
| Migrations fail | `docker compose exec backend npx sequelize-cli db:migrate --debug` |
| SSL errors | `sudo certbot certificates` |
| Disk full | `docker system prune -a` |
| Full wipe and redeploy | `docker compose down -v && docker compose up -d --build` |

---

## Default Login Credentials (post-seed)

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@skyraksys.com` | `admin123` |
| HR Manager | `hr@skyraksys.com` | `admin123` |
| Manager | `manager@skyraksys.com` | `admin123` |
| Employee | `employee@skyraksys.com` | `admin123` |

> **Change all passwords immediately after first login.**
