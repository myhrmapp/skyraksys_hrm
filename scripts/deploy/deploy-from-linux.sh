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
            docker-compose down -v 2>/dev/null || true
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
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        sudo usermod -aG docker $USER
        echo "Docker installed successfully"
    else
        echo "Docker already installed"
    fi
    
    # Install Docker Compose if not installed
    if ! command -v docker-compose &> /dev/null; then
        echo "Installing Docker Compose..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        echo "Docker Compose installed successfully"
    else
        echo "Docker Compose already installed"
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
        echo "Creating .env file from template..."
        cp .env.production .env
        
        # Generate secure secrets
        JWT_SECRET=$(openssl rand -base64 48)
        JWT_REFRESH_SECRET=$(openssl rand -base64 48)
        DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
        
        # Update .env with generated secrets
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" .env
        sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|g" .env
        sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|g" .env
        
        echo "Environment configuration created with secure secrets"
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
    
    # Build and start containers
    docker-compose up -d ${BUILD_FLAG}
    
    # Wait for database to be ready
    echo "Waiting for database to be ready..."
    sleep 15
    
    # Run database migrations
    echo "Running database migrations..."
    docker-compose exec -T backend npm run db:migrate
    
    # Run database seeder (only for fresh installations)
    if [ ! -f ".seeded" ]; then
        echo "Running database seeder..."
        docker-compose exec -T backend npm run db:seed
        touch .seeded
    fi
    
    echo "Docker deployment completed"
ENDSSH
log_success "Docker containers deployed and running"

# Step 6: Setup SSL with Let's Encrypt
log_info "Setting up SSL certificate..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    
    # Install certbot if not installed
    if ! command -v certbot &> /dev/null; then
        sudo apt-get install -y certbot
    fi
    
    # Stop nginx temporarily
    cd ~/skyraksys_hrm
    docker-compose stop nginx
    
    # Generate certificate (if not exists)
    if [ ! -f "/etc/letsencrypt/live/skyait.skyraksys.com/fullchain.pem" ]; then
        echo "Generating SSL certificate..."
        sudo certbot certonly --standalone \
            -d skyait.skyraksys.com \
            -d www.skyait.skyraksys.com \
            --non-interactive \
            --agree-tos \
            --email admin@skyraksys.com
        
        # Copy certificates to nginx directory
        sudo mkdir -p ~/skyraksys_hrm/nginx/ssl
        sudo cp /etc/letsencrypt/live/skyait.skyraksys.com/fullchain.pem ~/skyraksys_hrm/nginx/ssl/
        sudo cp /etc/letsencrypt/live/skyait.skyraksys.com/privkey.pem ~/skyraksys_hrm/nginx/ssl/
        sudo chown -R \${USER}:\${USER} ~/skyraksys_hrm/nginx/ssl
    else
        echo "SSL certificate already exists"
    fi
    
    # Restart nginx
    docker-compose start nginx
ENDSSH
log_success "SSL certificate configured"

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
    
    # Allow PostgreSQL (only from localhost)
    sudo ufw allow from 127.0.0.1 to any port 5432
    
    echo "Firewall configured"
ENDSSH
log_success "Firewall configured"

# Step 8: Setup auto-renewal for SSL
log_info "Setting up SSL auto-renewal..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    
    # Add cron job for certificate renewal
    (crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 0 1 * * sudo certbot renew --quiet && cd ~/skyraksys_hrm && docker-compose restart nginx") | crontab -
    
    echo "SSL auto-renewal configured"
ENDSSH
log_success "SSL auto-renewal configured"

# Step 9: Verify deployment
log_info "Verifying deployment..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    cd ~/skyraksys_hrm
    
    # Check container status
    echo "Container Status:"
    docker-compose ps
    
    # Check application health
    echo ""
    echo "Application Health:"
    sleep 5
    curl -f http://localhost:5000/health || echo "Backend health check failed"
    curl -f http://localhost:3000/health || echo "Frontend health check failed"
ENDSSH

# Final output
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Deployment Completed Successfully!              ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
log_info "Application URL: https://skyait.skyraksys.com"
log_info "API Health: https://skyait.skyraksys.com/api/health"
log_info "pgAdmin: http://skyait.skyraksys.com:8081 (if enabled)"
echo ""
log_warning "Default Credentials:"
log_warning "  Admin Email: admin@skyraksys.com"
log_warning "  Admin Password: admin123"
log_warning "  ⚠️  CHANGE THESE IMMEDIATELY AFTER FIRST LOGIN!"
echo ""
log_info "Useful commands:"
log_info "  View logs: ssh ${SERVER_USER}@${SERVER_IP} 'cd ~/skyraksys_hrm && docker-compose logs -f'"
log_info "  Restart: ssh ${SERVER_USER}@${SERVER_IP} 'cd ~/skyraksys_hrm && docker-compose restart'"
log_info "  Stop: ssh ${SERVER_USER}@${SERVER_IP} 'cd ~/skyraksys_hrm && docker-compose stop'"
echo ""
