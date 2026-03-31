# ==============================================================================
# SkyrakSys HRM — Verify Docker Installation on Server (Windows)
#
# PURPOSE:
#   Quick check that Docker Engine and Docker Compose Plugin are installed
#   and responding on the production server. Run this after server-full-setup.sh
#   to confirm Docker is ready, or when diagnosing container start failures.
#
# WHAT IT CHECKS:
#   - docker --version          (Docker Engine installed?)
#   - docker compose version    (Compose plugin installed?)
#
# NOTE: This checks installation only — it does NOT check whether containers
#   are actually running. To check container state, SSH in and run:
#     docker compose ps
#
# REQUIRES: PuTTY (plink) installed on this machine
# RUNS FROM: Windows developer machine
# SERVER:    skyait.skyraksys.com (46.225.73.94)
# ==============================================================================

$SERVER_IP = "46.225.73.94"
$SERVER_USER = "Rakesh"
$SERVER_PASSWORD = 't]%eCt!49!0>'
$HOST_KEY = "ssh-ed25519 255 SHA256:HvzjAjWL17DE7CUYaDoU3762yW3hLPrjoSCLTb3RY5k"

Write-Host "Verifying Docker installation..." -ForegroundColor Cyan

# Check without sudo first
$result = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "docker --version 2>&1 || echo '$SERVER_PASSWORD' | sudo -S docker --version"
Write-Host $result

$composeResult = plink -ssh -batch -hostkey $HOST_KEY -pw $SERVER_PASSWORD ${SERVER_USER}@${SERVER_IP} "docker compose version 2>&1 || echo '$SERVER_PASSWORD' | sudo -S docker compose version"
Write-Host $composeResult

Write-Host "`nDocker is ready!" -ForegroundColor Green
