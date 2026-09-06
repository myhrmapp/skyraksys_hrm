# Deployment Guide

## Supported deployment model

The active production deployment model is Docker Compose running on a Red Hat host.

### Environment model

- Local Windows workstation: Docker Desktop for testing and local validation
- Production Red Hat host: Docker Engine and Docker Compose plugin
- Runtime stack: PostgreSQL, backend, frontend, mobile web, Redis, and Nginx

## Production deployment flow

```bash
cp .env.production.template .env.production
# edit .env.production with real values

docker compose --env-file .env.production up -d --build
bash scripts/deploy/run-migrations.sh
```

## Required production values

Set these values before deployment:

- DB_PASSWORD
- JWT_SECRET
- JWT_REFRESH_SECRET
- ENCRYPTION_KEY
- SEED_DEFAULT_PASSWORD
- SMTP settings when email is enabled

Do not leave placeholders or default values in production.

## Operational rules

- Keep database ports private
- Keep pgAdmin off by default
- Avoid storing secrets in scripts or shell history
- Use one consistent Docker Compose deployment flow
- Verify health before assuming the release is successful

## Health checks

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f backend
```

Backend health check:

```bash
docker compose --env-file .env.production exec -T backend node -e "require('http').get('http://localhost:5000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1));"
```

## Backup and rollback

- Back up the database before a production release
- Keep a known-good previous image or backup available
- Confirm rollback path before sign-off

## Golden rule

Use the canonical Docker Compose path. Historical shell-based and host-specific deployment scripts are kept in archive and are not the current production standard.
