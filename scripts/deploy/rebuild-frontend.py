"""Upload fixed package.json and rebuild frontend"""
import paramiko
import os

SERVER = "46.225.73.94"
USER = "Rakesh"
PASSWD = "t]%eCt!49!0>"
APP_DIR = "/var/www/skyraksys_hrm"
LOCAL = r"d:\skyraksys_hrm1\skyraksys_hrm_app"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(SERVER, username=USER, password=PASSWD, timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, t=300):
    _, o, e = c.exec_command(cmd, timeout=t)
    ec = o.channel.recv_exit_status()
    out = o.read().decode().strip()
    err = e.read().decode().strip()
    print(f"\nCMD: {cmd[:120]}")
    lines = out.split('\n')
    for l in lines[-20:]:
        print(f"  {l}")
    if ec != 0:
        print(f"  EXIT CODE: {ec}")
        err_lines = [l for l in err.split('\n')[-5:] if 'password' not in l.lower()]
        for l in err_lines:
            print(f"  ERR: {l}")
    return out, ec

# Upload updated package.json
print("=== Uploading updated package.json ===")
sftp = c.open_sftp()
sftp.put(os.path.join(LOCAL, "frontend", "package.json"), f"{APP_DIR}/frontend/package.json")
sftp.close()

# Install deps (npm install since we changed deps, not npm ci)
print("=== Installing dependencies ===")
run(f"cd {APP_DIR}/frontend && npm install", t=300)

# Build
print("=== Building frontend ===")
run(f"cd {APP_DIR}/frontend && npm run build", t=300)

# Verify build output
print("=== Verify build ===")
run(f"ls -la {APP_DIR}/frontend/build/ | head -10")
run(f"du -sh {APP_DIR}/frontend/build/")

c.close()
print("\n=== Done ===")
