import paramiko
import time

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Check if build is still running
stdin, stdout, stderr = ssh.exec_command("ps aux | grep 'react-scripts' | grep -v grep", timeout=10)
procs = stdout.read().decode().strip()
if procs:
    print("Build is still running...")
    print(procs)
else:
    print("No react-scripts process found.")

# Read build log
print("\n=== /tmp/build.log ===")
stdin, stdout, stderr = ssh.exec_command("cat /tmp/build.log 2>&1", timeout=10)
log = stdout.read().decode()
print(log if log else "(log file not found or empty)")

# Check build output
print("\n=== Build output directory ===")
stdin, stdout, stderr = ssh.exec_command("ls -la /var/www/skyraksys_hrm/frontend/build/ 2>&1 && echo '---' && du -sh /var/www/skyraksys_hrm/frontend/build/ 2>&1", timeout=10)
print(stdout.read().decode().strip())

ssh.close()
