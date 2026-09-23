# Production Linux Deployment Guide

This guide walks a complete beginner through deploying SkyrakSys HRM to a live
Ubuntu production server — from a blank server to a fully running application
with HTTPS, automatic restarts, and backups.

---

## Overview: what will happen

| Phase | What | Time |
|-------|------|------|
| **Phase 1** | Prepare your server (one-time) | 5 min |
| **Phase 2** | Run the automated setup script | 15-20 min |
| **Phase 3** | Verify the app is working | 2 min |
| **Phase 4** | Enable real HTTPS (after DNS) | 5 min |
| **Phase 5** | Future updates | 5-10 min each |

The setup script handles everything automatically:
installs Docker, clones the code, generates secrets, builds the containers,
runs the database, and configures the firewall.

---

## What you need before you start

### 1. A fresh Ubuntu server

- Ubuntu 22.04 LTS or Ubuntu 24.04 LTS
- Minimum 2 GB RAM, 20 GB disk (4 GB RAM recommended)
- A public IP address
- Root or sudo access via SSH

> The scripts use IP `46.225.73.94` and domain `skyait.skyraksys.com`
> by default. If your server is different, edit
> `scripts/deploy/deploy.env` before running anything.

### 2. A terminal application

- **Windows:** Use the built-in **PowerShell** or install
  [PuTTY](https://www.putty.org/) for SSH
- **Mac / Linux:** Use the built-in Terminal

### 3. Your server SSH credentials

- The IP address of your server
- A username with sudo privileges (e.g. `ubuntu`, `root`)
- The password for that user

---

## Phase 1 — Prepare Your Server (5 minutes)

### Step 1.1 — SSH into your server

**From Windows (PowerShell):**
`powershell
ssh ubuntu@46.225.73.94
`

**From Mac / Linux:**
`ash
ssh ubuntu@46.225.73.94
`

Type your password when prompted. You should see a `$` or `#` prompt,
meaning you are now inside the server.

### Step 1.2 — Update the server

Always update before installing anything new:

`ash
sudo apt update && sudo apt upgrade -y
`

This may take a few minutes. Wait for it to finish.

### Step 1.3 — Create a dedicated deploy user (recommended)

Using the `root` user directly for an app is a security risk.
Create a dedicated user instead:

`ash
sudo adduser deploy
sudo usermod -aG sudo deploy
`

It will ask you to set a password for the `deploy` user. Choose a strong one.

Then switch to the deploy user:
`ash
su - deploy
`

> If you already have a suitable non-root user on your server, just use that.
> Update `SERVER_USER` in `scripts/deploy/deploy.env` to match.

### Step 1.4 — Upload the deployment scripts

On your **local machine** (not the server), open a new terminal and run:

`ash
# From your local project folder
scp -r scripts/deploy/ deploy@46.225.73.94:/tmp/skyraksys-deploy/
`

Or if you are using PuTTY on Windows:
`powershell
pscp -r scripts\deploy deploy@46.225.73.94:/tmp/skyraksys-deploy/
`

---

## Phase 2 — Run the Automated Setup (15-20 minutes)

Back in your server terminal (logged in as the deploy user):

### Step 2.1 — Navigate to the uploaded scripts

`ash
cd /tmp/skyraksys-deploy/deploy
`

### Step 2.2 — Review the configuration

Open `deploy.env` and confirm the settings match your server:

`ash
cat deploy.env
`

You should see:
`
SERVER_IP=46.225.73.94
SERVER_USER=deploy
SERVER_DOMAIN=skyait.skyraksys.com
GIT_REPO=https://github.com/myhrmapp/skyraksys_hrm.git
GIT_BRANCH=skyraksys_hrm
APP_DIR=/opt/skyraksys_hrm
`

If any of these are wrong, edit the file:
`ash
nano deploy.env
`

Use `Ctrl+X`, then `Y`, then `Enter` to save and exit nano.

### Step 2.3 — Run the setup script

`ash
sudo bash server-full-setup.sh
`

> This runs as `sudo` because it needs to install Docker, configure the
> firewall, and create system services.

**What you will see:**

The script prints a status line for each of its 11 steps:
`
[INFO]    Step 1: Cleaning existing deployment...
[SUCCESS] PM2 processes stopped
[INFO]    Step 2: Installing dependencies...
[SUCCESS] Docker installed
...
[INFO]    Step 5: Building and starting Docker containers...
`

The longest step is Step 5 (building Docker images) — it can take 10-15 minutes
on a fresh server. This is normal. Do not close the terminal.

**When it finishes you will see:**
`
╔═══════════════════════════════════════════════════════════╗
║       Deployment Completed Successfully!                  ║
╚═══════════════════════════════════════════════════════════╝

[INFO]  Application URL (HTTP via IP):  http://46.225.73.94
[INFO]  Application URL (HTTP domain):  http://skyait.skyraksys.com
[INFO]  Application URL (HTTPS):        https://skyait.skyraksys.com
[INFO]  API Health:  http://46.225.73.94/api/health

[WARNING] Default Login Accounts (password: Skyraksys123$):
[WARNING]   Super Admin : admin@skyraksys.com
[WARNING]   HR Manager  : hr@skyraksys.com
[WARNING]   Manager     : manager@skyraksys.com
[WARNING]   Employee    : employee@skyraksys.com
`

---

## Phase 3 — Verify the App is Working (2 minutes)

### Step 3.1 — Check all containers are running

`ash
cd /opt/skyraksys_hrm
docker compose ps
`

You should see all containers with status **Up**:
`
NAME         STATUS          PORTS
postgres     Up              5432/tcp
backend      Up              5000/tcp
frontend     Up              3000/tcp
nginx        Up              0.0.0.0:80->80/tcp
`

If any show **Exit** or **Restarting**, see the Troubleshooting section below.

### Step 3.2 — Check the API health

`ash
curl http://localhost/api/health
`

Expected response: `{"status":"ok"}`

### Step 3.3 — Open the app in your browser

Go to: **http://46.225.73.94**

You should see the SkyrakSys HRM login page.

Log in with:
- **Email:** `admin@skyraksys.com`
- **Password:** `Skyraksys123$`

> ⚠️ **Change the admin password immediately after your first login.**

### Step 3.4 — Read your generated credentials

The setup script saved all auto-generated secrets to a file on the server:

`ash
cat ~/.deployment-credentials.txt
`

This file contains:
- The database password
- The pgAdmin password
- The JWT secrets
- All access URLs

**Keep this file private.** Copy its contents somewhere safe (a password manager).

---

## Phase 4 — Enable Real HTTPS (after DNS is configured)

By default the app uses a self-signed certificate, which causes a browser
security warning. To get a real trusted HTTPS certificate, you need to point
your domain to the server first.

### Step 4.1 — Point your domain to the server

Log in to wherever you manage your domain (GoDaddy, Cloudflare, Namecheap, etc.)
and create an **A record**:

`
Type:  A
Name:  skyait          (or @ for the root domain)
Value: 46.225.73.94    (your server IP)
TTL:   300
`

DNS changes take 5 minutes to 24 hours to spread across the internet.

### Step 4.2 — Verify DNS has propagated

Run this on your local machine:
`ash
nslookup skyait.skyraksys.com
`
The answer should show `46.225.73.94`. If it shows a different IP or nothing,
wait longer and try again.

### Step 4.3 — Run the SSL script

On the server:
`ash
cd /opt/skyraksys_hrm
bash scripts/deploy/enable-ssl.sh
`

The script automatically:
1. Verifies DNS is pointing here (exits safely if not ready)
2. Gets a free Let's Encrypt certificate
3. Installs it into Nginx
4. Sets up automatic monthly renewal

After it completes, visit **https://skyait.skyraksys.com** — there should be
no browser security warning.

---

## Phase 5 — Deploying Future Updates

Whenever you push new code to the `skyraksys_hrm` branch on GitHub,
deploy it to the server with one script:

`ash
ssh deploy@46.225.73.94
cd /opt/skyraksys_hrm
bash scripts/deploy/redeploy.sh
`

This script:
1. Pulls the latest code from GitHub
2. Applies any new database migrations (safe, non-destructive)
3. Rebuilds the Docker containers
4. Restarts all services with zero data loss

It takes 5-10 minutes.

---

## Day-to-Day Operations

### View live logs
`ash
cd /opt/skyraksys_hrm
docker compose logs -f backend          # backend API logs
docker compose logs -f frontend         # frontend build logs
docker compose logs -f nginx            # web server access logs
`
Press `Ctrl+C` to stop watching.

### Restart all services
`ash
docker compose restart
`

### Stop all services
`ash
docker compose down
`

### Start all services
`ash
docker compose up -d
`

### Back up the database
`ash
docker compose exec postgres pg_dump -U hrm_admin skyraksys_hrm > backup_.sql
`
Store this file somewhere safe (not just on the server).

### Restore from a backup
`ash
docker compose exec -T postgres psql -U hrm_admin skyraksys_hrm < backup_20260101_1200.sql
`

---

## Troubleshooting

### A container shows "Exit" or "Restarting" in docker compose ps

Check what went wrong:
`ash
docker compose logs backend     # replace 'backend' with the failing container name
`

Common causes:
- **postgres** failing: the database volume may be corrupted — check disk space with `df -h`
- **backend** failing: a required environment variable is missing — check `.env` file exists
- **nginx** failing: SSL certificate is missing — check if `nginx/ssl/` directory exists

### "Cannot connect to the Docker daemon"
Docker is not running. Start it:
`ash
sudo systemctl start docker
sudo systemctl enable docker
`

### The app is up but I get "502 Bad Gateway"
Nginx is running but the backend is not responding.
Check the backend container:
`ash
docker compose logs backend
docker compose restart backend
`

### "git clone" hung or failed during setup
Your repository may be **Private**. The server needs a GitHub Personal Access Token.
Edit the clone URL in `deploy.env`:
`
GIT_REPO=https://<YOUR_PAT>@github.com/myhrmapp/skyraksys_hrm.git
`
Then re-run the setup script.

### The SSL script says "DNS lookup returned nothing"
Your DNS A record has not propagated yet. Wait and try again.
You can check from any machine with:
`ash
nslookup skyait.skyraksys.com 8.8.8.8
`

### Disk is full
`ash
df -h                                   # check disk usage
docker system prune -f                  # remove unused Docker images and containers
docker volume ls                        # check volumes
`

### Forgot the database or admin password
`ash
cat ~/.deployment-credentials.txt      # shows all generated credentials
`

---

## Security Checklist (after first deploy)

- [ ] Change the default `Skyraksys123$` password for all accounts
- [ ] Remove or disable accounts that are not needed
- [ ] Save `~/.deployment-credentials.txt` to a password manager, then consider deleting it from the server
- [ ] Enable real HTTPS (Phase 4 above)
- [ ] Set up database backups on a schedule
