import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

def sudo(cmd, timeout=30):
    full = f"echo 't]%eCt!49!0>' | sudo -S bash -c \"{cmd}\""
    stdin, stdout, stderr = ssh.exec_command(full, timeout=timeout)
    return stdout.read().decode().strip(), stderr.read().decode().strip(), stdout.channel.recv_exit_status()

# Update nginx to listen on 3030
nginx_config = r"""upstream backend {
    server 127.0.0.1:5000;
}

limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

server {
    listen 80;
    listen 3030;
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

    root /var/www/skyraksys_hrm/frontend/build;
    index index.html;

    location /static/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

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

    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api-docs {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /var/www/skyraksys_hrm/uploads/;
        expires 7d;
        add_header Cache-Control "public";
    }

    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    access_log /var/log/nginx/skyraksys_hrm_access.log;
    error_log /var/log/nginx/skyraksys_hrm_error.log;
}
"""

print("Updating nginx config to listen on port 3030...")
sftp = ssh.open_sftp()
with sftp.file('/tmp/skyraksys_hrm.conf', 'w') as f:
    f.write(nginx_config)
sftp.close()

sudo("cp /tmp/skyraksys_hrm.conf /etc/nginx/sites-available/skyraksys_hrm")
out, err, code = sudo("nginx -t 2>&1")
print(f"Nginx test: {out}")

if code == 0:
    sudo("systemctl restart nginx 2>&1")
    print("✅ Nginx restarted on ports 80 and 3030")
    
    # Open firewall port 3030
    print("\nOpening firewall port 3030...")
    sudo("ufw allow 3030/tcp")
    print("✅ Firewall rule added")
    
    import time
    time.sleep(2)
    
    # Test
    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:3030/", timeout=10)
    print(f"\nPort 3030 test: HTTP {stdout.read().decode().strip()}")
else:
    print("❌ Nginx config error")

# Upload updated frontend .env
print("\nUploading frontend .env with port 3030...")
sftp = ssh.open_sftp()
sftp.put(r"d:\skyraksys_hrm1\skyraksys_hrm_app\frontend\.env.production", 
         "/var/www/skyraksys_hrm/frontend/.env.production")
sftp.close()
print("✅ Uploaded")

# Start rebuild
print("\nStarting frontend rebuild...")
cmd = """cd /var/www/skyraksys_hrm/frontend && \
rm -rf build && \
export NODE_OPTIONS="--max-old-space-size=4096" && \
export CI=true && \
nohup npx react-scripts build > /tmp/rebuild3030.log 2>&1 &
echo "Build PID: $!"
"""
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
print(stdout.read().decode().strip())

print("\n🚀 Configuration updated!")
print(f"   Access app at: http://46.225.73.94:3030")
print(f"   Wait 3 min for rebuild to complete")

ssh.close()
