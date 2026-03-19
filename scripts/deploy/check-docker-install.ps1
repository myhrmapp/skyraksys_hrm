# Check Docker installation status

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"

Write-Host "Checking Docker installation..." -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Checking if docker binary exists:" -ForegroundColor Yellow
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "ls -la /usr/bin/docker* 2>&1"

Write-Host "`n2. Checking installed packages:" -ForegroundColor Yellow
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "dpkg -l | grep docker"

Write-Host "`n3. Checking what's in /tmp/docker-packages:" -ForegroundColor Yellow
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "ls -lh /tmp/docker-packages/"

Write-Host "`n4. Checking docker service status:" -ForegroundColor Yellow
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S systemctl status docker 2>&1 | head -10"
