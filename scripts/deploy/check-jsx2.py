import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Read wider context around line 646
cmd = "sed -n '540,660p' /var/www/skyraksys_hrm/frontend/src/components/features/admin/ProjectTaskConfiguration.js"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
out = stdout.read().decode()
for i, line in enumerate(out.split('\n'), start=540):
    marker = " >>>" if i == 646 else "    "
    print(f"{marker} {i}: {line.rstrip()}")

ssh.close()
