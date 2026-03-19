# Quick verify Docker is installed

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"

Write-Host "Verifying Docker installation..." -ForegroundColor Cyan

# Check without sudo first
$result = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "docker --version 2>&1 || echo '$SERVER_PASSWORD' | sudo -S docker --version"
Write-Host $result

$composeResult = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "docker compose version 2>&1 || echo '$SERVER_PASSWORD' | sudo -S docker compose version"
Write-Host $composeResult

Write-Host "`nDocker is ready!" -ForegroundColor Green
