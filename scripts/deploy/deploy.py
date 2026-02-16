#!/usr/bin/env python3
"""
SkyRakSys HRM — Automated Server Deployment via SSH
Server: 46.225.73.94 (skyait.skyraksys.com)
Uses paramiko for password-based SSH (no manual password entry needed)
"""

import paramiko
import os
import sys
import time
import stat
from scp import SCPClient

# ===== CONFIGURATION =====
SERVER_IP = "46.225.73.94"
SERVER_USER = "Rakesh"
SERVER_PASSWORD = "t]%eCt!49!0>"
ROOT_PASSWORD = SERVER_PASSWORD
REMOTE_APP_DIR = "/var/www/skyraksys_hrm"
LOCAL_APP_DIR = r"d:\skyraksys_hrm1\skyraksys_hrm_app"
DOMAIN = "skyait.skyraksys.com"
SSH_KEY_PATH = os.path.join(os.path.expanduser("~"), ".ssh", "id_rsa_skyraksys")


def get_ssh_client(user=SERVER_USER, password=SERVER_PASSWORD):
    """Create an SSH client connection."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SERVER_IP, port=22, username=user, password=password, timeout=30)
    return client


def run_remote(client, command, sudo=False, stream=True):
    """Execute a command on the remote server."""
    if sudo:
        command = f"echo '{ROOT_PASSWORD}' | sudo -S bash -c '{command}'"
    
    print(f"  > {command[:120]}{'...' if len(command) > 120 else ''}")
    stdin, stdout, stderr = client.exec_command(command, timeout=1800, get_pty=True)
    
    output = ""
    if stream:
        for line in stdout:
            line = line.strip()
            print(f"    {line}")
            output += line + "\n"
    else:
        output = stdout.read().decode()
    
    err = stderr.read().decode()
    exit_code = stdout.channel.recv_exit_status()
    
    if exit_code != 0 and err:
        print(f"  [WARN] Exit code {exit_code}: {err[:200]}")
    
    return output, err, exit_code


def run_remote_script(client, script_content, sudo=False):
    """Upload a script and execute it."""
    sftp = client.open_sftp()
    remote_script = "/tmp/_deploy_script.sh"
    
    with sftp.file(remote_script, 'w') as f:
        f.write(script_content)
    sftp.chmod(remote_script, 0o755)
    sftp.close()
    
    if sudo:
        cmd = f"echo '{ROOT_PASSWORD}' | sudo -S bash {remote_script}"
    else:
        cmd = f"bash {remote_script}"
    
    stdin, stdout, stderr = client.exec_command(cmd, timeout=1800, get_pty=True)
    for line in stdout:
        print(f"    {line.strip()}")
    err = stderr.read().decode()
    exit_code = stdout.channel.recv_exit_status()
    return exit_code


def scp_upload_dir(client, local_path, remote_path, exclude=None):
    """Upload a directory via SCP, excluding specified patterns."""
    if exclude is None:
        exclude = ['node_modules', '.git', '.env', 'build', 'coverage', 'logs', 'uploads']
    
    sftp = client.open_sftp()
    
    def _upload_dir(local, remote):
        try:
            sftp.stat(remote)
        except FileNotFoundError:
            sftp.mkdir(remote)
        
        for item in os.listdir(local):
            if item in exclude:
                continue
            
            local_item = os.path.join(local, item)
            remote_item = f"{remote}/{item}"
            
            if os.path.isdir(local_item):
                _upload_dir(local_item, remote_item)
            else:
                file_size = os.path.getsize(local_item)
                if file_size > 50 * 1024 * 1024:  # Skip files > 50MB
                    print(f"    Skipping large file: {item} ({file_size // 1024 // 1024}MB)")
                    continue
                sftp.put(local_item, remote_item)
    
    _upload_dir(local_path, remote_path)
    sftp.close()


def step_header(step_num, title):
    print(f"\n{'='*60}")
    print(f"  STEP {step_num}: {title}")
    print(f"{'='*60}\n")


# ============================================================
# MAIN DEPLOYMENT
# ============================================================
def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "full"
    
    print("=" * 60)
    print("  SkyRakSys HRM — Automated Deployment")
    print(f"  Server: {SERVER_IP} ({DOMAIN})")
    print(f"  Mode: {mode}")
    print("=" * 60)
    
    # --- Test Connection ---
    print("\nConnecting to server...")
    try:
        client = get_ssh_client()
        out, _, _ = run_remote(client, "echo CONNECTED && uname -a && whoami", stream=False)
        print(f"  Connected! {out.strip()}")
    except Exception as e:
        print(f"  ERROR: Cannot connect to {SERVER_IP}: {e}")
        sys.exit(1)
    
    if mode == "redeploy":
        # Quick redeploy (code changes only)
        step_header("R", "Quick Redeploy — Code Update Only")
        
        print("Uploading backend files...")
        scp_upload_dir(client, os.path.join(LOCAL_APP_DIR, "backend"), f"{REMOTE_APP_DIR}/backend",
                       exclude=['node_modules', '.env', 'logs', 'uploads', 'coverage', '.git', 'tests'])
        
        print("Uploading frontend files...")
        scp_upload_dir(client, os.path.join(LOCAL_APP_DIR, "frontend"), f"{REMOTE_APP_DIR}/frontend",
                       exclude=['node_modules', 'build', '.env', 'coverage', '.git', 'e2e-integration'])
        
        # Upload .env.production for frontend
        sftp = client.open_sftp()
        sftp.put(os.path.join(LOCAL_APP_DIR, "frontend", ".env.production"),
                 f"{REMOTE_APP_DIR}/frontend/.env.production")
        sftp.close()
        
        print("Running redeploy...")
        run_remote(client, f"cd {REMOTE_APP_DIR}/backend && npm ci --production && npx sequelize-cli db:migrate")
        run_remote(client, f"cd {REMOTE_APP_DIR}/frontend && npm ci && npm run build")
        run_remote(client, f"cd {REMOTE_APP_DIR} && pm2 restart skyraksys-hrm && pm2 status")
        
        print("\n✓ Redeploy complete!")
        client.close()
        return
    
    # ---- FULL DEPLOYMENT ----
    
    # ============================================================
    # STEP 1: Install SSH Key (for future convenience)
    # ============================================================
    step_header(1, "SSH Key Setup")
    
    if os.path.exists(SSH_KEY_PATH + ".pub"):
        with open(SSH_KEY_PATH + ".pub", "r") as f:
            pub_key = f.read().strip()
        # Fix home dir ownership first, then install key
        run_remote(client, f"echo '{ROOT_PASSWORD}' | sudo -S chown -R {SERVER_USER}:{SERVER_USER} /home/{SERVER_USER} && mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '{pub_key}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'SSH key installed'")
        print("  SSH key installed for future use.")
    else:
        print("  No SSH key found, skipping.")
    
    # ============================================================
    # STEP 2: Server Setup (Node.js, PostgreSQL, Nginx, PM2, UFW)
    # ============================================================
    step_header(2, "Server Setup — Node.js, PostgreSQL, Nginx, PM2")
    
    with open(os.path.join(LOCAL_APP_DIR, "scripts", "deploy", "01-server-setup.sh"), "r") as f:
        setup_script = f.read()
    
    exit_code = run_remote_script(client, setup_script, sudo=True)
    if exit_code != 0:
        print(f"  WARNING: Server setup exited with code {exit_code}")
    print("  Server setup complete!")
    
    # ============================================================
    # STEP 3: Database Setup
    # ============================================================
    step_header(3, "PostgreSQL Database Setup")
    
    with open(os.path.join(LOCAL_APP_DIR, "scripts", "deploy", "02-db-setup.sh"), "r") as f:
        db_script = f.read()
    
    exit_code = run_remote_script(client, db_script, sudo=True)
    print("  Database setup complete!")
    
    # ============================================================
    # STEP 4: Upload Application Files
    # ============================================================
    step_header(4, "Uploading Application Files")
    
    # Create remote dirs
    run_remote(client, f"sudo mkdir -p {REMOTE_APP_DIR}/backend {REMOTE_APP_DIR}/frontend {REMOTE_APP_DIR}/uploads {REMOTE_APP_DIR}/logs {REMOTE_APP_DIR}/scripts/deploy && sudo chown -R {SERVER_USER}:{SERVER_USER} {REMOTE_APP_DIR}")
    
    print("  Uploading backend...")
    scp_upload_dir(client, os.path.join(LOCAL_APP_DIR, "backend"), f"{REMOTE_APP_DIR}/backend",
                   exclude=['node_modules', '.env', 'logs', 'uploads', 'coverage', '.git', 'tests'])
    
    print("  Uploading frontend...")
    scp_upload_dir(client, os.path.join(LOCAL_APP_DIR, "frontend"), f"{REMOTE_APP_DIR}/frontend",
                   exclude=['node_modules', 'build', '.env', 'coverage', '.git', 'e2e-integration', 'test-results', '.vscode'])
    
    print("  Uploading config files...")
    sftp = client.open_sftp()
    sftp.put(os.path.join(LOCAL_APP_DIR, "ecosystem.config.js"), f"{REMOTE_APP_DIR}/ecosystem.config.js")
    sftp.put(os.path.join(LOCAL_APP_DIR, "package.json"), f"{REMOTE_APP_DIR}/package.json")
    sftp.put(os.path.join(LOCAL_APP_DIR, "frontend", ".env.production"), f"{REMOTE_APP_DIR}/frontend/.env.production")
    
    # Upload deploy scripts
    deploy_dir = os.path.join(LOCAL_APP_DIR, "scripts", "deploy")
    for fname in os.listdir(deploy_dir):
        fpath = os.path.join(deploy_dir, fname)
        if os.path.isfile(fpath) and not fname.startswith('.'):
            sftp.put(fpath, f"{REMOTE_APP_DIR}/scripts/deploy/{fname}")
    sftp.close()
    
    print("  Upload complete!")
    
    # ============================================================
    # STEP 5: Configure Environment & Deploy
    # ============================================================
    step_header(5, "Configure Environment & Deploy Application")
    
    deploy_commands = f"""
