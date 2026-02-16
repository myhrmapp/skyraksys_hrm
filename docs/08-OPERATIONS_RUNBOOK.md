# Operations Runbook

> **Last updated:** 2026-02-14 | **Infrastructure:** PM2 cluster ×2 + PostgreSQL 15 (Docker)

---

## 1. Architecture Overview

```
┌──────────┐      ┌─────────────────────────┐      ┌─────────────┐
│  Client  │ ──── │  PM2 (cluster mode ×2)   │ ──── │ PostgreSQL  │
│ React SPA│      │  Express/Node.js         │      │   15.x      │
│ port 3000│      │  port 5000               │      │ port 5432   │
└──────────┘      └─────────────────────────┘      │ (Docker)    │
                                                    └─────────────┘
```

- **Frontend:** Static React build served by Nginx or PM2/serve
- **Backend:** Node.js (Express 4.18) managed by PM2 in cluster mode (2 instances)
- **Database:** PostgreSQL 15 running in Docker container
- **Monitoring:** pgAdmin (Docker, port 5050), express-status-monitor, PM2 monit

---

## 2. Health Checks

### 2.1 API Health Endpoint

```
GET /api/health
```

Response (healthy):
```json
{
  "status": "healthy",
  "timestamp": "2026-02-14T10:00:00.000Z",
  "database": "connected",
  "uptime": 86400
}
```

Response (unhealthy — DB down):
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Connection refused"
}
```
Returns **503** when database is unreachable.

### 2.2 Status Endpoint

```
GET /status
```

Returns:
```json
{
  "status": "running",
  "uptime": 86400,
  "memory": { "rss": 85000000, "heapUsed": 45000000, "heapTotal": 70000000 },
  "pid": 12345,
  "nodeVersion": "v18.x.x"
}
```

### 2.3 Performance Metrics (Admin)

```
GET /api/performance/server-metrics    → CPU, memory, event loop, GC stats
GET /api/performance/api-metrics       → Per-endpoint response times, error rates
GET /api/performance/health-metrics    → Basic health (any authenticated user)
```

---

## 3. Logging

### 3.1 Log Files

| File | Content | Rotation |
|------|---------|----------|
| `logs/combined.log` | All application logs (info+) | 5MB × 5 files |
| `logs/error.log` | Error-level only | 5MB × 5 files |
| `logs/access.log` | HTTP request logs (Morgan) | 5MB × 5 files |
| `logs/pm2-combined.log` | PM2 combined output | PM2 managed |
| `logs/pm2-error.log` | PM2 error output | PM2 managed |
| `logs/pm2-out.log` | PM2 stdout | PM2 managed |

### 3.2 Log Format

**Winston (combined.log, error.log):**
```
2026-02-14 10:00:00 [info]: Server listening on port 5000
2026-02-14 10:00:01 [warn]: Slow query detected (250ms): SELECT * FROM employees...
2026-02-14 10:00:02 [error]: Database connection failed { error: "ECONNREFUSED" }
```

**Morgan (access.log):**
```
::1 - - [14/Feb/2026:10:00:00 +0000] "GET /api/employees HTTP/1.1" 200 4521 15ms
```

### 3.3 Alert Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Slow query | > 100ms | Warning logged |
| Slow request | > 500ms | Warning logged with response time |
| Memory usage | > 1GB | PM2 auto-restart |
| PM2 restarts | > 10 | PM2 stops restarting (check logs) |

### 3.4 Log Management (Debug Routes — dev only)

```
GET  /api/debug/logs              — List available log files
GET  /api/debug/logs/:type        — Read log file (paginated)
GET  /api/debug/logs/:type/tail   — Tail last N lines
DELETE /api/debug/logs/:type      — Clear log file
```

---

## 4. Scheduled Tasks (Cron)

### 4.1 Monthly Leave Accrual

**Schedule:** `0 5 1 * *` — 00:05 AM on the 1st of every month

**Action:** For each active employee, accrues monthly leave balance:
```
monthly_amount = leave_type.maxDaysPerYear / 12
totalAccrued += monthly_amount
balance += monthly_amount
```

**Manual trigger:** `POST /api/leave-accrual/run` (admin only)  
**Preview:** `GET /api/leave-accrual/preview` (dry-run)

### 4.2 Year-End Leave Carry Forward

**Schedule:** `0 1 1 1 *` — 00:01 AM on January 1st

**Action:** For each employee with carry-forward eligible leave types:
```
carryForward = min(currentBalance, leaveType.maxCarryForwardDays)
Create new year balance with carryForward amount
```

**Manual trigger:** `POST /api/leave-accrual/carry-forward` (admin only)

### 4.3 Token Cleanup

**Schedule:** `0 0 2 * * *` — 02:00 AM daily

**Action:**
- Deletes expired refresh tokens from `refresh_tokens` table
- Purges expired entries from in-memory token blacklist

---

## 5. Database Operations

### 5.1 Backup

```bash
# Full database backup
docker exec postgres pg_dump -U postgres skyraksys_hrm > backup_$(date +%Y%m%d).sql

