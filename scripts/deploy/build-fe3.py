import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Run build and redirect ALL output to a log file, then read it
cmd = """cd /var/www/skyraksys_hrm/frontend && \
rm -rf build && \
export NODE_OPTIONS="--max-old-space-size=4096" && \
export CI=true && \
npx react-scripts build > /tmp/build.log 2>&1; \
echo "EXIT_CODE=$?" >> /tmp/build.log; \
cat /tmp/build.log"""

print("Starting build (may take 2-5 minutes)...")
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=600)
exit_status = stdout.channel.recv_exit_status()
out = stdout.read().decode()
err = stderr.read().decode()
print(out)
if err:
    print(f"STDERR: {err}")
print(f"SSH exit: {exit_status}")

ssh.close()
