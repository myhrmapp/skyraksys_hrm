<#
.SYNOPSIS
    Push SSH public key to the remote server (one-time setup)
.DESCRIPTION
    Uses PowerShell process to handle password input for SSH key deployment
#>
$ServerIP = "46.225.73.94"
$ServerUser = "Rakesh"
$ServerPassword = 't]%eCt!49!0>'
$SSHKeyPubPath = "$env:USERPROFILE\.ssh\id_rsa_skyraksys.pub"

if (-not (Test-Path $SSHKeyPubPath)) {
    Write-Host "SSH key not found. Generating..." -ForegroundColor Yellow
    ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\id_rsa_skyraksys" -N '""' -C "deploy@skyraksys"
}

$pubKey = (Get-Content $SSHKeyPubPath -Raw).Trim()

Write-Host "Pushing SSH key to $ServerUser@$ServerIP..." -ForegroundColor Yellow
Write-Host "You will be prompted for the password. Enter: $ServerPassword" -ForegroundColor Magenta
Write-Host ""

# Method: Use ssh with the public key content echoed into authorized_keys
$command = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$pubKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo KEY_INSTALLED"
ssh -o StrictHostKeyChecking=no -o PreferredAuthentications=password "$ServerUser@$ServerIP" $command

# Verify
Write-Host "`nVerifying key-based auth..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
$result = ssh -i "$env:USERPROFILE\.ssh\id_rsa_skyraksys" -o BatchMode=yes -o ConnectTimeout=10 "$ServerUser@$ServerIP" "echo KEY_AUTH_OK" 2>&1
if ($result -match "KEY_AUTH_OK") {
    Write-Host "SUCCESS: SSH key authentication is working!" -ForegroundColor Green
    Write-Host "You can now run: .\deploy-to-server.ps1 -SkipKeySetup" -ForegroundColor Cyan
} else {
    Write-Host "Key auth verification failed. Output: $result" -ForegroundColor Red
}
