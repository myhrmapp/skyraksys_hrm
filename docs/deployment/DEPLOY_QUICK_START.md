# SkyrakSys HRM — Deployment Quick Start

> Current stack: **Node.js 22 · PostgreSQL 15 · Nginx · PM2**  
> Server: `skyait.skyraksys.com` (46.225.73.94)

---

## First-Time Production Setup

→ **Full guide:** [PROD_DEPLOYMENT_CHECKLIST.md](PROD_DEPLOYMENT_CHECKLIST.md)

### 1 — Upload code (from Windows, Git Bash / WSL)
```bash
rsync -avz \
  --exclude 'node_modules' --exclude '.env' --exclude 'build' \
  --exclude 'uploads/*' --exclude 'logs/*' --exclude '.git' \
  --exclude 'archive' --exclude 'admin-debug-panel' \
  /d/skyraksys_hrm1/skyraksys_hrm_app/ \
  Rakesh@46.225.73.94:/var/www/skyraksys_hrm/
```

### 2 — Server dependencies (once per server)
```bash
bash /var/www/skyraksys_hrm/scripts/deploy/01-server-setup.sh
bash /var/www/skyraksys_hrm/scripts/deploy/02-db-setup.sh
```

### 3 — Configure environment
```bash
cd /var/www/skyraksys_hrm/backend
cp ../scripts/deploy/backend.env.production .env

# Generate all three required secrets
JWT1=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT2=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
ENC=$(node -e  "console.log(require('crypto').randomBytes(32).toString('hex'))")
sed -i "s/REPLACE_WITH_GENERATED_SECRET_64_CHARS/$JWT1/" .env
sed -i "s/REPLACE_WITH_DIFFERENT_GENERATED_SECRET_64_CHARS/$JWT2/" .env
sed -i "s/REPLACE_WITH_64_HEX_CHAR_ENCRYPTION_KEY/$ENC/" .env

cp /var/www/skyraksys_hrm/scripts/deploy/frontend.env.production \
   /var/www/skyraksys_hrm/frontend/.env.production
```

### 4 — Deploy (installs deps, builds frontend, migrates DB, starts PM2)
```bash
bash /var/www/skyraksys_hrm/scripts/deploy/03-deploy-app.sh
# When prompted "Run database seed? (y/N):" → type y (first time only)
```

### 5 — Configure Nginx + SSL
```bash
bash /var/www/skyraksys_hrm/scripts/deploy/04-nginx-config.sh
bash /var/www/skyraksys_hrm/scripts/deploy/05-ssl-setup.sh

# After SSL — update URLs to https:// and rebuild frontend
cd /var/www/skyraksys_hrm/backend
sed -i 's|http://skyait.skyraksys.com|https://skyait.skyraksys.com|g' .env
cd /var/www/skyraksys_hrm/frontend
sed -i 's|http://skyait.skyraksys.com|https://skyait.skyraksys.com|g' .env.production
npm run build
pm2 restart skyraksys-hrm
```

---

## Code Update / Redeploy

```bash
# Upload changed files (Windows → server), then:
bash /var/www/skyraksys_hrm/scripts/deploy/03-deploy-app.sh
```

Or manually:
```bash
cd /var/www/skyraksys_hrm
cd backend && npm ci --production
cd ../frontend && npm ci && npm run build
cd ../backend && npx sequelize-cli db:migrate
cd .. && pm2 reload skyraksys-hrm
```

---

## Verify Deployment

```bash
pm2 status                                        # Two instances: online
curl http://localhost:5000/api/health             # {"success":true}
curl https://skyait.skyraksys.com/api/health      # {"success":true}
```

Open in browser: `https://skyait.skyraksys.com`

---

## Default Accounts (change all immediately)

| Email | Password | Role |
|-------|----------|------|
| `admin@skyraksys.com` | `admin123` | System Admin |
| `hr@skyraksys.com` | `admin123` | HR Manager |
| `lead@skyraksys.com` | `admin123` | Team Lead |
| `employee1@skyraksys.com` | `admin123` | Employee |
| `employee2@skyraksys.com` | `admin123` | Employee |

---

## Key Commands

```bash
pm2 status                          # App status
pm2 logs skyraksys-hrm --lines 50  # Recent logs
pm2 reload skyraksys-hrm           # Zero-downtime reload
pm2 monit                           # Real-time monitor
nginx -t && systemctl reload nginx  # Nginx check + reload
npx sequelize-cli db:migrate:status # All 19 migrations should be "up"
```

---

📖 **Full checklist:** [PROD_DEPLOYMENT_CHECKLIST.md](PROD_DEPLOYMENT_CHECKLIST.md)  
📖 **Detailed guide:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
