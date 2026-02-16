"""
SkyRakSys HRM — Step-by-step Deployment
Runs each step individually to avoid timeout/streaming issues
"""
import paramiko
import os
import sys
import time

SERVER = "46.225.73.94"
USER = "Rakesh"
PASSWD = "t]%eCt!49!0>"
APP_DIR = "/var/www/skyraksys_hrm"
LOCAL = r"d:\skyraksys_hrm1\skyraksys_hrm_app"


def ssh():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(SERVER, username=USER, password=PASSWD, timeout=30, allow_agent=False, look_for_keys=False)
    return c


def run(client, cmd, timeout=300):
    """Run command, wait, return output."""
    print(f"\n  CMD: {cmd[:150]}...")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode()
    err = stderr.read().decode()
    # Print last 40 lines of output to keep it manageable
    lines = out.strip().split('\n')
    if len(lines) > 40:
        print(f"  ({len(lines)} lines, showing last 40)")
        for l in lines[-40:]:
            print(f"    {l}")
    else:
        for l in lines:
            print(f"    {l}")
    if exit_code != 0:
        print(f"  EXIT CODE: {exit_code}")
        if err.strip():
            err_lines = err.strip().split('\n')[-10:]
            for l in err_lines:
                print(f"    ERR: {l}")
    return out, exit_code


def sudo(client, cmd, timeout=300):
    """Run command with sudo."""
    return run(client, f"echo '{PASSWD}' | sudo -S bash -c \"{cmd}\"", timeout=timeout)


def upload_dir(client, local_path, remote_path, exclude=None):
    """Upload directory via SFTP."""
    if exclude is None:
        exclude = ['node_modules', '.git', '.env', 'build', 'coverage', 'logs', 'uploads', '__pycache__']
    
    sftp = client.open_sftp()
    count = [0]
    
    def _mkdir(path):
        try:
            sftp.stat(path)
        except:
            sftp.mkdir(path)
    
    def _upload(local, remote):
        _mkdir(remote)
        for item in os.listdir(local):
            if item in exclude:
                continue
            lp = os.path.join(local, item)
            rp = f"{remote}/{item}"
            if os.path.isdir(lp):
                _upload(lp, rp)
            elif os.path.getsize(lp) < 50_000_000:
                sftp.put(lp, rp)
                count[0] += 1
    
    _upload(local_path, remote_path)
    sftp.close()
    print(f"  Uploaded {count[0]} files to {remote_path}")


