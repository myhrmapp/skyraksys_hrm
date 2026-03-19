# Quick fix: Disable IPv6 and update DNS

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }

Write-Host ""
Write-Info "Applying network fixes..."
Write-Host ""

$fixCommands = @"
echo '$SERVER_PASSWORD' | sudo -S bash << 'EOF'

# Force IPv4
echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4

# Update DNS to use Cloudflare (more reliable)
echo 'nameserver 1.1.1.1' > /etc/resolv.conf
echo 'nameserver 1.0.0.1' >> /etc/resolv.conf
echo 'nameserver 8.8.8.8' >> /etc/resolv.conf

# Test connectivity
echo ''
echo 'Testing connectivity...'
ping -c 2 1.1.1.1

# Switch to HTTP mirrors (not HTTPS)
cp /etc/apt/sources.list /etc/apt/sources.list.hetzner-backup
sed -i 's|https://|http://|g' /etc/apt/sources.list

# Update package lists
echo ''
echo 'Updating package lists...'
apt-get update

echo ''
echo '[SUCCESS] Network fixes applied'
EOF
"@

plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} $fixCommands

Write-Host ""
Write-Success "Network configured. Testing deployment again..."
Write-Host ""
