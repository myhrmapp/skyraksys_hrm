"""Re-upload fixed migration file and re-run migrations"""
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
    if out:
        lines = out.split('\n')
        for l in lines[-30:]:
            print(f"  {l}")
    if ec != 0:
        print(f"  EXIT CODE: {ec}")
        if err:
            for l in err.split('\n')[-5:]:
                print(f"  ERR: {l}")
    return out, ec

# Re-upload the fixed migration file
print("=== Re-uploading fixed migration ===")
sftp = c.open_sftp()
migrations_dir = os.path.join(LOCAL, "backend", "migrations")
remote_migrations = f"{APP_DIR}/backend/migrations"

for fn in os.listdir(migrations_dir):
    if fn.endswith('.js'):
        sftp.put(os.path.join(migrations_dir, fn), f"{remote_migrations}/{fn}")
        print(f"  Uploaded {fn}")

# Also re-upload .sequelizerc if it exists
sequelizerc = os.path.join(LOCAL, "backend", ".sequelizerc")
if os.path.exists(sequelizerc):
    sftp.put(sequelizerc, f"{APP_DIR}/backend/.sequelizerc")
    print("  Uploaded .sequelizerc")

sftp.close()

# Re-run migrations
print("\n=== Running remaining migrations ===")
out, ec = run(f"cd {APP_DIR}/backend && npx sequelize-cli db:migrate", t=180)

c.close()
print("\n=== Done ===")