def main():
    step = sys.argv[1] if len(sys.argv) > 1 else "all"
    steps = {
        "1": "ssh-key", "2": "apt-update", "3": "install-node",
        "4": "install-pg", "5": "install-nginx-pm2", "6": "firewall",
        "7": "create-dirs", "8": "db-setup", "9": "upload",
        "10": "env-config", "11": "backend-deps", "12": "migrate-seed",
        "13": "frontend-build", "14": "pm2-start", "15": "nginx-config",
        "16": "verify"
    }
    
    print(f"=== Deployment Step: {step} ===")
    c = ssh()
    print("Connected!")
    
    if step in ("all", "1", "ssh-key"):
        print("\n--- STEP 1: SSH Key ---")
        key_path = os.path.expanduser("~/.ssh/id_rsa_skyraksys.pub")
        if os.path.exists(key_path):
            key = open(key_path).read().strip()
            sudo(c, f"chown -R {USER}:{USER} /home/{USER}")
            run(c, f"mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '{key}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo DONE")
            print("  SSH key installed!")
    
    if step in ("all", "2", "apt-update"):
        print("\n--- STEP 2: System Update ---")
        sudo(c, "apt update -y && apt upgrade -y", timeout=600)
        sudo(c, "apt install -y curl wget git unzip build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release ufw fail2ban", timeout=300)
        print("  System updated!")
    
    if step in ("all", "3", "install-node"):
        print("\n--- STEP 3: Install Node.js 22 ---")
        sudo(c, "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -", timeout=120)
        sudo(c, "apt install -y nodejs", timeout=300)
        out, _ = run(c, "node -v && npm -v")
        print(f"  Node.js installed!")
    
    if step in ("all", "4", "install-pg"):
        print("\n--- STEP 4: Install PostgreSQL 16 ---")
        # Ubuntu 24.04 ships PostgreSQL 16 by default — no external repo needed
        _, ec = run(c, "which psql")
        if ec != 0:
            sudo(c, "apt install -y postgresql postgresql-contrib", timeout=300)
        sudo(c, "systemctl enable postgresql && systemctl start postgresql")
        run(c, "psql --version")
        print("  PostgreSQL installed!")
    
    if step in ("all", "5", "install-nginx-pm2"):
        print("\n--- STEP 5: Install Nginx & PM2 ---")
        sudo(c, "apt install -y nginx", timeout=120)
        sudo(c, "systemctl enable nginx && systemctl start nginx")
        sudo(c, "npm install -g pm2", timeout=120)
        run(c, "nginx -v 2>&1; pm2 -v")
        print("  Nginx & PM2 installed!")
    
    if step in ("all", "6", "firewall"):
        print("\n--- STEP 6: Firewall ---")
        sudo(c, "ufw default deny incoming && ufw default allow outgoing && ufw allow ssh && ufw allow 'Nginx Full' && echo 'y' | ufw enable && ufw status")
        print("  Firewall configured!")
    
    if step in ("all", "7", "create-dirs"):
        print("\n--- STEP 7: Create App Directories ---")
        sudo(c, f"mkdir -p {APP_DIR}/backend {APP_DIR}/frontend {APP_DIR}/uploads {APP_DIR}/logs {APP_DIR}/scripts/deploy && chown -R {USER}:{USER} {APP_DIR}")
        run(c, f"ls -la {APP_DIR}/")
        print("  Directories created!")
    
    if step in ("all", "8", "db-setup"):
        print("\n--- STEP 8: Database Setup ---")
        # Write SQL setup script to server as temp file, then execute via sudo -u postgres
        db_sql = """
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hrm_app') THEN
    CREATE ROLE hrm_app WITH LOGIN PASSWORD 'HrM_Pr0d_S3cur3_2026!';
  ELSE
    ALTER ROLE hrm_app WITH PASSWORD 'HrM_Pr0d_S3cur3_2026!';
  END IF;
END $$;

SELECT 'CREATE DATABASE skyraksys_hrm_prod OWNER hrm_app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'skyraksys_hrm_prod')\\gexec

GRANT ALL PRIVILEGES ON DATABASE skyraksys_hrm_prod TO hrm_app;
"""
        grant_sql = """
GRANT ALL ON SCHEMA public TO hrm_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hrm_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hrm_app;
"""
        # Upload SQL files via SFTP
        sftp = c.open_sftp()
        with sftp.file("/tmp/db-setup.sql", "w") as f:
            f.write(db_sql)
        with sftp.file("/tmp/db-grants.sql", "w") as f:
            f.write(grant_sql)
        sftp.close()

        # Run SQL as postgres user
        sudo(c, "sudo -u postgres psql -f /tmp/db-setup.sql", timeout=30)
        sudo(c, "sudo -u postgres psql -d skyraksys_hrm_prod -f /tmp/db-grants.sql", timeout=30)

        # Enable md5 auth for local TCP connections in pg_hba.conf
        sudo(c, r"PG_HBA=$(find /etc/postgresql -name pg_hba.conf | head -1) && grep -q 'hrm_app' $PG_HBA || sed -i '/^# IPv4 local/a host    skyraksys_hrm_prod    hrm_app    127.0.0.1/32    md5' $PG_HBA && systemctl restart postgresql", timeout=30)

        # Verify connection
        out, ec = sudo(c, "PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h 127.0.0.1 -U hrm_app -d skyraksys_hrm_prod -c 'SELECT current_database(), current_user;'", timeout=15)
        sudo(c, "rm /tmp/db-setup.sql /tmp/db-grants.sql")
        print("  Database created!")
    
    if step in ("all", "9", "upload"):
        print("\n--- STEP 9: Upload Application Files ---")
        print("  Uploading backend...")
        upload_dir(c, os.path.join(LOCAL, "backend"), f"{APP_DIR}/backend",
                   exclude=['node_modules', '.env', 'logs', 'uploads', 'coverage', '.git', 'tests', '__tests__',
                            'jest.config.js', 'test-results.json', 'login-rate-test-output.txt', 'scripts'])
        
        print("  Uploading frontend...")
        upload_dir(c, os.path.join(LOCAL, "frontend"), f"{APP_DIR}/frontend",
                   exclude=['node_modules', 'build', '.env', 'coverage', '.git', 'e2e-integration', 'test-results',
                            '.vscode', '__tests__', 'e2e', 'e2e-excel', 'playwright-report', 'playwright.config.js'])
        
        print("  Uploading root configs...")
        sftp = c.open_sftp()
        sftp.put(os.path.join(LOCAL, "ecosystem.config.js"), f"{APP_DIR}/ecosystem.config.js")
        sftp.put(os.path.join(LOCAL, "package.json"), f"{APP_DIR}/package.json")
        sftp.put(os.path.join(LOCAL, "frontend", ".env.production"), f"{APP_DIR}/frontend/.env.production")
        
        # Upload deploy env templates
        deploy_local = os.path.join(LOCAL, "scripts", "deploy")
        for f in ["backend.env.production", "frontend.env.production", "redeploy.sh"]:
            fp = os.path.join(deploy_local, f)
            if os.path.exists(fp):
                sftp.put(fp, f"{APP_DIR}/scripts/deploy/{f}")
        sftp.close()
        print("  Upload complete!")
    
    if step in ("all", "10", "env-config"):
        print("\n--- STEP 10: Configure Environment ---")
        run(c, f"""cd {APP_DIR} && \
cp scripts/deploy/backend.env.production backend/.env && \
JWT1=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))") && \
JWT2=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))") && \
sed -i "s/REPLACE_WITH_GENERATED_SECRET_64_CHARS/$JWT1/" backend/.env && \
sed -i "s/REPLACE_WITH_DIFFERENT_GENERATED_SECRET_64_CHARS/$JWT2/" backend/.env && \
echo 'ENV configured' && grep -c JWT backend/.env""")
        print("  Environment configured!")
    
    if step in ("all", "11", "backend-deps"):
        print("\n--- STEP 11: Install Backend Dependencies ---")
        run(c, f"cd {APP_DIR}/backend && npm ci --production", timeout=300)
        print("  Backend dependencies installed!")
    
    if step in ("all", "12", "migrate-seed"):
        print("\n--- STEP 12: Database Migration & Seed ---")
        run(c, f"cd {APP_DIR}/backend && npx sequelize-cli db:migrate", timeout=120)
        run(c, f"cd {APP_DIR}/backend && npx sequelize-cli db:seed:all 2>&1 || echo 'Seed skipped/already applied'", timeout=120)
        print("  Migration & seed complete!")
    
    if step in ("all", "13", "frontend-build"):
        print("\n--- STEP 13: Frontend Build ---")
        run(c, f"cd {APP_DIR}/frontend && npm ci", timeout=300)
        run(c, f"cd {APP_DIR}/frontend && npm run build", timeout=300)
        print("  Frontend built!")
    
    if step in ("all", "14", "pm2-start"):
        print("\n--- STEP 14: Start PM2 ---")
        run(c, f"cd {APP_DIR} && pm2 delete skyraksys-hrm 2>/dev/null; pm2 start ecosystem.config.js --env production && pm2 save")
        sudo(c, f"env PATH=$PATH:/usr/bin pm2 startup systemd -u {USER} --hp /home/{USER}")
        run(c, "pm2 status")
        print("  PM2 started!")
    
    if step in ("all", "15", "nginx-config"):
        print("\n--- STEP 15: Nginx Configuration ---")
        # Read the nginx config script and execute it
        nginx_script = open(os.path.join(LOCAL, "scripts", "deploy", "04-nginx-config.sh")).read()
        sftp = c.open_sftp()
        with sftp.file("/tmp/nginx-setup.sh", "w") as f:
            f.write(nginx_script)
        sftp.close()
        sudo(c, "chmod +x /tmp/nginx-setup.sh && bash /tmp/nginx-setup.sh", timeout=60)
        print("  Nginx configured!")
    
    if step in ("all", "16", "verify"):
        print("\n--- STEP 16: Verify Deployment ---")
        run(c, "curl -s http://localhost:5000/api/health || echo 'Backend not responding'")
        run(c, "curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost/ || echo 'Nginx not responding'")
        run(c, "pm2 status")
        run(c, "systemctl is-active postgresql nginx")
        print("\n=== DEPLOYMENT COMPLETE ===")
        print(f"  URL: http://skyait.skyraksys.com")
        print(f"  IP:  http://{SERVER}")
    
    c.close()


if __name__ == "__main__":
    main()
