#!/bin/bash
# ==============================================================================
# SkyRakSys HRM - Production Migration Script
#
# Run this script AFTER pulling new code to safely apply DB schema changes.
# This does NOT delete data. It safely upgrades the schema using Sequelize.
#
# USAGE:
#   cd ~/skyraksys_hrm
#   bash scripts/deploy/run-migrations.sh
# ==============================================================================

set -e

echo "================================================"
echo "  SkyRakSys HRM - Running Production Migrations"
echo "================================================"

if [[ ! -d "backend" ]]; then
  echo "Error: Must be run from the root skyraksys_hrm directory."
  exit 1
fi

echo ""
echo "[1/4] Checking backend container is running..."
if ! docker compose ps backend | grep -q "running"; then
  echo "Error: Backend container not running. Start with: docker compose up -d"
  exit 1
fi
echo "  OK: Backend container is up"

echo ""
echo "[2/4] Running Sequelize Migrations..."
docker compose exec backend npx sequelize-cli db:migrate --env production
echo "  OK: Migrations applied"

echo ""
echo "[3/4] Running any pending Seeders (if applicable)..."
docker compose exec backend npx sequelize-cli db:seed --seed 20260721000004-seed-default-invoice-templates.js --env production 2>/dev/null || echo "  SKIP: Seeder already applied"

echo ""
echo "[4/4] Restarting backend to load new models..."
docker compose restart backend
echo "  OK: Backend restarted"

echo ""
echo "================================================"
echo "  Migrations completed successfully!"
echo "  Server: http://46.225.73.94/api/health"
echo "================================================"
echo ""
