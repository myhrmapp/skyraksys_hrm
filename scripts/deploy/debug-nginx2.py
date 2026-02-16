import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

def sudo(cmd, timeout=30):
    full = f"echo 't]%eCt!49!0>' | sudo -S bash -c \"{cmd}\""
    stdin, stdout, stderr = ssh.exec_command(full, timeout=timeout)
    return stdout.read().decode(), stderr.read().decode(), stdout.channel.recv_exit_status()

# Check the actual nginx config file
print("=== Nginx Config ===")
out, err, code = sudo("cat /etc/nginx/sites-available/skyraksys_hrm")
print(out[:2000])

# Check actual response body
print("\n=== Response Body ===")
stdin, stdout, stderr = ssh.exec_command("curl -v http://localhost/ 2>&1", timeout=10)
print(stdout.read().decode()[:1500])

# Check nginx error log globally
print("\n=== Nginx Main Error Log ===")
out, err, code = sudo("tail -10 /var/log/nginx/error.log 2>&1")
print(out.strip())

ssh.close()
