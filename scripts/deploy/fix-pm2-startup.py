import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

def sudo(cmd, timeout=30):
    full = f"echo 't]%eCt!49!0>' | sudo -S bash -c \"{cmd}\""
    stdin, stdout, stderr = ssh.exec_command(full, timeout=timeout)
    return stdout.read().decode().strip(), stderr.read().decode().strip(), stdout.channel.recv_exit_status()

# Save PM2 process list
stdin, stdout, stderr = ssh.exec_command("pm2 save", timeout=10)
print(f"PM2 save: {stdout.read().decode().strip()}")

# Re-run PM2 startup
sudo("env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u Rakesh --hp /home/Rakesh")

# Enable and start the service
sudo("systemctl enable pm2-Rakesh")
sudo("systemctl start pm2-Rakesh")

# Verify
stdin, stdout, stderr = ssh.exec_command("systemctl is-active pm2-Rakesh", timeout=10)
print(f"pm2-Rakesh: {stdout.read().decode().strip()}")

ssh.close()
