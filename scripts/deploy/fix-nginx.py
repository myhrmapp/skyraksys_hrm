import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

def sudo(cmd, timeout=30):
    full = f"echo 't]%eCt!49!0>' | sudo -S bash -c \"{cmd}\""
    stdin, stdout, stderr = ssh.exec_command(full, timeout=timeout)
    return stdout.read().decode(), stderr.read().decode(), stdout.channel.recv_exit_status()

# Write correct nginx config ($ not \$)
nginx_config = r"""upstream backend {
    server 127.0.0.1:5000;
}

limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

server {
    listen 80;
    server_name skyait.skyraksys.com 46.225.73.94;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    client_max_body_size 10M;

    # Frontend - React static files
    location / {
        root /var/www/skyraksys_hrm/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Login rate limiting
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Swagger docs
    location /api-docs {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads
    location /uploads/ {
        alias /var/www/skyraksys_hrm/uploads/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # Deny hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    access_log /var/log/nginx/skyraksys_hrm_access.log;
    error_log /var/log/nginx/skyraksys_hrm_error.log;
}
"""

# Upload via SFTP to avoid shell escaping
sftp = ssh.open_sftp()
with sftp.file('/tmp/skyraksys_hrm.conf', 'w') as f:
    f.write(nginx_config)
sftp.close()
print("✅ Config uploaded")

# Copy and reload
out, err, code = sudo("cp /tmp/skyraksys_hrm.conf /etc/nginx/sites-available/skyraksys_hrm")
print(f"Copy: exit {code}")

# Test
out, err, code = sudo("nginx -t 2>&1")
result = out.strip() if out.strip() else err.strip()
print(f"Test: {result}")

if code == 0:
    out, err, code = sudo("systemctl reload nginx 2>&1")
    print(f"Reload: exit {code}")
    
    import time
    time.sleep(1)
    
    # Test
    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost/", timeout=10)
    print(f"Frontend HTTP: {stdout.read().decode().strip()}")
    
    stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost/api/health", timeout=10)
    print(f"API: {stdout.read().decode().strip()}")
    
    stdin, stdout, stderr = ssh.exec_command("curl -s http://46.225.73.94/ -o /dev/null -w '%{http_code}'", timeout=10)
    print(f"External: {stdout.read().decode().strip()}")
else:
    print("❌ Config test failed!")

ssh.close()
