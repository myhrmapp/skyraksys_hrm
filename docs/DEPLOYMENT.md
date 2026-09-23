# Deployment Guide

> **First time deploying to a Linux production server?**
> Follow the step-by-step novice guide: **[PRODUCTION_LINUX_SETUP.md](PRODUCTION_LINUX_SETUP.md)**
>
> **Deploying from a Windows machine?** See the Windows path in that same guide,
> or use the automated one-click script: `scripts/deploy/deploy-docker-from-windows.ps1`

This document is a concise operational reference for teams already familiar with the stack.


> **First-time setup only.** For day-to-day code updates after the initial deployment,
> SSH into the server and run `bash redeploy.sh` instead.

---

## What you need before you start

### 1. A Linux server

You need an Ubuntu 22.04 (or newer) server with:
- At least 2 GB RAM and 20 GB disk
- A public IP address (the scripts use `46.225.73.94` / `skyait.skyraksys.com`)
- Port **22** (SSH), **80** (HTTP), and **443** (HTTPS) open in any external firewall

### 2. Your server SSH password

You will need the SSH password for the `Rakesh` user on the server.
Keep it ready — you will enter it once at the start.

### 3. A GitHub token (only if the repo is private)

If the repository is **Private** on GitHub, the server needs a Personal Access
Token (PAT) to clone it. Create one at:
`GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens`
with **read-only Contents** access to this repository.

---

## Path A — Windows machine (recommended for most users)

### Step 1 — Install PuTTY

1. Download PuTTY from **https://www.putty.org/** (use the MSI installer).
2. Run the installer and accept all defaults.
3. **Restart your PowerShell window** after installation so that `plink` and `pscp`
   are available.

Confirm PuTTY is installed correctly by opening a new PowerShell window and running:

```powershell
plink -V
```

You should see a version number. If you get "not recognized", restart your terminal and try again.

### Step 2 — Open PowerShell in the project folder

```powershell
cd d:\skyraksys_hrm1\skyraksys_hrm_app
```

### Step 3 — Set your server SSH password

Type this in the same PowerShell window (replace `your_password` with the real password):

```powershell
$env:SKYRAKSYS_SSH_PASSWORD = "your_password"
```

> **Important:** This only lasts for the current terminal session. Do not close this
> window until deployment is done.

### Step 4 — Run the deployment script

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy\deploy-docker-from-windows.ps1
```

The script will automatically:
1. Test the SSH connection to the server
2. Upload the provisioning script to the server
3. Run it on the server — this takes **10–15 minutes**
4. Check that the API health endpoint responds

Watch the output. If it ends with a green **"Deployment Completed Successfully!"**
banner, you are done.

---

## Path B — Linux or Mac machine

### Step 1 — Open a terminal in the project folder

```bash
cd /path/to/skyraksys_hrm_app
```

### Step 2 — Run the deployment script

```bash
bash scripts/deploy/deploy-from-linux.sh
```

The script will prompt you for the server SSH password when needed.

---

## After deployment — first login

Once deployment completes, open a browser and go to:

| URL | When it works |
|-----|--------------|
| `http://46.225.73.94` | Immediately after deployment |
| `http://skyait.skyraksys.com` | After DNS propagates (up to 24 hours) |
| `https://skyait.skyraksys.com` | After SSL certificate is issued |

Log in with these default accounts:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@skyraksys.com` | `Skyraksys123$` |
| HR Manager | `hr@skyraksys.com` | `Skyraksys123$` |
| Manager | `manager@skyraksys.com` | `Skyraksys123$` |
| Employee | `employee@skyraksys.com` | `Skyraksys123$` |

> ⚠️ **Change all passwords immediately after your first login.**

---

## Verifying the deployment

SSH into the server and run these commands:

```bash
# Are all containers running?
docker compose ps

# Is the API healthy?
curl http://localhost/api/health

# View live backend logs
docker compose logs -f backend
```

All containers should show **Up** status. The health endpoint should return `{"status":"ok"}`.

---

## Backup before any future update

Before deploying a new version, back up the database:

```bash
# Run on the server
docker compose exec postgres pg_dump -U skyraksys skyraksys_hrm > backup_$(date +%Y%m%d).sql
```

Keep this file safe. If anything goes wrong you can restore from it.

---

## Troubleshooting

### "PuTTY (plink) not found"
Install PuTTY from https://www.putty.org/ and **restart your terminal** before retrying.

### "SKYRAKSYS_SSH_PASSWORD is not set"
Set the environment variable in the **same PowerShell window** you will run the script from (see Step 3 above).

### Deployment hangs at "Cloning from GitHub"
Your repository is **Private**. The server cannot clone it without authentication.
Edit `scripts/deploy/server-full-setup.sh` and inject your PAT into the clone URL:
```bash
GIT_REPO="https://<YOUR_PAT>@github.com/your-org/skyraksys_hrm.git"
```

### The app is not accessible after deployment
1. Wait 2 minutes — containers may still be starting up.
2. Run `docker compose ps` on the server to check all services are `Up`.
3. Run `docker compose logs backend` to check for startup errors.
4. Confirm ports 80 and 443 are open in your cloud provider's security group / firewall.

### Where are the generated secrets?
All auto-generated secrets (DB password, JWT secrets, etc.) are saved on the server at:
```
~/.deployment-credentials.txt
```
Read them with: `cat ~/.deployment-credentials.txt`

---

## Operational rules

- Never commit real passwords or secrets into source code.
- Keep database ports (5432) private — do not expose them publicly.
- Keep pgAdmin disabled by default in production.
- Always verify health before declaring a release successful.
- Use the Docker Compose path only — do not mix PM2 or bare Node deployments.

