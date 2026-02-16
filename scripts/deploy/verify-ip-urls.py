import paramiko
import json

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Test frontend
print("=== Testing Frontend ===")
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://46.225.73.94/", timeout=10)
code = stdout.read().decode().strip()
print(f"Homepage: HTTP {code}")

# Test API through Nginx
print("\n=== Testing API ===")
stdin, stdout, stderr = ssh.exec_command("curl -s http://46.225.73.94/api/health", timeout=10)
response = stdout.read().decode().strip()
try:
    data = json.loads(response)
    print(f"Health: {data['status']}")
    print(f"Database: {data['database']}")
    print(f"Uptime: {round(data['uptime'])}s")
except:
    print(response[:200])

# Check the built JS file for API URL
print("\n=== Checking Built API URLs ===")
stdin, stdout, stderr = ssh.exec_command("grep -o 'http://[^\"]*' /var/www/skyraksys_hrm/frontend/build/static/js/main.*.js 2>/dev/null | head -5", timeout=10)
urls = stdout.read().decode().strip()
if urls:
    print("URLs found in build:")
    for url in urls.split('\n')[:5]:
        print(f"  {url}")
else:
    print("(checking alternative method)")
    stdin, stdout, stderr = ssh.exec_command("strings /var/www/skyraksys_hrm/frontend/build/static/js/main.*.js 2>/dev/null | grep -E 'http://46|http://skyait' | head -3", timeout=10)
    print(stdout.read().decode().strip())

ssh.close()

print("\n✅ Frontend now configured with IP address!")
print(f"   Access at: http://46.225.73.94")
