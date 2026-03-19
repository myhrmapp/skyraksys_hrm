# Fix network connectivity and retry deployment

$ErrorActionPreference = "Stop"

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARNING] $args" -ForegroundColor Yellow }

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host " Fixing Network and Retrying Deployment" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Upload network fix script
Write-Info "Uploading network fix script..."
pscp -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD scripts\deploy\fix-network-and-deploy.sh ${SERVER_USER}@${SERVER_IP}:/tmp/fix-network-and-deploy.sh

if ($LASTEXITCODE -ne 0) {
    Write-Warn "Failed to upload fix script"
    exit 1
}

Write-Success "Fix script uploaded"

# Make executable
Write-Info "Making script executable..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "chmod +x /tmp/fix-network-and-deploy.sh"

# Execute fix and deployment
Write-Info "Executing network fix and deployment..."
Write-Warn "This will take 10-15 minutes..."
Write-Host ""

$fixCommand = "echo '$SERVER_PASSWORD' | sudo -S bash /tmp/fix-network-and-deploy.sh"
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} $fixCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " Deployment Completed Successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Success "Application: https://skyait.skyraksys.com"
    Write-Success "API Health: https://skyait.skyraksys.com/api/health"
} else {
    Write-Warn "Deployment encountered issues. Check output above."
}

Write-Host ""
