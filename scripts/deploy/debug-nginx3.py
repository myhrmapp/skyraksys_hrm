import paramiko
import time

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

def sudo(cmd, timeout=30):
    full = f"echo 't]%eCt!49!0>' | sudo -S bash -c \"{cmd}\""
    stdin, stdout, stderr = ssh.exec_command(full, timeout=timeout)
    return stdout.read().decode(), stderr.read().decode(), stdout.channel.recv_exit_status()

# Restart PM2
print("=== Restarting PM2 ===")
stdin, stdout, stderr = ssh.exec_command("cd /var/www/skyraksys_hrm && pm2 delete all 2>/dev/null; pm2 start ecosystem.config.js --env production 2>&1", timeout=30)
print(stdout.read().decode().strip()[-300:])

time.sleep(5)

# Check PM2 status
stdin, stdout, stderr = ssh.exec_command("pm2 status 2>&1", timeout=10)
status = stdout.read().decode()
print(f"\n=== PM2 Status ===\n{status.strip()}")

# Check API directly (bypass nginx)
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:5000/api/health", timeout=10)
print(f"\nDirect API: {stdout.read().decode().strip()}")

# Check API through nginx
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost/api/health", timeout=10)
print(f"Nginx API: {stdout.read().decode().strip()[:200]}")

# Check nginx error log
print("\n=== Nginx Error Log ===")
out, err, code = sudo("tail -10 /var/log/nginx/skyraksys_hrm_error.log 2>&1")
print(out.strip() if out.strip() else "(empty)")

# Check nginx main error log 
out, err, code = sudo("tail -10 /var/log/nginx/error.log 2>&1")
print(f"\nMain error log:\n{out.strip()}")

# Check frontend access
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost/", timeout=10)
print(f"\nFrontend HTTP: {stdout.read().decode().strip()}")

# Check if index.html can be served directly as a test  
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost/index.html", timeout=10)
print(f"index.html HTTP: {stdout.read().decode().strip()}")

ssh.close()
