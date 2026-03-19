# Download Docker images without Docker (using Registry API v2)

$ErrorActionPreference = "Continue"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARNING] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Download Docker Images (No Docker)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Create output directory
$outputDir = "docker-images-downloaded"
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# Skopeo - tool to download images without Docker
Write-Info "Checking if skopeo is available..."

# Try to download skopeo for Windows
$skopeoUrl = "https://github.com/containers/skopeo/releases/latest/download/skopeo.exe"
$skopeoPath = ".\skopeo.exe"

if (!(Test-Path $skopeoPath)) {
    Write-Info "Downloading skopeo (tool to download images without Docker)..."
    try {
        Invoke-WebRequest -Uri $skopeoUrl -OutFile $skopeoPath -UseBasicParsing
        Write-Success "skopeo downloaded"
    } catch {
        Write-Warn "Could not download skopeo automatically"
        Write-Info "Alternative: Download manually from https://github.com/containers/skopeo/releases"
        Write-Host ""
        Write-Info "Or use Option 2 below..."
    }
}

if (Test-Path $skopeoPath) {
    Write-Host ""
    Write-Info "Downloading images using skopeo..."
    
    $images = @(
        @{name="postgres"; tag="17-alpine"; output="postgres_17-alpine.tar"}
        @{name="node"; tag="18-alpine"; output="node_18-alpine.tar"}
        @{name="nginx"; tag="alpine"; output="nginx_alpine.tar"}
    )
    
    foreach ($img in $images) {
        $outputFile = "$outputDir\$($img.output)"
        if (Test-Path $outputFile) {
            Write-Success "Already downloaded: $($img.output)"
            continue
        }
        
        Write-Info "Downloading $($img.name):$($img.tag)..."
        $source = "docker://docker.io/library/$($img.name):$($img.tag)"
        $dest = "docker-archive:$outputFile"
        
        & $skopeoPath copy $source $dest
        
        if ($LASTEXITCODE -eq 0) {
            $size = (Get-Item $outputFile).Length / 1MB
            Write-Success "Downloaded: $($img.output) ($([math]::Round($size, 2)) MB)"
        } else {
            Write-Warn "Failed to download: $($img.name):$($img.tag)"
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host " Alternative Simple Solution" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Warn "Docker images need special handling"
Write-Info "Simplest options:"
Write-Host "  1. Ask Hetzner to enable internet for 10 minutes" -ForegroundColor Cyan
Write-Host "  2. Free up 3GB on C: drive and install Docker Desktop" -ForegroundColor Cyan
Write-Host "  3. Use a friend's computer with Docker to save images" -ForegroundColor Cyan
Write-Host ""
