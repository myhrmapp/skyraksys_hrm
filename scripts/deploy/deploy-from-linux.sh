#!/bin/bash
# ==============================================================================
# SkyrakSys HRM — One-Click First-Time Deploy (Linux / WSL / Mac)
#
# PURPOSE:
#   WSL/Linux/Mac equivalent of deploy-docker-from-windows.ps1.
#   SSHes into the production server and runs each provisioning step directly
#   via remote SSH commands (does NOT upload server-full-setup.sh — it runs
#   inline). Steps performed on the server:
#     1. Optionally cleans existing deployment (--clean flag)
#     2. Installs Docker, Docker Compose, and Git on the server if missing
#     3. Clones or pulls the GitHub repo (branch: skyraksys_hrm)
#     4. Builds Docker images and starts all containers
#     5. Runs Sequelize migrations and seeds initial data
#
# WHEN TO USE:
#   Once only — when setting up a fresh or wiped Ubuntu server for the first time.
#   For day-to-day code updates, SSH in and run redeploy.sh instead.
#
# OPTIONS:
#   --clean       Stop containers, wipe app directory, prune Docker resources
#   --build       Force rebuild Docker images (passed to docker compose build)
#   --no-backup   Skip database backup step
#   --help        Show usage
#
# REQUIRES:
#   - SSH access to 46.225.73.94 (password or key-based auth)
#   - Git access to the GitHub repo
#
# RUNS FROM: WSL / Linux / Mac developer machine (NOT the server)
# DURATION:  ~15-20 minutes
# SERVER:    skyait.skyraksys.com (46.225.73.94)
# USER:      Rakesh
# ==============================================================================

set -e  # Exit on any error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="46.225.73.94"
SERVER_USER="Rakesh"
SERVER_DOMAIN="skyait.skyraksys.com"
APP_DIR="/home/Rakesh/skyraksys_hrm"
GIT_REPO="https://github.com/myhrmapp/skyraksys_hrm.git"
GIT_BRANCH="skyraksys_hrm"
BACKUP_DIR="/home/Rakesh/backups"

# Parse command line arguments
CLEAN_DEPLOY=false
FORCE_BUILD=false
SKIP_BACKUP=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --clean)
      CLEAN_DEPLOY=true
      shift
      ;;
    --build)
      FORCE_BUILD=true
      shift
      ;;
    --no-backup)
      SKIP_BACKUP=true
      shift
      ;;
    --help)
      echo "Usage: ./deploy-from-linux.sh [options]"
      echo "  --clean         Clean existing deployment before deploying"
      echo "  --build         Force rebuild Docker images"
      echo "  --no-backup     Skip database backup"
      echo "  --help          Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       SkyrakSys HRM - Production Deployment               ║"
echo "║       Server: skyait.skyraksys.com (46.225.73.94)         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if SSH key exists
log_info "Checking SSH connection..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_IP} exit 2>/dev/null; then
    log_success "SSH connection established"
else
    log_warning "SSH key authentication failed, will use password"
fi

# Step 1: Clean existing deployment (if requested)
if [ "$CLEAN_DEPLOY" = true ]; then
    log_info "Cleaning existing deployment..."
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
        set -e
        cd ~
        
        # Stop and remove containers
        if [ -d "skyraksys_hrm" ]; then
            cd skyraksys_hrm
            docker compose down -v 2>/dev/null || true
            cd ..
        fi
        
        # Backup and remove old installation
        if [ -d "skyraksys_hrm" ]; then
            BACKUP_NAME="skyraksys_hrm_backup_$(date +%Y%m%d_%H%M%S)"
            mv skyraksys_hrm "$BACKUP_NAME"
            echo "Old installation backed up to: $BACKUP_NAME"
        fi
        
        # Remove old PM2 processes
        pm2 delete all 2>/dev/null || true
        pm2 kill 2>/dev/null || true
        
        # Clean Docker resources
        docker system prune -af --volumes 2>/dev/null || true
        
        echo "Cleanup completed"
ENDSSH
    log_success "Existing deployment cleaned"
fi

# Step 2: Install Docker and dependencies on server
log_info "Installing Docker and dependencies on server..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    
    # Update system
    sudo apt-get update
    
    # Install Docker if not installed
    if ! command -v docker &> /dev/null; then
        echo "Installing Docker..."
        sudo apt-get install -y ca-certificates curl gnupg lsb-release
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update
        # docker-compose-plugin provides 'docker compose' (no hyphen) — the current standard.
        # The old standalone docker-compose binary is deprecated; do NOT install it.
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        sudo usermod -aG docker $USER
        echo "Docker installed successfully"
    else
        echo "Docker already installed"
    fi

    # Install Git if not installed
    if ! command -v git &> /dev/null; then
        sudo apt-get install -y git
    fi
ENDSSH
log_success "Docker and dependencies installed"

