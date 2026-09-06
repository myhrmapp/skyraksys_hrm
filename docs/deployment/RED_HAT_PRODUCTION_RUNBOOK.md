# Red Hat Production Runbook

This is the supported operator runbook for deploying SkyrakSys HRM to a Red Hat Docker host. It is intentionally simple and safe for a non-technical operator.

## 1. Scope

This runbook covers:

- installing Docker on Red Hat
- copying the application to the server
- creating a secure production environment file
- starting the application with Docker Compose
- running database migrations
- verifying health
- performing rollback and backup operations

This runbook does not use the legacy deployment scripts as the standard production path.

---

## 2. Simple production rule

Use one consistent deployment command:

```bash
docker compose --env-file .env.production up -d --build
```

Do not use multiple deployment methods. Do not mix legacy scripts with the Docker Compose flow.

---

## 3. Requirements

### Server
- Red Hat Enterprise Linux or compatible RHEL-family distro
- Docker Engine installed
- Docker Compose plugin installed
- Git installed
- SSH access for the operator
- A writable deployment directory

### Local machine
- Windows or Mac or Linux
- Git client
- Docker Desktop or Docker Engine
- Access to the repo

---

## 4. Install Docker on Red Hat

Run these commands as a user with sudo access:

```bash
sudo dnf update -y
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
```

Verify:

```bash
docker --version
docker compose version
```

---

## 5. Prepare the app directory

```bash
mkdir -p /opt/skyraksys-hrm
cd /opt/skyraksys-hrm

git clone <repo-url> .
```

If the repo already exists:

```bash
cd /opt/skyraksys-hrm
git pull origin <branch>
```

---

## 6. Create the production environment file

From the repo root:

```bash
cp .env.production.template .env.production
```

Edit `.env.production` and set real values. Required values include:

- DB_PASSWORD
- JWT_SECRET
- JWT_REFRESH_SECRET
- ENCRYPTION_KEY
- SEED_DEFAULT_PASSWORD
- SMTP settings if email is enabled

Important:
- never leave `REPLACE_WITH_...` placeholders
- never use default passwords in production
- never hardcode secrets in shell scripts or deployment files

---

## 7. Start the application

From the repo root:

```bash
docker compose --env-file .env.production up -d --build
```

Check containers:

```bash
docker compose --env-file .env.production ps
```

If the app does not start cleanly, check logs:

```bash
docker compose --env-file .env.production logs -f backend
```

---

## 8. Run database migrations

Run:

```bash
bash scripts/deploy/run-migrations.sh
```

This applies pending schema updates safely.

---

## 9. Health checks

Verify the backend is healthy:

```bash
docker compose --env-file .env.production exec -T backend node -e "require('http').get('http://localhost:5000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1));"
```

Check web access:

```bash
curl -I http://localhost
```

Expected result:
- container status is running
- backend health returns 200
- nginx responds successfully

---

## 10. Production security rules

The following are mandatory:

- Do not expose the PostgreSQL port publicly
- Do not expose pgAdmin publicly
- Do not store credentials in `.sh` deployment scripts
- Do not use default admin passwords in production
- Do not leave placeholder values in `.env.production`
- Do not run legacy deployment scripts as the standard path
- Do not allow production secrets to be printed in logs

---

## 11. Backup and rollback

### Backup database

Take a backup before a production release:

```bash
docker compose --env-file .env.production exec -T postgres pg_dump -U ${DB_USER} -d ${DB_NAME} > backup_$(date +%Y%m%d_%H%M%S).sql
```

Store the backup outside the app directory in a secure location.

### Rollback

If a deployment fails:

1. stop the new version
2. restore the previous backup if needed
3. restart the prior working container stack
4. validate health again

Example rollback steps:

```bash
docker compose --env-file .env.production down
# restore DB backup if required
# restart prior image or tag
```

If you are using a tagged release, rollback to the previous image tag instead of rebuilding blindly.

---

## 12. Change management

Before production rollout:

- confirm the release scope
- confirm the change is approved
- confirm a rollback path exists
- confirm a backup exists
- confirm that the app passes smoke tests in a production-like environment
- confirm operator runbook is available

---

## 13. Simple operator checklist

Use this checklist for each production deployment:

- [ ] `.env.production` exists
- [ ] no placeholders remain
- [ ] DB password is real and strong
- [ ] JWT secrets are real and strong
- [ ] ENCRYPTION_KEY is configured
- [ ] SMTP is configured if needed
- [ ] Docker is installed and running
- [ ] repo is up to date
- [ ] app starts with `docker compose --env-file .env.production up -d --build`
- [ ] migrations run successfully
- [ ] backend health returns 200
- [ ] nginx responds successfully
- [ ] backup is taken
- [ ] rollback plan is ready

---

## 14. Troubleshooting

### Docker not running

```bash
sudo systemctl status docker
sudo systemctl restart docker
```

### Containers failed to start

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=200
```

### Migration failed

```bash
bash scripts/deploy/run-migrations.sh
```

If migration fails, stop and investigate before restarting the stack.

---

## 15. Final production recommendation

The supported production path is:

- Red Hat host
- Docker Engine + Docker Compose plugin
- one `.env.production` file
- one Docker Compose deployment command
- migration run after startup
- health verification before sign-off

Avoid legacy shell-heavy deploy scripts as the default path. They are historical reference only.

