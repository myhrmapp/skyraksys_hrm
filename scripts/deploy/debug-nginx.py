import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

def sudo(cmd, timeout=30):
    full = f"echo 't]%eCt!49!0>' | sudo -S bash -c \"{cmd}\""
    stdin, stdout, stderr = ssh.exec_command(full, timeout=timeout)
    return stdout.read().decode(), stderr.read().decode(), stdout.channel.recv_exit_status()

commands = [
    # Check nginx error log
    ("sudo", "tail -20 /var/log/nginx/skyraksys_hrm_error.log 2>&1"),
    # Check nginx access log
    ("sudo", "tail -5 /var/log/nginx/skyraksys_hrm_access.log 2>&1"),
    # Check if build directory is accessible by nginx (www-data user)
    ("sudo", "ls -la /var/www/skyraksys_hrm/frontend/build/"),
    # Check permissions up the tree
    ("sudo", "ls -la /var/www/skyraksys_hrm/frontend/"),
    # Check if nginx can read index.html
    ("sudo", "sudo -u www-data cat /var/www/skyraksys_hrm/frontend/build/index.html 2>&1 | head -3"),
    # Check nginx worker user
    ("sudo", "grep 'user ' /etc/nginx/nginx.conf"),
]

for mode, cmd in commands:
    print(f"\n{'='*50}")
    print(f"$ {cmd}")
    print('='*50)
    if mode == "sudo":
        out, err, code = sudo(cmd)
    else:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
        out = stdout.read().decode()
        err = stderr.read().decode()
    if out: print(out.strip())
    if err and "password" not in err.lower(): print(f"ERR: {err.strip()}")

ssh.close()
