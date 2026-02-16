#!/bin/bash
# ==============================================================================
# SkyRakSys HRM — Step 4: Nginx Configuration
# Run as: root
# ==============================================================================
set -e

DOMAIN="skyait.skyraksys.com"
SERVER_IP="46.225.73.94"

echo "=========================================="
echo "  SkyRakSys HRM — Nginx Setup"
echo "=========================================="

# --- Create Nginx site config ---
echo "[1/4] Creating Nginx configuration..."
cat > /etc/nginx/sites-available/skyraksys-hrm <<'NGINX_CONF'
# SkyRakSys HRM — Nginx Reverse Proxy
# Domain: skyait.skyraksys.com

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

# Upstream backend (PM2 cluster on port 5000)
upstream hrm_backend {
    server 127.0.0.1:5000;
    keepalive 64;
}

# HTTP → HTTPS redirect (enable after SSL cert is installed)
# server {
#     listen 80;
#     server_name skyait.skyraksys.com 46.225.73.94;
#     return 301 https://$host$request_uri;
# }

# Main server block (HTTP — switch to 443 after SSL)
server {
    listen 80;
    server_name skyait.skyraksys.com 46.225.73.94;

    # --- SSL (uncomment after certbot) ---
    # listen 443 ssl http2;
    # ssl_certificate /etc/letsencrypt/live/skyait.skyraksys.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/skyait.skyraksys.com/privkey.pem;
    # ssl_protocols TLSv1.2 TLSv1.3;
    # ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    # ssl_prefer_server_ciphers off;
    # ssl_session_cache shared:SSL:10m;
    # ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;  # Enable after SSL

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_min_length 256;

    # Client body size (for file uploads)
    client_max_body_size 10M;

    # --- Frontend (React static files) ---
    root /var/www/skyraksys_hrm/frontend/build;
    index index.html;

    # React SPA — all non-API routes served by index.html
    location / {
        try_files $uri $uri/ /index.html;

        # Cache static assets aggressively
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # --- API Proxy to Node.js backend ---
    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://hrm_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }

    # Stricter rate limit for auth endpoints
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;

        proxy_pass http://hrm_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- Uploads (proxied through backend auth) ---
    location /uploads/ {
        proxy_pass http://hrm_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- Health check (no rate limit) ---
    location /api/health {
        proxy_pass http://hrm_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # --- Status monitor (restrict access) ---
    location /status {
        # allow 46.225.73.94;   # server itself
        # deny all;             # uncomment to restrict
        proxy_pass http://hrm_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Block dotfiles
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Custom error pages
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }

    access_log /var/log/nginx/skyraksys_hrm_access.log;
    error_log /var/log/nginx/skyraksys_hrm_error.log;
}
NGINX_CONF

# --- Enable site ---
echo "[2/4] Enabling site..."
ln -sf /etc/nginx/sites-available/skyraksys-hrm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# --- Test config ---
echo "[3/4] Testing Nginx configuration..."
nginx -t

# --- Reload ---
echo "[4/4] Reloading Nginx..."
systemctl reload nginx

echo ""
echo "=========================================="
echo "  Nginx configured!"
echo "  Site: http://${DOMAIN}"
echo "  IP:   http://${SERVER_IP}"
echo ""
echo "  For SSL, run:"
echo "  apt install certbot python3-certbot-nginx -y"
echo "  certbot --nginx -d ${DOMAIN}"
echo "=========================================="
