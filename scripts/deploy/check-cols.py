"""Check DB columns by uploading SQL via SFTP"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('46.225.73.94', username='Rakesh', password='t]%eCt!49!0>', timeout=30, allow_agent=False, look_for_keys=False)
PASSWD = "t]%eCt!49!0>"

sql = """
SELECT column_name FROM information_schema.columns WHERE table_name='salary_structures' ORDER BY ordinal_position;
SELECT column_name FROM information_schema.columns WHERE table_name='employees' ORDER BY ordinal_position;
SELECT column_name FROM information_schema.columns WHERE table_name='leave_requests' ORDER BY ordinal_position;
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
SELECT name FROM "SequelizeMeta" ORDER BY name;
"""

sftp = c.open_sftp()
with sftp.file("/tmp/check.sql", "w") as f:
    f.write(sql)
sftp.close()

_, o, e = c.exec_command(
    f"echo '{PASSWD}' | sudo -S bash -c \"PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h 127.0.0.1 -U hrm_app -d skyraksys_hrm_prod -f /tmp/check.sql\"",
    timeout=30
)
ec = o.channel.recv_exit_status()
out = o.read().decode()
err = e.read().decode()
print(out)
if ec != 0:
    print(f"ERR: {err[-300:]}")

# Cleanup
c.exec_command("rm /tmp/check.sql")
c.close()
