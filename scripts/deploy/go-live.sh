#!/bin/bash
# ==============================================================================
# SkyRakSys HRM — Go-Live Script
#
# Runs ONCE before going live.
# What it does:
#   1. Rotates JWT secrets (writes new ones to .env.production)
#   2. Wipes all test/UAT data from the database
#   3. Creates a fresh admin user
#   4. Restarts all containers with the new secrets
#
# USAGE:
#   ssh <your-server-username>@46.225.73.94
#   cd ~/skyraksys_hrm
#   bash scripts/deploy/go-live.sh
#
# WARNING: This is destructive — all existing database data will be deleted.
#          Run it only once, immediately before go-live.
# ==============================================================================

set -e

APP_DIR="$HOME/skyraksys_hrm"
SECRETS_FILE="backend/logs/new-jwt-secrets.env"

# ── Colours ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}✗ ERROR:${NC} $1"; exit 1; }

echo ""
echo -e "${BOLD}================================================${NC}"
echo -e "${BOLD}  SkyRakSys HRM — Go-Live Preparation${NC}"
echo -e "${BOLD}================================================${NC}"
echo ""
warn "This will DELETE ALL TEST DATA and create a fresh admin user."
echo ""
read -r -p "Are you sure you want to continue? (yes/no): " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi
echo ""

# ── Pre-flight checks ──────────────────────────────────────────────────────────
info "Running pre-flight checks..."

# Must run from the app directory
if [[ ! -f "$APP_DIR/docker-compose.yml" ]]; then
  fail "docker-compose.yml not found at $APP_DIR. Make sure you are logged in as the correct user (current: $USER)."
fi
cd "$APP_DIR"
ok "Working directory: $APP_DIR"

# Docker must be running
docker info > /dev/null 2>&1 || fail "Docker is not running. Start Docker and try again."
ok "Docker is running"

# Backend container must be up
if ! docker compose ps backend | grep -q "running"; then
  fail "Backend container is not running. Start it with: docker compose up -d"
fi
ok "Backend container is up"

echo ""

# ── Step 1: JWT rotation + DB cleanup (inside Docker) ─────────────────────────
echo -e "${BOLD}[1/3] Running DB reset and JWT secret rotation...${NC}"
docker compose exec backend node scripts/reset-db-admin-only.js
echo ""

# ── Step 2: Apply new JWT secrets to .env.production ──────────────────────────
echo -e "${BOLD}[2/3] Applying new JWT secrets to .env.production...${NC}"

if [[ ! -f "$SECRETS_FILE" ]]; then
  fail "Secrets file not found at $SECRETS_FILE. Check the output above for errors."
fi

# Load the new secrets and patch .env.production
# shellcheck source=/dev/null
source "$SECRETS_FILE"

if [[ -z "$JWT_SECRET" || -z "$JWT_REFRESH_SECRET" ]]; then
  fail "Secrets file is empty or malformed: $SECRETS_FILE"
fi

sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env.production
sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" .env.production

# Remove the temp secrets file
rm "$SECRETS_FILE"
ok ".env.production updated with new JWT secrets"
echo ""

# ── Step 3: Restart containers with new secrets ────────────────────────────────
echo -e "${BOLD}[3/3] Restarting containers...${NC}"
docker compose down
docker compose up -d
echo ""

# ── Health check ───────────────────────────────────────────────────────────────
info "Waiting for backend to be ready..."
for i in {1..12}; do
  if curl -sf http://localhost/api/health > /dev/null 2>&1; then
    ok "API health check passed"
    break
  fi
  if [[ $i -eq 12 ]]; then
    warn "Health check timed out. Check containers with: docker compose ps"
    warn "Or check logs with: docker compose logs backend"
  fi
  sleep 5
done

echo ""
echo -e "${GREEN}${BOLD}================================================${NC}"
echo -e "${GREEN}${BOLD}  Go-live complete!${NC}"
echo -e "${GREEN}${BOLD}================================================${NC}"
echo ""
echo -e "  Access : ${BOLD}http://46.225.73.94${NC}"
echo -e "  Health : ${BOLD}http://46.225.73.94/api/health${NC}"
echo ""
echo -e "  ${YELLOW}Login with the admin credentials printed above.${NC}"
echo -e "  ${YELLOW}Change the admin password immediately after first login.${NC}"
echo ""
