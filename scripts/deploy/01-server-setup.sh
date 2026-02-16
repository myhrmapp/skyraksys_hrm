#!/bin/bash
# ==============================================================================
# SkyRakSys HRM — Step 1: Ubuntu 24.04 Server Setup
# Server: 46.225.73.94 (skyait.skyraksys.com)
# Run as: root
# ==============================================================================
set -e

echo "=========================================="
echo "  SkyRakSys HRM — Server Setup (Ubuntu)"
echo "=========================================="

# --- System Update ---
echo "[1/8] Updating system packages..."
apt update && apt upgrade -y

# --- Essential Tools ---
echo "[2/8] Installing essential tools..."
apt install -y curl wget git unzip build-essential software-properties-common \
  apt-transport-https ca-certificates gnupg lsb-release ufw fail2ban

# --- Node.js 22 LTS ---
echo "[3/8] Installing Node.js 22 LTS..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# --- PM2 (Process Manager) ---
echo "[4/8] Installing PM2..."
npm install -g pm2

# --- PostgreSQL 15 ---
echo "[5/8] Installing PostgreSQL 15..."
if ! command -v psql &> /dev/null; then
  sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
  apt update
  apt install -y postgresql-15 postgresql-contrib-15
fi
systemctl enable postgresql
systemctl start postgresql
echo "PostgreSQL version: $(psql --version)"

# --- Nginx ---
echo "[6/8] Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# --- Firewall (UFW) ---
echo "[7/8] Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'     # ports 80 + 443
# Do NOT expose port 5000 externally — Nginx proxies to it
ufw --force enable
ufw status

# --- Create deploy user ---
echo "[8/8] Creating deploy user..."
if ! id "deploy" &>/dev/null 2>&1; then
  useradd -m -s /bin/bash deploy
  echo "deploy:SkYrAk_Deploy_2026!" | chpasswd
  usermod -aG sudo deploy
  echo "Deploy user created."
else
  echo "Deploy user already exists."
fi

# Create app directory
mkdir -p /var/www/skyraksys_hrm
chown deploy:deploy /var/www/skyraksys_hrm

# Create uploads directory
mkdir -p /var/www/skyraksys_hrm/uploads
chown deploy:deploy /var/www/skyraksys_hrm/uploads

# Create logs directory
mkdir -p /var/www/skyraksys_hrm/logs
chown deploy:deploy /var/www/skyraksys_hrm/logs

echo ""
echo "=========================================="
echo "  Server setup complete!"
echo "  Next: Run 02-db-setup.sh"
echo "=========================================="
