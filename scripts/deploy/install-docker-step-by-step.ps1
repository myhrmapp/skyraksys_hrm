# Step 1: Install Docker (step-by-step)

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARNING] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Installing Docker (Step-by-Step)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Step 1.1: Update package lists
Write-Info "Step 1.1: Updating package lists..."
$result = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S apt-get update -o Acquire::ForceIPv4=true -o Acquire::Retries=3 -o Acquire::http::Timeout=10" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Package lists updated"
} else {
    Write-Err "Failed to update package lists"
    Write-Host $result
    exit 1
}

# Step 1.2: Install prerequisites
Write-Info "Step 1.2: Installing prerequisites (ca-certificates, curl, gnupg)..."
$result = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S apt-get install -y ca-certificates curl gnupg -o Acquire::ForceIPv4=true" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Prerequisites installed"
} else {
    Write-Err "Failed to install prerequisites"
    Write-Host $result
    exit 1
}

# Step 1.3: Add Docker GPG key
Write-Info "Step 1.3: Adding Docker GPG key..."
$result = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S sh -c 'install -m 0755 -d /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && chmod a+r /etc/apt/keyrings/docker.gpg'" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Docker GPG key added"
} else {
    Write-Err "Failed to add Docker GPG key"
    Write-Host $result
    exit 1
}

# Step 1.4: Add Docker repository
Write-Info "Step 1.4: Adding Docker repository..."
$result = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} @"
echo '$SERVER_PASSWORD' | sudo -S sh -c 'echo \"deb [arch=\`$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \`$(. /etc/os-release && echo \`$VERSION_CODENAME) stable\" | tee /etc/apt/sources.list.d/docker.list > /dev/null'
"@ 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Docker repository added"
} else {
    Write-Err "Failed to add Docker repository"
    Write-Host $result
    exit 1
}

# Step 1.5: Update package lists again
Write-Info "Step 1.5: Updating package lists with Docker repository..."
$result = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S apt-get update -o Acquire::ForceIPv4=true" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Package lists updated"
} else {
    Write-Err "Failed to update package lists"
    Write-Host $result
    exit 1
}

# Step 1.6: Install Docker
Write-Info "Step 1.6: Installing Docker Engine (this may take 2-3 minutes)..."
$result = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -o Acquire::ForceIPv4=true" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Docker Engine installed"
} else {
    Write-Err "Failed to install Docker Engine"
    Write-Host $result
    exit 1
}

# Step 1.7: Start Docker service
Write-Info "Step 1.7: Starting Docker service..."
$result = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S systemctl start docker && sudo systemctl enable docker" 2>&1
Write-Success "Docker service started and enabled"

# Step 1.8: Add user to docker group
Write-Info "Step 1.8: Adding user to docker group..."
$result = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S usermod -aG docker `$USER" 2>&1
Write-Success "User added to docker group"

# Step 1.9: Verify Docker installation
Write-Info "Step 1.9: Verifying Docker installation..."
$result = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S docker --version" 2>&1
Write-Host $result
Write-Success "Docker installation complete!"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Docker Installed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
