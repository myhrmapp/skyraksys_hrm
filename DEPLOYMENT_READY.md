# 🚀 SkyrakSys HRM - Docker Deployment Ready!

## ✅ What's Been Prepared

### 1. **Docker Infrastructure**
- ✅ Backend Dockerfile (Node.js 18 Alpine)
- ✅ Frontend Dockerfile (React + Nginx)
- ✅ docker-compose.yml (PostgreSQL + Backend + Frontend + Nginx)
- ✅ Nginx reverse proxy with SSL support
- ✅ Health checks for all containers
- ✅ Production-optimized builds

### 2. **Automation Scripts**
- ✅ `cleanup-and-deploy-docker.sh` - Complete server setup
- ✅ `deploy-docker-from-windows.ps1` - One-click Windows deployment
- ✅ Auto-cleanup of existing PM2/Node.js deployment
- ✅ SSL certificate automation (Let's Encrypt)
- ✅ Firewall configuration (UFW)
- ✅ Auto-start on boot

### 3. **Documentation**
- ✅ [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md) - Comprehensive guide
- ✅ [DEPLOY_QUICK_START.md](DEPLOY_QUICK_START.md) - Quick reference
- ✅ Troubleshooting guides
- ✅ Management commands

### 4. **Security**
- ✅ Secure JWT secrets auto-generation
- ✅ Firewall rules (SSH, HTTP, HTTPS only)
- ✅ SSL/TLS with Let's Encrypt
- ✅ Non-root Docker containers
- ✅ Rate limiting
- ✅ Security headers

---

## 🎯 Ready to Deploy!

### Server Information
- **IP:** `46.225.73.94`
- **Domain:** `skyait.skyraksys.com`
- **User:** `Rakesh`
- **OS:** Ubuntu 24.04.3 LTS

---

## 📋 Deployment Options

### **Option 1: One-Click from Windows (Recommended)**

1. Install PuTTY: https://www.putty.org/
2. Open PowerShell in project directory
3. Run:
```powershell
.\scripts\deploy\deploy-docker-from-windows.ps1
```

**Duration:** 10-15 minutes  
**What it does:**
- Uploads deployment script to server
- Executes complete deployment
- Monitors progress
- Verifies deployment

---

### **Option 2: Manual Deployment via SSH**

```bash
# 1. SSH into server
ssh Rakesh@46.225.73.94

# 2. Switch to root
sudo su -

# 3. Download and run deployment script
curl -o /tmp/deploy.sh https://raw.githubusercontent.com/myhrmapp/skyraksys_hrm/skyraksys_hrm/scripts/deploy/cleanup-and-deploy-docker.sh

chmod +x /tmp/deploy.sh
bash /tmp/deploy.sh
```

---

### **Option 3: Deploy from Local Script**

```bash
# From your Windows machine (using WSL or Git Bash)

# 1. Upload script
scp scripts/deploy/cleanup-and-deploy-docker.sh Rakesh@46.225.73.94:/tmp/

# 2. SSH and execute
ssh Rakesh@46.225.73.94
chmod +x /tmp/cleanup-and-deploy-docker.sh
sudo bash /tmp/cleanup-and-deploy-docker.sh
```

---

## 🔧 What the Deployment Script Does

### Phase 1: Cleanup (No Backup)
1. Stops all PM2 processes
2. Removes old application files
3. Cleans Nginx configurations
4. Removes old PM2 installation
5. Stops existing PostgreSQL service

### Phase 2: Docker Installation
1. Updates system packages
2. Installs Docker CE
3. Installs Docker Compose
4. Adds user to docker group

### Phase 3: Application Deployment
1. Clones repository from GitHub
2. Generates secure credentials
3. Creates environment configuration
4. Builds Docker images
5. Starts all containers
6. Runs database migrations
7. Seeds initial data

### Phase 4: Production Setup
1. Generates SSL certificate (Let's Encrypt)
2. Configures Nginx reverse proxy
3. Sets up UFW firewall
4. Configures auto-renewal for SSL
5. Enables auto-start on boot
6. Runs health checks

---

## 📊 Deployment Architecture

```
Internet (Port 443)
    ↓
Nginx Container (SSL Termination + Reverse Proxy)
    ↓
    ├─→ Frontend Container (Port 3000)
    │   └─→ React App (Production Build)
    │
    └─→ Backend Container (Port 5000)
        └─→ Node.js API
            ↓
        PostgreSQL Container (Port 5432)
            └─→ Database: skyraksys_hrm
```

---

## 🔐 Security Features

- ✅ **SSL/TLS:** Let's Encrypt certificate (auto-renewal)
- ✅ **Firewall:** UFW with SSH (22), HTTP (80), HTTPS (443)
- ✅ **Secrets:** Auto-generated JWT secrets (64 chars)
- ✅ **Database:** Password-protected, not exposed externally
- ✅ **Rate Limiting:** API (10 req/s), Auth (5 req/s)
- ✅ **Headers:** XSS, CSRF, HSTS, Content-Type protection
- ✅ **Containers:** Non-root users, isolated networks

---

## 📦 What Gets Deployed

### Docker Containers
1. **postgres** - PostgreSQL 15 Alpine (Database)
2. **backend** - Node.js 18 API (Port 5000)
3. **frontend** - React + Nginx (Port 3000)
4. **nginx** - Reverse Proxy (Ports 80, 443)
5. **pgadmin** - Database UI (Port 8081) - *Optional*

### Persistent Data
- Database: Docker volume `postgres_data`
- Uploads: `/home/Rakesh/skyraksys_hrm/backend/uploads`
- Logs: `/home/Rakesh/skyraksys_hrm/backend/logs`

---

## ✨ After Deployment

### Access Your Application
- **URL:** https://skyait.skyraksys.com
- **Admin Email:** admin@skyraksys.com
- **Admin Password:** admin123
- **⚠️ CHANGE PASSWORD IMMEDIATELY!**

### Credentials Location
All generated credentials are saved to:
```
/home/Rakesh/.deployment-credentials.txt
```

This includes:
- Database password
- pgAdmin password  
- JWT secrets

---

## 🛠️ Post-Deployment Management

### View Logs
```bash
ssh Rakesh@46.225.73.94
cd /home/Rakesh/skyraksys_hrm
docker-compose logs -f
```

### Restart Application
```bash
docker-compose restart
```

### Update Code
```bash
git pull origin skyraksys_hrm
docker-compose up -d --build
docker-compose exec backend npm run db:migrate
```

### Database Backup
```bash
docker-compose exec postgres pg_dump -U hrm_admin skyraksys_hrm > backup_$(date +%Y%m%d).sql
```

---

## 📖 Full Documentation

- **Quick Start:** [DEPLOY_QUICK_START.md](DEPLOY_QUICK_START.md)
- **Complete Guide:** [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)
- **Original PM2 Guide:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) *(deprecated)*

---

## 🎯 Next Steps

1. **Deploy:** Run the PowerShell script
2. **Verify:** Check https://skyait.skyraksys.com
3. **Login:** Use admin credentials
4. **Change Password:** Update admin password immediately
5. **Test:** Verify all features work
6. **Monitor:** Check container health with `docker-compose ps`

---

## ⚠️ Important Notes

### This Will Be Deleted (No Backup)
- ❌ Existing PM2 deployment
- ❌ Old application files in `/var/www/skyraksys_hrm`
- ❌ Existing Nginx configurations
- ❌ PM2 system installation
- ❌ Existing PostgreSQL data (if using system PostgreSQL)

### Fresh Installation
- ✅ New Docker-based deployment
- ✅ Fresh database (with seeder data)
- ✅ New credentials (auto-generated)
- ✅ SSL certificate (Let's Encrypt)
- ✅ Production-optimized configuration

---

## 🆘 Support & Troubleshooting

### Common Issues

**Problem:** Deployment script fails  
**Solution:** Check logs, ensure server has internet access, verify credentials

**Problem:** Cannot access application  
**Solution:** Check firewall (`sudo ufw status`), verify containers running (`docker-compose ps`)

**Problem:** SSL certificate fails  
**Solution:** Verify DNS points to server, check Let's Encrypt rate limits

### Get Help
1. Check deployment logs
2. Review [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)
3. SSH into server and check container status
4. View application logs with `docker-compose logs -f`

---

## ✅ Pre-Deployment Checklist

- [ ] PuTTY installed (for Windows deployment)
- [ ] SSH access to server verified
- [ ] DNS points to server IP (46.225.73.94)
- [ ] Server has internet access
- [ ] Server has at least 2GB RAM
- [ ] Server has at least 10GB free disk space
- [ ] Backup any critical data from existing deployment *(optional)*
- [ ] Ready to change admin password after deployment

---

**Status:** ✅ **READY TO DEPLOY**  
**Date:** February 17, 2026  
**Version:** 2.0.0 (Docker-based)  
**Author:** SkyrakSys Development Team
