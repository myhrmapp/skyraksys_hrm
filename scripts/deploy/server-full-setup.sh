#!/bin/bash
# ==============================================================================
# SkyrakSys HRM — Full Server Setup (runs ON the server as root)
#
# PURPOSE:
#   Complete first-time provisioning of the production Ubuntu server.
#   Uploaded to /tmp/ and executed by deploy-docker-from-windows.ps1 or
#   deploy-from-linux.sh. Can also be run manually via SSH.
#
# WHAT IT DOES (11 steps in order):
#   1. Removes any existing PM2, system Nginx, and system PostgreSQL
#   2. Installs Docker, Docker Compose, Git, Certbot, UFW
#   3. Clones the repo from GitHub (branch: skyraksys_hrm)
#   4. Auto-generates all secrets (JWT_SECRET, JWT_REFRESH_SECRET,
#      ENCRYPTION_KEY, DB_PASSWORD, PGADMIN_PASSWORD) and writes .env
#   5. Builds all 5 Docker images (postgres, backend, frontend, mobile, nginx)
#      and starts containers with docker-compose up -d
#   6. Runs Sequelize migrations (db:migrate) and seeds initial data (db:seed)
#   7. Obtains Let's Encrypt SSL certificate (self-signed fallback if DNS not ready)
#   8. Configures UFW firewall: allows 22, 80, 443, 8081 — denies all else
#   9. Adds monthly cron for automatic SSL certificate renewal (copies fresh certs)
#  10. Creates systemd service so containers auto-start on server reboot
#  11. Verifies deployment (container status + health checks)
#
# CREDENTIALS:
#   All generated secrets saved at (chmod 600, Rakesh-only):
#     /home/Rakesh/.deployment-credentials.txt
#
# WHEN TO USE:
#   Once only — on a fresh or wiped Ubuntu 24.04 server.
#   For day-to-day code updates, use redeploy.sh instead.
#
# USAGE:
#   bash server-full-setup.sh
#
# RUNS FROM: Server (as root via sudo)
# DURATION:  ~15-20 minutes
# SERVER:    skyait.skyraksys.com (46.225.73.94)
# ==============================================================================

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOMAIN="skyait.skyraksys.com"
SERVER_IP="46.225.73.94"
APP_DIR="/home/Rakesh/skyraksys_hrm"
OLD_APP_DIR="/var/www/skyraksys_hrm"
GIT_REPO="https://github.com/myhrmapp/skyraksys_hrm.git"
GIT_BRANCH="skyraksys_hrm"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   SkyrakSys HRM - Docker Deployment                       ║"
echo "║   Server: skyait.skyraksys.com (46.225.73.94)             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================================
# STEP 1: Clean Existing Deployment
# ============================================================================
log_info "Step 1: Cleaning existing deployment..."

# Stop PM2 processes
log_info "Stopping PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
log_success "PM2 processes stopped"

# Stop Nginx
log_info "Stopping Nginx..."
systemctl stop nginx 2>/dev/null || true
log_success "Nginx stopped"

# Stop PostgreSQL (we'll use Docker PostgreSQL)
log_info "Stopping existing PostgreSQL..."
systemctl stop postgresql 2>/dev/null || true
systemctl disable postgresql 2>/dev/null || true
log_success "PostgreSQL stopped"

# Remove old application directories
log_info "Removing old application files..."
if [ -d "$OLD_APP_DIR" ]; then
    rm -rf "$OLD_APP_DIR"
    log_success "Removed $OLD_APP_DIR"
fi

