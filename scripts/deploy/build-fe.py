"""Just build the frontend - long timeout"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('46.225.73.94', username='Rakesh', password='t]%eCt!49!0>', timeout=30, allow_agent=False, look_for_keys=False)

print("Building frontend (this may take 2-5 minutes)...")
_, o, e = c.exec_command(
    "cd /var/www/skyraksys_hrm/frontend && npm run build 2>&1",
    timeout=600
)
ec = o.channel.recv_exit_status()
out = o.read().decode().strip()
lines = out.split('\n')
for l in lines[-20:]:
    print(f"  {l}")
if ec != 0:
    print(f"EXIT CODE: {ec}")
    print(e.read().decode()[-300:])
else:
    print("BUILD SUCCESS!")

# Check build output
_, o2, _ = c.exec_command("ls -la /var/www/skyraksys_hrm/frontend/build/ | head -10 && du -sh /var/www/skyraksys_hrm/frontend/build/", timeout=10)
o2.channel.recv_exit_status()
print(o2.read().decode())

c.close()
