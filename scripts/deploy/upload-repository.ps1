# Upload repository to server and deploy

$ErrorActionPreference = "Stop"

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"
$REMOTE_DIR = "/home/Rakesh/skyraksys_hrm"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARNING] $args" -ForegroundColor Yellow }

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Uploading Repository to Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Step 1: Create archive of current directory (excluding unnecessary files)
Write-Info "Step 1: Creating repository archive..."
$archiveName = "skyraksys_hrm.zip"

if (Test-Path $archiveName) {
    Remove-Item $archiveName -Force
}

# Compress repository (excluding node_modules, .git, etc.)
Write-Info "  Compressing files (this may take a minute)..."
$excludes = @("node_modules", ".git", "build", "dist", "coverage", "*.log", "docker-offline-packages")

# Use 7-Zip if available, otherwise use PowerShell compression
if (Get-Command 7z -ErrorAction SilentlyContinue) {
    $excludeArgs = $excludes | ForEach-Object { "-xr!$_" }
    & 7z a -tzip $archiveName * $excludeArgs -mx1 | Out-Null
} else {
    # Create temporary directory with only needed files
    $tempDir = "temp_upload"
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
    Copy-Item "." $tempDir -Recurse -Exclude $excludes
    Compress-Archive -Path "$tempDir\*" -DestinationPath $archiveName -Force
    Remove-Item $tempDir -Recurse -Force
}

Write-Success "Archive created: $archiveName"
$archiveSize = (Get-Item $archiveName).Length / 1MB
Write-Info "  Size: $([math]::Round($archiveSize, 2)) MB"

# Step 2: Upload archive to server
Write-Host ""
Write-Info "Step 2: Uploading archive to server..."
Write-Warn "  This may take several minutes depending on file size..."

pscp -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD $archiveName "${SERVER_USER}@${SERVER_IP}:/tmp/"

if ($LASTEXITCODE -eq 0) {
    Write-Success "Archive uploaded"
} else {
    Write-Err "Failed to upload archive"
    exit 1
}

# Step 3: Extract on server
Write-Host ""
Write-Info "Step 3: Extracting archive on server..."

$extractScript = @"
cd /tmp
echo 'Installing unzip if needed...'
if ! command -v unzip &> /dev/null; then
    echo 'unzip not found, trying manual extraction...'
    # If unzip not available, we'll need to handle .zip differently
fi

echo 'Creating target directory...'
mkdir -p $REMOTE_DIR

echo 'Extracting archive...'
if command -v unzip &> /dev/null; then
    unzip -q -o $archiveName -d $REMOTE_DIR
else
    echo 'ERROR: unzip not available and server has no internet'
    echo 'Please install unzip manually or use tar.gz archive'
    exit 1
fi

echo 'Setting permissions...'
chmod -R 755 $REMOTE_DIR

echo 'Cleanup...'
rm /tmp/$archiveName

echo 'Repository extracted successfully!'
ls -la $REMOTE_DIR
"@

plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "bash -c '$extractScript'"

if ($LASTEXITCODE -eq 0) {
    Write-Success "Repository extracted on server"
} else {
    Write-Warn "Extraction may have failed - check if unzip is installed"
}

# Cleanup local archive
Write-Host ""
Write-Info "Cleaning up local archive..."
Remove-Item $archiveName -Force
Write-Success "Cleanup complete"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Repository Uploaded Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Info "Repository location on server: $REMOTE_DIR"
Write-Info "Next step: Configure environment and start Docker containers"
Write-Host ""
