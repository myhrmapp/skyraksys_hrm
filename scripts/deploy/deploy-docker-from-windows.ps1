# SkyrakSys HRM - One-Click Docker Deployment from Windows
# 
# This script will:
#   1. Upload the deployment script to server
#   2. Execute deployment remotely
#   3. Monitor deployment progress
#
# Server: skyait.skyraksys.com (46.225.73.94)
# User: Rakesh
# Password: t]%eCt!49!0>

$ErrorActionPreference = "Stop"

# Configuration
$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$DOMAIN = "skyait.skyraksys.com"

# Colors
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warning { Write-Host "[WARNING] $args" -ForegroundColor Yellow }
function Write-Error-Custom { Write-Host "[ERROR] $args" -ForegroundColor Red }

# Banner
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   SkyrakSys HRM - Docker Deployment (from Windows)       ║" -ForegroundColor Green
Write-Host "║   Server: skyait.skyraksys.com (46.225.73.94)             ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Check if plink exists (PuTTY)
if (!(Get-Command plink -ErrorAction SilentlyContinue)) {
    Write-Warning "PuTTY (plink) not found. Please install PuTTY or use WSL."
    Write-Info "Download from: https://www.putty.org/"
    exit 1
}

Write-Info "Testing SSH connection..."
$testConnection = echo y | plink -ssh -batch -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo Connected" 2>&1
if ($testConnection -match "Connected") {
    Write-Success "SSH connection successful"
} else {
    Write-Error-Custom "SSH connection failed"
    Write-Info "Please verify server credentials and connectivity"
    exit 1
}

# Step 1: Upload deployment script
Write-Info "Step 1: Uploading deployment script to server..."

$scriptPath = "scripts\deploy\cleanup-and-deploy-docker.sh"
if (!(Test-Path $scriptPath)) {
    Write-Error-Custom "Deployment script not found: $scriptPath"
    exit 1
}

# Use pscp (PuTTY SCP) to upload
pscp -batch -pw $SERVER_PASSWORD $scriptPath ${SERVER_USER}@${SERVER_IP}:/tmp/cleanup-and-deploy-docker.sh

if ($LASTEXITCODE -eq 0) {
    Write-Success "Deployment script uploaded"
} else {
    Write-Error-Custom "Failed to upload deployment script"
    exit 1
}

# Step 2: Make script executable
Write-Info "Step 2: Making script executable..."
plink -ssh -batch -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "chmod +x /tmp/cleanup-and-deploy-docker.sh"
Write-Success "Script permissions set"

# Step 3: Execute deployment
Write-Info "Step 3: Executing deployment on server..."
Write-Warning "This will take 10-15 minutes. Please wait..."
Write-Host ""

# Run deployment as root (using sudo)
$deployCommand = "echo '$SERVER_PASSWORD' | sudo -S bash /tmp/cleanup-and-deploy-docker.sh"

plink -ssh -batch -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} $deployCommand

if ($LASTEXITCODE -eq 0) {
    Write-Success "Deployment completed successfully!"
} else {
    Write-Error-Custom "Deployment failed. Check server logs."
    exit 1
}

# Step 4: Final verification
Write-Host ""
Write-Info "Step 4: Verifying deployment..."

Start-Sleep -Seconds 10

try {
    $response = Invoke-WebRequest -Uri "https://$DOMAIN/api/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Success "✓ API health check passed"
    }
} catch {
    Write-Warning "✗ API health check failed (SSL may still be configuring)"
}

# Final output
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║          Deployment Completed Successfully!               ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Info "Application URL: https://$DOMAIN"
Write-Info "API Health: https://$DOMAIN/api/health"
Write-Info "pgAdmin: http://$DOMAIN:8081"
Write-Host ""
Write-Warning "Default Admin Credentials:"
Write-Warning "  Email: admin@skyraksys.com"
Write-Warning "  Password: admin123"
Write-Warning "  WARNING: CHANGE THESE IMMEDIATELY AFTER FIRST LOGIN!"
Write-Host ""
Write-Info "To view server logs:"
Write-Info "  plink -ssh -batch -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} 'cd /home/Rakesh/skyraksys_hrm && sudo docker-compose logs -f'"
Write-Host ""
Write-Success "Deployment script completed!"
Write-Host ""
