# Add SSH config entry for skyait server
$configPath = "$env:USERPROFILE\.ssh\config"
$entry = "`nHost skyait`n  HostName 46.225.73.94`n  User Rakesh`n  IdentityFile ~/.ssh/id_rsa_skyraksys`n  StrictHostKeyChecking no`n"

if (Test-Path $configPath) {
    $content = Get-Content $configPath -Raw
    if ($content -notmatch 'skyait') {
        Add-Content $configPath $entry
        Write-Host 'SSH config entry added'
    } else {
        Write-Host 'SSH config entry already exists'
    }
} else {
    Set-Content $configPath $entry
    Write-Host 'SSH config created'
}
