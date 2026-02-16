#!/bin/bash
# ==============================================================================
# SkyRakSys HRM — Step 5: SSL Certificate Setup
# Run as: root (after DNS is pointing to 46.225.73.94)
# ==============================================================================
set -e

DOMAIN="skyait.skyraksys.com"

echo "=========================================="
echo "  SkyRakSys HRM — SSL Setup"
echo "=========================================="

# --- Install Certbot ---
echo "[1/3] Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# --- Obtain SSL Certificate ---
echo "[2/3] Obtaining SSL certificate for ${DOMAIN}..."
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email admin@skyraksys.com --redirect

# --- Auto-renewal ---
echo "[3/3] Setting up auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Test renewal
certbot renew --dry-run

echo ""
echo "=========================================="
echo "  SSL configured!"
echo "  Site: https://${DOMAIN}"
echo ""
echo "  IMPORTANT: After SSL is active, update:"
echo "  1. backend/.env → CORS_ORIGIN & FRONTEND_URL to https://"
echo "  2. frontend/.env.production → REACT_APP_API_URL to https://"
echo "  3. Rebuild frontend: cd /var/www/skyraksys_hrm/frontend && npm run build"
echo "  4. Restart backend: pm2 restart skyraksys-hrm"
echo "=========================================="
