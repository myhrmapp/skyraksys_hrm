# ==============================================================================
# SkyrakSys HRM — Pre/Post-Deploy Server Environment Check (Windows)
#
# PURPOSE:
#   Verifies the production server environment is ready for deployment,
#   or diagnoses why a deployment may have failed.
#
# WHAT IT CHECKS:
#   - Docker installed?
#   - Docker Compose installed?
#   - App repository cloned at ~/skyraksys_hrm?
#   - Available disk space on /
#
# NOTE: This checks the server environment only — it does NOT check whether
#   containers are running or whether HTTP endpoints are reachable.
#   For container health: SSH in and run: docker compose ps
#   For HTTP health:      curl https://skyait.skyraksys.com/api/health
#
# REQUIRES: PuTTY (plink) installed on this machine
# RUNS FROM: Windows developer machine
# SERVER:    skyait.skyraksys.com (46.225.73.94)
# ==============================================================================

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARNING] $args" -ForegroundColor Yellow }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Server Status Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Info "Checking Docker installation..."
$dockerCheck = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "which docker 2>/dev/null && docker --version || echo 'Docker not installed'" 2>&1
Write-Host $dockerCheck
Write-Host ""

Write-Info "Checking Docker Compose installation..."
$composeCheck = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "which docker-compose 2>/dev/null && docker-compose --version || echo 'Docker Compose not installed'" 2>&1
Write-Host $composeCheck
Write-Host ""

Write-Info "Checking if repository is cloned..."
$repoCheck = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "ls -la ~/skyraksys_hrm 2>/dev/null || echo 'Repository not cloned'" 2>&1
Write-Host $repoCheck
Write-Host ""

Write-Info "Checking available disk space..."
$diskSpace = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "df -h /" 2>&1
Write-Host $diskSpace
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Status Check Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
