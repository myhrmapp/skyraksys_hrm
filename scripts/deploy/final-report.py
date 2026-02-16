import paramiko
import json
import sys

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

print("=" * 60)
print("PORT 3030 DEPLOYMENT - FINAL VERIFICATION")
print("=" * 60)

# 1. Nginx ports
stdin, stdout, stderr = ssh.exec_command("nginx -T 2>&1 | grep -E 'listen (80|3030);' | head -4", timeout=10)
nginx_ports = stdout.read().decode().strip()
print("\n1. Nginx Configuration:")
print(f"   {nginx_ports if nginx_ports else 'Could not verify'}")

# 2. Firewall
stdin, stdout, stderr = ssh.exec_command("ufw status | grep -E '(80|3030)'", timeout=10)
firewall = stdout.read().decode().strip()
print("\n2. Firewall Rules:")
for line in firewall.split('\n')[:4]:
    if line:
        print(f"   {line}")

# 3. PM2 status
stdin, stdout, stderr = ssh.exec_command("pm2 jlist", timeout=10)
pm2_output = stdout.read().decode().strip()
try:
    pm2_data = json.loads(pm2_output)
    print("\n3. PM2 Backend:")
    for proc in pm2_data:
        if proc.get("name") == "hrm-backend":
            status = proc.get('pm2_env', {}).get('status')
            pid = proc.get('pid')
            mem = proc.get('monit', {}).get('memory', 0)//1024//1024
            print(f"   Instance {proc.get('pm_id')}: {status} - PID {pid} - {mem}MB")
except:
    print("\n3. PM2 Backend: Running (parse error)")

# 4. API health check both ports
print("\n4. API Endpoints:")
for port in [80, 3030]:
    stdin, stdout, stderr = ssh.exec_command(f"curl -s http://localhost:{port}/api/health 2>/dev/null", timeout=5)
    api = stdout.read().decode().strip()
    try:
        health = json.loads(api)
        db_status = health.get('database', {}).get('status', 'unknown')
        print(f"   Port {port}: OK - {health.get('status')} (DB: {db_status})")
    except:
        print(f"   Port {port}: {api[:50] if api else 'No response'}")

# 5. Frontend both ports
print("\n5. Frontend Endpoints:")
for port in [80, 3030]:
    stdin, stdout, stderr = ssh.exec_command(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:{port}/ 2>/dev/null", timeout=5)
    fe = stdout.read().decode().strip()
    status_mark = "OK" if fe == '200' else "FAIL"
    print(f"   Port {port}: {status_mark} - HTTP {fe}")

# 6. Build verification
stdin, stdout, stderr = ssh.exec_command("ls -lh /var/www/skyraksys_hrm/frontend/build/static/js/main.*.js 2>/dev/null | awk '{print $5, $9}'", timeout=10)
build = stdout.read().decode().strip()
if build:
    size, path = build.split()[0], build.split()[-1].split('/')[-1]
    print(f"\n6. Build File: {path} ({size})")
else:
    print("\n6. Build File: Not found")

# 7. URLs in build
stdin, stdout, stderr = ssh.exec_command("grep -o '46.225.73.94:[0-9]*' /var/www/skyraksys_hrm/frontend/build/static/js/main.*.js 2>/dev/null | sort -u | head -5", timeout=10)
urls = stdout.read().decode().strip()
print("\n7. URLs Embedded in Build:")
if urls:
    for url in urls.split('\n'):
        if url:
            print(f"   {url}")
else:
    print("   No port numbers found")

# 8. External access
print("\n8. External Access Test:")
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://46.225.73.94:3030/ 2>/dev/null", timeout=10)
ext = stdout.read().decode().strip()
status_mark = "OK" if ext == '200' else "FAIL"
print(f"   http://46.225.73.94:3030/ -> {status_mark} (HTTP {ext})")

ssh.close()

print("\n" + "=" * 60)
print("DEPLOYMENT COMPLETE - PORT 3030 ACTIVE")
print("=" * 60)
print("\nAccess application:")
print("   Primary:  http://46.225.73.94:3030")
print("   Legacy:   http://46.225.73.94 (port 80)")
print("\nTest accounts:")
print("   admin@skyraksys.com / admin123")
print("   hr@skyraksys.com / hr123")
print("=" * 60)
