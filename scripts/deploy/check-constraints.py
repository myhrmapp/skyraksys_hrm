"""Check existing constraints and indexes in the fresh DB"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('46.225.73.94', username='Rakesh', password='t]%eCt!49!0>', timeout=30, allow_agent=False, look_for_keys=False)
PASSWD = "t]%eCt!49!0>"

sql = """
-- Check audit_logs FK
SELECT constraint_name, constraint_type FROM information_schema.table_constraints 
WHERE table_name = 'audit_logs' ORDER BY constraint_name;

-- Check salary_structures constraints
SELECT constraint_name, constraint_type FROM information_schema.table_constraints 
WHERE table_name = 'salary_structures' ORDER BY constraint_name;

-- Check payslip_templates constraints
SELECT constraint_name, constraint_type FROM information_schema.table_constraints 
WHERE table_name = 'payslip_templates' ORDER BY constraint_name;

-- Check projects constraints
SELECT constraint_name, constraint_type FROM information_schema.table_constraints 
WHERE table_name = 'projects' ORDER BY constraint_name;

-- Check payroll_data PK type
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'payroll_data' AND column_name = 'id';

-- Check all indexes  
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' ORDER BY tablename, indexname;
"""

sftp = c.open_sftp()
with sftp.file("/tmp/check_constraints.sql", "w") as f:
    f.write(sql)
sftp.close()

_, o, e = c.exec_command(
    f"echo '{PASSWD}' | sudo -S bash -c \"PGPASSWORD='HrM_Pr0d_S3cur3_2026!' psql -h 127.0.0.1 -U hrm_app -d skyraksys_hrm_prod -f /tmp/check_constraints.sql\"",
    timeout=30
)
print(o.read().decode())
err = e.read().decode()
if 'ERROR' in err: print(f"ERR: {err}")
c.close()
