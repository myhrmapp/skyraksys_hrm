import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Read lines 636-660 from the server copy
cmd = "sed -n '636,660p' /var/www/skyraksys_hrm/frontend/src/components/features/admin/ProjectTaskConfiguration.js"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
out = stdout.read().decode()
print("Lines 636-660:")
for i, line in enumerate(out.split('\n'), start=636):
    marker = " >>>" if i == 646 else "    "
    print(f"{marker} {i}: {line}")

# Also check total line count
cmd2 = "wc -l /var/www/skyraksys_hrm/frontend/src/components/features/admin/ProjectTaskConfiguration.js"
stdin, stdout, stderr = ssh.exec_command(cmd2, timeout=30)
print(f"\n{stdout.read().decode().strip()}")

ssh.close()
