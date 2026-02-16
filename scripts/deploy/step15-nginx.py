import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

def sudo(cmd, timeout=30):
    full = f"echo 't]%eCt!49!0>' | sudo -S bash -c \"{cmd}\""
    stdin, stdout, stderr = ssh.exec_command(full, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    return out, err, code

# Nginx config for SkyRakSys HRM
nginx_config = """
upstream backend {
    server 127.0.0.1:5000;
}

# Rate limiting zone
limit_req_zone \\$binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone \\$binary_remote_addr zone=login:10m rate=5r/m;

server {
    listen 80;
    server_name skyait.skyraksys.com 46.225.73.94;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Upload size limit
    client_max_body_size 10M;

    # Frontend - React static files
    location / {
        root /var/www/skyraksys_hrm/frontend/build;
        index index.html;
        try_files \\$uri \\$uri/ /index.html;

        # Cache static assets
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\\$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # API - Proxy to Node.js backend
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_cache_bypass \\$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Login rate limiting
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }

    # Swagger / API docs
    location /api-docs {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }

    # Uploads directory
    location /uploads/ {
        alias /var/www/skyraksys_hrm/uploads/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # Deny hidden files
    location ~ /\\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    access_log /var/log/nginx/skyraksys_hrm_access.log;
    error_log /var/log/nginx/skyraksys_hrm_error.log;
}
"""

# Write nginx config to temp file on server
sftp = ssh.open_sftp()
with sftp.file('/tmp/skyraksys_hrm.conf', 'w') as f:
    f.write(nginx_config)
sftp.close()
print("✅ Nginx config uploaded to /tmp/skyraksys_hrm.conf")

# Move to nginx sites
out, err, code = sudo("cp /tmp/skyraksys_hrm.conf /etc/nginx/sites-available/skyraksys_hrm")
print(f"Copy to sites-available: exit {code}")

# Enable site (create symlink)
out, err, code = sudo("ln -sf /etc/nginx/sites-available/skyraksys_hrm /etc/nginx/sites-enabled/skyraksys_hrm")
print(f"Enable site: exit {code}")

# Remove default site if it conflicts
out, err, code = sudo("rm -f /etc/nginx/sites-enabled/default")
print(f"Remove default site: exit {code}")

# Test nginx config
print("\n=== Testing Nginx Config ===")
out, err, code = sudo("nginx -t 2>&1")
print(out.strip() if out.strip() else err.strip())
print(f"Exit: {code}")

if code == 0:
    # Reload nginx
    print("\n=== Reloading Nginx ===")
    out, err, code = sudo("systemctl reload nginx 2>&1")
    print(f"Reload: exit {code}")
    
    # Verify
    print("\n=== Verification ===")
    import time
    time.sleep(2)
    
    # Check nginx status
    stdin, stdout, stderr = ssh.exec_command("systemctl is-active nginx", timeout=10)
    print(f"Nginx: {stdout.read().decode().strip()}")
    
    # Test frontend (get HTTP code)
    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost/", timeout=10)
    print(f"Frontend HTTP: {stdout.read().decode().strip()}")
    
    # Test API through nginx
    stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost/api/health", timeout=10)
    print(f"API Health: {stdout.read().decode().strip()}")
    
    # Test from external IP
    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://46.225.73.94/", timeout=10)
    print(f"External HTTP: {stdout.read().decode().strip()}")
else:
    print("❌ Nginx config test failed! Not reloading.")

ssh.close()
print("\n✅ Step 15 Complete")
