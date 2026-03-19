# Download Docker images locally and save them

$ErrorActionPreority = "Stop"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARNING] $args" -ForegroundColor Yellow }

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Downloading Docker Images Locally" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Warn "This requires Docker Desktop to be installed and running on Windows"
Write-Host ""

# Check if Docker is available
try {
    $dockerVersion = docker --version
    Write-Success "Docker found: $dockerVersion"
} catch {
    Write-Err "Docker not found. Please install Docker Desktop for Windows"
    Write-Info "Download from: https://www.docker.com/products/docker-desktop"
    exit 1
}

# Create images directory
$imagesDir = "docker-images"
if (!(Test-Path $imagesDir)) {
    New-Item -ItemType Directory -Path $imagesDir | Out-Null
}

# Images needed for deployment
$images = @(
    "postgres:17-alpine",
    "node:18-alpine",
    "nginx:alpine"
)

Write-Host ""
foreach ($image in $images) {
    $imageName = $image.Replace(":", "_").Replace("/", "_")
    $imageFile = "$imagesDir\$imageName.tar"
    
    Write-Info "Processing: $image"
    
    if (Test-Path $imageFile) {
        Write-Success "  Already saved: $imageFile"
        continue
    }
    
    Write-Info "  Pulling image from Docker Hub..."
    docker pull $image
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "  Image pulled"
        
        Write-Info "  Saving image to file..."
        docker save -o $imageFile $image
        
        if ($LASTEXITCODE -eq 0) {
            $size = (Get-Item $imageFile).Length / 1MB
            Write-Success "  Saved: $imageFile ($([math]::Round($size, 2)) MB)"
        } else {
            Write-Warn "  Failed to save image"
        }
    } else {
        Write-Warn "  Failed to pull image"
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Green
Write-Host " Download Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Info "Images saved to: $imagesDir"
Write-Info "Total files: $(Get-ChildItem $imagesDir -Filter '*.tar' | Measure-Object | Select-Object -ExpandProperty Count)"
$totalSize = (Get-ChildItem $imagesDir -Filter '*.tar' | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Info "Total size: $([math]::Round($totalSize, 2)) MB"
Write-Host ""
Write-Info "Next: Run upload-docker-images.ps1 to upload to server"
Write-Host ""