# Compressed backup
docker exec postgres pg_dump -U postgres skyraksys_hrm | gzip > backup_$(date +%Y%m%d).sql.gz

# Table-specific backup (via debug route — dev only)
POST /api/debug/database/backup/:tableName
```

### 5.2 Restore

```bash
# Restore from backup
docker exec -i postgres psql -U postgres skyraksys_hrm < backup_20260214.sql

# Restore compressed
gunzip -c backup_20260214.sql.gz | docker exec -i postgres psql -U postgres skyraksys_hrm
```

### 5.3 Database Monitor

```bash
# Connection count
docker exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity WHERE datname='skyraksys_hrm';"

# Table sizes
docker exec postgres psql -U postgres skyraksys_hrm -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;"

# Active queries
docker exec postgres psql -U postgres -c "SELECT pid, state, query, now() - query_start AS duration FROM pg_stat_activity WHERE datname='skyraksys_hrm' AND state != 'idle';"
```

Via API (dev only):
```
GET /api/debug/database/stats        — Database statistics
GET /api/debug/database/connections   — Active connections
GET /api/debug/database/tables        — List all tables
GET /api/debug/database/schema/:table — Table schema
```

---

## 6. Common Operations

### 6.1 Deploy New Version

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
cd backend && npm ci
cd ../frontend && npm ci

# 3. Build frontend
npm run build

# 4. Run migrations
cd ../backend
npx sequelize-cli db:migrate

# 5. Reload backend (zero-downtime)
pm2 reload skyraksys-hrm
```

### 6.2 Reset User Password (Admin CLI)

```bash
# Via API (admin account required)
curl -X PUT http://localhost:5000/api/auth/users/{userId}/reset-password \
  -H "Cookie: accessToken=<admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "NewSecurePass123!"}'
```

### 6.3 Force-Unlock a Locked Payslip

```bash
# Via debug route (dev only)
# Or directly in database:
docker exec postgres psql -U postgres skyraksys_hrm -c \
  "UPDATE payslips SET is_locked = false WHERE id = '<payslip-uuid>';"
```

### 6.4 Clear Rate Limit Lockouts

Rate limiting is in-memory — restart the PM2 process to clear:
```bash
pm2 restart skyraksys-hrm
```

### 6.5 Rebuild Leave Balances

```bash
# Bulk initialize for all active employees
curl -X POST http://localhost:5000/api/admin/leave-balances/bulk/initialize \
  -H "Cookie: accessToken=<admin_token>"
```

---

## 7. Troubleshooting

### 7.1 Common Issues

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| 401 on all requests | JWT secret changed | Restart server, users re-login |
| 503 from /api/health | Database down | Check Docker: `docker-compose ps` |
| High memory (>1GB) | Memory leak or large queries | PM2 auto-restarts; check logs |
| CORS errors | Frontend URL mismatch | Check `FRONTEND_URL` and `CORS_ORIGIN` env |
| Rate limit (429) | Legitimate heavy usage | Increase `RATE_LIMIT_MAX` |
| Login lockout | Too many failed attempts | Wait 15min or restart PM2 |
| Token blacklist not working | PM2 cluster mode | ⚠️ Blacklist is per-process. Consider Redis |
| Cron not running | PM2 cluster mode | Only one instance should run cron tasks |
| Email not sending | SMTP config wrong | Check via `/api/admin/email-config/test` |
| Payslip locked | Finalized payslip | Admin unlock or DB update |

### 7.2 Emergency Procedures

**Database Connection Pool Exhaustion:**
```bash
# Check active connections
docker exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections
docker exec postgres psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='skyraksys_hrm' AND state='idle' AND query_start < now() - interval '10 minutes';"

# Restart backend
pm2 restart skyraksys-hrm
```

**Disk Space Full (Logs):**
```bash
# Check sizes
du -sh logs/*

# Truncate large logs
> logs/combined.log
> logs/access.log

# Or via PM2
pm2 flush
```

**Application Crash Loop:**
```bash
# Check PM2 status
pm2 status

# Check restart count (>10 = stopped)
pm2 describe skyraksys-hrm

# Check error logs
pm2 logs skyraksys-hrm --err --lines 50

# Delete and restart fresh
pm2 delete skyraksys-hrm
pm2 start ecosystem.config.js --env production
```

---

## 8. Monitoring Checklist

### Daily
- [ ] Check `/api/health` returns 200
- [ ] Review `logs/error.log` for new errors
- [ ] Monitor PM2 memory usage (`pm2 monit`)

### Weekly
- [ ] Review slow query warnings in logs
- [ ] Check database connection pool usage
- [ ] Verify cron tasks ran (leave accrual on 1st)
- [ ] Review audit logs for suspicious activity

### Monthly
- [ ] Database backup verification
- [ ] Review disk space usage (logs, uploads, database)
- [ ] Check PM2 restart counts (indicates stability issues)
- [ ] Review rate limiting effectiveness
- [ ] Update dependencies (security patches)
