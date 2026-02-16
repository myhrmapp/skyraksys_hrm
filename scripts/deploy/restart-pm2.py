import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)
sftp = ssh.open_sftp()

# Upload updated ecosystem.config.js
local = r"d:\skyraksys_hrm1\skyraksys_hrm_app\ecosystem.config.js"
remote = "/var/www/skyraksys_hrm/ecosystem.config.js"
print("Uploading ecosystem.config.js...")
sftp.put(local, remote)
sftp.close()
print("✅ Uploaded")

# Also verify backend .env has content
print("\n=== Checking backend/.env ===")
stdin, stdout, stderr = ssh.exec_command("wc -l /var/www/skyraksys_hrm/backend/.env && head -5 /var/www/skyraksys_hrm/backend/.env", timeout=10)
print(stdout.read().decode().strip())

# Restart PM2
print("\n=== Restarting PM2 ===")
stdin, stdout, stderr = ssh.exec_command("cd /var/www/skyraksys_hrm && pm2 delete all 2>/dev/null; pm2 start ecosystem.config.js --env production 2>&1", timeout=30)
print(stdout.read().decode().strip())

# Wait and check
import time
time.sleep(5)

print("\n=== PM2 Status ===")
stdin, stdout, stderr = ssh.exec_command("pm2 status", timeout=10)
print(stdout.read().decode().strip())

print("\n=== PM2 Logs (last 15) ===")
stdin, stdout, stderr = ssh.exec_command("pm2 logs --nostream --lines 15 2>&1", timeout=10)
print(stdout.read().decode().strip())

# Test health endpoint
print("\n=== Health Check ===")
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:5000/api/health 2>&1 || echo 'FAILED'", timeout=10)
print(stdout.read().decode().strip())

ssh.close()
