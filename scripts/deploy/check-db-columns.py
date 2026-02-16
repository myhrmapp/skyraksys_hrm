"""Check actual column names in the deployed database"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('46.225.73.94', username='Rakesh', password='t]%eCt!49!0>', timeout=30, allow_agent=False, look_for_keys=False)
PASSWD = "t]%eCt!49!0>"

def sudo(cmd, t=30):
    _, o, e = c.exec_command(f"echo '{PASSWD}' | sudo -S bash -c \"{cmd}\"", timeout=t)
    ec = o.channel.recv_exit_status()
    out = o.read().decode().strip()
    err = e.read().decode().strip()
    if out:
        for l in out.split('\n'):
            print(f"  {l}")
    if ec != 0 and err:
        for l in err.split('\n')[-3:]:
            print(f"  ERR: {l}")
    return out

# Check column names in key tables
print("=== salary_structures columns ===")
sudo("PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h 127.0.0.1 -U hrm_app -d skyraksys_hrm_prod -c \"SELECT column_name FROM information_schema.columns WHERE table_name='salary_structures' ORDER BY ordinal_position;\"")

print("\n=== employees columns ===")
sudo("PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h 127.0.0.1 -U hrm_app -d skyraksys_hrm_prod -c \"SELECT column_name FROM information_schema.columns WHERE table_name='employees' ORDER BY ordinal_position;\"")

print("\n=== leave_requests columns ===")
sudo("PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h 127.0.0.1 -U hrm_app -d skyraksys_hrm_prod -c \"SELECT column_name FROM information_schema.columns WHERE table_name='leave_requests' ORDER BY ordinal_position;\"")

print("\n=== All tables ===")
sudo("PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h 127.0.0.1 -U hrm_app -d skyraksys_hrm_prod -c \"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;\"")

print("\n=== Migration status ===")
sudo("PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h 127.0.0.1 -U hrm_app -d skyraksys_hrm_prod -c \"SELECT name FROM \\\"SequelizeMeta\\\" ORDER BY name;\"")

c.close()
