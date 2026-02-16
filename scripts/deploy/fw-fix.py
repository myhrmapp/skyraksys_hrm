import paramiko
import time

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

password = "t]%eCt!49!0>"

# Use echo to pipe password to sudo
cmd = f"echo '{password}' | sudo -S ufw allow 3030/tcp 2>&1"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
time.sleep(3)

output = stdout.read().decode('utf-8', errors='ignore')
error = stderr.read().decode('utf-8', errors='ignore')

print("=== UFW ALLOW 3030 OUTPUT ===")
print(output)
if error:
    print("STDERR:", error)
print()

# Verify
stdin, stdout, stderr = ssh.exec_command("sudo ufw status | grep 3030", timeout=10)
time.sleep(2)
verify = stdout.read().decode('utf-8', errors='ignore')

print("=== VERIFICATION ===")
if verify:
    print(verify)
    print("SUCCESS: Port 3030 is open")
else:
    print("WARNING: Port 3030 not found")
print()

# Test access
stdin, stdout, stderr = ssh.exec_command("curl -s -I http://46.225.73.94:3030/ 2>&1 | head -5", timeout=10)
test = stdout.read().decode('utf-8', errors='ignore')
print("=== EXTERNAL ACCESS TEST ===")
print(test)

ssh.close()
