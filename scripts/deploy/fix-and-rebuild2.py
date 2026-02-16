import paramiko
import os

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)
sftp = ssh.open_sftp()

# Upload fixed file
local = r"d:\skyraksys_hrm1\skyraksys_hrm_app\frontend\src\components\features\admin\ProjectTaskConfiguration.js"
remote = "/var/www/skyraksys_hrm/frontend/src/components/features/admin/ProjectTaskConfiguration.js"
print("Uploading ProjectTaskConfiguration.js...")
sftp.put(local, remote)
print("✅ Uploaded")
sftp.close()

# Start background build
print("Starting build in background...")
cmd = """cd /var/www/skyraksys_hrm/frontend && \
rm -rf build && \
export NODE_OPTIONS="--max-old-space-size=4096" && \
export CI=true && \
nohup npx react-scripts build > /tmp/build.log 2>&1 &
echo "PID=$!"
"""
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
print(stdout.read().decode().strip())
print("Build started. Check with check-build-status.py")

ssh.close()
