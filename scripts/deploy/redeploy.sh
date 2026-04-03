#!/bin/bash
# ==============================================================================
# SkyRakSys HRM — Day-to-Day Code Update (runs ON the server)
#
# PURPOSE:
#   Applies code changes after a git push. Safe to run at any time — it
#   migrates the DB before rebuilding so there is no schema gap.
#
# WHAT IT DOES (5 steps):
#   1. git pull origin skyraksys_hrm  — fetch latest code
#   2. db:migrate                      — apply any new Sequelize migrations
#   3. validate-schema.sh              — assert all 25 migrations applied,
#                                        tables, columns, and indexes exist
#   4. docker compose build --no-cache — rebuild all container images
#   5. docker compose up -d            — restart containers with new images
#
# WHEN TO USE:
#   After every git push to deploy changes to production.
#   NOT for first-time server setup — use server-full-setup.sh for that.
#
# USAGE:
#   ssh Rakesh@46.225.73.94
#   cd skyraksys_hrm
#   bash scripts/deploy/redeploy.sh
#
# RUNS FROM: Server (/home/Rakesh/skyraksys_hrm)
# DURATION:  ~5-10 minutes
# SERVER:    skyait.skyraksys.com (46.225.73.94)
# ==============================================================================
set -e

APP_DIR="/home/Rakesh/skyraksys_hrm"
COMPOSE="docker compose"

echo "=========================================="
echo "  SkyRakSys HRM — Docker Redeploy"
echo "  Server: skyait.skyraksys.com"
echo "=========================================="

cd "$APP_DIR"

# --- Pull latest code ---
echo "[1/5] Pulling latest code..."
git pull origin skyraksys_hrm
echo "Code updated."

# --- Run DB migrations (inside running backend container) ---
echo "[2/5] Running database migrations..."
$COMPOSE exec backend npx sequelize-cli db:migrate
echo "Migrations complete."

# --- Validate schema matches expected state ---
echo "[3/5] Validating database schema..."
bash "$APP_DIR/scripts/deploy/validate-schema.sh"

# --- Rebuild and restart all containers ---
echo "[4/5] Rebuilding containers..."
$COMPOSE build --no-cache
echo "Build complete."

echo "[5/5] Restarting services..."
$COMPOSE up -d
$COMPOSE ps

echo ""
echo "================================================"
echo "  Redeploy complete!"
echo "  Web (HTTP via IP):  http://46.225.73.94"
echo "  Web (HTTP domain):  http://skyait.skyraksys.com"
echo "  Web (HTTPS):        https://skyait.skyraksys.com"
echo "  API health:         http://46.225.73.94/api/health"
echo "================================================"