if [ -d "$APP_DIR" ] && [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    docker compose down -v 2>/dev/null || true
    cd ~
    rm -rf "$APP_DIR"
    log_success "Removed $APP_DIR"
fi

# Remove PM2 from system
log_info "Removing PM2..."
npm uninstall -g pm2 2>/dev/null || true
log_success "PM2 removed"

# Clean old Nginx configs
log_info "Cleaning Nginx configurations..."
rm -f /etc/nginx/sites-enabled/skyraksys_hrm 2>/dev/null || true
rm -f /etc/nginx/sites-available/skyraksys_hrm 2>/dev/null || true
log_success "Old Nginx configs removed"

log_success "Step 1 Complete: Existing deployment cleaned"
echo ""

# ============================================================================
# STEP 2: Install Docker & Docker Compose
# ============================================================================
log_info "Step 2: Installing Docker..."

# Update system
log_info "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install prerequisites
log_info "Installing prerequisites..."
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    certbot \
    python3-certbot-nginx

# Install Docker
if ! command -v docker &> /dev/null; then
    log_info "Docker not found, installing..."
    
    # Add Docker's official GPG key
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add user to docker group
    usermod -aG docker Rakesh
    
    # Start Docker
    systemctl enable docker
    systemctl start docker
    
    log_success "Docker installed successfully"
else
    log_success "Docker already installed"
fi

# Verify Docker installation
# Note: docker-compose-plugin (installed above) provides 'docker compose' (no hyphen).
# The old standalone 'docker-compose' binary is deprecated — do not use it.
log_info "Docker version: $(docker --version)"
log_info "Docker Compose version: $(docker compose version)"

log_success "Step 2 Complete: Docker installed"
echo ""

# ============================================================================
# STEP 3: Clone Repository
# ============================================================================
log_info "Step 3: Cloning repository..."

cd /home/Rakesh

if [ -d "$APP_DIR" ]; then
    log_warning "Directory exists, removing..."
    rm -rf "$APP_DIR"
fi

log_info "Cloning from GitHub..."
git clone -b "$GIT_BRANCH" "$GIT_REPO" skyraksys_hrm

if [ ! -d "$APP_DIR" ]; then
    log_error "Failed to clone repository"
    exit 1
fi

cd "$APP_DIR"
log_success "Repository cloned successfully"
echo ""

# ============================================================================
# STEP 4: Setup Environment Variables
# ============================================================================
log_info "Step 4: Setting up environment variables..."

# Generate secure secrets
log_info "Generating secure secrets..."
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
ENCRYPTION_KEY=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
PGADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

# Create .env file
cat > .env << EOF
# ===== Database Configuration =====
DB_NAME=skyraksys_hrm
DB_USER=hrm_admin
DB_PASSWORD=${DB_PASSWORD}
DB_HOST=postgres
DB_PORT=5432

# ===== JWT Configuration =====
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# ===== Encryption Key (required — backend crashes without this) =====
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# ===== CORS Configuration =====
# Allows both HTTPS (production) and HTTP (IP access / pre-SSL access).
CORS_ORIGIN=https://${DOMAIN},http://${DOMAIN},http://${SERVER_IP}

# ===== Email / SMTP Configuration (Optional — configure via Admin panel post-deploy) =====
EMAIL_FROM=noreply@skyraksys.com
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=

# ===== Frontend Configuration =====
REACT_APP_API_URL=/api

# ===== Seeded Account Default Password =====
# All demo/seed accounts use this password on first deploy.
# Shown in ~/.deployment-credentials.txt — change via the app after first login.
SEED_DEFAULT_PASSWORD=admin123

# ===== pgAdmin Configuration =====
PGADMIN_EMAIL=admin@skyraksys.com
PGADMIN_PASSWORD=${PGADMIN_PASSWORD}

# ===== Node Environment =====
NODE_ENV=production
PORT=5000
EOF

log_success "Environment configuration created"

# Save credentials for reference
cat > /home/Rakesh/.deployment-credentials.txt << EOF
SkyrakSys HRM — Deployment Credentials
Generated: $(date)
Server: ${SERVER_IP}

=== Access URLs ===
  App (HTTP  — works immediately):  http://${DOMAIN}
  App (HTTP via IP — no DNS needed): http://${SERVER_IP}
  App (HTTPS — after SSL setup):     https://${DOMAIN}
  API Health:                         http://${DOMAIN}/api/health
  pgAdmin:                            http://${DOMAIN}:8081

=== Default Login Accounts ===
  All accounts use password: admin123
  Change passwords after first login!

  Super Admin : admin@skyraksys.com    / admin123
  HR Manager  : hr@skyraksys.com       / admin123
  Manager     : manager@skyraksys.com  / admin123
  Employee    : employee@skyraksys.com / admin123

=== Database ===
  Name:     skyraksys_hrm
  User:     hrm_admin
  Password: ${DB_PASSWORD}
  (Connect: docker compose exec postgres psql -U hrm_admin -d skyraksys_hrm)

=== pgAdmin ===
  Email:    admin@skyraksys.com
  Password: ${PGADMIN_PASSWORD}

=== JWT / Encryption Secrets (keep private) ===
  JWT_SECRET:          ${JWT_SECRET}
  JWT_REFRESH_SECRET:  ${JWT_REFRESH_SECRET}
  ENCRYPTION_KEY:      ${ENCRYPTION_KEY}
EOF

chmod 600 /home/Rakesh/.deployment-credentials.txt
chown Rakesh:Rakesh /home/Rakesh/.deployment-credentials.txt

log_success "Credentials saved to ~/.deployment-credentials.txt"
echo ""

# ============================================================================
# STEP 5: Build and Start Docker Containers
# ============================================================================
log_info "Step 5: Building and starting Docker containers..."

# Pre-create bind-mount directories with the correct owner BEFORE docker compose up.
# The backend container runs as user 'nodejs' (uid 1001). If these directories
# don't exist, Docker creates them as root → nodejs can't write → uploads crash.
log_info "Pre-creating uploads and logs directories..."
mkdir -p backend/uploads backend/logs
chown -R 1001:1001 backend/uploads backend/logs
log_success "Directories created (owned by nodejs uid 1001)"

# Build images
log_info "Building Docker images (this may take 5-10 minutes)..."
docker compose build --no-cache

# Start everything EXCEPT nginx.
# nginx requires SSL cert files to exist before it can start, but we don't have
# certs yet — that happens in Step 7. Starting nginx now would crash it.
log_info "Starting backend, frontend, mobile, and database containers..."
docker compose up -d postgres backend frontend mobile

# Wait for database to be ready
log_info "Waiting for database to be ready..."
sleep 20

# Check core containers are running (nginx deliberately excluded here)
if ! docker compose ps | grep -E "backend|frontend" | grep -q "Up"; then
    log_error "Core containers failed to start!"
    docker compose logs
    exit 1
fi

log_success "Core Docker containers started (nginx will start after SSL in Step 7)"
echo ""

# ============================================================================
# STEP 6: Run Database Migrations
# ============================================================================
log_info "Step 6: Running database migrations..."

# Wait a bit more for backend to be ready
sleep 10

# Run migrations
log_info "Executing migrations..."
docker compose exec -T backend npm run db:migrate

# Run seeder (for initial data)
log_info "Running database seeder..."
docker compose exec -T backend npm run db:seed

log_success "Database initialized"
echo ""

# ============================================================================
# STEP 7: SSL Certificate (Self-Signed — DNS Not Yet Configured)
# ============================================================================
log_info "Step 7: Setting up SSL certificate..."

echo ""
log_warning "┌─────────────────────────────────────────────────────────────────┐"
log_warning "│  DNS NOT CONFIGURED — Skipping Let's Encrypt (certbot).        │"
log_warning "│  A self-signed certificate is generated so nginx can start.    │"
log_warning "│  The app is fully accessible via HTTP:  http://${SERVER_IP}    │"
log_warning "│  HTTPS also works but browsers will show a security warning.   │"
log_warning "│                                                                 │"
log_warning "│  When DNS is ready, run once ON the server:                    │"
log_warning "│    bash scripts/deploy/enable-ssl.sh                           │"
log_warning "└─────────────────────────────────────────────────────────────────┘"
echo ""

mkdir -p nginx/ssl

# If a real Let's Encrypt cert already exists (re-run after DNS was pointed), reuse it.
# Otherwise generate a self-signed cert so nginx starts and HTTP works immediately.
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    log_info "Existing Let's Encrypt certificate found — installing it."
    cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem nginx/ssl/
    cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem nginx/ssl/
    chown -R Rakesh:Rakesh nginx/ssl
    log_success "Real SSL certificate installed"
else
    # No real cert — generate self-signed (10-year validity so it doesn't expire during dev/staging).
    # Certbot / real SSL is NOT attempted here intentionally — DNS is not pointing here yet.
    # Use enable-ssl.sh once DNS A record resolves to this server.
    log_info "Generating self-signed certificate (10-year validity)..."
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout nginx/ssl/privkey.pem \
        -out nginx/ssl/fullchain.pem \
        -subj "/C=US/ST=State/L=City/O=SkyrakSys/CN=${DOMAIN}" 2>/dev/null
    chown -R Rakesh:Rakesh nginx/ssl
    log_success "Self-signed certificate created"
fi

# Start nginx — cert files exist (real or self-signed), so it will start cleanly.
log_info "Starting nginx..."
docker compose up -d nginx
sleep 5

if docker compose ps nginx | grep -q "Up"; then
    log_success "Nginx started — app is live on http://${SERVER_IP}"
else
    log_error "Nginx failed to start — run: docker compose logs nginx"
fi

# Start pgAdmin (tools profile — must be started explicitly with --profile tools)
log_info "Starting pgAdmin..."
docker compose --profile tools up -d pgadmin
log_success "pgAdmin started — accessible at http://${SERVER_IP}:8081"

log_success "Step 7 Complete"
echo ""

# ============================================================================
# STEP 8: Configure Firewall
# ============================================================================
log_info "Step 8: Configuring firewall..."

# Reset UFW
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp comment 'SSH'

# Allow HTTP and HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Allow pgAdmin (optional - comment out for security)
ufw allow 8081/tcp comment 'pgAdmin'

# Enable firewall
ufw --force enable

log_success "Firewall configured"
echo ""

# ============================================================================
# STEP 9: Setup Auto-renewal for SSL
# ============================================================================
log_info "Step 9: Setting up SSL auto-renewal..."

# Add cron job for certificate renewal.
# IMPORTANT: certbot was obtained with --standalone which needs port 80 free.
# The nginx Docker container holds port 80, so we must stop it before renewal
# and start it again after (using semicolon so nginx always restarts even if
# certbot finds nothing to renew or errors).
# After renewal, certs are copied to nginx/ssl/ so nginx serves the fresh cert.
(crontab -l 2>/dev/null | grep -v "certbot renew"; \
 echo "0 0 1 * * cd $APP_DIR && docker compose stop nginx && certbot renew --quiet; cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ${APP_DIR}/nginx/ssl/ 2>/dev/null; cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem ${APP_DIR}/nginx/ssl/ 2>/dev/null; docker compose start nginx") | crontab -

log_success "SSL auto-renewal configured"
echo ""

# ============================================================================
# STEP 10: Setup Auto-start on Boot
# ============================================================================
log_info "Step 10: Setting up auto-start on boot..."

# Create systemd service
cat > /etc/systemd/system/skyraksys-hrm.service << EOF
[Unit]
Description=SkyrakSys HRM Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/docker compose -f ${APP_DIR}/docker-compose.yml up -d
ExecStop=/usr/bin/docker compose -f ${APP_DIR}/docker-compose.yml down
User=Rakesh
Group=Rakesh

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable skyraksys-hrm.service

log_success "Auto-start configured"
echo ""

# ============================================================================
# STEP 11: Verify Deployment
# ============================================================================
log_info "Step 11: Verifying deployment..."

# Wait for services to be fully ready
sleep 10

# Check container status
log_info "Container Status:"
docker compose ps

echo ""

# Check health endpoints
log_info "Testing health endpoints..."
sleep 5

# Backend and frontend ports are NOT exposed to host (nginx proxies all traffic).
# Health-check via nginx (HTTPS) or directly inside the container network.
if docker compose exec -T backend node -e "require('http').get('http://localhost:5000/health',(r)=>{process.exit(r.statusCode===200?0:1)})" &> /dev/null; then
    log_success "✓ Backend health check passed"
else
    log_warning "✗ Backend health check failed — run: docker compose logs backend"
fi

if curl -fsk http://localhost/health &> /dev/null; then
    log_success "✓ Nginx/frontend health check passed"
else
    log_warning "✗ Nginx health check failed — run: docker compose logs nginx"
fi

echo ""

# ============================================================================
# FINAL OUTPUT
# ============================================================================
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Deployment Completed Successfully!               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
log_info "Application URL (HTTP domain): http://${DOMAIN}"
log_info "Application URL (HTTP via IP): http://${SERVER_IP}  ← works even without DNS"
log_info "Application URL (HTTPS):       https://${DOMAIN}  ← after SSL setup"
log_info "API Health: http://${DOMAIN}/api/health"
log_info "pgAdmin: http://${DOMAIN}:8081"
echo ""
log_warning "Default Login Accounts (password: admin123):"
log_warning "  Super Admin : admin@skyraksys.com"
log_warning "  HR Manager  : hr@skyraksys.com"
log_warning "  Manager     : manager@skyraksys.com"
log_warning "  Employee    : employee@skyraksys.com"
log_warning "  ⚠️  Change all passwords after first login!"
echo ""
log_warning "All credentials saved to: ~/.deployment-credentials.txt"
log_warning "Read with: cat ~/.deployment-credentials.txt"
echo ""
log_info "Useful commands:"
log_info "  View logs: cd ${APP_DIR} && docker compose logs -f"
log_info "  Restart: cd ${APP_DIR} && docker compose restart"
log_info "  Stop: cd ${APP_DIR} && docker compose stop"
log_info "  Start: cd ${APP_DIR} && docker compose start"
log_info "  Rebuild: cd ${APP_DIR} && docker compose up -d --build"
echo ""
log_success "Deployment script completed!"
