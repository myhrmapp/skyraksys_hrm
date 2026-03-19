# Direct network fix commands

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }

Write-Host ""
Write-Info "Applying network fixes..."

# Force IPv4 for APT
Write-Info "Step 1: Force IPv4 for package manager..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S sh -c 'echo Acquire::ForceIPv4 \""true\""; > /etc/apt/apt.conf.d/99force-ipv4'"
Write-Success "IPv4 forced"

# Update DNS
Write-Info "Step 2: Updating DNS servers..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S sh -c 'echo nameserver 1.1.1.1 > /etc/resolv.conf; echo nameserver 8.8.8.8 >> /etc/resolv.conf'"
Write-Success "DNS updated"

# Switch to HTTP
Write-Info "Step 3: Switching to HTTP mirrors..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S sh -c 'cp /etc/apt/sources.list /etc/apt/sources.list.backup-https && sed -i s/https:/http:/g /etc/apt/sources.list'"
Write-Success "Switched to HTTP"

# Test connectivity
Write-Info "Step 4: Testing connectivity..."
$testResult = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "ping -c 2 1.1.1.1" 2>&1
if ($testResult -match "2 received") {
    Write-Success "Internet connectivity restored!"
} else {
    Write-Host "[WARNING] Still no connectivity" -ForegroundColor Yellow
}

# Update apt
Write-Info "Step 5: Updating package lists..."
plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "echo '$SERVER_PASSWORD' | sudo -S apt-get update -o Acquire::ForceIPv4=true"

Write-Host ""
Write-Success "Network fixes complete!"
Write-Host ""
