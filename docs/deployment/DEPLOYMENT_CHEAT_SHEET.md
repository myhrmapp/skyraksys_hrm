# Deployment Cheat Sheet

This is the quick one-page reference for production operations.

## Supported production path

Use Docker Compose from the repo root.

```bash
cp .env.production.template .env.production
# edit .env.production with real values

docker compose --env-file .env.production up -d --build
bash scripts/deploy/run-migrations.sh
```

---

## Required environment values

Set real values in `.env.production` before deployment:

- DB_PASSWORD
- JWT_SECRET
- JWT_REFRESH_SECRET
- ENCRYPTION_KEY
- SEED_DEFAULT_PASSWORD
- SMTP_HOST / SMTP_USER / SMTP_PASSWORD if email is enabled

Never leave placeholders like `REPLACE_WITH_...` or default passwords in production.

---

## Red Hat server setup

```bash
sudo dnf update -y
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
```

---

## Start app

```bash
cd /opt/skyraksys-hrm
docker compose --env-file .env.production up -d --build
```

---

## Run migrations

```bash
bash scripts/deploy/run-migrations.sh
```

---

## Health check

```bash
docker compose --env-file .env.production exec -T backend node -e "require('http').get('http://localhost:5000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1));"
```

---

## Backup

```bash
docker compose --env-file .env.production exec -T postgres pg_dump -U ${DB_USER} -d ${DB_NAME} > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## Rollback

1. Stop the current stack
2. Restore the previous DB backup if needed
3. Restart the previous known-good version
4. Verify backend health again

---

## Do not do this in production

- Do not expose PostgreSQL publicly
- Do not expose pgAdmin publicly
- Do not use default or weak passwords
- Do not leave placeholders in `.env.production`
- Do not rely on the legacy deployment scripts for routine production deployment
- Do not print secrets in logs or scripts

---

## Final release rule

Production is approved only when:

- Docker Compose starts successfully
- migrations complete successfully
- backend health returns 200
- no placeholder values remain
- rollback is ready
- backup exists

