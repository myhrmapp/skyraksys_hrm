import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

commands = [
    # Check if build is still running
    "ps aux | grep -E 'node|react-scripts|npm' | grep -v grep",
    # Check build assets
    "find /var/www/skyraksys_hrm/frontend/build/ -type f 2>&1",
    # Check if there was a build error - look at recent npm logs
    "ls -la /var/www/skyraksys_hrm/frontend/build/assets/ 2>&1",
    # Check package.json build script
    "cat /var/www/skyraksys_hrm/frontend/package.json | grep -A2 '\"build\"'",
    # Check if react-scripts is installed
    "ls /var/www/skyraksys_hrm/frontend/node_modules/.bin/react-scripts 2>&1",
    # Check if there's a public/index.html
    "ls /var/www/skyraksys_hrm/frontend/public/index.html 2>&1",
    # Check available memory
    "free -h",
]

for cmd in commands:
    print(f"\n=== {cmd.split('|')[0].strip()} ===")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(out.strip())
    if err: print(f"ERR: {err.strip()}")

ssh.close()