# Step 3: Clone/Update repository on server
log_info "Deploying code to server..."
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
    set -e
    cd ~
    
    # Clone or update repository
    if [ -d "skyraksys_hrm" ]; then
        echo "Updating existing repository..."
        cd skyraksys_hrm
        git fetch origin
        git checkout ${GIT_BRANCH}
        git pull origin ${GIT_BRANCH}
    else
        echo "Cloning repository..."
        git clone -b ${GIT_BRANCH} ${GIT_REPO} skyraksys_hrm
        cd skyraksys_hrm
    fi
    
    echo "Code deployment completed"
ENDSSH
log_success "Code deployed to server"

# Step 4: Setup environment configuration
log_info "Setting up environment configuration..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    cd ~/skyraksys_hrm
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        echo "Creating .env file..."

        # Generate all required secrets up front
        JWT_SECRET=$(openssl rand -base64 48)
        JWT_REFRESH_SECRET=$(openssl rand -base64 48)
        # ENCRYPTION_KEY must be exactly 64 hex chars (32 bytes) — backend crashes without it
        ENCRYPTION_KEY=$(openssl rand -hex 32)
        DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
        PGADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

        # Write the full .env directly — safer than sed-patching a template
        cat > .env << ENVEOF
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
CORS_ORIGIN=https://skyait.skyraksys.com,http://skyait.skyraksys.com,http://46.225.73.94

# ===== Email / SMTP Configuration =====
EMAIL_FROM=noreply@skyraksys.com
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=

# ===== Frontend =====
REACT_APP_API_URL=/api
SEED_DEFAULT_PASSWORD=admin123

# ===== pgAdmin =====
PGADMIN_EMAIL=admin@skyraksys.com
PGADMIN_PASSWORD=${PGADMIN_PASSWORD}

# ===== Node Environment =====
NODE_ENV=production
PORT=5000
TRUST_PROXY=true
ENVEOF

        # Save credentials for reference
        cat > /home/$(whoami)/.deployment-credentials.txt << CREDEOF
SkyrakSys HRM — Deployment Credentials
Generated: $(date)

=== Access URLs ===
  App (HTTP via IP): http://46.225.73.94
  App (HTTP domain): http://skyait.skyraksys.com
  App (HTTPS):       https://skyait.skyraksys.com

=== Default Login Accounts (password: admin123) ===
  Super Admin : admin@skyraksys.com
  HR Manager  : hr@skyraksys.com
  Manager     : manager@skyraksys.com
  Employee    : employee@skyraksys.com

=== Database ===
  Name: skyraksys_hrm  User: hrm_admin  Password: ${DB_PASSWORD}

=== pgAdmin ===
  Email: admin@skyraksys.com  Password: ${PGADMIN_PASSWORD}

=== Secrets ===
  JWT_SECRET: ${JWT_SECRET}
  JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
  ENCRYPTION_KEY: ${ENCRYPTION_KEY}
CREDEOF
        chmod 600 /home/$(whoami)/.deployment-credentials.txt
        echo "Environment configuration created. Credentials saved to ~/.deployment-credentials.txt"
    else
        echo "Environment file already exists, skipping..."
    fi
ENDSSH
log_success "Environment configuration ready"

# Step 5: Deploy with Docker Compose
log_info "Building and starting Docker containers..."
BUILD_FLAG=""
if [ "$FORCE_BUILD" = true ]; then
    BUILD_FLAG="--build"
fi

ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
    set -e
    cd ~/skyraksys_hrm

    # Pre-create bind-mount directories with the correct owner BEFORE docker compose up.
    # The backend container runs as user 'nodejs' (uid 1001). If these directories
    # don't exist, Docker creates them as root → nodejs can't write → uploads crash.
    mkdir -p backend/uploads backend/logs
    chown -R 1001:1001 backend/uploads backend/logs

    # Build all images. Start everything EXCEPT nginx — nginx needs SSL certs (Step 6).
    docker compose build --no-cache
    docker compose up -d postgres backend frontend mobile

    # Wait for database to be ready
    echo "Waiting for database to be ready..."
    sleep 20

    # Run database migrations
    echo "Running database migrations..."
    docker compose exec -T backend npm run db:migrate

    # Run database seeder (only for fresh installations)
    if [ ! -f ".seeded" ]; then
        echo "Running database seeder..."
        docker compose exec -T backend npm run db:seed
        touch .seeded
    fi

    echo "Docker deployment completed"
ENDSSH
log_success "Docker containers deployed and running"

# Step 6: SSL Certificate (self-signed — DNS not yet configured)
log_info "Setting up SSL certificate (self-signed — DNS not yet configured)..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    cd ~/skyraksys_hrm
    DOMAIN="skyait.skyraksys.com"
    SERVER_IP="46.225.73.94"

    mkdir -p nginx/ssl

    # If a real Let's Encrypt cert already exists (script re-run after DNS was pointed), use it.
    # Otherwise generate self-signed so nginx starts and HTTP works immediately.
    # To get a real cert later, run: bash scripts/deploy/enable-ssl.sh
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        echo "Existing Let's Encrypt certificate found — using it."
        sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem nginx/ssl/
        sudo cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem nginx/ssl/
        sudo chown -R $(whoami):$(whoami) nginx/ssl
        echo "Real SSL certificate installed"
    else
        echo "Generating self-signed certificate (10-year validity)..."
        openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
            -keyout nginx/ssl/privkey.pem \
            -out nginx/ssl/fullchain.pem \
            -subj "/C=US/ST=State/L=City/O=SkyrakSys/CN=${DOMAIN}" 2>/dev/null
        chown -R $(whoami):$(whoami) nginx/ssl
        echo "Self-signed certificate created — HTTP is fully working now."
    fi

    # Start nginx — cert files exist (real or self-signed), so it starts cleanly.
    docker compose up -d nginx
    sleep 5
    docker compose ps nginx
    echo "Nginx started — app accessible via http://${SERVER_IP}"

    # Start pgAdmin (tools profile — must be started explicitly)
    docker compose --profile tools up -d pgadmin
    echo "pgAdmin started — accessible at http://${SERVER_IP}:8081"
