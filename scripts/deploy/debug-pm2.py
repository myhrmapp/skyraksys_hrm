import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

commands = [
    # Check where .env file is
    "find /var/www/skyraksys_hrm -name '.env' -type f 2>/dev/null",
    # Check dotenv config in server.js
    "head -30 /var/www/skyraksys_hrm/backend/server.js",
    # Check the actual error logs
    "cat /var/www/skyraksys_hrm/logs/error.log 2>/dev/null | tail -30",
    # Try running server.js manually to see the error
    "cd /var/www/skyraksys_hrm && timeout 5 node backend/server.js 2>&1 || true",
]

for cmd in commands:
    print(f"\n{'='*50}")
    print(f"$ {cmd.split('|')[0].strip()}")
    print('='*50)
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(out.strip())
    if err: print(f"STDERR: {err.strip()}")

ssh.close()
