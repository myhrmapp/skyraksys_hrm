"""Upload and run consolidated migration SQL"""
import paramiko
import os

SERVER = "46.225.73.94"
USER = "Rakesh"
PASSWD = "t]%eCt!49!0>"
LOCAL = r"d:\skyraksys_hrm1\skyraksys_hrm_app"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(SERVER, username=USER, password=PASSWD, timeout=30, allow_agent=False, look_for_keys=False)

# Upload SQL file
print("=== Uploading migration SQL ===")
sftp = c.open_sftp()
sftp.put(os.path.join(LOCAL, "scripts", "deploy", "all-migrations.sql"), "/tmp/all-migrations.sql")
sftp.close()

# Run it
print("=== Running migrations ===")
_, o, e = c.exec_command(
    f"echo '{PASSWD}' | sudo -S bash -c \"PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h 127.0.0.1 -U hrm_app -d skyraksys_hrm_prod -f /tmp/all-migrations.sql\"",
    timeout=120
)
ec = o.channel.recv_exit_status()
out = o.read().decode()
err = e.read().decode()

print(out)
if ec != 0:
    print(f"\nEXIT CODE: {ec}")
# Show errors (filter out the sudo password prompt)
err_lines = [l for l in err.split('\n') if l.strip() and 'password for' not in l.lower()]
if err_lines:
    print("\n=== Errors/Warnings ===")
    for l in err_lines:
        print(f"  {l}")

# Cleanup
c.exec_command("rm /tmp/all-migrations.sql")
c.close()
print("\n=== Done ===")
