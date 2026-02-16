import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Check build
stdin, stdout, stderr = ssh.exec_command("test -f /var/www/skyraksys_hrm/frontend/build/index.html && echo DONE || echo BUILDING", timeout=10)
build_status = stdout.read().decode().strip()
print(f"Build: {build_status}")

# Check port 3030 API
stdin, stdout, stderr = ssh.exec_command("curl -s http://46.225.73.94:3030/api/health", timeout=10)
api = stdout.read().decode().strip()
print(f"API 3030: {api[:60]}...")

# Check port 3030 frontend
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://46.225.73.94:3030/", timeout=10)
fe = stdout.read().decode().strip()
print(f"Frontend 3030: HTTP {fe}")

# Check if URLs in build have :3030
if build_status == "DONE":
    stdin, stdout, stderr = ssh.exec_command("strings /var/www/skyraksys_hrm/frontend/build/static/js/main.*.js 2>/dev/null | grep -E '46.225.73.94:3030' | head -1", timeout=10)
    url = stdout.read().decode().strip()
    if url:
        print(f"✅ Build contains: {url}")
    else:
        print("⚠️  Build may not have :3030 yet")

ssh.close()
