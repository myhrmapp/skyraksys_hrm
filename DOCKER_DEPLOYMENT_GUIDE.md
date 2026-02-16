# SkyrakSys HRM - Docker Deployment Guide

> **🚀 Quick Deploy:** `scripts/deploy/deploy-docker-from-windows.ps1`

---

## 📋 Server Information

| Item | Value |
|------|-------|
| Server IP | `46.225.73.94` |
| Domain | `skyait.skyraksys.com` |
| OS | Ubuntu 24.04.3 LTS |
| User | `Rakesh` |
| App Directory | `/home/Rakesh/skyraksys_hrm` |
| Deployment Type | **Docker Compose** |

---

## 🎯 Quick Start

### Option 1: One-Click Deployment (Windows)

```powershell
# From project root
cd skyraksys_hrm_app
.\scripts\deploy\deploy-docker-from-windows.ps1
```

**Prerequisites:**
- PuTTY installed ([Download](https://www.putty.org/))
- Internet connection

**Duration:** 10-15 minutes

---

### Option 2: Manual Deployment (Linux/Mac)

```bash
# 1. Upload script to server
scp scripts/deploy/cleanup-and-deploy-docker.sh Rakesh@46.225.73.94:/tmp/

# 2. SSH into server
ssh Rakesh@46.225.73.94

# 3. Run deployment
chmod +x /tmp/cleanup-and-deploy-docker.sh
sudo bash /tmp/cleanup-and-deploy-docker.sh
```

---

## 🐳 What Gets Deployed

### Docker Containers

1. **PostgreSQL** (`postgres:15-alpine`)
   - Port: 5432 (internal only)
   - Database: `skyraksys_hrm`
   - User: `hrm_admin`
   - Auto-configured with secure password

2. **Backend API** (Node.js 18)
   - Port: 5000 (internal only)
   - Auto-runs migrations and seeder
   - Health check: `/health`

3. **Frontend** (React + Nginx)
   - Port: 3000 (internal only)
   - Optimized production build
   - Gzip compression enabled

4. **Nginx Reverse Proxy**
   - Ports: 80 (HTTP), 443 (HTTPS)
   - SSL/TLS termination
   - Rate limiting
   - Security headers

5. **pgAdmin** (Optional - Profile: tools)
   - Port: 8081
   - Database management UI

### What Gets Cleaned

The deployment script will **automatically remove**:
- Existing PM2 processes
- Old Node.js application files
- Previous Nginx configurations
- Existing PostgreSQL service (uses Docker PostgreSQL instead)

**⚠️ No backup is taken - fresh installation only!**

---

## 📦 Architecture

```
Internet
    ↓
Nginx (80/443) ← SSL Termination
    ↓
    ├─→ Frontend (3000) ← React SPA
    └─→ Backend (5000) ← Node.js API
            ↓
        PostgreSQL (5432) ← Database
```

---

## 🔐 Default Credentials

### Application Admin
- **URL:** `https://skyait.skyraksys.com`
- **Email:** `admin@skyraksys.com`
- **Password:** `admin123`
- **⚠️ CHANGE IMMEDIATELY AFTER FIRST LOGIN!**

### Database (Saved in `~/.deployment-credentials.txt`)
- **Database:** `skyraksys_hrm`
- **User:** `hrm_admin`
- **Password:** *Auto-generated during deployment*

### pgAdmin (Optional)
- **URL:** `http://skyait.skyraksys.com:8081`
- **Email:** `admin@skyraksys.com`
- **Password:** *Auto-generated during deployment*

---

## 🛠️ Management Commands

All commands must be run on the server in `/home/Rakesh/skyraksys_hrm`

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
docker-compose restart nginx
```

### Stop/Start
```bash
# Stop all
docker-compose stop

# Start all
docker-compose start

# Stop and remove
docker-compose down

# Start with rebuild
docker-compose up -d --build
```

### Database Operations
```bash
# Run migrations
docker-compose exec backend npm run db:migrate

# Run seeder
docker-compose exec backend npm run db:seed

# Database backup
docker-compose exec postgres pg_dump -U hrm_admin skyraksys_hrm > backup_$(date +%Y%m%d).sql

# Restore backup
docker-compose exec -T postgres psql -U hrm_admin skyraksys_hrm < backup_20260217.sql
```

### Container Status
```bash
# View running containers
docker-compose ps

# View resource usage
docker stats

# Shell into container
docker-compose exec backend bash
docker-compose exec frontend sh
```

---

## 🔄 Update Deployment (Pull Latest Code)

```bash
cd /home/Rakesh/skyraksys_hrm

# Pull latest code
git pull origin skyraksys_hrm

# Rebuild and restart
docker-compose up -d --build

# Run any new migrations
docker-compose exec backend npm run db:migrate
```

---

## 🔒 Security Features

### 1. Firewall (UFW)
- ✅ SSH (22)
- ✅ HTTP (80)
- ✅ HTTPS (443)
- ✅ pgAdmin (8081) - Optional
- ❌ All other ports blocked

### 2. SSL/TLS
- ✅ Let's Encrypt SSL certificate
- ✅ Auto-renewal via cron
- ✅ HTTPS redirect
- ✅ TLS 1.2/1.3 only
- ✅ HSTS headers

### 3. Application Security
- ✅ JWT authentication
- ✅ Rate limiting (API: 10 req/s, Auth: 5 req/s)
- ✅ CORS configured
- ✅ Security headers (XSS, CSRF, etc.)
- ✅ Non-root Docker containers

### 4. Database Security
- ✅ Password-protected
- ✅ Not exposed externally
- ✅ Docker network isolation

---

## 📊 Monitoring & Health Checks

### Health Endpoints
```bash
# Backend health
curl https://skyait.skyraksys.com/api/health

# Expected response: 200 OK with health status
```

### Docker Health Checks
All containers have built-in health checks:
- Backend: HTTP check on `/health`
- Frontend: wget check on `/health`
- PostgreSQL: pg_isready check

View health status:
```bash
docker-compose ps
# Look for "(healthy)" status
```

---

## 🐛 Troubleshooting

### Problem: Unable to connect to application

**Solution:**
```bash
# Check container status
docker-compose ps

# Check container logs
docker-compose logs backend
docker-compose logs frontend

# Restart services
docker-compose restart
```

### Problem: SSL certificate not working

**Solution:**
```bash
# Check certificate expiry
sudo certbot certificates

# Renew manually
sudo certbot renew

# Restart nginx
docker-compose restart nginx
```

### Problem: Database connection error

**Solution:**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify database is running
docker-compose ps postgres

# Check connection from backend
docker-compose exec backend npm run db:migrate:status
```

### Problem: 502 Bad Gateway

**Solution:**
```bash
# Backend might not be running
docker-compose restart backend

# Check backend logs
docker-compose logs -f backend

# Verify backend health
curl http://localhost:5000/health
```

### Problem: Container won't start

**Solution:**
```bash
# Check logs for error
docker-compose logs [service-name]

# Rebuild container
docker-compose up -d --build [service-name]

# Remove and recreate
docker-compose down
docker-compose up -d
```

---

## 🔧 Advanced Configuration

### Enable pgAdmin
```bash
# Start with pgAdmin
docker-compose --profile tools up -d

# Access: http://skyait.skyraksys.com:8081
```

### Change Database Password
```bash
# 1. Update .env file
nano .env
# Change DB_PASSWORD value

# 2. Recreate database container
docker-compose up -d --force-recreate postgres
```

### Scale Services (if needed)
```bash
# Start multiple backend instances
docker-compose up -d --scale backend=3
```

---

## 📝 Maintenance Tasks

### Daily Backups (Automated)
The deployment sets up automated SSL renewal. For database backups:

```bash
# Add to crontab
crontab -e

# Add this line (daily at 2 AM)
0 2 * * * cd /home/Rakesh/skyraksys_hrm && docker-compose exec postgres pg_dump -U hrm_admin skyraksys_hrm | gzip > /home/Rakesh/backups/hrm_$(date +\%Y\%m\%d).sql.gz
```

### View System Resources
```bash
# Docker resource usage
docker stats

# System resources
htop
df -h
free -h
```

### Clean Up Old Images
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Clean everything
docker system prune -a --volumes
```

---

## 🆘 Emergency Recovery

### Full System Restart
```bash
cd /home/Rakesh/skyraksys_hrm
docker-compose down
docker-compose up -d
```

### Reset to Fresh State
```bash
# ⚠️ WARNING: This will delete all data!
cd /home/Rakesh/skyraksys_hrm
docker-compose down -v  # -v removes volumes (database data)
docker-compose up -d
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed
```

### Rollback to Previous Version
```bash
cd /home/Rakesh/skyraksys_hrm
git log --oneline  # Find commit hash
git checkout [commit-hash]
docker-compose up -d --build
```

---

## 📞 Support

For issues or questions:
- Check logs first: `docker-compose logs -f`
- Review this guide
- Check container status: `docker-compose ps`
- Verify network connectivity: `curl https://skyait.skyraksys.com/api/health`

---

## ✅ Post-Deployment Checklist

- [ ] Access application: `https://skyait.skyraksys.com`
- [ ] Login with admin credentials
- [ ] **Change admin password immediately**
- [ ] Verify all features work
- [ ] Check all containers are healthy: `docker-compose ps`
- [ ] Test database backup process
- [ ] Verify SSL certificate is active
- [ ] Review firewall rules: `sudo ufw status`
- [ ] Save deployment credentials securely
- [ ] Configure email settings (if needed)
- [ ] Set up monitoring/alerts (if needed)

---

**Deployment Date:** February 17, 2026  
**Version:** 2.0.0 (Docker-based)  
**Status:** Production Ready ✅
