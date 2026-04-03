# SkyrakSys HRM — Interim Deployment Status

> **Written:** April 2026  
> **Purpose:** Reference snapshot for the team during the DNS-pending / pre-SSL stage.  
> Keep this file until full SSL is confirmed working in production, then archive it.

---

## Current State (as of writing)

| Item | Status |
|---|---|
| Server provisioned | ✅ `46.225.73.94` (Ubuntu 24.04 LTS) |
| Docker installed | ✅ |
| App running (HTTP) | ✅ `http://46.225.73.94` |
| App running (domain HTTP) | ⏳ Pending DNS setup |
| SSL / HTTPS | ⏳ Pending DNS setup — self-signed cert in place |
| DNS A record set | ❌ Not yet — `skyait.skyraksys.com` not pointing to `46.225.73.94` |
| pgAdmin | ✅ `http://46.225.73.94:8081` (start with `docker compose --profile tools up -d pgadmin`) |

---

## Access Points (Right Now)

| URL | Status |
|---|---|
| `http://46.225.73.94` | ✅ Working — use this now |
| `http://skyait.skyraksys.com` | ❌ DNS not set — not working |
| `https://skyait.skyraksys.com` | ❌ DNS not set — not working |
| `http://46.225.73.94/api/health` | ✅ API health check |
| `http://46.225.73.94:8081` | ✅ pgAdmin (if started) |

---

## Default Login Credentials

All seeded accounts use password: **admin123**  
**Change all passwords after first real use.**

| Role | Email |
|---|---|
| Super Admin | `admin@skyraksys.com` |
| HR Manager | `hr@skyraksys.com` |
| Manager | `manager@skyraksys.com` |
| Employee | `employee@skyraksys.com` |

All credentials (including generated DB password and JWT secrets) are on the server:
```bash
ssh Rakesh@46.225.73.94
cat ~/.deployment-credentials.txt
```

---

## PostgreSQL Decision: Docker vs External

### Decision: **Keep PostgreSQL in Docker** ✅

**Why Docker is the right choice for this app:**

| Factor | Docker PostgreSQL | External / Managed DB |
|---|---|---|
| Setup complexity | Zero — starts with `docker compose up` | Requires separate server or managed service (RDS etc.) |
| Backup | `docker compose exec postgres pg_dump` → one command | Depends on provider |
| Data persistence | Named Docker volume — survives container restarts and rebuilds | N/A |
| DB credentials | Never exposed on the host — Docker network only | Requires network rules |
| Operational burden | None — same `docker compose` commands for everything | Separate infra to maintain |
| Cost | Free | Extra server/managed service cost |
| Suitable for | ✅ Small-to-medium HRM, single server, no DBA team | Large scale, HA, point-in-time recovery |

**When to reconsider moving to external PostgreSQL:**
- You need automatic failover (replica + standby)
- Data exceeds ~50 GB and the server disk becomes a bottleneck
- Compliance requires a dedicated DB server with separate audit logging
- You have a DBA team who will manage the DB independently

**For now: nothing to change** — the existing `postgres` Docker service in `docker-compose.yml` is correct for this deployment.

---

## SSL Plan: Step-by-Step

### Phase 1 (NOW): HTTP only via server IP
All deploy scripts now skip certbot entirely and generate a self-signed certificate so nginx can start. The app is fully usable over HTTP.

No action required — already done.

### Phase 2 (WHEN DNS READY): Enable real HTTPS

**Step A — Set DNS A record**

Go to your domain registrar (wherever `skyraksys.com` DNS is managed) and add:
```
Type:  A
Name:  skyait          (creates skyait.skyraksys.com)
Value: 46.225.73.94
TTL:   300  (5 minutes — can increase later)
```

Also add:
```
Type:  A
Name:  www.skyait      (creates www.skyait.skyraksys.com)
Value: 46.225.73.94
TTL:   300
```

DNS changes can take **up to 48 hours** to propagate (usually much faster with low TTL).

**Step B — Verify propagation**
```bash
# From any machine
nslookup skyait.skyraksys.com
# or
dig +short skyait.skyraksys.com
# Must return: 46.225.73.94
```

