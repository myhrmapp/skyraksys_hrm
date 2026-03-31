<#
.SYNOPSIS
    Install your SSH public key on the production server (one-time setup).

.DESCRIPTION
    PURPOSE:
      Copies your local SSH public key (~/.ssh/id_rsa_skyraksys.pub) into
      ~/.ssh/authorized_keys on the server so that subsequent SSH and PuTTY
      connections authenticate without a password prompt.

    WHEN TO USE:
      Run once before using deploy-docker-from-windows.ps1 if you want
      passwordless authentication. Not required if you are comfortable
      entering the password each time (the deploy script uses password auth).

    WHAT IT DOES:
      1. Reads ~/.ssh/id_rsa_skyraksys.pub from this machine
      2. SSHes into 46.225.73.94 as Rakesh using password auth
      3. Appends the public key to ~/.ssh/authorized_keys on the server
      4. If step 3 fails (home directory permission issue), retries as root
         and fixes ownership before installing the key
      5. Verifies the key works by attempting key-based SSH authentication

    RUNS FROM: Windows developer machine
    SERVER:    skyait.skyraksys.com (46.225.73.94)
    USER:      Rakesh
#>

$ServerIP = "46.225.73.94"
$ServerUser = "Rakesh"
$ServerPassword = 't]%eCt!49!0>'
$PubKeyPath = "$env:USERPROFILE\.ssh\id_rsa_skyraksys.pub"
$PubKey = (Get-Content $PubKeyPath -Raw).Trim()

# Build the remote command to set up SSH key
$remoteCmd = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$PubKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo KEY_INSTALLED_OK"

Write-Host "Setting up SSH key on $ServerIP..." -ForegroundColor Cyan

# Create SSH process with stdin redirect for password
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "ssh"
$psi.Arguments = "-o StrictHostKeyChecking=no -o PreferredAuthentications=password $ServerUser@$ServerIP `"$remoteCmd`""
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $false

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $psi
$process.Start() | Out-Null

# Wait a moment for password prompt
Start-Sleep -Seconds 3

# Send password
$process.StandardInput.WriteLine($ServerPassword)
$process.StandardInput.Flush()

# Wait for completion
$process.WaitForExit(30000)

$stdout = $process.StandardOutput.ReadToEnd()
$stderr = $process.StandardError.ReadToEnd()

Write-Host "STDOUT: $stdout" -ForegroundColor White
if ($stderr) { Write-Host "STDERR: $stderr" -ForegroundColor Yellow }

if ($stdout -match "KEY_INSTALLED_OK") {
    Write-Host "`nSSH key installed successfully!" -ForegroundColor Green
} else {
    Write-Host "`nKey installation may have failed. Trying as root..." -ForegroundColor Yellow
    
    # Try as root to fix home directory permissions  
    $rootCmd = "chown -R Rakesh:Rakesh /home/Rakesh && su - Rakesh -c `"mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$PubKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo KEY_INSTALLED_OK`""
    
    $psi2 = New-Object System.Diagnostics.ProcessStartInfo
    $psi2.FileName = "ssh"
    $psi2.Arguments = "-o StrictHostKeyChecking=no -o PreferredAuthentications=password root@$ServerIP `"$rootCmd`""
    $psi2.UseShellExecute = $false
    $psi2.RedirectStandardInput = $true
    $psi2.RedirectStandardOutput = $true
    $psi2.RedirectStandardError = $true
    $psi2.CreateNoWindow = $false
    
    $proc2 = New-Object System.Diagnostics.Process
    $proc2.StartInfo = $psi2
    $proc2.Start() | Out-Null
    Start-Sleep -Seconds 3
    $proc2.StandardInput.WriteLine($ServerPassword)
    $proc2.StandardInput.Flush()
    $proc2.WaitForExit(30000)
    
    $out2 = $proc2.StandardOutput.ReadToEnd()
    $err2 = $proc2.StandardError.ReadToEnd()
    Write-Host "ROOT STDOUT: $out2" -ForegroundColor White
    if ($err2) { Write-Host "ROOT STDERR: $err2" -ForegroundColor Yellow }
}

# Verify key auth
Write-Host "`nVerifying key-based authentication..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

$verifyResult = & ssh -i "$env:USERPROFILE\.ssh\id_rsa_skyraksys" -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$ServerUser@$ServerIP" "echo KEY_AUTH_VERIFIED" 2>&1
Write-Host "Verify result: $verifyResult"

if ("$verifyResult" -match "KEY_AUTH_VERIFIED") {
    Write-Host "`nSUCCESS! Key-based auth is working." -ForegroundColor Green
    Write-Host "You can now run the full deployment:" -ForegroundColor Cyan
    Write-Host "  powershell -ExecutionPolicy Bypass -File deploy-docker-from-windows.ps1" -ForegroundColor White
} else {
    Write-Host "`nKey verification failed." -ForegroundColor Red
    Write-Host "Please manually SSH and run:" -ForegroundColor Yellow
    Write-Host "  ssh Rakesh@46.225.73.94" -ForegroundColor White
    Write-Host "  # Then type password: $ServerPassword" -ForegroundColor White
    Write-Host "  mkdir -p ~/.ssh && chmod 700 ~/.ssh" -ForegroundColor White
    Write-Host "  echo '$PubKey' >> ~/.ssh/authorized_keys" -ForegroundColor White
    Write-Host "  chmod 600 ~/.ssh/authorized_keys" -ForegroundColor White
}
