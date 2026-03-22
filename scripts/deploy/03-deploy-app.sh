#!/bin/bash
# ==============================================================================
# SkyRakSys HRM — Step 3: Application Deployment
# Run as: deploy user (or root)
# ==============================================================================
set -e

APP_DIR="/var/www/skyraksys_hrm"

echo "=========================================="
echo "  SkyRakSys HRM — App Deployment"
echo "=========================================="

cd "$APP_DIR"

# --- Validate .env exists ---
if [ ! -f "$APP_DIR/backend/.env" ]; then
  echo "ERROR: backend/.env not found!"
  echo "  Copy it first: cp scripts/deploy/backend.env.production backend/.env"
  echo "  Then fill in JWT_SECRET, JWT_REFRESH_SECRET and ENCRYPTION_KEY"
  exit 1
fi

# --- Check required secrets are set ---
if grep -q "REPLACE_WITH" "$APP_DIR/backend/.env"; then
  echo "ERROR: backend/.env still contains placeholder values!"
  echo "  Please set: JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY"
  echo ""
  echo "  Generate them now:"
  echo "  JWT_SECRET:      node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
  echo "  ENCRYPTION_KEY:  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  exit 1
fi

# --- Ensure runtime directories exist ---
mkdir -p "$APP_DIR/backend/uploads"
mkdir -p "$APP_DIR/backend/logs"

# --- Backend Dependencies ---
echo "[1/6] Installing backend dependencies..."
cd "$APP_DIR/backend"
npm ci --production
echo "Backend dependencies installed."

# --- Frontend Dependencies + Build ---
echo "[2/6] Installing frontend dependencies..."
cd "$APP_DIR/frontend"
npm ci
echo "Frontend dependencies installed."

echo "[3/6] Building frontend for production..."
npm run build
echo "Frontend build complete."

# --- Database Migration ---
echo "[4/6] Running database migrations..."
cd "$APP_DIR/backend"
npx sequelize-cli db:migrate
echo "Migrations complete."

# --- Database Seed (first-time only) ---
echo "[5/6] Seeding database (skip if already seeded)..."
read -p "Run database seed? (y/N): " SEED_ANSWER
if [[ "$SEED_ANSWER" =~ ^[Yy]$ ]]; then
  npx sequelize-cli db:seed:all
  echo "Database seeded."
  echo ""
  echo "  Default credentials (CHANGE IMMEDIATELY after first login):"
  echo "  admin@skyraksys.com     / admin123"
  echo "  hr@skyraksys.com        / admin123"
  echo "  lead@skyraksys.com      / admin123"
else
  echo "Skipping seed."
fi

# --- Start/Restart PM2 ---
echo "[6/6] Starting application with PM2..."
cd "$APP_DIR"
pm2 delete skyraksys-hrm 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u deploy --hp /home/deploy 2>/dev/null || true

echo ""
echo "=========================================="
echo "  Application deployed!"
echo "  PM2 Status:"
echo "=========================================="
pm2 status

echo ""
echo "Next: Configure Nginx (04-nginx-config.sh)"
