# Master Offline Deployment Script

$ErrorActionPreference = "Stop"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARNING] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

Write-Host ""
Write-Host "╔═══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  SkyrakSys HRM - Offline Deployment      ║" -ForegroundColor Green
Write-Host "║  (No Internet Required on Server)        ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Warn "This deployment works WITHOUT internet on server"
Write-Info "Your Windows machine needs internet to download packages"
Write-Host ""

# Check if scripts exist
$scriptsPath = ".\scripts\deploy"
$requiredScripts = @(
    "download-docker-offline.ps1",
    "upload-and-install-docker.ps1",
    "upload-repository.ps1"
)

foreach ($script in $requiredScripts) {
    if (!(Test-Path "$scriptsPath\$script")) {
        Write-Err "Missing script: $script"
        exit 1
    }
}

Write-Success "All scripts found"
Write-Host ""

# Prompt user
Write-Host "This will perform the following steps:" -ForegroundColor Yellow
Write-Host "  1. Download Docker packages to your Windows PC"
Write-Host "  2. Upload Docker packages to server"
Write-Host "  3. Install Docker on server (offline)"
Write-Host "  4. Upload repository code to server"
Write-Host "  5. Configure and start containers"
Write-Host ""
$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne "y") {
    Write-Info "Deployment cancelled"
    exit 0
}

# Step 1: Download Docker packages
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " STEP 1: Downloading Docker Packages" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

& "$scriptsPath\download-docker-offline.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed to download Docker packages"
    exit 1
}

# Step 2: Upload and install Docker
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " STEP 2: Installing Docker on Server" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

& "$scriptsPath\upload-and-install-docker.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed to install Docker"
    exit 1
}

# Step 3: Upload repository
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " STEP 3: Uploading Repository" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

& "$scriptsPath\upload-repository.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed to upload repository"
    exit 1
}

# Step 4: Note about Docker images
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Yellow
Write-Host " IMPORTANT: Docker Images" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Warn "Docker images cannot be downloaded without internet"
Write-Info "Two options:"
Write-Host "  A) Temporarily enable internet on server to pull images"
Write-Host "  B) Save images locally and upload them (coming in next script)"
Write-Host ""

# Final message
Write-Host ""
Write-Host "╔═══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Offline Setup Complete!                 ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Success "Docker installed:     /usr/bin/docker"
Write-Success "Repository uploaded:  /home/Rakesh/skyraksys_hrm"
Write-Host ""
Write-Info "Next: Configure environment and handle Docker images"
Write-Host ""
