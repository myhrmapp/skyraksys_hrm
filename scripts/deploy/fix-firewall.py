import paramiko
import sys
import time

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

password = "t]%eCt!49!0>"

print("Opening port 3030 in firewall...\n")

# 1. Check current UFW status
stdin, stdout, stderr = ssh.exec_command("ufw status numbered 2>&1 | grep -E '(80|3030|ALLOW)'", timeout=10)
before = stdout.read().decode().strip()
print("Current firewall rules:")
for line in before.split('\n')[:10]:
    print(f"   {line}")
print()

# 2. Add port 3030 using echo password
cmd = f"echo '{password}' | sudo -S ufw allow 3030/tcp"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
time.sleep(2)
result = stdout.read().decode().strip()
err = stderr.read().decode().strip()

print("Adding port 3030:")
if result:
    for line in result.split('\n'):
        if 'sudo' not in line.lower() and 'password' not in line.lower():
            print(f"   {line}")
if err and 'sudo' not in err.lower():
    print(f"   Error: {err}")
print()

# 3. Verify it was added
stdin, stdout, stderr = ssh.exec_command("ufw status | grep 3030", timeout=10)
verify = stdout.read().decode().strip()
print("Verification:")
if verify:
    print(f"   {verify}")
    print("\nOK - Port 3030 is now open!")
else:
    print("   Port 3030 not found in rules")
print()

# 4. Test external access
print("Testing external access...")
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w 'HTTP %{http_code}' http://46.225.73.94:3030/ 2>&1", timeout=10)
test = stdout.read().decode().strip()
print(f"   http://46.225.73.94:3030/ -> {test}")

ssh.close()

print("\n" + "="*60)
print("Access your app at: http://46.225.73.94:3030")
print("="*60)
