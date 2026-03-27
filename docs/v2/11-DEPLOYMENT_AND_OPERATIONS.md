# SkyrakSys HRM — Deployment & Operations

> **Document Owner**: DevOps / SRE Engineer  
> **Version**: 2.0 | **Last Updated**: 2026-03-26  
> **Audience**: DevOps, sysadmins, on-call engineers

---

## 1. Deployment Architecture

```
┌──────────────────────────────────────────────┐
│              Production Server                │
│              Ubuntu 24.04 LTS                 │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │              Nginx (Port 80/443)         │  │
│  │  ┌──────────┐  ┌─────────────────────┐  │  │
│  │  │ SSL/TLS  │  │ Static Files        │  │  │
│  │  │ Termination│ │ (React build/)      │  │  │
│  │  └──────────┘  └─────────────────────┘  │  │
│  │    /api/* → proxy_pass backend:5000      │  │
│  └─────────────────┬───────────────────────┘  │
│                    │                          │
│  ┌─────────────────▼───────────────────────┐  │
│  │        PM2 Process Manager               │  │
│  │  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │ Backend     │  │ Backend         │   │  │
│  │  │ Instance 0  │  │ Instance 1      │   │  │
│  │  │ (Port 5000) │  │ (Port 5000)     │   │  │
│  │  │ Node.js 22  │  │ Node.js 22      │   │  │
│  │  └──────┬──────┘  └────────┬────────┘   │  │
│  └─────────┼──────────────────┼────────────┘  │
│            │                  │                │
│  ┌─────────▼──────────────────▼────────────┐  │
│  │          PostgreSQL 15+                  │  │
│  │          (Port 5432)                     │  │
│  └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## 2. Deployment Options

### Option A: Docker Compose (Recommended)

```bash
# Clone and configure
git clone <repo-url>
cd skyraksys_hrm_app
cp backend/.env.production.template backend/.env.production

# Build and start
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f
```

**docker-compose.yml** runs 3 containers:
| Container | Image | Ports | Purpose |
|-----------|-------|-------|---------|
| `backend` | Custom (Dockerfile) | 5000 | Express API server |
| `frontend` | Custom (Dockerfile + Nginx) | 80, 443 | React build + reverse proxy |
| `postgres` | postgres:15 | 5432 | Database |

**External DB variant**: `docker-compose.external-db.yml` — only backend + frontend, connects to external PostgreSQL.

### Option B: PM2 (Bare Metal)

```bash
# Install dependencies
cd backend && npm install --production
cd frontend && npm run build

# Start with PM2
pm2 start ecosystem.config.js

# PM2 commands
pm2 status
pm2 logs
pm2 restart all
pm2 save                # Save process list for reboot
pm2 startup             # Generate startup script
```

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'skyraksys-hrm-backend',
    script: './backend/server.js',
    instances: 2,            // Cluster mode
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    max_memory_restart: '500M',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true
  }]
};
```

### Option C: Manual / Development

```bash
# Terminal 1: Backend
cd backend
npm run dev     # nodemon with auto-restart

# Terminal 2: Frontend
cd frontend
npm start       # Webpack dev server with HMR (port 3000)
```

---

## 3. Nginx Configuration

### Production (`nginx/nginx.conf`)

```nginx
upstream backend {
    server 127.0.0.1:5000;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Frontend static files
    root /var/www/frontend/build;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
    }

    # Health check
    location /health {
        proxy_pass http://backend;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static asset caching
    location ~* \.(js|css|png|jpg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

---

## 4. Environment Configuration

### Production Environment Variables

```env
# Server
NODE_ENV=production
PORT=5000

# Database
DB_HOST=localhost                    # or RDS endpoint
DB_PORT=5432
DB_NAME=skyraksys_hrm
DB_USER=skyraksys_app               # Not "postgres"
DB_PASSWORD=<strong-password>
DB_SSL=true
DB_LOGGING=false
DB_POOL_MAX=10
DB_POOL_MIN=2

# JWT (generate unique 64-char secrets)
JWT_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<different-random-64-char-string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS
CORS_ORIGIN=https://your-domain.com

# Features
SEED_DEMO_DATA=false
RATE_LIMIT_ENABLED=true

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@your-domain.com
SMTP_PASS=<app-password>

# Encryption
ENCRYPTION_KEY=<32-byte-hex-key>
```

### Generating Secrets

```bash
# JWT secrets (64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. Database Operations

### Initial Setup

```bash
# Create database
createdb -h localhost -U postgres skyraksys_hrm

# Run migrations
cd backend
npx sequelize-cli db:migrate

# Seed demo data (optional)
npx sequelize-cli db:seed:all
```

### Schema Management

The backend uses `sequelize.sync({ alter: true })` on startup, which automatically adjusts the schema. For explicit control:

```bash
npx sequelize-cli db:migrate                  # Apply pending
npx sequelize-cli db:migrate:undo             # Rollback last
npx sequelize-cli db:migrate:undo:all         # Rollback all
npx sequelize-cli db:migrate:status           # Check status
npx sequelize-cli migration:generate --name desc  # New migration
```

### Backup & Restore

```bash
# Full backup
pg_dump -h localhost -U postgres -d skyraksys_hrm -F c -f backup_$(date +%Y%m%d_%H%M).dump

# Restore
pg_restore -h localhost -U postgres -d skyraksys_hrm -c backup_20260326_1200.dump

# Automated daily backup (cron)
0 2 * * * /usr/bin/pg_dump -h localhost -U postgres -d skyraksys_hrm -F c -f /backups/hrm_$(date +\%Y\%m\%d).dump
```

