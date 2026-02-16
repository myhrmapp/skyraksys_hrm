import paramiko, time

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Check if build is running
stdin, stdout, stderr = ssh.exec_command("ps aux | grep 'react-scripts' | grep -v grep | wc -l", timeout=10)
count = stdout.read().decode().strip()
print(f"react-scripts processes: {count}")

if count != "0":
    print("Build still running, waiting...")
    time.sleep(60)

# Read the build log  
print("\n=== Last 30 lines of /tmp/build.log ===")
stdin, stdout, stderr = ssh.exec_command("tail -30 /tmp/build.log 2>&1", timeout=10)
print(stdout.read().decode())

# Check build output
print("=== Build directory ===")
stdin, stdout, stderr = ssh.exec_command("ls -la /var/www/skyraksys_hrm/frontend/build/ 2>&1 && echo --- && du -sh /var/www/skyraksys_hrm/frontend/build/ 2>&1", timeout=10)
print(stdout.read().decode())

# Check if index.html exists
stdin, stdout, stderr = ssh.exec_command("test -f /var/www/skyraksys_hrm/frontend/build/index.html && echo 'INDEX.HTML EXISTS' || echo 'NO INDEX.HTML'", timeout=10)
print(stdout.read().decode().strip())

ssh.close()