**Step C — Run enable-ssl.sh on the server**
```bash
ssh Rakesh@46.225.73.94
cd skyraksys_hrm
bash scripts/deploy/enable-ssl.sh
```
This script:
- Checks DNS resolves correctly (exits if not ready — safe to run early)
- Gets a real Let's Encrypt certificate
- Installs it into nginx
- Sets up monthly auto-renewal cron

After this — `https://skyait.skyraksys.com` works with no browser warning.

### Phase 3 (OPTIONAL LATER): Enforce HTTPS redirect

Once HTTPS is confirmed working and you want HTTP to redirect to HTTPS:

```bash
ssh Rakesh@46.225.73.94
cd skyraksys_hrm
nano nginx/conf.d/default.conf
```

In the **HTTP server block** (the `listen 80` block), replace all the `location` blocks with a single line:
```nginx
return 301 https://skyait.skyraksys.com$request_uri;
```

Then restart nginx:
```bash
docker compose restart nginx
```

---

## Day-to-Day Commands Reference

```bash
ssh Rakesh@46.225.73.94
cd skyraksys_hrm

# --- Status ---
docker compose ps                          # all containers
docker compose logs -f backend             # live backend logs
docker compose logs -f nginx               # live nginx logs

# --- Restart ---
docker compose restart backend             # restart without rebuild
docker compose restart nginx

# --- Redeploy after code push ---
bash scripts/deploy/redeploy.sh            # pull → migrate → rebuild → restart

# --- Database ---
docker compose exec postgres psql -U hrm_admin -d skyraksys_hrm
docker compose exec backend npx sequelize-cli db:migrate
docker compose exec backend npx sequelize-cli db:seed:all

# --- Backup DB ---
docker compose exec postgres pg_dump -U hrm_admin skyraksys_hrm > ~/backup_$(date +%Y%m%d).sql

# --- Full wipe and fresh deploy (DESTRUCTIVE — wipes all DB data) ---
docker compose down -v
bash scripts/deploy/server-full-setup.sh
```

---

## SSL Auto-Renewal (after enable-ssl.sh is run)

Cron runs on the **1st of each month at midnight**:
```
0 0 1 * * cd /home/Rakesh/skyraksys_hrm && docker compose stop nginx && sudo certbot renew --quiet; sudo cp /etc/letsencrypt/live/skyait.skyraksys.com/fullchain.pem /home/Rakesh/skyraksys_hrm/nginx/ssl/ 2>/dev/null; sudo cp /etc/letsencrypt/live/skyait.skyraksys.com/privkey.pem /home/Rakesh/skyraksys_hrm/nginx/ssl/ 2>/dev/null; docker compose start nginx
```

Let's Encrypt certs are valid for **90 days**. Monthly renewal ensures the cert never expires in production.  
Verify renewal is set: `crontab -l`

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

## Pending Items

- [ ] Set DNS A record for `skyait.skyraksys.com` → `46.225.73.94`
- [ ] Set DNS A record for `www.skyait.skyraksys.com` → `46.225.73.94`
- [ ] Run `enable-ssl.sh` after DNS propagates
- [ ] Change default passwords (`admin123`) after first login
- [ ] Configure SMTP for email notifications (optional — set via Admin panel)
- [ ] Decide whether to enforce HTTPS redirect (Phase 3 above)

---

## Files Changed in This Audit (April 2026)

| File | Change |
|---|---|
| `scripts/deploy/server-full-setup.sh` | Step 7 — skip certbot, generate self-signed directly; clear banner directing to enable-ssl.sh |
| `scripts/deploy/deploy-from-linux.sh` | Step 6 — same; fixed `--clean` docker-compose bug; added UFW port 8081; added systemd setup |
| `scripts/deploy/enable-ssl.sh` | **NEW** — dedicated script for enabling real SSL once DNS is ready |
| `scripts/deploy/deploy-docker-from-windows.ps1` | SSH password from env var; health check via HTTP IP first; all 4 role logins in banner |
| `nginx/conf.d/default.conf` | HTTP block serves full app (not redirect); dynamic CORS map; HTTPS OPTIONS fix |
| `docker-compose.yml` | All internal service ports removed; TRUST_PROXY set; CORS_ORIGIN includes all 3 origins; SEED_DEFAULT_PASSWORD forwarded to backend |
| `docs/deployment/DEPLOY_QUICK_START.md` | SSH password instruction; WSL/Linux deploy section; manual Step 4 full .env + credentials file; correct cron with cert-copy |
