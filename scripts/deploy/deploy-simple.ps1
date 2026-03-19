# SkyrakSys HRM - Simple Docker Deployment from Windows

$ErrorActionPreference = "Stop"

# Configuration
$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$DOMAIN = "skyait.skyraksys.com"
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"

# Colors
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARNING] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " SkyrakSys HRM - Docker Deployment" -ForegroundColor Green
Write-Host " Server: skyait.skyraksys.com" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if plink exists (PuTTY)
if (!(Get-Command plink -ErrorAction SilentlyContinue)) {
    Write-Warn "PuTTY (plink) not found. Please install PuTTY"
    Write-Info "Download from: https://www.putty.org/"
    exit 1
}

# Test SSH connection with host key
Write-Info "Testing SSH connection..."

$testConnection = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo Connected" 2>&1
if ($testConnection -match "Connected") {
    Write-Success "SSH connection successful"
} else {
    Write-Err "SSH connection failed"
    Write-Err "Error: $testConnection"
    exit 1
}

# Upload deployment script
Write-Info "Uploading deployment script to server..."

$scriptPath = "scripts\deploy\cleanup-and-deploy-docker.sh"
if (!(Test-Path $scriptPath)) {
    Write-Err "Deployment script not found: $scriptPath"
    exit 1
}

pscp -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD $scriptPath ${SERVER_USER}@${SERVER_IP}:/tmp/cleanup-and-deploy-docker.sh

if ($LASTEXITCODE -eq 0) {
    Write-Success "Deployment script uploaded"
} else {
    Write-Err "Failed to upload deployment script"
    exit 1
}

# Make script executable
Write-Info "Making script executable..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "chmod +x /tmp/cleanup-and-deploy-docker.sh"
Write-Success "Script permissions set"

# Execute deployment
Write-Info "Executing deployment on server..."
Write-Warn "This will take 10-15 minutes. Please wait..."
Write-Host ""

$deployCommand = "echo '$SERVER_PASSWORD' | sudo -S bash /tmp/cleanup-and-deploy-docker.sh"
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} $deployCommand

if ($LASTEXITCODE -eq 0) {
    Write-Success "Deployment completed successfully!"
} else {
    Write-Err "Deployment failed. Check server logs."
    exit 1
}

# Final verification
Write-Host ""
Write-Info "Verifying deployment..."
Start-Sleep -Seconds 10

try {
    $response = Invoke-WebRequest -Uri "https://$DOMAIN/api/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Success "API health check passed"
    }
} catch {
    Write-Warn "API health check failed (SSL may still be configuring)"
}

# Final output
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Info "Application URL: https://$DOMAIN"
Write-Info "API Health: https://$DOMAIN/api/health"
Write-Info "pgAdmin: http://$DOMAIN:8081"
Write-Host ""
Write-Warn "Default Admin Credentials:"
Write-Warn "  Email: admin@skyraksys.com"
Write-Warn "  Password: admin123"
Write-Warn "  WARNING: CHANGE THESE IMMEDIATELY!"
Write-Host ""
Write-Success "Deployment script completed!"
Write-Host ""
