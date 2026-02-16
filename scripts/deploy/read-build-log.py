import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Read the build log from the previous build
print("=== Build Log ===")
stdin, stdout, stderr = ssh.exec_command("cat /tmp/build.log 2>&1", timeout=30)
out = stdout.read().decode()
print(out if out else "(empty)")

# Also check dmesg for OOM kill
print("\n=== OOM Kill Check ===")
stdin, stdout, stderr = ssh.exec_command("dmesg | grep -i 'out of memory\\|oom\\|killed process' | tail -5 2>&1", timeout=30)
out = stdout.read().decode()
print(out if out else "No OOM kills found")

# Check if the build process crashed
print("\n=== Recent node crashes ===")
stdin, stdout, stderr = ssh.exec_command("ls -la /var/www/skyraksys_hrm/frontend/npm-debug.log 2>&1", timeout=30)
out = stdout.read().decode()
print(out.strip())

ssh.close()
