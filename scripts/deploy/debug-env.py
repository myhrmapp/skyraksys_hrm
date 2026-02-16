import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Check full .env content
print("=== backend/.env content ===")
stdin, stdout, stderr = ssh.exec_command("cat /var/www/skyraksys_hrm/backend/.env", timeout=10)
print(stdout.read().decode())

# Check if dotenv is v17 (auto-inject behavior)
print("\n=== dotenv version ===")
stdin, stdout, stderr = ssh.exec_command("cd /var/www/skyraksys_hrm/backend && node -e \"console.log(require('dotenv/package.json').version)\"", timeout=10)
print(stdout.read().decode().strip())

# Try running directly from backend dir
print("\n=== Running from backend dir ===")
stdin, stdout, stderr = ssh.exec_command("cd /var/www/skyraksys_hrm/backend && timeout 5 node server.js 2>&1 || true", timeout=15)
out = stdout.read().decode()
print(out[:2000])

ssh.close()
