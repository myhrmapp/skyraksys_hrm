# Configuration Guide

> **Last updated:** 2026-02-14 | **Backend:** Node.js + Express | **Config source:** Environment variables + SystemConfig model

---

## 1. Environment Variables

### 1.1 Server

| Variable | Default | Required Prod | Description |
|----------|---------|:---:|-------------|
| `NODE_ENV` | `development` | ✅ | `production`, `development`, `test` |
| `PORT` | `5000` | | Server listen port |
| `HOST` | `0.0.0.0` | | Bind address |
| `TRUST_PROXY` | `false` | ✅ | Set `true` behind reverse proxy (for rate limiting) |

### 1.2 Database

| Variable | Default | Required Prod | Description |
|----------|---------|:---:|-------------|
| `DB_HOST` | `localhost` | ✅ | PostgreSQL host |
| `DB_PORT` | `5432` | | PostgreSQL port |
| `DB_NAME` | `skyraksys_hrm` | ✅ | Database name |
| `DB_USER` | `postgres` | ✅ | Database user |
| `DB_PASSWORD` | `postgres` | ✅ | Database password |
| `DB_SSL` | `false` | | Enable SSL connection |
| `DB_POOL_MAX` | `10` | | Max pool connections |
| `DB_POOL_MIN` | `2` | | Min pool connections |
| `DB_POOL_ACQUIRE` | `30000` | | Acquire timeout (ms) |
| `DB_POOL_IDLE` | `10000` | | Idle timeout (ms) |
| `DB_LOGGING` | `false` | | Enable SQL query logging |

### 1.3 Authentication

| Variable | Default | Required Prod | Description |
|----------|---------|:---:|-------------|
| `JWT_SECRET` | Dev fallback | ✅ | JWT access token secret |
| `JWT_REFRESH_SECRET` | Dev fallback | ✅ | JWT refresh token secret |
| `JWT_EXPIRY` | `15m` | | Access token expiry |
| `JWT_REFRESH_EXPIRY` | `7d` | | Refresh token expiry |
| `SESSION_SECRET` | Dev fallback | ✅ | Express session secret |
| `BCRYPT_SALT_ROUNDS` | `12` | | Password hashing rounds |

### 1.4 CORS & Frontend

| Variable | Default | Required Prod | Description |
|----------|---------|:---:|-------------|
| `FRONTEND_URL` | `http://localhost:3000` | ✅ | Frontend origin for CORS |
| `CORS_ORIGIN` | | | Additional CORS origin |
| `API_BASE_URL` | `http://localhost:5000` | ✅ | Backend base URL |

### 1.5 Rate Limiting

| Variable | Default | Required Prod | Description |
|----------|---------|:---:|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 min) | | General rate limit window |
| `RATE_LIMIT_MAX` | `300` | | Max requests per window |
| `AUTH_RATE_LIMIT_MAX` | `20` | | Auth endpoint max requests |
| `LOGIN_MAX_ATTEMPTS_PER_IP` | `5` | | Login attempts per IP |
| `LOGIN_WINDOW_MS` | `900000` (15 min) | | Login rate limit window |
| `LOGIN_MAX_ATTEMPTS_PER_USER` | `10` | | Login attempts per username |
| `LOGIN_USER_WINDOW_MS` | `3600000` (1 hr) | | Per-username window |

### 1.6 Email (SMTP)

| Variable | Default | Required Prod | Description |
|----------|---------|:---:|-------------|
| `SMTP_HOST` | | ✅ | SMTP server hostname |
| `SMTP_PORT` | `587` | | SMTP port (587=TLS, 465=SSL) |
| `SMTP_USER` | | ✅ | SMTP username |
| `SMTP_PASSWORD` | | ✅ | SMTP password |
| `SMTP_SECURE` | `false` | | Use SSL (true for port 465) |
| `SMTP_FROM_NAME` | `SkyrakSys HRM` | | Email sender name |
| `SMTP_FROM_EMAIL` | | ✅ | Email sender address |

### 1.7 File Upload

| Variable | Default | Required Prod | Description |
|----------|---------|:---:|-------------|
| `UPLOAD_DIR` | `uploads/` | | File upload directory |
| `MAX_FILE_SIZE` | `5242880` (5MB) | | Max upload size in bytes |

### 1.8 Logging

| Variable | Default | Required Prod | Description |
|----------|---------|:---:|-------------|
| `LOG_LEVEL` | `info` | | Winston log level |
| `LOG_DIR` | `logs/` | | Log file directory |
| `LOG_MAX_SIZE` | `5m` | | Max log file size |
| `LOG_MAX_FILES` | `5` | | Max rotated log files |
| `SLOW_QUERY_THRESHOLD` | `100` | | Slow query warning (ms) |
| `SLOW_REQUEST_THRESHOLD` | `500` | | Slow request warning (ms) |

