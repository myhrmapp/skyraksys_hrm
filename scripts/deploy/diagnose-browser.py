import paramiko
import json

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

print("Checking browser access issues...\n")

# 1. Check if nginx is actually serving the frontend
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:3030/ | head -20", timeout=10)
html = stdout.read().decode().strip()
print("1. HTML Content (first 20 lines):")
print(html)
print("\n" + "="*60 + "\n")

# 2. Check nginx error logs
stdin, stdout, stderr = ssh.exec_command("tail -30 /var/log/nginx/error.log 2>/dev/null | grep -v 'could not be resolved'", timeout=10)
errors = stdout.read().decode().strip()
if errors:
    print("2. Recent Nginx Errors:")
    print(errors)
else:
    print("2. Nginx Errors: None")
print("\n" + "="*60 + "\n")

# 3. Check if port 3030 is listening externally
stdin, stdout, stderr = ssh.exec_command("netstat -tlnp 2>/dev/null | grep ':3030'", timeout=10)
port = stdout.read().decode().strip()
print("3. Port 3030 Listening:")
print(port if port else "Not found")
print("\n" + "="*60 + "\n")

# 4. Test external connectivity with full headers
stdin, stdout, stderr = ssh.exec_command("curl -I http://46.225.73.94:3030/ 2>&1", timeout=10)
headers = stdout.read().decode().strip()
print("4. External HTTP Headers:")
print(headers)
print("\n" + "="*60 + "\n")

# 5. Check UFW status for port 3030
stdin, stdout, stderr = ssh.exec_command("ufw status verbose | grep -A2 -B2 3030", timeout=10)
fw = stdout.read().decode().strip()
print("5. Firewall Status for 3030:")
print(fw if fw else "Not found in firewall rules")

ssh.close()
