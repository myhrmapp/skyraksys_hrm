import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Check if build is running
stdin, stdout, stderr = ssh.exec_command("ps aux | grep 'react-scripts' | grep -v grep | wc -l", timeout=10)
count = stdout.read().decode().strip()
if count != "0":
    print(f"⏳ Build still running ({count} processes)...")
else:
    print("✅ No build processes running")

# Read build log
print("\n=== Build Log (last 30 lines) ===")
stdin, stdout, stderr = ssh.exec_command("tail -30 /tmp/rebuild.log 2>&1", timeout=10)
log = stdout.read().decode()
print(log if log else "(log empty or not found)")

# Check build output
print("\n=== Build Output ===")
stdin, stdout, stderr = ssh.exec_command("ls -lh /var/www/skyraksys_hrm/frontend/build/index.html 2>&1 && du -sh /var/www/skyraksys_hrm/frontend/build/ 2>&1", timeout=10)
out = stdout.read().decode()
if "No such file" in out:
    print("❌ Build not complete yet")
else:
    print(out.strip())
    print("\n✅ Build complete!")

ssh.close()
