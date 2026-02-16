"""Fix PostgreSQL to listen on TCP localhost and allow hrm_app auth"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('46.225.73.94', username='Rakesh', password='t]%eCt!49!0>', timeout=30, allow_agent=False, look_for_keys=False)
PASSWD = "t]%eCt!49!0>"

def run(cmd, t=30):
    _, o, e = c.exec_command(cmd, timeout=t)
    ec = o.channel.recv_exit_status()
    out = o.read().decode().strip()
    err = e.read().decode().strip()
    print(f"CMD: {cmd[:120]}")
    if out: print(f"  OUT: {out[:300]}")
    if ec != 0 and err: print(f"  ERR({ec}): {err[:200]}")
    return out, ec

def sudo(cmd, t=30):
    return run(f"echo '{PASSWD}' | sudo -S bash -c \"{cmd}\"", t)

# Find PostgreSQL config paths
print("=== Finding PostgreSQL config ===")
run("find /etc/postgresql -name postgresql.conf 2>/dev/null")
run("find /etc/postgresql -name pg_hba.conf 2>/dev/null")

# Check current listen_addresses
print("\n=== Current listen config ===")
run("grep listen_addresses /etc/postgresql/16/main/postgresql.conf")

# Enable TCP listen on localhost
print("\n=== Enabling TCP listen ===")
sudo("sed -i \"s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/\" /etc/postgresql/16/main/postgresql.conf")
run("grep listen_addresses /etc/postgresql/16/main/postgresql.conf")

# Add md5 auth entry for hrm_app
print("\n=== Adding pg_hba entry ===")
out, _ = run("grep hrm_app /etc/postgresql/16/main/pg_hba.conf")
if "hrm_app" not in out:
    # Upload the line via SFTP to avoid quoting issues
    sftp = c.open_sftp()
    with sftp.file("/tmp/hba_line.txt", "w") as f:
        f.write("host    skyraksys_hrm_prod    hrm_app    127.0.0.1/32    md5\n")
    sftp.close()
    sudo("cat /tmp/hba_line.txt >> /etc/postgresql/16/main/pg_hba.conf && rm /tmp/hba_line.txt")
    print("  Added hrm_app entry")
else:
    print("  Already has hrm_app entry")

# Restart PostgreSQL
print("\n=== Restarting PostgreSQL ===")
sudo("systemctl restart postgresql")
run("sleep 2")

# Verify TCP listening
print("\n=== Verifying TCP ===")
run("ss -tlnp | grep 5432")

# Test connection as hrm_app
print("\n=== Testing hrm_app connection ===")
sudo("PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h 127.0.0.1 -U hrm_app -d skyraksys_hrm_prod -c 'SELECT current_database(), current_user;'")

c.close()
print("\n=== DONE ===")
