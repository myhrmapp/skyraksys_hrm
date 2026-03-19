# Upload repository archive and extract on server

$ErrorActionPreference = "Stop"

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"
$ARCHIVE = "skyraksys_hrm_deploy.tar.gz"
$REMOTE_DIR = "/home/Rakesh/skyraksys_hrm"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Uploading Repository to Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

if (!(Test-Path $ARCHIVE)) {
    Write-Host "[ERROR] Archive not found: $ARCHIVE" -ForegroundColor Red
    exit 1
}

$sizeMB = [math]::Round((Get-Item $ARCHIVE).Length / 1MB, 2)
Write-Info "Archive size: $sizeMB MB"
Write-Host ""

# Upload archive
Write-Info "Uploading to server (this may take 1-2 minutes)..."
pscp -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD $ARCHIVE "${SERVER_USER}@${SERVER_IP}:/tmp/"

if ($LASTEXITCODE -eq 0) {
    Write-Success "Archive uploaded"
} else {
    Write-Host "[ERROR] Upload failed" -ForegroundColor Red
    exit 1
}

# Extract on server
Write-Host ""
Write-Info "Extracting archive on server..."

$extractScript = @"
mkdir -p $REMOTE_DIR
cd $REMOTE_DIR
echo 'Extracting files...'
tar -xzf /tmp/$ARCHIVE -C $REMOTE_DIR
echo 'Setting permissions...'
chmod -R 755 $REMOTE_DIR
echo 'Cleanup...'
rm /tmp/$ARCHIVE
echo 'Done!'
ls -la $REMOTE_DIR | head -20
"@

plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} $extractScript

if ($LASTEXITCODE -eq 0) {
    Write-Success "Repository extracted successfully"
} else {
    Write-Host "[WARNING] Extraction may have issues" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Repository Deployed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Success "Location: $REMOTE_DIR"
Write-Host ""