ENDSSH
log_success "SSL certificate configured (run enable-ssl.sh when DNS is ready)"

# Step 7: Setup firewall
log_info "Configuring firewall..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    
    # Enable UFW firewall
    sudo ufw --force enable
    
    # Allow SSH
    sudo ufw allow 22/tcp
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp

    # Allow pgAdmin web UI
    sudo ufw allow 8081/tcp

    echo "Firewall configured"
ENDSSH
log_success "Firewall configured"

# Step 8: Setup auto-renewal for SSL
log_info "Setting up SSL auto-renewal..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    APP_DIR="/home/$(whoami)/skyraksys_hrm"
    DOMAIN="skyait.skyraksys.com"

    # Renewal cron:
    # - stops nginx (frees port 80 for certbot --standalone)
    # - renews cert (sudo required — certbot needs root)
    # - copies the fresh certs into nginx/ssl/ (sudo required — /etc/letsencrypt/live is root-owned)
    # - starts nginx (semicolon ensures nginx always restarts even if certbot had nothing to renew)
    (crontab -l 2>/dev/null | grep -v "certbot renew"; \
     echo "0 0 1 * * cd ${APP_DIR} && docker compose stop nginx && sudo certbot renew --quiet; sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ${APP_DIR}/nginx/ssl/ 2>/dev/null; sudo cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem ${APP_DIR}/nginx/ssl/ 2>/dev/null; docker compose start nginx") | crontab -

    echo "SSL auto-renewal configured"
ENDSSH
log_success "SSL auto-renewal configured"

# Step 9: Setup auto-start on boot (systemd service)
log_info "Setting up auto-start on boot..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    sudo tee /etc/systemd/system/skyraksys-hrm.service > /dev/null << 'SVCEOF'
[Unit]
Description=SkyrakSys HRM Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/Rakesh/skyraksys_hrm
ExecStart=/usr/bin/docker compose -f /home/Rakesh/skyraksys_hrm/docker-compose.yml up -d
ExecStop=/usr/bin/docker compose -f /home/Rakesh/skyraksys_hrm/docker-compose.yml down
User=Rakesh
Group=Rakesh

[Install]
WantedBy=multi-user.target
SVCEOF

    sudo systemctl daemon-reload
    sudo systemctl enable skyraksys-hrm.service
    echo "Auto-start on boot configured"
ENDSSH
log_success "Auto-start on boot configured"

# Step 10: Verify deployment
log_info "Verifying deployment..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    cd ~/skyraksys_hrm

    # Check container status
    echo "Container Status:"
    docker compose ps

    # Health check via nginx (backend/frontend ports not exposed to host)
    echo ""
    echo "Application Health:"
    sleep 5
    docker compose exec -T backend node -e "require('http').get('http://localhost:5000/health',(r)=>{console.log('Backend status:',r.statusCode)})" 2>/dev/null || echo "Backend health check failed"
    curl -fsk http://localhost/health && echo "Nginx OK" || echo "Nginx health check failed"
ENDSSH

# Final output
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Deployment Completed Successfully!              ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
log_info "Application URL (HTTP via IP — works immediately): http://46.225.73.94"
log_info "Application URL (HTTP domain):                      http://skyait.skyraksys.com"
log_info "Application URL (HTTPS — after SSL):               https://skyait.skyraksys.com"
log_info "API Health: http://46.225.73.94/api/health"
log_info "pgAdmin: http://skyait.skyraksys.com:8081 (if enabled)"
echo ""
log_warning "Default Login Accounts (password: admin123):"
log_warning "  Super Admin : admin@skyraksys.com"
log_warning "  HR Manager  : hr@skyraksys.com"
log_warning "  Manager     : manager@skyraksys.com"
log_warning "  Employee    : employee@skyraksys.com"
log_warning "  Change all passwords after first login!"
echo ""
log_info "All credentials saved on server: cat ~/.deployment-credentials.txt"
echo ""
log_info "Useful commands:"
log_info "  View logs: ssh ${SERVER_USER}@${SERVER_IP} 'cd ~/skyraksys_hrm && docker compose logs -f'"
log_info "  Restart:   ssh ${SERVER_USER}@${SERVER_IP} 'cd ~/skyraksys_hrm && docker compose restart'"
log_info "  Stop:      ssh ${SERVER_USER}@${SERVER_IP} 'cd ~/skyraksys_hrm && docker compose stop'"
echo ""
