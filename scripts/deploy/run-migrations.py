"""Re-upload the fixed gap-fixes migration and run pending migrations"""
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

def run(cmd, t=120):
    _, o, e = c.exec_command(cmd, timeout=t)
    ec = o.channel.recv_exit_status()
    out = o.read().decode().strip()
    err = e.read().decode().strip()
    print(f"\nCMD: {cmd[:120]}")
    lines = out.split('\n')
    for l in lines[-40:]:
        print(f"  {l}")
    if ec != 0:
        print(f"  EXIT CODE: {ec}")
        for l in err.split('\n')[-10:]:
            print(f"  ERR: {l}")
    return out, ec

# Step 1: Upload ALL migration files
print("=== Uploading all migration files ===")
sftp = c.open_sftp()
migrations_dir = os.path.join(LOCAL, "backend", "migrations")
remote_migrations = f"{APP_DIR}/backend/migrations"

for fn in sorted(os.listdir(migrations_dir)):
    if fn.endswith('.js'):
        local_path = os.path.join(migrations_dir, fn)
        sftp.put(local_path, f"{remote_migrations}/{fn}")
        # Verify content
        size = os.path.getsize(local_path)
        print(f"  {fn} ({size} bytes)")

sftp.close()

# Step 2: Verify the fix is present on server
print("\n=== Verify fix on server ===")
run(f"grep -n 'information_schema.table_constraints' {APP_DIR}/backend/migrations/20260209100000-gap-fixes-module-2-3-5-6.js | head -5")
run(f"grep -n 'Could not find' {APP_DIR}/backend/migrations/20260209100000-gap-fixes-module-2-3-5-6.js || echo 'OLD MESSAGE NOT FOUND - GOOD'")

# Step 3: Check current SequelizeMeta (what's already been run)
print("\n=== Current migration status ===")
sql_check = 'SELECT name FROM "SequelizeMeta" ORDER BY name;'
sftp2 = c.open_sftp()
with sftp2.file("/tmp/meta_check.sql", "w") as f:
    f.write(sql_check)
sftp2.close()
run(f"PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h 127.0.0.1 -U hrm_app -d skyraksys_hrm_prod -f /tmp/meta_check.sql")

# Step 4: Run pending migrations
print("\n=== Running migrations ===")
out, ec = run(f"cd {APP_DIR}/backend && npx sequelize-cli db:migrate 2>&1", t=300)

c.close()
print("\n=== Done ===")
