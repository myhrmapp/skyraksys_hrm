#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but was not found in PATH."
  echo "Install Docker Desktop or Docker Engine first, then re-run this script."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose support is not available."
  echo "Please install Docker Compose v2 or Docker Desktop, then re-run this script."
  exit 1
fi

if [ ! -f .env.production ]; then
  cp .env.production.template .env.production
  echo "Created .env.production from the template."
  echo "Edit it now and set your real DB password, JWT secrets, and SMTP values."
  echo ""
  echo "Required values to update before continuing:"
  echo "  - DB_PASSWORD"
  echo "  - JWT_SECRET"
  echo "  - JWT_REFRESH_SECRET"
  echo "  - ENCRYPTION_KEY"
  echo "  - SEED_DEFAULT_PASSWORD"
  echo ""
  echo "After editing .env.production, run this script again."
  exit 0
fi

PLACEHOLDER_PATTERN='REPLACE_WITH_|your-|your_email|your-smtp-host|example.com|Skyraksys123$'
if grep -E "REPLACE_WITH_|your-|example.com|Skyraksys123$" .env.production >/dev/null 2>&1; then
  echo "The .env.production file still contains placeholder values."
  echo "Open it and replace the placeholders with real values before continuing."
  echo ""
  grep -nE "REPLACE_WITH_|your-|example.com|Skyraksys123$" .env.production || true
  exit 1
fi

echo "Starting SkyrakSys HRM..."
docker compose --env-file .env.production up -d --build

echo "Running database migrations..."
bash scripts/deploy/run-migrations.sh

echo "Checking application health..."
if docker compose --env-file .env.production exec -T backend node -e "require('http').get('http://localhost:5000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1));"; then
  echo ""
  echo "Installation complete."
  echo "Open: http://localhost"
  echo "API health: http://localhost/api/health"
else
  echo ""
  echo "The app started but the backend health check did not pass."
  echo "Check the container logs with: docker compose logs -f backend"
  exit 1
fi
