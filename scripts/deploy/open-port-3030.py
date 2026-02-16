import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

print("Opening port 3030 in firewall...\n")

# 1. Check current UFW status
stdin, stdout, stderr = ssh.exec_command("sudo ufw status numbered | grep -E '(22|80|443|3030)'", timeout=10)
before = stdout.read().decode().strip()
print("Current firewall rules:")
print(before)
print("\n" + "="*60 + "\n")

# 2. Add port 3030
stdin, stdout, stderr = ssh.exec_command("sudo ufw allow 3030/tcp", timeout=10)
result = stdout.read().decode().strip()
err = stderr.read().decode().strip()
print("Adding port 3030:")
print(result if result else err)
print("\n" + "="*60 + "\n")

# 3. Verify it was added
stdin, stdout, stderr = ssh.exec_command("sudo ufw status | grep 3030", timeout=10)
verify = stdout.read().decode().strip()
print("Verification:")
if verify:
    print(verify)
    print("\n✅ Port 3030 is now open!")
else:
    print("❌ Port 3030 not found in rules")
print("\n" + "="*60 + "\n")

# 4. Test external access
print("Testing external access...")
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w 'HTTP %{http_code}' http://46.225.73.94:3030/", timeout=10)
test = stdout.read().decode().strip()
print(f"http://46.225.73.94:3030/ -> {test}")

ssh.close()

print("\n" + "="*60)
print("🚀 Access your app at: http://46.225.73.94:3030")
print("="*60)
