import paramiko

key = paramiko.RSAKey.from_private_key_file(r"C:\Users\otyvi\.ssh\id_rsa_skyraksys")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.73.94', username='Rakesh', pkey=key, timeout=30)

def run(cmd, label="", timeout=60):
    print(f"\n{'='*50}")
    if label:
        print(f">>> {label}")
    print(f"$ {cmd}")
    print('='*50)
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    if out: print(out.strip())
    if err and code != 0: print(f"STDERR: {err.strip()}")
    print(f"[exit: {code}]")
    return out, code

def sudo(cmd):
    return run(f"echo 't]%eCt!49!0>' | sudo -S bash -c \"{cmd}\"")

# Step 14: PM2 Start
print("=" * 60)
print("STEP 14: PM2 START BACKEND")
print("=" * 60)

# Stop any existing PM2 processes
run("pm2 delete all 2>/dev/null || true", "Stop existing PM2 processes")

# Check ecosystem config exists
run("cat /var/www/skyraksys_hrm/ecosystem.config.js", "Check ecosystem.config.js")

# Start PM2 with ecosystem config
run("cd /var/www/skyraksys_hrm && pm2 start ecosystem.config.js --env production", "Start PM2", timeout=30)

# Save PM2 configuration
run("pm2 save", "Save PM2 config")

# Setup PM2 startup (run on boot)
out, code = run("pm2 startup systemd 2>&1 | grep 'sudo'", "Get PM2 startup command")
if out.strip():
    # Extract and run the sudo command
    startup_cmd = out.strip()
    print(f"\nRunning startup command: {startup_cmd}")
    stdin, stdout, stderr = ssh.exec_command(f"echo 't]%eCt!49!0>' | sudo -S {startup_cmd.replace('sudo ', '')}", timeout=30)
    print(stdout.read().decode().strip())

# Check PM2 status
import time
time.sleep(3)
run("pm2 status", "PM2 Status")
run("pm2 logs --nostream --lines 20", "PM2 Recent Logs")

ssh.close()
print("\n✅ Step 14 Complete")
