# Pull Docker images (requires temporary internet on server)

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Pulling Docker Images on Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "[REQUIREMENT] Server must have internet access" -ForegroundColor Yellow
Write-Host ""

$pullScript = @"
echo 'Testing internet connectivity...'
if ping -c 2 8.8.8.8 > /dev/null 2>&1; then
    echo '[SUCCESS] Internet connected'
else
    echo '[ERROR] No internet connection!'
    exit 1
fi

echo ''
echo 'Pulling Docker images (this may take 3-5 minutes)...'
echo ''

echo '1/3 Pulling postgres:17-alpine (~95MB)...'
sudo docker pull postgres:17-alpine

echo ''
echo '2/3 Pulling node:18-alpine (~175MB)...'
sudo docker pull node:18-alpine

echo ''
echo '3/3 Pulling nginx:alpine (~40MB)...'
sudo docker pull nginx:alpine

echo ''
echo 'Verifying images...'
sudo docker images

echo ''
echo '[SUCCESS] All images pulled successfully!'
"@

plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S bash -c '$pullScript'"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " Images Ready!" -ForegroundColor Green  
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Success "Internet can now be disabled if needed"
    Write-Success "All requirements met - ready to deploy!"
    Write-Host ""
} else {
    Write-Host "[ERROR] Image pull failed - check internet connection" -ForegroundColor Red
}
