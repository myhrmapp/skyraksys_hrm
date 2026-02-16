import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Check build status
stdin, stdout, stderr = ssh.exec_command("ps aux | grep 'react-scripts' | grep -v grep | wc -l", timeout=10)
if stdout.read().decode().strip() != "0":
    print("⏳ Build still running...")
else:
    print("✅ Build complete")
    
    # Verify
    stdin, stdout, stderr = ssh.exec_command("strings /var/www/skyraksys_hrm/frontend/build/static/js/main.*.js 2>/dev/null | grep -E 'http://46.225.73.94' | head -3", timeout=10)
    print("\nURLs in build:")
    print(stdout.read().decode().strip())
    
    # Test
    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://46.225.73.94/", timeout=10)
    print(f"\nFrontend: HTTP {stdout.read().decode().strip()}")

ssh.close()
