"""Quick test PostgreSQL connection"""
import paramiko, time

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
    for l in out.split('\n')[-5:]:
        if l.strip(): print(f"  {l}")
    if ec != 0 and err:
        for l in err.split('\n')[-3:]:
            print(f"  ERR: {l}")
    return out, ec

def sudo(cmd, t=30):
    return run(f"echo '{PASSWD}' | sudo -S bash -c \"{cmd}\"", t)

# Check PG status
print("=== PostgreSQL Status ===")
sudo("systemctl is-active postgresql")

# Check listening
run("ss -tlnp | grep 5432")

# Test connection via IPv4
print("\n=== Test IPv4 ===")
sudo("PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h 127.0.0.1 -U hrm_app -d skyraksys_hrm_prod -c 'SELECT current_database(), current_user;'")

# Test connection via localhost
print("\n=== Test localhost ===")
sudo("PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h localhost -U hrm_app -d skyraksys_hrm_prod -c 'SELECT current_database(), current_user;'")

c.close()
print("\nDONE")
