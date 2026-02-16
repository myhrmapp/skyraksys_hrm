import paramiko
import secrets
import time

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Generate a 64-char hex encryption key (32 bytes)
encryption_key = secrets.token_hex(32)
print(f"Generated ENCRYPTION_KEY: {encryption_key[:8]}...{encryption_key[-8:]}")

# Check if ENCRYPTION_KEY already exists in .env
stdin, stdout, stderr = ssh.exec_command("grep ENCRYPTION_KEY /var/www/skyraksys_hrm/backend/.env", timeout=10)
existing = stdout.read().decode().strip()
if existing:
    print(f"ENCRYPTION_KEY already in .env: {existing[:20]}...")
else:
    # Add ENCRYPTION_KEY to .env
    cmd = f"echo '\n# Encryption key for AES-256-GCM (32 bytes hex)\nENCRYPTION_KEY={encryption_key}' >> /var/www/skyraksys_hrm/backend/.env"
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    stdout.channel.recv_exit_status()
    print("✅ ENCRYPTION_KEY added to .env")

# Verify
stdin, stdout, stderr = ssh.exec_command("grep ENCRYPTION_KEY /var/www/skyraksys_hrm/backend/.env", timeout=10)
print(f"Verify: {stdout.read().decode().strip()[:40]}...")

# Restart PM2
print("\n=== Restarting PM2 ===")
stdin, stdout, stderr = ssh.exec_command("cd /var/www/skyraksys_hrm && pm2 delete all 2>/dev/null; pm2 start ecosystem.config.js --env production 2>&1", timeout=30)
print(stdout.read().decode().strip()[-500:])

time.sleep(5)

# Check status
print("\n=== PM2 Status ===")
stdin, stdout, stderr = ssh.exec_command("pm2 status", timeout=10)
print(stdout.read().decode().strip())

# Check logs
print("\n=== Logs ===")
stdin, stdout, stderr = ssh.exec_command("pm2 logs --nostream --lines 10 2>&1", timeout=10)
print(stdout.read().decode().strip())

# Health check
print("\n=== Health Check ===")
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:5000/api/health 2>&1", timeout=10)
print(stdout.read().decode().strip())

ssh.close()
