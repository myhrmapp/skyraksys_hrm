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

> ### ℹ️ DNS Is NOT Required for Initial Deployment
> The deploy scripts generate a **self-signed SSL certificate** automatically, so nginx starts and
> the app is accessible **via HTTP immediately** — no DNS configuration needed upfront.
>
> | URL | Available |
> |---|---|
> | `http://46.225.73.94` | ✅ Immediately after deploy |
> | `http://skyait.skyraksys.com` | ✅ Once DNS A record points to `46.225.73.94` |
> | `https://skyait.skyraksys.com` | ⚠️ Works with browser warning (self-signed) until you run `enable-ssl.sh` |
>
> **When DNS is ready and you want a trusted HTTPS cert**, run once on the server:
> ```bash
> bash scripts/deploy/enable-ssl.sh
> ```
> This verifies DNS resolves correctly, requests a Let's Encrypt certificate, installs it, and sets up monthly auto-renewal.

### 🔀 Choose your deployment path

| Path | Best for | Jump to |
|---|---|---|
| **Windows (PowerShell + PuTTY)** | Deploying from a Windows machine | [Run from PowerShell](#run-from-powershell) |
| **Linux / WSL / Mac (SSH)** | Deploying from a Linux/Mac/WSL terminal | [Run from WSL / Linux / Mac](#run-from-wsl--linux--mac) |
| **Manual (step by step via SSH)** | PuTTY not available, script fails mid-way, or you want full control | [Manual Deployment ↓](#manual-deployment-step-by-step) |

All three paths do **identical work**: clone the repo, generate secrets, build Docker images, run migrations, generate SSL cert, configure firewall, and set up auto-start. The scripts automate it; the manual path shows each command explicitly.

### Prerequisite (Windows machine)
- [PuTTY](https://www.putty.org/) installed — provides `plink` and `pscp` commands
- Network access to `46.225.73.94` on port 22

### Run from PowerShell

> **Before running:** the script reads your server SSH password from an environment variable — never hardcoded in files.

```powershell
# Step 1 — Set your server SSH password (replace with your actual password)
$env:SKYRAKSYS_SSH_PASSWORD = "your_server_password_here"

# Step 2 — Run the deployment from the repo root
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
   - Generates a self-signed SSL cert so nginx starts immediately (HTTP works right away)
   - Run `enable-ssl.sh` on the server when DNS is ready for a real Let's Encrypt cert
   - Configures UFW firewall (ports 22, 80, 443, 8081 open)
   - Creates systemd service for auto-start on reboot
   - Sets up monthly SSL auto-renewal cron

**Duration:** ~15–20 minutes on first run.

Generated credentials are saved on the server at:
```
/home/Rakesh/.deployment-credentials.txt   (chmod 600 — Rakesh only)
```
Read with: `cat ~/.deployment-credentials.txt`

### Run from WSL / Linux / Mac

```bash
# Step 1 — Run the deployment from the repo root
bash scripts/deploy/deploy-from-linux.sh
```

This performs the same 10 provisioning steps as the Windows script, entirely via SSH.

> **Password prompt:** If you have not set up SSH key auth, the script will prompt for the server password multiple times (once per SSH step). To avoid this, install your SSH key first:
> ```bash
> ssh-copy-id Rakesh@46.225.73.94
> ```

**Options:**
- `--clean` — wipe the existing installation before deploying (use on a dirty server)
- `--build` — force rebuild all Docker images

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
| `CORS_ORIGIN` | `https://skyait.skyraksys.com,http://skyait.skyraksys.com,http://46.225.73.94` | ✅ |
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
| `backend` | 5000 | Internal only — no host port mapping |
| `frontend` | 3000 | Internal only — no host port mapping |
| `mobile` | 3001 | Internal only — no host port mapping |
| `postgres` | 5432 | Internal only — no host port mapping |
| `pgadmin` | 8081 | Via `server:8081` (tools profile only) |

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

**How the cron works:** `--standalone` mode needs port 80 free, so the cron stops nginx first, renews the cert, **copies the fresh certs into `nginx/ssl/`** so nginx actually serves the renewed certificate, then starts nginx again. Semicolons (not `&&`) ensure nginx always restarts even if certbot finds nothing to renew:
```
0 0 1 * * cd /home/Rakesh/skyraksys_hrm && docker compose stop nginx && sudo certbot renew --quiet; sudo cp /etc/letsencrypt/live/skyait.skyraksys.com/fullchain.pem /home/Rakesh/skyraksys_hrm/nginx/ssl/ 2>/dev/null; sudo cp /etc/letsencrypt/live/skyait.skyraksys.com/privkey.pem /home/Rakesh/skyraksys_hrm/nginx/ssl/ 2>/dev/null; docker compose start nginx
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
# Works immediately after deploy — no DNS required
curl http://46.225.73.94/health
curl http://46.225.73.94/api/health

# Once DNS points to the server
curl https://skyait.skyraksys.com/health
curl https://skyait.skyraksys.com/api/health

# From Windows
.\scripts\deploy\check-server-status.ps1
```

---

## Manual Deployment (step by step)

This section covers **exactly the same actions as `server-full-setup.sh`** — every command the script runs, executed manually one at a time via SSH. Use this if:
- PuTTY / plink is not available on your machine
- A script failed midway and you need to resume from a specific point
- You want to understand or audit exactly what each step does

**Before you start:** SSH into the server. All steps below run **on the server** (not your local machine) unless stated otherwise.

| Step | What it does | Script equivalent |
|---|---|---|
| 1 | SSH into server | — (all scripts do this via plink/ssh) |
| 2 | Install Docker + Compose + Git | `server-full-setup.sh` Steps 1–2 |
| 3 | `git clone` the repo | `server-full-setup.sh` Step 3 |
| 4 | Generate secrets → write `.env` | `server-full-setup.sh` Step 4 |
| 5 | Build images → start postgres/backend/frontend/mobile | `server-full-setup.sh` Step 5 |
| 6 | `db:migrate` → `db:seed` → validate schema | `server-full-setup.sh` Step 6 |
| 7 | Self-signed cert → start nginx → start pgAdmin | `server-full-setup.sh` Step 7 |
| 8 | UFW firewall: 22, 80, 443, 8081 | `server-full-setup.sh` Step 8 |
| 9 | systemd service (auto-start on reboot) | `server-full-setup.sh` Step 10 |
| 10 | Monthly SSL renewal cron | `server-full-setup.sh` Step 9 |
| 11 | Verify containers + health endpoints | `server-full-setup.sh` Step 11 |

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
# Generate all secrets up front
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
ENCRYPTION_KEY=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
PGADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

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
CORS_ORIGIN=https://skyait.skyraksys.com,http://skyait.skyraksys.com,http://46.225.73.94
REACT_APP_API_URL=/api
SEED_DEFAULT_PASSWORD=admin123
NODE_ENV=production
PORT=5000
TRUST_PROXY=true
EMAIL_FROM=noreply@skyraksys.com
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
PGADMIN_EMAIL=admin@skyraksys.com
PGADMIN_PASSWORD=${PGADMIN_PASSWORD}
EOF

# Save ALL credentials in one file — refer to this if you ever lose access
cat > ~/.deployment-credentials.txt << EOF
SkyrakSys HRM — Deployment Credentials
Generated: $(date)

=== Access URLs ===
  App (HTTP via IP — works immediately): http://46.225.73.94
  App (HTTP domain):                      http://skyait.skyraksys.com
  App (HTTPS — after SSL):               https://skyait.skyraksys.com
  API Health:                             http://46.225.73.94/api/health
  pgAdmin:                                http://skyait.skyraksys.com:8081

=== Default Login Accounts (password: admin123) ===
  Super Admin : admin@skyraksys.com
  HR Manager  : hr@skyraksys.com
  Manager     : manager@skyraksys.com
  Employee    : employee@skyraksys.com
  !! Change all passwords after first login !!

=== Database ===
  Name: skyraksys_hrm   User: hrm_admin   Password: ${DB_PASSWORD}
  Connect: docker compose exec postgres psql -U hrm_admin -d skyraksys_hrm

=== pgAdmin ===
  Email: admin@skyraksys.com   Password: ${PGADMIN_PASSWORD}

=== Secrets (keep private) ===
  JWT_SECRET:          ${JWT_SECRET}
  JWT_REFRESH_SECRET:  ${JWT_REFRESH_SECRET}
  ENCRYPTION_KEY:      ${ENCRYPTION_KEY}
EOF
chmod 600 ~/.deployment-credentials.txt
echo "All credentials saved to ~/.deployment-credentials.txt"
```

### Step 5 — Build and start all containers

> **Do not start nginx yet.** nginx requires SSL cert files to exist on startup — those come in Step 7. Starting it now will crash the nginx container.

> **Startup order** (Docker enforces this automatically via `depends_on`):
> 1. `postgres` starts first — backend waits until postgres reports healthy
> 2. `backend` starts next — frontend and mobile wait until backend reports healthy
> 3. `frontend` and `mobile` start last
>
> Do NOT run migrations (Step 6) until all 4 show **(healthy)** — see wait command below.

```bash
# Pre-create bind-mount directories BEFORE starting Docker.
# The backend container runs as user nodejs (uid 1001).
# If Docker creates these as root, the nodejs user can't write → file uploads crash.
mkdir -p backend/uploads backend/logs
sudo chown -R 1001:1001 backend/uploads backend/logs

# Build all images (takes 5-10 minutes on first run)
docker compose build --no-cache

# Start everything except nginx
docker compose up -d postgres backend frontend mobile
```

**Wait until all 4 containers are healthy before continuing to Step 6.**
Run this repeatedly until all 4 show `(healthy)` — not just `Up` or `starting`:
```bash
# Run this every 15 seconds until all show (healthy):
docker compose ps
```

Expected output (may take **60–120 seconds** — backend has a 40s start period):
```
skyraksys_hrm_postgres   Up (healthy)
skyraksys_hrm_backend    Up (healthy)
skyraksys_hrm_frontend   Up (healthy)
skyraksys_hrm_mobile     Up (healthy)
```

If a container shows `(unhealthy)` or `Exit`, check its logs before proceeding:
```bash
docker compose logs backend   # or: postgres / frontend / mobile
```

### Step 6 — Run migrations and seed

> Only run this once all 4 containers from Step 5 show **(healthy)**.

```bash
# Run database migrations
docker compose exec backend npx sequelize-cli db:migrate

# Seed initial data (demo accounts and reference data)
docker compose exec backend npx sequelize-cli db:seed:all

# Validate that all migrations applied correctly
bash scripts/deploy/validate-schema.sh
```

Expected migration output ends with:
```
== (migration name): migrated (Xs)
```
Expected seed output ends with:
```
Seeding finished
```

### Step 7 — SSL certificate

> DNS is **not** required at this point. Generate a self-signed cert so nginx starts and the
> app works via HTTP immediately. Run `enable-ssl.sh` later when DNS is ready.

```bash
mkdir -p nginx/ssl

# Generate self-signed cert (10-year validity — browsers warn, but nginx starts and HTTP works)
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=SkyrakSys/CN=skyait.skyraksys.com"
chown -R Rakesh:Rakesh nginx/ssl
```

**Optional — get a real cert right now** (only if DNS already resolves to this server):
```bash
# Verify DNS first
dig +short skyait.skyraksys.com   # must return 46.225.73.94

# nginx is not running yet (not started in Step 5), so port 80 is free for certbot
sudo certbot certonly --standalone \
  -d skyait.skyraksys.com \
  -d www.skyait.skyraksys.com \
  --non-interactive --agree-tos \
  --email admin@skyraksys.com

sudo cp /etc/letsencrypt/live/skyait.skyraksys.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/skyait.skyraksys.com/privkey.pem nginx/ssl/
sudo chown -R Rakesh:Rakesh nginx/ssl
```

**Start nginx** (cert files exist either way, so it will start cleanly):
```bash
docker compose up -d nginx
docker compose ps   # nginx should show Up

# Start pgAdmin (it uses a Docker 'tools' profile — must be started explicitly)
docker compose --profile tools up -d pgadmin

# Verify HTTP works immediately (no DNS needed)
curl http://46.225.73.94/health       # should return: healthy
curl http://46.225.73.94/api/health   # should return JSON
```

### Step 8 — Firewall
```bash
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 8081/tcp comment 'pgAdmin'
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
# Stop nginx before renewal (certbot --standalone needs port 80).
# Copies the fresh certs into nginx/ssl/ so nginx serves the renewed cert.
# Semicolons (not &&) ensure nginx always restarts even if certbot has nothing to renew.
(crontab -l 2>/dev/null | grep -v "certbot renew"; \
 echo "0 0 1 * * cd /home/Rakesh/skyraksys_hrm && docker compose stop nginx && sudo certbot renew --quiet; sudo cp /etc/letsencrypt/live/skyait.skyraksys.com/fullchain.pem /home/Rakesh/skyraksys_hrm/nginx/ssl/ 2>/dev/null; sudo cp /etc/letsencrypt/live/skyait.skyraksys.com/privkey.pem /home/Rakesh/skyraksys_hrm/nginx/ssl/ 2>/dev/null; docker compose start nginx") \
 | crontab -

crontab -l   # confirm the cron is set
```

### Step 11 — Verify everything
```bash
# Containers (all 5 should show 'Up' or 'healthy')
docker compose ps

# API health (via nginx — backend port is not exposed directly to host)
docker compose exec backend node -e "require('http').get('http://localhost:5000/health',(r)=>{console.log('status:',r.statusCode)})"
curl http://46.225.73.94/api/health          # works immediately, no DNS needed
curl https://skyait.skyraksys.com/api/health  # once DNS is set

# Frontend
curl -I http://46.225.73.94
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
