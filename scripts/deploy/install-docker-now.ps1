# Actually install Docker packages that are already on server

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Installing Docker Packages" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Info "Step 1: Installing containerd.io..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "cd /tmp/docker-packages && echo '$SERVER_PASSWORD' | sudo -S dpkg -i containerd.io.deb"
Write-Success "containerd.io installed"

Write-Info "Step 2: Installing docker-ce-cli..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "cd /tmp/docker-packages && echo '$SERVER_PASSWORD' | sudo -S dpkg -i docker-ce-cli.deb"
Write-Success "docker-ce-cli installed"

Write-Info "Step 3: Installing docker-ce..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "cd /tmp/docker-packages && echo '$SERVER_PASSWORD' | sudo -S dpkg -i docker-ce.deb"
Write-Success "docker-ce installed"

Write-Info "Step 4: Installing docker-buildx-plugin..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "cd /tmp/docker-packages && echo '$SERVER_PASSWORD' | sudo -S dpkg -i docker-buildx-plugin.deb"
Write-Success "docker-buildx-plugin installed"

Write-Info "Step 5: Installing docker-compose-plugin..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "cd /tmp/docker-packages && echo '$SERVER_PASSWORD' | sudo -S dpkg -i docker-compose-plugin.deb"
Write-Success "docker-compose-plugin installed"

Write-Host ""
Write-Info "Step 6: Starting Docker service..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S systemctl start docker && sudo -S systemctl enable docker"
Write-Success "Docker service started"

Write-Info "Step 7: Adding user to docker group..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S usermod -aG docker $SERVER_USER"
Write-Success "User added to docker group"

Write-Host ""
Write-Info "Step 8: Verifying installation..."
$version = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S docker --version"
Write-Host $version

$composeVersion = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S docker compose version"
Write-Host $composeVersion

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Docker Installed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
