# ==============================================================================
# SkyrakSys HRM — One-Click First-Time Deploy (Windows)
#
# PURPOSE:
#   Launcher for first-time production server setup, run from a Windows machine.
#   Uses PuTTY (plink + pscp) to:
#     1. Upload scripts/deploy/server-full-setup.sh to /tmp/ on the server
#     2. Execute it as root (via sudo) — this does the actual provisioning
#     3. Hit the /api/health endpoint to verify the API is responding
#
# WHEN TO USE:
#   Once only — when setting up a fresh or wiped Ubuntu server for the first time.
#   For day-to-day code updates, SSH in and run redeploy.sh instead.
#
# REQUIRES:
#   - PuTTY installed on this machine (provides plink and pscp commands)
#   - Network access to 46.225.73.94 on port 22
#   - scripts/deploy/server-full-setup.sh present in the local repo
#
# RUNS FROM: Windows developer machine (NOT the server)
# DURATION:  ~15-20 minutes
# SERVER:    skyait.skyraksys.com (46.225.73.94)
# USER:      Rakesh
# ==============================================================================

$ErrorActionPreference = "Stop"

# Configuration
$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$DOMAIN = "skyait.skyraksys.com"

# SERVER_PASSWORD is read from the environment variable SKYRAKSYS_SSH_PASSWORD.
# Set it before running this script:
#   $env:SKYRAKSYS_SSH_PASSWORD = "your_password"
#   .\scripts\deploy\deploy-docker-from-windows.ps1
# Never commit a real password into source code.
if (-not $env:SKYRAKSYS_SSH_PASSWORD) {
    Write-Host "[ERROR] Environment variable SKYRAKSYS_SSH_PASSWORD is not set." -ForegroundColor Red
    Write-Host "  Set it first:  `$env:SKYRAKSYS_SSH_PASSWORD = 'your_server_password'" -ForegroundColor Yellow
    Write-Host "  Then re-run this script." -ForegroundColor Yellow
    exit 1
}
$SERVER_PASSWORD = $env:SKYRAKSYS_SSH_PASSWORD

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

$scriptPath = "scripts\deploy\server-full-setup.sh"
if (!(Test-Path $scriptPath)) {
    Write-Error-Custom "Deployment script not found: $scriptPath"
    exit 1
}

# Use pscp (PuTTY SCP) to upload
pscp -batch -pw $SERVER_PASSWORD $scriptPath ${SERVER_USER}@${SERVER_IP}:/tmp/server-full-setup.sh

if ($LASTEXITCODE -eq 0) {
    Write-Success "Deployment script uploaded"
} else {
    Write-Error-Custom "Failed to upload deployment script"
    exit 1
}

# Step 2: Make script executable
Write-Info "Step 2: Making script executable..."
plink -ssh -batch -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "chmod +x /tmp/server-full-setup.sh"
Write-Success "Script permissions set"

# Step 3: Execute deployment
Write-Info "Step 3: Executing deployment on server..."
Write-Warning "This will take 10-15 minutes. Please wait..."
Write-Host ""

# Run deployment as root (using sudo)
$deployCommand = "echo '$SERVER_PASSWORD' | sudo -S bash /tmp/server-full-setup.sh"

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
    $response = Invoke-WebRequest -Uri "http://$SERVER_IP/api/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Success "✓ API health check passed (HTTP via IP)"
    }
} catch {
    # Also try HTTPS domain in case SSL finished
    try {
        $response2 = Invoke-WebRequest -Uri "https://$DOMAIN/api/health" -UseBasicParsing -TimeoutSec 10
        if ($response2.StatusCode -eq 200) {
            Write-Success "✓ API health check passed (HTTPS)"
        }
    } catch {
        Write-Warning "✗ API health check failed — the app may still be starting up."
        Write-Warning "  Try manually: http://$SERVER_IP  or  http://$DOMAIN"
    }
}

# Final output
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║          Deployment Completed Successfully!               ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Info "Application URL (HTTP via IP — works immediately): http://$SERVER_IP"
Write-Info "Application URL (HTTP domain):                      http://$DOMAIN"
Write-Info "Application URL (HTTPS — after SSL):               https://$DOMAIN"
Write-Info "API Health: http://$SERVER_IP/api/health"
Write-Info "pgAdmin: http://$DOMAIN:8081"
Write-Host ""
Write-Warning "Default Login Accounts (password: admin123):"
Write-Warning "  Super Admin : admin@skyraksys.com"
Write-Warning "  HR Manager  : hr@skyraksys.com"
Write-Warning "  Manager     : manager@skyraksys.com"
Write-Warning "  Employee    : employee@skyraksys.com"
Write-Warning "  WARNING: Change all passwords after first login!"
Write-Host ""
Write-Info "All credentials saved on server: cat ~/.deployment-credentials.txt"
Write-Host ""
Write-Info "To view server logs:"
Write-Info "  plink -ssh -batch -pw `$SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} 'cd /home/Rakesh/skyraksys_hrm && docker compose logs -f'"
Write-Host ""
Write-Success "Deployment script completed!"
Write-Host ""
