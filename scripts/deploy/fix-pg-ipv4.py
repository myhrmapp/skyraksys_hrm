"""Fix PostgreSQL to listen on both IPv4 and IPv6 localhost"""
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
    if out:
        lines = out.split('\n')
        for l in lines[-5:]:
            print(f"  {l}")
    if ec != 0 and err: print(f"  ERR({ec}): {err[:200]}")
    return out, ec

def sudo(cmd, t=30):
    return run(f"echo '{PASSWD}' | sudo -S bash -c \"{cmd}\"", t)

PG_CONF = "/etc/postgresql/16/main/postgresql.conf"
PG_HBA = "/etc/postgresql/16/main/pg_hba.conf"

# Fix listen_addresses to explicitly include both IPv4 and IPv6
print("=== Fix listen_addresses ===")
out, _ = sudo(f"cat {PG_CONF}")

# Replace the current listen_addresses line
old_line = "listen_addresses = 'localhost'"
new_line = "listen_addresses = '127.0.0.1,::1'"

if old_line in out:
    new_conf = out.replace(old_line, new_line)
    sftp = c.open_sftp()
    with sftp.file("/tmp/postgresql.conf", "w") as f:
        f.write(new_conf + "\n")
    sftp.close()
    sudo(f"cp /tmp/postgresql.conf {PG_CONF} && chown postgres:postgres {PG_CONF} && chmod 644 {PG_CONF} && rm /tmp/postgresql.conf")
    print(f"  FIXED: {new_line}")
elif new_line in out:
    print("  Already correct")
else:
    print(f"  Current value: {[l for l in out.split(chr(10)) if 'listen_addr' in l and not l.strip().startswith('#')]}")

# Also add IPv6 entry to pg_hba.conf
print("\n=== Check pg_hba.conf ===")
out_hba, _ = sudo(f"cat {PG_HBA}")
if "::1/128" not in out_hba or "hrm_app" not in [l for l in out_hba.split('\n') if '::1/128' in l and 'hrm_app' in l]:
    need_ipv6 = True
    for line in out_hba.split('\n'):
        if '::1/128' in line and 'hrm_app' in line:
            need_ipv6 = False
            break
    if need_ipv6:
        sftp = c.open_sftp()
        with sftp.file("/tmp/hba_ipv6.txt", "w") as f:
            f.write("host    skyraksys_hrm_prod    hrm_app    ::1/128             md5\n")
        sftp.close()
        sudo(f"cat /tmp/hba_ipv6.txt >> {PG_HBA} && rm /tmp/hba_ipv6.txt")
        print("  Added IPv6 entry for hrm_app")
    else:
        print("  IPv6 entry already exists")

# Verify pg_hba entries
sudo(f"grep hrm_app {PG_HBA}")

# Restart
print("\n=== Restart PostgreSQL ===")
sudo("systemctl restart postgresql", t=15)
run("sleep 2")

# Check listening
print("\n=== Check listening ===")
run("ss -tlnp | grep 5432")

# Test IPv4
print("\n=== Test IPv4 connection ===")
sudo("PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h 127.0.0.1 -U hrm_app -d skyraksys_hrm_prod -c 'SELECT current_database(), current_user;'")

# Test localhost
print("\n=== Test localhost connection ===")
sudo("PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h localhost -U hrm_app -d skyraksys_hrm_prod -c 'SELECT current_database(), current_user;'")

c.close()
print("\n=== DONE ===")
