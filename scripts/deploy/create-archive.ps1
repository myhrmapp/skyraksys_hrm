# Create repository archive for upload

$ErrorActionPreference = "Continue"

Write-Host "Creating repository archive..." -ForegroundColor Cyan

$archiveName = "skyraksys_hrm_deploy.tar.gz"

# Use tar (built into Windows 10+) which is more reliable
$excludes = @(
    "--exclude=node_modules"
    "--exclude=.git"
    "--exclude=build"
    "--exclude=dist"
    "--exclude=coverage"
    "--exclude=*.log"
    "--exclude=docker-offline-packages"
    "--exclude=playwright-report"
    "--exclude=test-results"
    "--exclude=backend/logs/*"
    "--exclude=frontend/build/*"
    "--exclude=*.zip"
    "--exclude=*.tar.gz"
)

# Create tar.gz archive
Write-Host "Compressing files..." -ForegroundColor Yellow
tar -czf $archiveName $excludes *

if (Test-Path $archiveName) {
    $size = (Get-Item $archiveName).Length / 1MB
    Write-Host "Archive created: $archiveName ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "Failed to create archive" -ForegroundColor Red
    exit 1
}
