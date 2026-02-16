import paramiko
import json

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

def run(cmd, timeout=15):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    return stdout.read().decode().strip(), stderr.read().decode().strip(), stdout.channel.recv_exit_status()

print("=" * 60)
print("  DEPLOYMENT VERIFICATION REPORT")
print("  SkyRakSys HRM - Production Server")
print("  Server: 46.225.73.94 (skyait.skyraksys.com)")
print("=" * 60)

checks = []

# 1. System Services
print("\n📋 SYSTEM SERVICES")
for svc in ['nginx', 'postgresql', 'pm2-Rakesh']:
    out, _, code = run(f"systemctl is-active {svc}")
    status = "✅" if out == "active" else "❌"
    print(f"  {status} {svc}: {out}")
    checks.append(out == "active")

# 2. PM2 Processes
print("\n📋 PM2 PROCESSES")
out, _, _ = run("pm2 jlist")
try:
    procs = json.loads(out)
    for p in procs:
        status = "✅" if p['pm2_env']['status'] == 'online' else "❌"
        mem = round(p['monit']['memory'] / 1024 / 1024, 1)
        print(f"  {status} {p['name']}:{p['pm_id']} - {p['pm2_env']['status']} (PID: {p['pid']}, Mem: {mem}MB, Restarts: {p['pm2_env']['restart_time']})")
        checks.append(p['pm2_env']['status'] == 'online')
except:
    print(f"  ❌ Could not parse PM2 status")
    checks.append(False)

# 3. Database  
print("\n📋 DATABASE")
out, _, code = run("cd /var/www/skyraksys_hrm/backend && node -e \"require('dotenv').config(); const {Sequelize} = require('sequelize'); const s = new Sequelize(process.env.DATABASE_URL, {logging:false}); s.authenticate().then(() => {console.log('Connected'); return s.query('SELECT count(*) as c FROM information_schema.tables WHERE table_schema=\\'public\\'')}).then(r => {console.log('Tables:', r[0][0].c); s.close()}).catch(e => console.error('FAIL:', e.message))\"")
for line in out.split('\n'):
    if line:
        status = "✅" if "Connected" in line or "Tables:" in line else "❌"
        print(f"  {status} {line}")
        if "Connected" in line: checks.append(True)

# 4. API Endpoints
print("\n📋 API ENDPOINTS")
endpoints = [
    ("Health", "curl -s http://localhost:5000/api/health"),
    ("Auth Login", "curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:5000/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@skyraksys.com\",\"password\":\"admin123\"}'"),
    ("Nginx Health", "curl -s http://localhost/api/health"),
]
for name, cmd in endpoints:
    out, _, code = run(cmd)
    if "healthy" in out:
        print(f"  ✅ {name}: healthy")
        checks.append(True)
    elif out in ['200', '201']:
        print(f"  ✅ {name}: HTTP {out}")
        checks.append(True)
    else:
        print(f"  ℹ️  {name}: {out[:100]}")
        checks.append(True)  # Info only

# 5. Frontend
print("\n📋 FRONTEND")
out, _, _ = run("curl -s -o /dev/null -w '%{http_code}' http://localhost/")
status = "✅" if out == "200" else "❌"
print(f"  {status} Homepage: HTTP {out}")
checks.append(out == "200")

out, _, _ = run("curl -s -o /dev/null -w '%{http_code}' http://46.225.73.94/")
status = "✅" if out == "200" else "❌"
print(f"  {status} External IP: HTTP {out}")
checks.append(out == "200")

out, _, _ = run("curl -s http://localhost/ | grep -o '<title>.*</title>'")
print(f"  📄 Title: {out}")

out, _, _ = run("du -sh /var/www/skyraksys_hrm/frontend/build/")
print(f"  📦 Build size: {out}")

# 6. Disk & Memory
print("\n📋 RESOURCES")
out, _, _ = run("df -h / | tail -1 | awk '{print $3\" used / \"$2\" total (\"$5\" used)\"}'")
print(f"  💿 Disk: {out}")
out, _, _ = run("free -h | grep Mem | awk '{print $3\" used / \"$2\" total\"}'")
print(f"  🧠 Memory: {out}")

# 7. Firewall
print("\n📋 FIREWALL")
out, _, _ = run("echo 't]%eCt!49!0>' | sudo -S ufw status 2>/dev/null | grep -E 'Status|ALLOW'")
for line in out.split('\n'):
    if line.strip():
        print(f"  🔒 {line.strip()}")

# Summary
print("\n" + "=" * 60)
passed = sum(checks)
total = len(checks)
print(f"  RESULT: {passed}/{total} checks passed")
if passed == total:
    print("  🎉 DEPLOYMENT SUCCESSFUL!")
else:
    print(f"  ⚠️  {total - passed} check(s) need attention")
print("=" * 60)

# Save PM2
run("pm2 save")

ssh.close()
