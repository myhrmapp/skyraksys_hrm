# Upload and load Docker images on server

$ErrorActionPreference = "Stop"

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"
$IMAGES_DIR = "D:\docker-images"
$REMOTE_DIR = "/tmp/docker-images"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARNING] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Uploading Docker Images to Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if images exist
if (!(Test-Path $IMAGES_DIR)) {
    Write-Err "Images directory not found! Run download-docker-images.ps1 first"
    exit 1
}

$imageFiles = Get-ChildItem $IMAGES_DIR -Filter "*.tar"
if ($imageFiles.Count -eq 0) {
    Write-Err "No image files found in $IMAGES_DIR"
    exit 1
}

Write-Info "Found $($imageFiles.Count) image files to upload"
Write-Host ""

# Step 1: Create remote directory
Write-Info "Step 1: Creating remote directory..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "mkdir -p $REMOTE_DIR"
Write-Success "Remote directory created"

# Step 2: Upload images
Write-Info "Step 2: Uploading images (this will take several minutes)..."
foreach ($imageFile in $imageFiles) {
    $sizeMB = [math]::Round($imageFile.Length / 1MB, 2)
    Write-Info "  Uploading: $($imageFile.Name) ($sizeMB MB)"
    
    pscp -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD $imageFile.FullName "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "  Uploaded: $($imageFile.Name)"
    } else {
        Write-Err "  Failed to upload: $($imageFile.Name)"
        exit 1
    }
}
Write-Success "All images uploaded"
Write-Host ""

# Step 3: Load images into Docker
Write-Info "Step 3: Loading images into Docker on server..."

$loadScript = @"
cd $REMOTE_DIR
echo 'Loading Docker images...'
for img in *.tar; do
    echo "Loading: \`$img"
    sudo docker load -i "\`$img"
done
echo 'Verifying loaded images...'
sudo docker images
"@

plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S bash -c '$loadScript'"

if ($LASTEXITCODE -eq 0) {
    Write-Success "Images loaded successfully"
} else {
    Write-Err "Failed to load images"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Images Ready on Server!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Success "Docker images are now available for deployment"
Write-Host ""
