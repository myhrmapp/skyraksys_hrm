import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

commands = [
    "ls -la /var/www/skyraksys_hrm/frontend/build/ 2>&1 | head -20",
    "ls /var/www/skyraksys_hrm/frontend/build/static/ 2>&1",
    "cat /var/www/skyraksys_hrm/frontend/build/index.html 2>&1 | head -5",
    "du -sh /var/www/skyraksys_hrm/frontend/build/ 2>&1",
]

for cmd in commands:
    print(f"\n=== {cmd.split('|')[0].strip()} ===")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(out.strip())
    if err: print(f"ERR: {err.strip()}")

ssh.close()
