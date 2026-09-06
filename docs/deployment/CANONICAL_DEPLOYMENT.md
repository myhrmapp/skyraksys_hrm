# Canonical Deployment Guide

This is the single source of truth for production deployment.

## Production-safe path

Use this deployment path for all production and staging deployment work:

```bash
cp .env.production.template .env.production
# edit .env.production with real values

docker compose --env-file .env.production up -d --build
bash scripts/deploy/run-migrations.sh
```

## Why this is the canonical path

- It matches the actual Docker Compose topology in the repo.
- It keeps one consistent deployment flow for Windows local development and Red Hat production hosting.
- It avoids hardcoded host assumptions and legacy script drift.
- It reduces complexity for non-technical operators.
- It keeps production secrets in one environment file instead of in shell scripts or remote credential files.

## Required environment values

Before deployment, configure these in `.env.production`:

- DB_PASSWORD
- JWT_SECRET
- JWT_REFRESH_SECRET
- ENCRYPTION_KEY
- SEED_DEFAULT_PASSWORD
- SMTP settings if email is enabled

Do not leave placeholder values in production. The install script will refuse to continue if placeholders are still present.

## Health checks

After startup:

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f backend
```

Verify backend health:

```bash
docker compose --env-file .env.production exec -T backend node -e "require('http').get('http://localhost:5000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1));"
```

## Legacy scripts

The following scripts are considered legacy and are archived for reference only:

- scripts/deploy/deploy-from-linux.sh
- scripts/deploy/deploy-docker-from-windows.ps1
- scripts/deploy/server-full-setup.sh
- scripts/deploy/go-live.sh
- scripts/deploy/redeploy.sh
- scripts/deploy/enable-ssl.sh
- scripts/deploy/check-server-status.ps1
- scripts/deploy/check-docker-status.ps1
- docs/deployment/DEPLOY_QUICK_START.md
- docs/deployment/INTERIM_STATUS.md

These files contain older deployment assumptions, hardcoded hosts, conflicting instructions, and production behaviors that are not considered the current safe path.

## Archive note

Do not use legacy deployment scripts as the standard rollout path unless a dedicated production release review explicitly approves them for a specific environment.

## Current production recommendation

- Local Windows: use Docker Desktop and the same Compose file
- Red Hat host: install Docker Engine + Compose plugin and run the same Compose flow
- Operator runbook: simplest possible Docker Compose commands, not script-heavy automation

