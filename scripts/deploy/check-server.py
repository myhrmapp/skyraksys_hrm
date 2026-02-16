"""Check current server state after deployment attempt"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('46.225.73.94', username='Rakesh', password='t]%eCt!49!0>', allow_agent=False, look_for_keys=False)

commands = [
    "echo '=== SYSTEM ===' && uname -r && lsb_release -ds",
    "echo '=== NODE ===' && (which node && node -v) 2>/dev/null || echo 'NOT INSTALLED'",
    "echo '=== NPM ===' && (npm -v) 2>/dev/null || echo 'NOT INSTALLED'",
    "echo '=== PM2 ===' && (which pm2 && pm2 -v) 2>/dev/null || echo 'NOT INSTALLED'",
    "echo '=== POSTGRESQL ===' && (psql --version) 2>/dev/null || echo 'NOT INSTALLED'",
    "echo '=== NGINX ===' && (nginx -v) 2>&1 || echo 'NOT INSTALLED'",
    "echo '=== UFW ===' && (sudo ufw status 2>/dev/null) || echo 'NOT CONFIGURED'",
    "echo '=== APP DIR ===' && ls -la /var/www/skyraksys_hrm/ 2>/dev/null || echo 'NOT CREATED'",
    "echo '=== PM2 PROCESSES ===' && (pm2 list) 2>/dev/null || echo 'NO PROCESSES'",
    "echo '=== SERVICES ===' && systemctl is-active postgresql 2>/dev/null; systemctl is-active nginx 2>/dev/null",
]

for cmd in commands:
    _, stdout, stderr = c.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    print(out)

c.close()
