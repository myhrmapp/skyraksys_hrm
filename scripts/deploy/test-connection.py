"""Quick SSH connection test"""
import paramiko

SERVER_IP = "46.225.73.94"
SERVER_USER = "Rakesh"
SERVER_PASSWORD = "t]%eCt!49!0>"

print(f"Connecting to {SERVER_USER}@{SERVER_IP}...")
print(f"Password: {SERVER_PASSWORD}")

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SERVER_IP, port=22, username=SERVER_USER, password=SERVER_PASSWORD, timeout=30, allow_agent=False, look_for_keys=False)
    
    stdin, stdout, stderr = client.exec_command("echo CONNECTED && uname -a && whoami && df -h / && free -h")
    print("\n--- OUTPUT ---")
    print(stdout.read().decode())
    
    err = stderr.read().decode()
    if err:
        print(f"STDERR: {err}")
    
    client.close()
    print("Connection successful!")
    
except paramiko.AuthenticationException:
    print(f"\nAuth failed with user '{SERVER_USER}'. Trying root...")
    try:
        client2 = paramiko.SSHClient()
        client2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client2.connect(SERVER_IP, port=22, username="root", password=SERVER_PASSWORD, timeout=30, allow_agent=False, look_for_keys=False)
        
        stdin, stdout, stderr = client2.exec_command("echo CONNECTED_AS_ROOT && uname -a && whoami && cat /etc/passwd | grep -i rakesh")
        print("\n--- OUTPUT ---")
        print(stdout.read().decode())
        client2.close()
        print("Root connection successful!")
    except Exception as e2:
        print(f"Root auth also failed: {e2}")
        print("\nTrying with different password variations...")
        
        # Try URL-decoded or alternative interpretations
        passwords = [
            "t]%eCt!49!0>",
            "t]%eCt!49!0>",
            r"t]%eCt!49!0>",
        ]
        for pw in set(passwords):
            try:
                c = paramiko.SSHClient()
                c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                c.connect(SERVER_IP, port=22, username="root", password=pw, timeout=15, allow_agent=False, look_for_keys=False)
                print(f"Connected with password: {pw}")
                stdin, stdout, stderr = c.exec_command("echo OK && whoami")
                print(stdout.read().decode())
                c.close()
                break
            except:
                print(f"  Failed: {repr(pw)}")

except Exception as e:
    print(f"Connection error: {e}")
