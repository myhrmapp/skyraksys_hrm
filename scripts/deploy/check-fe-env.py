import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Check current frontend .env.production on server
print("=== Frontend .env.production on server ===")
stdin, stdout, stderr = ssh.exec_command("cat /var/www/skyraksys_hrm/frontend/.env.production", timeout=10)
print(stdout.read().decode())

# Check what the built app is using
print("\n=== Checking built asset-manifest.json ===")
stdin, stdout, stderr = ssh.exec_command("cat /var/www/skyraksys_hrm/frontend/build/asset-manifest.json", timeout=10)
print(stdout.read().decode()[:300])

ssh.close()