cd {REMOTE_APP_DIR}

# Copy production env
cp scripts/deploy/backend.env.production backend/.env

# Generate JWT secrets
JWT1=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT2=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
sed -i "s/REPLACE_WITH_GENERATED_SECRET_64_CHARS/$JWT1/" backend/.env
sed -i "s/REPLACE_WITH_DIFFERENT_GENERATED_SECRET_64_CHARS/$JWT2/" backend/.env
echo "JWT secrets configured."

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm ci --production
echo "Backend deps installed."

# Run migrations
echo "Running migrations..."
npx sequelize-cli db:migrate
echo "Migrations complete."

# Seed database
echo "Seeding database..."
npx sequelize-cli db:seed:all 2>/dev/null || echo "Seeds already applied or skipped"

# Frontend
echo "Installing frontend dependencies..."
cd ../frontend
npm ci
echo "Building frontend..."
npm run build
echo "Frontend build complete."

# PM2
echo "Starting PM2..."
cd ..
pm2 delete skyraksys-hrm 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
echo "PM2 started."
pm2 status
"""
    run_remote(client, deploy_commands)
    print("  Application deployed!")
    
    # ============================================================
    # STEP 6: Nginx Configuration
    # ============================================================
    step_header(6, "Nginx Reverse Proxy Configuration")
    
    with open(os.path.join(LOCAL_APP_DIR, "scripts", "deploy", "04-nginx-config.sh"), "r") as f:
        nginx_script = f.read()
    
    run_remote_script(client, nginx_script, sudo=True)
    print("  Nginx configured!")
    
    # ============================================================
    # STEP 7: PM2 Startup + Verify
    # ============================================================
    step_header(7, "PM2 Startup & Final Verification")
    
    # PM2 startup
    run_remote(client, f"sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u {SERVER_USER} --hp /home/{SERVER_USER} 2>/dev/null; pm2 save")
    
    # Health check
    print("\n  Testing API health...")
    out, _, _ = run_remote(client, "curl -s http://localhost:5000/api/health", stream=False)
    print(f"  API Health: {out.strip()}")
    
    print("\n  Testing Nginx...")
    out, _, _ = run_remote(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost/", stream=False)
    print(f"  Nginx HTTP Status: {out.strip()}")
    
    print("\n  PM2 Status:")
    run_remote(client, "pm2 status")
    
    client.close()
    
    print("\n" + "=" * 60)
    print("  DEPLOYMENT COMPLETE!")
    print("=" * 60)
    print(f"\n  URL: http://{DOMAIN}")
    print(f"  IP:  http://{SERVER_IP}")
    print(f"\n  For SSL setup, ensure DNS A record points to {SERVER_IP}")
    print(f"  Then SSH in and run: bash {REMOTE_APP_DIR}/scripts/deploy/05-ssl-setup.sh")
    print(f"\n  For future code updates:")
    print(f"  python deploy.py redeploy")
    print()


if __name__ == "__main__":
    main()
