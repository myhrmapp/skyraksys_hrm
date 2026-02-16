import paramiko
import sys

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

# Clean old build, rebuild with full error output
print("=== Cleaning old build and rebuilding ===")
cmd = """cd /var/www/skyraksys_hrm/frontend && \
rm -rf build && \
export NODE_OPTIONS="--max-old-space-size=4096" && \
npx react-scripts build 2>&1"""

stdin, stdout, stderr = ssh.exec_command(cmd, timeout=600)
# Stream output line by line
for line in iter(stdout.readline, ''):
    print(line, end='')
    sys.stdout.flush()

err = stderr.read().decode()
if err:
    print(f"\nSTDERR:\n{err}")

exit_code = stdout.channel.recv_exit_status()
print(f"\n=== Build exit code: {exit_code} ===")

ssh.close()
