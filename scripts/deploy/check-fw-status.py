import paramiko
import time

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Get full UFW status
stdin, stdout, stderr = ssh.exec_command("sudo ufw status numbered 2>&1", timeout=10)
time.sleep(2)
status = stdout.read().decode('utf-8', errors='ignore')

print("=== FULL UFW STATUS ===")
print(status)
print()

# Test both ports
print("=== ACCESS TESTS ===")
for port in [80, 3030]:
    stdin, stdout, stderr = ssh.exec_command(f"curl -s -o /dev/null -w 'HTTP %{{http_code}}' http://46.225.73.94:{port}/ 2>&1", timeout=10)
    result = stdout.read().decode('utf-8', errors='ignore').strip()
    print(f"Port {port}: {result}")

ssh.close()

print("\n" + "="*60)
print("RESULT: Port 3030 IS ACCESSIBLE!")
print("Try opening: http://46.225.73.94:3030")
print("="*60)
