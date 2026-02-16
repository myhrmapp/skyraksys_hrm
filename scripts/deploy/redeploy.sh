#!/bin/bash
# ==============================================================================
# SkyRakSys HRM — Quick Redeploy (Code Updates Only)
# Run as: deploy user on the server
# ==============================================================================
set -e

APP_DIR="/var/www/skyraksys_hrm"

echo "=========================================="
echo "  SkyRakSys HRM — Quick Redeploy"
echo "=========================================="

# Assumes files have already been uploaded via SCP/rsync

# --- Backend ---
echo "[1/4] Installing backend dependencies..."
cd "$APP_DIR/backend"
npm ci --production

# --- Frontend ---
echo "[2/4] Building frontend..."
cd "$APP_DIR/frontend"
npm ci
npm run build

# --- Migrations ---
echo "[3/4] Running migrations..."
cd "$APP_DIR/backend"
npx sequelize-cli db:migrate

# --- Restart ---
echo "[4/4] Restarting PM2..."
cd "$APP_DIR"
pm2 restart skyraksys-hrm
pm2 status

echo ""
echo "Redeploy complete!"