### Monitoring Queries

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('skyraksys_hrm'));

-- Table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;

-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE datname='skyraksys_hrm';

-- Slow queries (if pg_stat_statements enabled)
SELECT query, mean_exec_time, calls FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;

-- Lock monitoring
SELECT * FROM pg_locks WHERE NOT granted;
```

---

## 6. Monitoring

### Health Checks

| Endpoint | Auth | Response |
|----------|------|----------|
| `GET /health` | None | `{ status: 'ok', uptime, memory, db }` |
| `GET /api/health` | None | Same as above |
| `GET /api/status` | None | express-status-monitor (web UI) |
| `GET /api/performance/server-metrics` | Admin | CPU, memory, DB pool, disk |
| `GET /api/performance/api-metrics` | Admin | API response times |

### Log Files

| File | Location | Content |
|------|----------|---------|
| Application errors | `backend/logs/error.log` | Error-level logs |
| All application logs | `backend/logs/combined.log` | All levels |
| HTTP access logs | `backend/logs/access.log` | Request logs (Morgan) |
| PM2 error logs | `./logs/pm2-error.log` | PM2 stderr |
| PM2 output logs | `./logs/pm2-out.log` | PM2 stdout |
| Nginx access logs | `/var/log/nginx/access.log` | HTTP requests |
| Nginx error logs | `/var/log/nginx/error.log` | Nginx errors |

### Log Rotation

Application logs rotate at 5MB with 5 file retention. For system logs:

```bash
# /etc/logrotate.d/skyraksys-hrm
/path/to/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 0640 www-data www-data
}
```

---

## 7. Troubleshooting

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ECONNREFUSED :5432` | PostgreSQL not running | `systemctl start postgresql` |
| `JWT_SECRET not set` | Missing .env | Copy template, set secrets |
| `CORS blocked` | Wrong CORS_ORIGIN | Set to frontend URL |
| `ENOMEM` | Memory exhaustion | Increase PM2 `max_memory_restart` |
| `Connection pool drained` | Too many connections | Increase `DB_POOL_MAX` |
| `Rate limit 429` | Rate limiter active | Increase limits or whitelist |
| Upload fails | File too large or wrong type | Check Multer limits (5MB) |
| Stale data after deploy | In-memory cache | Restart all PM2 instances |

### Debugging

```bash
# Check PM2 status
pm2 status
pm2 logs --lines 100

# Check database connectivity
psql -h localhost -U postgres -d skyraksys_hrm -c "SELECT 1"

# Check backend health
curl http://localhost:5000/health

# Check Nginx
nginx -t                    # Test config
systemctl status nginx      # Check status
tail -f /var/log/nginx/error.log

# Check disk space
df -h
du -sh backend/logs/ backend/uploads/
```

---

## 8. Scaling Considerations

### Current Architecture Limits

| Component | Current | Limit | Scale Path |
|-----------|---------|-------|-----------|
| Backend instances | 2 (PM2 cluster) | ~4 per server | Add servers + load balancer |
| DB connections | 10 pool | ~100 PostgreSQL | PgBouncer connection pooler |
| Token blacklist | In-memory | Per-instance | Redis for shared state |
| File uploads | Local disk | Server storage | S3/MinIO object storage |
| Cache | In-memory | Per-instance | Redis for shared cache |
| Sessions | Stateless JWT | N/A | Already stateless |

### Scaling Path

```
Current (Single Server)              Scaled (Multi-Server)
┌──────────────┐                    ┌──────────────┐
│ Nginx        │                    │ Load Balancer│
│ PM2 (2 inst) │                    │ (ALB/HAProxy)│
│ PostgreSQL   │                    └──────┬───────┘
└──────────────┘                           │
                                    ┌──────┴──────┐
                                    │             │
                              ┌─────▼──┐   ┌─────▼──┐
                              │Server 1│   │Server 2│
                              │PM2(2)  │   │PM2(2)  │
                              └────┬───┘   └────┬───┘
                                   │            │
                              ┌────▼────────────▼───┐
                              │     Redis           │
                              │  (cache + blacklist) │
                              └─────────┬───────────┘
                                        │
                              ┌─────────▼───────────┐
                              │    PostgreSQL        │
                              │ (Primary + Replica)  │
                              └─────────────────────┘
```

---

## 9. SSL/TLS Setup

### Let's Encrypt (Certbot)

```bash
# Install
apt install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d your-domain.com

# Auto-renewal (cron)
0 3 * * * /usr/bin/certbot renew --quiet
```

### Self-Signed (Development)

```bash
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/ssl/private/selfsigned.key \
  -out /etc/ssl/certs/selfsigned.crt
```

---

## 10. Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (backend + E2E)
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Strong JWT secrets generated
- [ ] SSL certificate configured
- [ ] CORS origin set to production domain
- [ ] `NODE_ENV=production`
- [ ] `SEED_DEMO_DATA=false`
- [ ] Rate limiting enabled
- [ ] Backup script configured

### Post-Deployment

- [ ] Health endpoint responding
- [ ] Login working
- [ ] Database connected
- [ ] Nginx serving frontend
- [ ] API proxy working
- [ ] PM2 processes stable
- [ ] Logs rotating
- [ ] Monitoring active
- [ ] DNS pointing correctly
- [ ] SSL certificate valid

---

*End of Document — See [00-INDEX.md](./00-INDEX.md) for the full documentation suite.*
