import paramiko
import os
import sys

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)
sftp = ssh.open_sftp()

# Upload fixed files
base = r"d:\skyraksys_hrm1\skyraksys_hrm_app\frontend\src"
remote_base = "/var/www/skyraksys_hrm/frontend/src"

files = [
    ("components/features/admin/ProjectTaskConfiguration.js",),
    ("components/features/employees/hooks/useEmployeeForm.js",),
]

for (rel,) in files:
    local = os.path.join(base, rel)
    remote = f"{remote_base}/{rel}"
    print(f"Uploading {rel}...")
    sftp.put(local, remote)
    print(f"  ✅ Done")

sftp.close()

# Clean and rebuild
print("\n=== Cleaning old build and rebuilding ===")
cmd = """cd /var/www/skyraksys_hrm/frontend && \
rm -rf build && \
export NODE_OPTIONS="--max-old-space-size=4096" && \
export CI=true && \
npx react-scripts build > /tmp/build.log 2>&1; \
echo "EXIT_CODE=$?" >> /tmp/build.log"""

stdin, stdout, stderr = ssh.exec_command(cmd, timeout=600)
exit_status = stdout.channel.recv_exit_status()
print(f"Build exit status: {exit_status}")

# Read the log
stdin, stdout, stderr = ssh.exec_command("cat /tmp/build.log", timeout=30)
log = stdout.read().decode()
print(log)

# Verify build output
if exit_status == 0:
    stdin, stdout, stderr = ssh.exec_command("ls -la /var/www/skyraksys_hrm/frontend/build/ && du -sh /var/www/skyraksys_hrm/frontend/build/", timeout=30)
    print("\n=== Build Output ===")
    print(stdout.read().decode())

ssh.close()
