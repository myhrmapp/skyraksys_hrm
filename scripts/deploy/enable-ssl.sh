#!/bin/bash
# ==============================================================================
# SkyrakSys HRM — Enable Real SSL (Run Once After DNS Is Ready)
#
# PURPOSE:
#   Replaces the self-signed certificate (used during initial deploy) with a
#   real Let's Encrypt certificate. Run this ONCE after your DNS A record for
#   skyait.skyraksys.com has been pointed to 46.225.73.94 AND propagated.
#
# PREREQUISITE:
#   1. DNS A record: skyait.skyraksys.com → 46.225.73.94
#   2. DNS has propagated — verify first:
#        nslookup skyait.skyraksys.com      # must return 46.225.73.94
#        dig +short skyait.skyraksys.com    # same check
#   3. The app must already be running (docker compose ps shows all Up)
#
# USAGE (run ON the server as the Rakesh user):
#   ssh Rakesh@46.225.73.94
#   cd skyraksys_hrm
#   bash scripts/deploy/enable-ssl.sh
#
# WHAT IT DOES:
#   1. Verifies DNS points to this server (exits if not ready)
#   2. Installs certbot if missing
#   3. Stops nginx (frees port 80 for certbot --standalone)
#   4. Requests a real Let's Encrypt cert for skyait.skyraksys.com + www.*
#   5. Copies certs to nginx/ssl/ (where Docker nginx mounts them)
#   6. Restarts nginx with the real cert
#   7. Sets up monthly auto-renewal cron (handles cert expiry automatically)
#
# AFTER THIS SCRIPT:
#   - https://skyait.skyraksys.com  → works, no browser warning
#   - http://skyait.skyraksys.com   → still works (no forced redirect by default)
#   - Cert auto-renews on the 1st of each month at midnight
# ==============================================================================

set -e

DOMAIN="skyait.skyraksys.com"
APP_DIR="/home/Rakesh/skyraksys_hrm"
EMAIL="admin@skyraksys.com"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   SkyrakSys HRM — Enable Real SSL Certificate            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$APP_DIR"

# ── Step 1: Verify DNS is pointing here ──────────────────────────────────────
log_info "Checking DNS..."

# Get this server's public IP
SERVER_IP=$(curl -sk --max-time 5 https://ifconfig.me 2>/dev/null \
    || curl -sk --max-time 5 https://api.ipify.org 2>/dev/null \
    || hostname -I | awk '{print $1}')

# Get what DNS says the domain resolves to
DNS_IP=$(dig +short "$DOMAIN" 2>/dev/null | grep -E '^[0-9]+\.' | tail -1 || true)

if [ -z "$DNS_IP" ]; then
    log_error "DNS lookup for $DOMAIN returned nothing."
    log_error "  Either DNS is not set up or has not propagated yet."
    log_error "  Point the A record to: $SERVER_IP  then wait and retry."
    exit 1
fi

if [ "$DNS_IP" != "$SERVER_IP" ]; then
    log_error "DNS not ready:"
    log_error "  $DOMAIN resolves to: $DNS_IP"
    log_error "  This server's IP:    $SERVER_IP"
    log_error "  Update your DNS A record → $SERVER_IP and wait for propagation."
    log_error "  Check propagation: dig +short $DOMAIN"
    exit 1
fi

log_success "DNS OK: $DOMAIN → $DNS_IP"

# ── Step 2: Install certbot ───────────────────────────────────────────────────
log_info "Checking certbot..."
if ! command -v certbot &> /dev/null; then
    log_info "Installing certbot..."
    sudo apt-get update -qq
    sudo apt-get install -y certbot
fi
log_success "certbot ready ($(certbot --version 2>&1 | head -1))"

# ── Step 3: Stop nginx to free port 80 ───────────────────────────────────────
log_info "Stopping nginx (port 80 must be free for certbot)..."
docker compose stop nginx
log_success "Nginx stopped"

# ── Step 4: Request real certificate ─────────────────────────────────────────
log_info "Requesting Let's Encrypt certificate for $DOMAIN and www.$DOMAIN ..."
sudo certbot certonly --standalone \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL"

log_success "Certificate issued"

# ── Step 5: Copy certs into Docker-mounted directory ─────────────────────────
log_info "Installing certificate into nginx/ssl/ ..."
sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem nginx/ssl/fullchain.pem
sudo cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem  nginx/ssl/privkey.pem
sudo chown -R Rakesh:Rakesh nginx/ssl
log_success "Certificate files copied to nginx/ssl/"

# ── Step 6: Start nginx with real cert ───────────────────────────────────────
log_info "Starting nginx with real SSL certificate..."
docker compose start nginx
sleep 5

if docker compose ps nginx | grep -q "Up"; then
    log_success "Nginx started"
else
    log_error "Nginx failed to start — check: docker compose logs nginx"
    exit 1
fi

# Quick HTTPS check
if curl -fsk --max-time 10 "https://$DOMAIN/health" &>/dev/null; then
    log_success "HTTPS health check passed ✓"
else
    log_warning "HTTPS health check did not respond — check: docker compose logs nginx"
fi

# ── Step 7: Setup monthly auto-renewal cron ───────────────────────────────────
log_info "Setting up monthly SSL auto-renewal cron..."

# Logic:
#   - certbot --standalone needs port 80 free → stop nginx first
#   - after renewal, copy fresh certs to nginx/ssl/ → nginx serves the new cert
#   - semicolons (not &&) ensure nginx always starts back up even if certbot skips renewal
(crontab -l 2>/dev/null | grep -v "certbot renew"; \
 echo "0 0 1 * * cd ${APP_DIR} && docker compose stop nginx && sudo certbot renew --quiet; sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ${APP_DIR}/nginx/ssl/ 2>/dev/null; sudo cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem ${APP_DIR}/nginx/ssl/ 2>/dev/null; docker compose start nginx") \
 | crontab -

log_success "Auto-renewal cron set (runs on the 1st of each month at midnight)"
log_info "Verify with: crontab -l"

# ── Final summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Real SSL Enabled Successfully!                 ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
log_success "https://$DOMAIN   — real cert, no browser warning"
log_info    "http://$DOMAIN    — still works (HTTP not forced to HTTPS)"
log_info    ""
log_info    "To enforce HTTPS redirect later, edit nginx/conf.d/default.conf:"
log_info    "  In the HTTP server block, replace all location blocks with:"
log_info    "    return 301 https://skyait.skyraksys.com\$request_uri;"
log_info    "  Then: docker compose restart nginx"
echo ""
