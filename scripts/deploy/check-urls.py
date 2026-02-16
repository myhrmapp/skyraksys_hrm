import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Find the main JS file
stdin, stdout, stderr = ssh.exec_command("ls -1 /var/www/skyraksys_hrm/frontend/build/static/js/main.*.js 2>/dev/null | head -1", timeout=10)
js_file = stdout.read().decode().strip()
print(f"JS file: {js_file}")

if js_file:
    # Check for :3030
    stdin, stdout, stderr = ssh.exec_command(f"grep -o '46.225.73.94:3030' {js_file} | head -5", timeout=10)
    urls = stdout.read().decode().strip()
    if urls:
        print(f"✅ Found :3030 URLs in build:\n{urls}")
    else:
        print("❌ No :3030 URLs found")
        # Check if it still has :80
        stdin, stdout, stderr = ssh.exec_command(f"grep -o '46.225.73.94:80' {js_file} | head -3", timeout=10)
        old_urls = stdout.read().decode().strip()
        if old_urls:
            print(f"⚠️  Still has :80 URLs:\n{old_urls}")
        else:
            # Check for no port
            stdin, stdout, stderr = ssh.exec_command(f"grep -o '46.225.73.94' {js_file} | head -3", timeout=10)
            plain = stdout.read().decode().strip()
            if plain:
                print(f"⚠️  Has plain URLs (no port):\n{plain}")

ssh.close()