### 1.9 Feature Flags & Seeding

| Variable | Default | Required Prod | Description |
|----------|---------|:---:|-------------|
| `ENABLE_DEMO_SEEDING` | `false` | | Enable demo data seeding |
| `AUTO_SEED_ON_EMPTY` | `false` | | Auto-seed when DB is empty |
| `ENABLE_STATUS_MONITOR` | `true` | | Enable express-status-monitor |

### 1.10 Frontend (React)

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | `/api` | Backend API base URL |
| `REACT_APP_APP_NAME` | `SkyrakSys HRM` | Application display name |

---

## 2. SystemConfig Model (Runtime Config)

Database-driven configuration stored in `system_configs` table. Versioned with audit trail. Accessed via admin-only endpoints.

### 2.1 Structure

```
category: STRING(50)   — Group (e.g. "auth", "email", "system")
key: STRING(100)       — Config key name
value: TEXT            — JSON-encoded value
version: INTEGER       — Increments on each update
changedBy: UUID        — User who made the change
```

### 2.2 Access Pattern

- **View:** `POST /api/system-config/view` — Requires password re-authentication
- **Update:** `PUT /api/system-config/update` — Requires password re-authentication
- **Audit:** `GET /api/system-config/audit-trail` — View change history
- **Password values:** AES-encrypted in storage

### 2.3 Email Config (Live-Editable)

Email configuration can be changed at runtime without restart:

```
GET  /api/admin/email-config          — Read current config
POST /api/admin/email-config          — Update config
POST /api/admin/email-config/test     — Test connection
POST /api/admin/email-config/send-test — Send test email
GET  /api/admin/email-config/history  — Change history
POST /api/admin/email-config/rollback — Rollback to previous version
```

---

## 3. Database Configuration

### 3.1 Sequelize Config

Source: `backend/config/database.js`

```javascript
{
  dialect: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  pool: {
    max: parseInt(DB_POOL_MAX) || 10,
    min: parseInt(DB_POOL_MIN) || 2,
    acquire: parseInt(DB_POOL_ACQUIRE) || 30000,
    idle: parseInt(DB_POOL_IDLE) || 10000
  },
  logging: DB_LOGGING === 'true' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
    paranoid: false  // per-model override
  }
}
```

### 3.2 Running Migrations

```bash
# Run all pending
npx sequelize-cli db:migrate

# Undo last
npx sequelize-cli db:migrate:undo

# Reset all
npx sequelize-cli db:migrate:undo:all

# Create new migration
npx sequelize-cli migration:generate --name descriptive-name
```

---

## 4. PM2 Configuration

Source: `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'skyraksys-hrm',
    script: 'backend/server.js',
    instances: 2,              // Cluster mode (2 workers)
    exec_mode: 'cluster',
    max_memory_restart: '1G',  // Restart if > 1GB memory
    max_restarts: 10,
    restart_delay: 4000,       // 4s between restarts
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    log_file: 'logs/pm2-combined.log',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### PM2 Commands

```bash
# Start
pm2 start ecosystem.config.js --env production

# Restart
pm2 restart skyraksys-hrm

# Reload (zero-downtime)
pm2 reload skyraksys-hrm

# Stop
pm2 stop skyraksys-hrm

# Logs
pm2 logs skyraksys-hrm --lines 100

# Monitor
pm2 monit
```

---

## 5. Docker Configuration

Source: `docker-compose.yml`

**Docker manages PostgreSQL + pgAdmin only. The Node.js app runs via PM2.**

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: skyraksys_hrm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: <from env>
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: <from env>
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  pgdata:
```

### Docker Commands

```bash
# Start database
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f postgres

# Reset database
docker-compose down -v  # removes volumes
docker-compose up -d
```

---

## 6. Auth Configuration

Source: `backend/config/auth.config.js`

| Setting | Value | Notes |
|---------|-------|-------|
| Access token expiry | 15 minutes | `JWT_EXPIRY` |
| Refresh token expiry | 7 days | `JWT_REFRESH_EXPIRY` |
| Cookie httpOnly | true | Always |
| Cookie secure | true (prod only) | HTTPS required in production |
| Cookie sameSite | Strict | CSRF protection |
| Refresh cookie path | `/api/auth` | Restricted |
| Bcrypt rounds | 12 | `BCRYPT_SALT_ROUNDS` |
| Token blacklist | In-memory Map | ⚠️ Not shared across PM2 cluster |
| Blacklist cleanup | Every 5 minutes | Removes expired entries |
