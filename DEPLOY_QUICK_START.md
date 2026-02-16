# 🚀 Quick Start - Docker Deployment

## One-Click Deployment (Recommended)

### From Windows:
```powershell
.\scripts\deploy\deploy-docker-from-windows.ps1
```

**Requirements:** PuTTY installed ([Download](https://www.putty.org/))

---

## What This Does

1. ✅ Cleans existing PM2/Node.js deployment
2. ✅ Installs Docker & Docker Compose
3. ✅ Deploys with Docker containers
4. ✅ Sets up SSL certificate (Let's Encrypt)
5. ✅ Configures firewall
6. ✅ Runs database migrations & seeder
7. ✅ Sets up auto-start on boot

**Duration:** 10-15 minutes

---

## After Deployment

**Application URL:** https://skyait.skyraksys.com

**Default Login:**
- Email: `admin@skyraksys.com`
- Password: `admin123`
- ⚠️ **CHANGE IMMEDIATELY!**

**Credentials:** Saved in `~/.deployment-credentials.txt` on server

---

## Useful Commands (Run on Server)

```bash
cd /home/Rakesh/skyraksys_hrm

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Update code
git pull && docker-compose up -d --build
```

---

📖 **Full Documentation:** [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)
