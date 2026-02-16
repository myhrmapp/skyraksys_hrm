import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Run build as nohup background process
cmd = """nohup bash -c 'cd /var/www/skyraksys_hrm/frontend && \
export NODE_OPTIONS="--max-old-space-size=4096" && \
export CI=true && \
rm -rf build && \
npx react-scripts build > /tmp/build.log 2>&1; \
echo "EXIT_CODE=$?" >> /tmp/build.log; \
echo "BUILD_DONE" >> /tmp/build.log' &
echo "Build started in background"
"""

stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
print(stdout.read().decode().strip())
print("Check /tmp/build.log for results. Use check-build-status.py to monitor.")
ssh.close()
