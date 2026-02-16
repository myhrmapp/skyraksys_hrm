"""Fix postgresql.conf listen_addresses via SFTP"""
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
    if out: print(f"  {out[:300]}")
    if ec != 0 and err: print(f"  ERR({ec}): {err[:200]}")
    return out, ec

def sudo(cmd, t=30):
    return run(f"echo '{PASSWD}' | sudo -S bash -c \"{cmd}\"", t)

PG_CONF = "/etc/postgresql/16/main/postgresql.conf"
PG_HBA = "/etc/postgresql/16/main/pg_hba.conf"

# Step 1: Read postgresql.conf via sudo, modify, upload, replace
print("=== Fix listen_addresses ===")
out, _ = sudo(f"cat {PG_CONF}")
if "#listen_addresses = 'localhost'" in out:
    new_conf = out.replace("#listen_addresses = 'localhost'", "listen_addresses = 'localhost'")
    sftp = c.open_sftp()
    with sftp.file("/tmp/postgresql.conf", "w") as f:
        f.write(new_conf + "\n")
    sftp.close()
    sudo(f"cp /tmp/postgresql.conf {PG_CONF} && chown postgres:postgres {PG_CONF} && chmod 644 {PG_CONF} && rm /tmp/postgresql.conf")
    print("  FIXED: listen_addresses uncommented")
else:
    print("  Already fixed or different format")

# Verify
out2, _ = sudo(f"grep '^listen_addresses' {PG_CONF}")
print(f"  Verify: {out2}")

# Step 2: Restart PostgreSQL
print("\n=== Restart PostgreSQL ===")
sudo("systemctl restart postgresql", t=15)
run("sleep 2")

# Step 3: Check TCP listening
print("\n=== Check TCP ===")
run("ss -tlnp | grep 5432")

# Step 4: Test hrm_app connection
print("\n=== Test connection ===")
sudo("PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h 127.0.0.1 -U hrm_app -d skyraksys_hrm_prod -c 'SELECT current_database(), current_user;'")

c.close()
print("\nDONE")
