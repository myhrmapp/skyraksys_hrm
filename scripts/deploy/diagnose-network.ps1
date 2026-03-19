# Network Diagnostics Script for Server

$ErrorActionPreference = "Stop"

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARNING] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Server Network Diagnostics" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Info "Running network diagnostics on server..."
Write-Host ""

# Run diagnostics
$diagnostics = @"
echo '=== Network Interface Status ==='
ip addr show
echo ''
echo '=== Default Route ==='
ip route show
echo ''
echo '=== DNS Configuration ==='
cat /etc/resolv.conf
echo ''
echo '=== Test Ping to Gateway ==='
ip route | grep default | awk '{print `$3}' | xargs -I {} ping -c 3 {}
echo ''
echo '=== Test Ping to Google DNS ==='
ping -c 3 8.8.8.8
echo ''
echo '=== Test DNS Resolution ==='
nslookup google.com
echo ''
echo '=== Firewall Status ==='
sudo ufw status
echo ''
echo '=== Check if IPv6 is causing issues ==='
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
"@

plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} $diagnostics

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host " Diagnostics Complete" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
