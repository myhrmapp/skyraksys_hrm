# Download Docker packages for Ubuntu 24.04 (Noble) - Offline Installation

$ErrorActionPreference = "Stop"

$UBUNTU_VERSION = "noble"
$ARCH = "amd64"
$DOWNLOAD_DIR = "docker-offline-packages"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARNING] $args" -ForegroundColor Yellow }

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Downloading Docker Packages Offline" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Create download directory
if (!(Test-Path $DOWNLOAD_DIR)) {
    New-Item -ItemType Directory -Path $DOWNLOAD_DIR | Out-Null
    Write-Success "Created directory: $DOWNLOAD_DIR"
} else {
    Write-Info "Using existing directory: $DOWNLOAD_DIR"
}

# Docker package URLs for Ubuntu 24.04 Noble
$packages = @{
    "containerd.io" = "https://download.docker.com/linux/ubuntu/dists/noble/pool/stable/amd64/containerd.io_1.7.24-1_amd64.deb"
    "docker-ce-cli" = "https://download.docker.com/linux/ubuntu/dists/noble/pool/stable/amd64/docker-ce-cli_27.4.1-1~ubuntu.24.04~noble_amd64.deb"
    "docker-ce" = "https://download.docker.com/linux/ubuntu/dists/noble/pool/stable/amd64/docker-ce_27.4.1-1~ubuntu.24.04~noble_amd64.deb"
    "docker-buildx-plugin" = "https://download.docker.com/linux/ubuntu/dists/noble/pool/stable/amd64/docker-buildx-plugin_0.19.3-1~ubuntu.24.04~noble_amd64.deb"
    "docker-compose-plugin" = "https://download.docker.com/linux/ubuntu/dists/noble/pool/stable/amd64/docker-compose-plugin_2.32.1-1~ubuntu.24.04~noble_amd64.deb"
}

Write-Info "Downloading Docker packages..."
Write-Host ""

foreach ($package in $packages.GetEnumerator()) {
    $filename = $package.Key + ".deb"
    $filepath = Join-Path $DOWNLOAD_DIR $filename
    
    if (Test-Path $filepath) {
        Write-Success "Already downloaded: $filename"
    } else {
        Write-Info "Downloading: $filename"
        try {
            Invoke-WebRequest -Uri $package.Value -OutFile $filepath -UseBasicParsing
            Write-Success "Downloaded: $filename"
        } catch {
            Write-Warn "Failed to download $filename : $_"
            Write-Info "Trying alternative method..."
            # Try with curl if available
            curl.exe -L -o $filepath $package.Value
            if (Test-Path $filepath) {
                Write-Success "Downloaded with curl: $filename"
            } else {
                Write-Warn "Could not download $filename"
            }
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Download Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Info "Packages saved to: $DOWNLOAD_DIR"
Write-Info "Total files: $(Get-ChildItem $DOWNLOAD_DIR | Measure-Object | Select-Object -ExpandProperty Count)"
Write-Host ""
Write-Info "Next: Run upload-and-install-docker.ps1 to install on server"
Write-Host ""
