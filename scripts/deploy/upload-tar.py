"""Upload app files via tar + SSH (much faster than SFTP file-by-file)"""
import paramiko
import os
import subprocess
import time

SERVER = "46.225.73.94"
USER = "Rakesh"
PASSWD = "t]%eCt!49!0>"
APP_DIR = "/var/www/skyraksys_hrm"
LOCAL = r"d:\skyraksys_hrm1\skyraksys_hrm_app"
SSH_KEY = os.path.expanduser("~/.ssh/id_rsa_skyraksys")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(SERVER, username=USER, password=PASSWD, timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, t=60):
    _, o, e = c.exec_command(cmd, timeout=t)
    ec = o.channel.recv_exit_status()
    out = o.read().decode().strip()
    err = e.read().decode().strip()
    print(f"  CMD: {cmd[:120]}")
    if out:
        for l in out.split('\n')[-10:]:
            print(f"    {l}")
    if ec != 0 and err:
        for l in err.split('\n')[-5:]:
            print(f"    ERR: {l}")
    return out, ec

def sudo(cmd, t=60):
    return run(f"echo '{PASSWD}' | sudo -S bash -c \"{cmd}\"", t)

# Step 1: Create tar archives locally using PowerShell (Windows doesn't have tar properly)
print("=== Creating archives locally ===")

# Use Python to create tar files
import tarfile

def create_tar(source_dir, tar_path, exclude_dirs):
    """Create tar.gz excluding specified directories."""
    exclude_set = set(exclude_dirs)
    count = 0
    with tarfile.open(tar_path, "w:gz") as tar:
        for root, dirs, files in os.walk(source_dir):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_set]
            for f in files:
                if f in exclude_set:
                    continue
                fp = os.path.join(root, f)
                arcname = os.path.relpath(fp, source_dir)
                # Skip files > 50MB
                if os.path.getsize(fp) < 50_000_000:
                    tar.add(fp, arcname=arcname)
                    count += 1
    print(f"  Created {tar_path} ({count} files, {os.path.getsize(tar_path) // 1024}KB)")
    return count

# Backend tar
be_exclude = ['node_modules', '.env', 'logs', 'uploads', 'coverage', '.git', 'tests', '__tests__',
              'jest.config.js', 'test-results.json', 'login-rate-test-output.txt']
print("  Creating backend.tar.gz...")
create_tar(os.path.join(LOCAL, "backend"), os.path.join(LOCAL, "backend.tar.gz"), be_exclude)

# Frontend tar
fe_exclude = ['node_modules', 'build', '.env', 'coverage', '.git', 'e2e-integration', 'test-results',
              '.vscode', '__tests__', 'e2e', 'e2e-excel', 'playwright-report', 'playwright.config.js']
print("  Creating frontend.tar.gz...")
create_tar(os.path.join(LOCAL, "frontend"), os.path.join(LOCAL, "frontend.tar.gz"), fe_exclude)

# Step 2: Upload tar files via SFTP
print("\n=== Uploading archives ===")
sftp = c.open_sftp()

for fn in ["backend.tar.gz", "frontend.tar.gz"]:
    local_file = os.path.join(LOCAL, fn)
    remote_file = f"/tmp/{fn}"
    size_mb = os.path.getsize(local_file) / (1024 * 1024)
    print(f"  Uploading {fn} ({size_mb:.1f}MB)...")
    t0 = time.time()
    sftp.put(local_file, remote_file)
    elapsed = time.time() - t0
    print(f"    Done in {elapsed:.1f}s")

# Upload individual config files
print("  Uploading config files...")
sftp.put(os.path.join(LOCAL, "ecosystem.config.js"), f"{APP_DIR}/ecosystem.config.js")
sftp.put(os.path.join(LOCAL, "package.json"), f"{APP_DIR}/package.json")

# Upload deploy scripts and env templates
deploy_local = os.path.join(LOCAL, "scripts", "deploy")
for fn in ["backend.env.production", "frontend.env.production", "redeploy.sh"]:
    fp = os.path.join(deploy_local, fn)
    if os.path.exists(fp):
        sftp.put(fp, f"{APP_DIR}/scripts/deploy/{fn}")
        print(f"    {fn}")

sftp.close()

# Step 3: Extract on server
print("\n=== Extracting on server ===")
run(f"cd {APP_DIR}/backend && tar xzf /tmp/backend.tar.gz", t=120)
print("  Backend extracted")
run(f"cd {APP_DIR}/frontend && tar xzf /tmp/frontend.tar.gz", t=120)
print("  Frontend extracted")

# Upload .env.production for frontend
sftp2 = c.open_sftp()
sftp2.put(os.path.join(LOCAL, "frontend", ".env.production"), f"{APP_DIR}/frontend/.env.production")
sftp2.close()

# Cleanup
run("rm /tmp/backend.tar.gz /tmp/frontend.tar.gz")

# Clean up local tar files
os.remove(os.path.join(LOCAL, "backend.tar.gz"))
os.remove(os.path.join(LOCAL, "frontend.tar.gz"))

# Verify
print("\n=== Verify upload ===")
run(f"ls -la {APP_DIR}/")
run(f"ls {APP_DIR}/backend/ | head -15")
run(f"ls {APP_DIR}/frontend/ | head -15")
run(f"find {APP_DIR} -type f | wc -l")

c.close()
print("\n=== Upload Complete ===")
