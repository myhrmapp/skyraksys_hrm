# Upload and install Docker packages on server (offline)

$ErrorActionPreference = "Stop"

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"
$DOWNLOAD_DIR = "docker-offline-packages"
$REMOTE_DIR = "/tmp/docker-packages"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARNING] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Installing Docker Offline" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if packages exist
if (!(Test-Path $DOWNLOAD_DIR)) {
    Write-Err "Packages not found! Run download-docker-offline.ps1 first"
    exit 1
}

$packages = Get-ChildItem $DOWNLOAD_DIR -Filter "*.deb"
if ($packages.Count -eq 0) {
    Write-Err "No .deb packages found in $DOWNLOAD_DIR"
    exit 1
}

Write-Info "Found $($packages.Count) packages to upload"
Write-Host ""

# Step 1: Create remote directory
Write-Info "Step 1: Creating remote directory..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "mkdir -p $REMOTE_DIR"
Write-Success "Remote directory created"

# Step 2: Upload packages
Write-Info "Step 2: Uploading packages to server (this may take a few minutes)..."
foreach ($package in $packages) {
    Write-Info "  Uploading: $($package.Name)"
    pscp -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD $package.FullName "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/"
    if ($LASTEXITCODE -eq 0) {
        Write-Success "  Uploaded: $($package.Name)"
    } else {
        Write-Err "  Failed to upload: $($package.Name)"
        exit 1
    }
}
Write-Success "All packages uploaded"
Write-Host ""

# Step 3: Install packages on server
Write-Info "Step 3: Installing Docker packages on server..."
Write-Info "  This installs packages in order: containerd -> docker-ce-cli -> docker-ce -> buildx -> compose"

$installScript = @"
cd $REMOTE_DIR

# Install in correct dependency order
echo 'Installing containerd.io...'
sudo dpkg -i containerd.io.deb 2>&1 | grep -v 'dpkg-deb\|tar\|xz'

echo 'Installing docker-ce-cli...'
sudo dpkg -i docker-ce-cli.deb 2>&1 | grep -v 'dpkg-deb\|tar\|xz'

echo 'Installing docker-ce...'
sudo dpkg -i docker-ce.deb 2>&1 | grep -v 'dpkg-deb\|tar\|xz'

echo 'Installing docker-buildx-plugin...'
sudo dpkg -i docker-buildx-plugin.deb 2>&1 | grep -v 'dpkg-deb\|tar\|xz'

echo 'Installing docker-compose-plugin...'
sudo dpkg -i docker-compose-plugin.deb 2>&1 | grep -v 'dpkg-deb\|tar\|xz'

# Start Docker
echo 'Starting Docker service...'
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
echo 'Adding user to docker group...'
sudo usermod -aG docker \`$USER

# Verify installation
echo 'Verifying Docker installation...'
sudo docker --version
sudo docker compose version

echo 'Docker installation complete!'
"@

plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S bash -c '$installScript'"

if ($LASTEXITCODE -eq 0) {
    Write-Success "Docker installed successfully!"
} else {
    Write-Err "Docker installation failed"
    exit 1
}

# Step 4: Verify
Write-Host ""
Write-Info "Step 4: Verifying installation..."
$version = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "sudo docker --version" 2>&1
Write-Host $version

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Docker Installed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Success "Next step: Clone repository to server"
Write-Host ""
