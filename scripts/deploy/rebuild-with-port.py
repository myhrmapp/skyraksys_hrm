import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)
sftp = ssh.open_sftp()

# Upload updated .env.production with explicit port
local = r"d:\skyraksys_hrm1\skyraksys_hrm_app\frontend\.env.production"
remote = "/var/www/skyraksys_hrm/frontend/.env.production"
print("Uploading .env.production with explicit port :80...")
sftp.put(local, remote)
sftp.close()
print("✅ Uploaded")

# Quick rebuild
print("\n=== Starting rebuild ===")
cmd = """cd /var/www/skyraksys_hrm/frontend && \
rm -rf build && \
export NODE_OPTIONS="--max-old-space-size=4096" && \
export CI=true && \
nohup npx react-scripts build > /tmp/rebuild2.log 2>&1 &
echo "Build PID: $!"
"""
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
print(stdout.read().decode().strip())

print("\nRebuilding with port :80 in URLs. Check in 3 min with:")
print("  python scripts/deploy/check-rebuild2.py")

ssh.close()
