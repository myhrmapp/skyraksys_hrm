<#
.SYNOPSIS
    SkyRakSys HRM — Full Production Deployment Script
.DESCRIPTION
    Deploys the HRM application to Ubuntu server 46.225.73.94 (skyait.skyraksys.com)
    Handles: SSH key setup, server provisioning, DB setup, app upload, Nginx config.
.NOTES
    Run from: d:\skyraksys_hrm1\skyraksys_hrm_app\scripts\deploy\
    Requires: Windows SSH (built-in)
#>

param(
    [switch]$SkipKeySetup,
    [switch]$SkipServerSetup,
    [switch]$SkipDbSetup,
    [switch]$SkipUpload,
    [switch]$SkipDeploy,
    [switch]$SkipNginx,
    [switch]$SkipSSL,
    [switch]$OnlyRedeploy
)

# ===== CONFIGURATION =====
$ServerIP       = "46.225.73.94"
$ServerUser     = "Rakesh"
$ServerPassword = 't]%eCt!49!0>'
$SSHKeyPath     = "$env:USERPROFILE\.ssh\id_rsa_skyraksys"
$SSHKeyPubPath  = "$SSHKeyPath.pub"
$RemoteAppDir   = "/var/www/skyraksys_hrm"
$LocalAppDir    = "d:\skyraksys_hrm1\skyraksys_hrm_app"
$Domain         = "skyait.skyraksys.com"

# SSH command shorthand (after key is installed)
function Invoke-RemoteCommand {
    param([string]$Command, [switch]$AsRoot)
    
    if ($AsRoot) {
        $fullCmd = "echo '$ServerPassword' | sudo -S bash -c `"$Command`""
    } else {
        $fullCmd = $Command
    }
    
    ssh -i $SSHKeyPath -o StrictHostKeyChecking=no -o ConnectTimeout=15 "${ServerUser}@${ServerIP}" $fullCmd
}

function Write-Step {
    param([string]$Step, [string]$Description)
    Write-Host ""
    Write-Host "=== [$Step] $Description ===" -ForegroundColor Cyan
    Write-Host ""
}

# ============================================================
# STEP 0: SSH Key Setup (one-time)
# ============================================================
if (-not $SkipKeySetup -and -not $OnlyRedeploy) {
    Write-Step "0" "SSH Key Setup"
    
    # Generate key if it doesn't exist
    if (-not (Test-Path $SSHKeyPath)) {
        Write-Host "Generating SSH key pair..." -ForegroundColor Yellow
        ssh-keygen -t rsa -b 4096 -f $SSHKeyPath -N '""' -C "deploy@skyraksys"
    }
    
    # Test if key auth already works
    $testResult = ssh -i $SSHKeyPath -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 "${ServerUser}@${ServerIP}" "echo KEY_AUTH_OK" 2>&1
    
    if ($testResult -match "KEY_AUTH_OK") {
        Write-Host "SSH key authentication already working!" -ForegroundColor Green
    } else {
        Write-Host "Need to copy SSH key to server. You will be prompted for password ONCE." -ForegroundColor Yellow
        Write-Host "Password: $ServerPassword" -ForegroundColor Magenta
        Write-Host ""
        
        # Read the public key
        $pubKey = Get-Content $SSHKeyPubPath -Raw
        $pubKey = $pubKey.Trim()
        
        # Use ssh to copy the key (user will type password)
        Write-Host "Connecting to $ServerIP — type the password when prompted..." -ForegroundColor Yellow
        $escapedKey = $pubKey -replace '"', '\"'
        ssh -o StrictHostKeyChecking=no "${ServerUser}@${ServerIP}" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo `"$escapedKey`" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'SSH key installed successfully!'"
        
        # Verify key auth now works
        Start-Sleep -Seconds 2
        $verifyResult = ssh -i $SSHKeyPath -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 "${ServerUser}@${ServerIP}" "echo KEY_AUTH_OK" 2>&1
        if ($verifyResult -match "KEY_AUTH_OK") {
            Write-Host "SSH key authentication verified!" -ForegroundColor Green
        } else {
            Write-Host "ERROR: SSH key auth failed. Try manually." -ForegroundColor Red
            Write-Host "Run: type $SSHKeyPubPath | ssh ${ServerUser}@${ServerIP} `"cat >> ~/.ssh/authorized_keys`"" -ForegroundColor Yellow
            exit 1
        }
    }
}

# Quick check connectivity
$connTest = ssh -i $SSHKeyPath -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 "${ServerUser}@${ServerIP}" "echo CONNECTED" 2>&1
if ($connTest -notmatch "CONNECTED") {
    Write-Host "ERROR: Cannot connect to server. Run without -SkipKeySetup first." -ForegroundColor Red
    exit 1
}
Write-Host "Connected to $ServerIP" -ForegroundColor Green

# ============================================================
# REDEPLOY-ONLY MODE (code updates, no server setup)
# ============================================================
if ($OnlyRedeploy) {
    Write-Step "REDEPLOY" "Quick Code Update Deployment"
    
    # Upload changed files
    Write-Host "Uploading backend..." -ForegroundColor Yellow
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\server.js" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\controllers" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\routes" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\middleware" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\models" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\config" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\migrations" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath "$LocalAppDir\backend\package.json" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath "$LocalAppDir\backend\package-lock.json" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    
    Write-Host "Uploading frontend..." -ForegroundColor Yellow
    scp -i $SSHKeyPath -r "$LocalAppDir\frontend\src" "${ServerUser}@${ServerIP}:${RemoteAppDir}/frontend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\frontend\public" "${ServerUser}@${ServerIP}:${RemoteAppDir}/frontend/"
    scp -i $SSHKeyPath "$LocalAppDir\frontend\package.json" "${ServerUser}@${ServerIP}:${RemoteAppDir}/frontend/"
    scp -i $SSHKeyPath "$LocalAppDir\frontend\package-lock.json" "${ServerUser}@${ServerIP}:${RemoteAppDir}/frontend/"
    scp -i $SSHKeyPath "$LocalAppDir\frontend\.env.production" "${ServerUser}@${ServerIP}:${RemoteAppDir}/frontend/"
    
    Write-Host "Running redeploy on server..." -ForegroundColor Yellow
    Invoke-RemoteCommand "cd $RemoteAppDir/backend && npm ci --production && npx sequelize-cli db:migrate && cd ../frontend && npm ci && npm run build && cd .. && pm2 restart skyraksys-hrm && pm2 status"
    
    Write-Host ""
    Write-Host "Redeploy complete!" -ForegroundColor Green
    exit 0
}

# ============================================================
# STEP 1: Server Setup
# ============================================================
if (-not $SkipServerSetup) {
    Write-Step "1" "Server Setup (Node.js, PostgreSQL, Nginx, PM2)"
    
    # Upload and run setup script
    scp -i $SSHKeyPath "$LocalAppDir\scripts\deploy\01-server-setup.sh" "${ServerUser}@${ServerIP}:/tmp/"
    Invoke-RemoteCommand "chmod +x /tmp/01-server-setup.sh && bash /tmp/01-server-setup.sh" -AsRoot
    
    Write-Host "Server setup complete!" -ForegroundColor Green
}

# ============================================================
# STEP 2: Database Setup
# ============================================================
if (-not $SkipDbSetup) {
    Write-Step "2" "PostgreSQL Database Setup"
    
    scp -i $SSHKeyPath "$LocalAppDir\scripts\deploy\02-db-setup.sh" "${ServerUser}@${ServerIP}:/tmp/"
    Invoke-RemoteCommand "chmod +x /tmp/02-db-setup.sh && bash /tmp/02-db-setup.sh" -AsRoot
    
    Write-Host "Database setup complete!" -ForegroundColor Green
}

# ============================================================
# STEP 3: Upload Application Files
# ============================================================
if (-not $SkipUpload) {
    Write-Step "3" "Uploading Application Files"
    
    # Create directory structure
    Invoke-RemoteCommand "mkdir -p $RemoteAppDir/backend $RemoteAppDir/frontend $RemoteAppDir/uploads $RemoteAppDir/logs $RemoteAppDir/scripts/deploy" -AsRoot
    Invoke-RemoteCommand "chown -R ${ServerUser}:${ServerUser} $RemoteAppDir" -AsRoot
    
    # Upload backend (excluding node_modules, .env, logs, uploads)
    Write-Host "Uploading backend..." -ForegroundColor Yellow
    scp -i $SSHKeyPath "$LocalAppDir\backend\package.json" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath "$LocalAppDir\backend\package-lock.json" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath "$LocalAppDir\backend\server.js" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath "$LocalAppDir\backend\jest.config.js" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\config" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\controllers" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\middleware" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\migrations" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\models" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\routes" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\seeders" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\backend\scripts" "${ServerUser}@${ServerIP}:${RemoteAppDir}/backend/"

    # Upload frontend (excluding node_modules, build)
    Write-Host "Uploading frontend..." -ForegroundColor Yellow
    scp -i $SSHKeyPath "$LocalAppDir\frontend\package.json" "${ServerUser}@${ServerIP}:${RemoteAppDir}/frontend/"
    scp -i $SSHKeyPath "$LocalAppDir\frontend\package-lock.json" "${ServerUser}@${ServerIP}:${RemoteAppDir}/frontend/"
    scp -i $SSHKeyPath "$LocalAppDir\frontend\.env.production" "${ServerUser}@${ServerIP}:${RemoteAppDir}/frontend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\frontend\src" "${ServerUser}@${ServerIP}:${RemoteAppDir}/frontend/"
    scp -i $SSHKeyPath -r "$LocalAppDir\frontend\public" "${ServerUser}@${ServerIP}:${RemoteAppDir}/frontend/"
    
    # Upload root config files
    Write-Host "Uploading config files..." -ForegroundColor Yellow
    scp -i $SSHKeyPath "$LocalAppDir\ecosystem.config.js" "${ServerUser}@${ServerIP}:${RemoteAppDir}/"
    scp -i $SSHKeyPath "$LocalAppDir\package.json" "${ServerUser}@${ServerIP}:${RemoteAppDir}/"
    
    # Upload deploy scripts
    scp -i $SSHKeyPath "$LocalAppDir\scripts\deploy\backend.env.production" "${ServerUser}@${ServerIP}:${RemoteAppDir}/scripts/deploy/"
    scp -i $SSHKeyPath "$LocalAppDir\scripts\deploy\frontend.env.production" "${ServerUser}@${ServerIP}:${RemoteAppDir}/scripts/deploy/"
    scp -i $SSHKeyPath "$LocalAppDir\scripts\deploy\redeploy.sh" "${ServerUser}@${ServerIP}:${RemoteAppDir}/scripts/deploy/"
    
    Write-Host "Upload complete!" -ForegroundColor Green
}

# ============================================================
# STEP 4: Configure Environment & Deploy
# ============================================================
if (-not $SkipDeploy) {
    Write-Step "4" "Configuring Environment & Deploying"
    
    # Copy production .env and generate JWT secrets
    $deployCmd = @"
cd $RemoteAppDir

# Copy production env file to backend
cp scripts/deploy/backend.env.production backend/.env

# Generate real JWT secrets
JWT1=\$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT2=\$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
sed -i "s/REPLACE_WITH_GENERATED_SECRET_64_CHARS/\$JWT1/" backend/.env
sed -i "s/REPLACE_WITH_DIFFERENT_GENERATED_SECRET_64_CHARS/\$JWT2/" backend/.env

echo "JWT secrets generated and configured."
grep -E "^JWT_SECRET=|^JWT_REFRESH_SECRET=" backend/.env | cut -c1-30

# Copy frontend env
cp scripts/deploy/frontend.env.production frontend/.env.production

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm ci --production

# Run database migrations
echo "Running database migrations..."
npx sequelize-cli db:migrate

# Seed database
echo "Seeding database..."
npx sequelize-cli db:seed:all 2>/dev/null || echo "Seed already applied or skipped"

# Install frontend dependencies and build
echo "Installing frontend dependencies..."
cd ../frontend
npm ci

echo "Building frontend..."
npm run build

# Start PM2
echo "Starting application with PM2..."
cd ..
pm2 delete skyraksys-hrm 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

echo "App deployment complete!"
pm2 status
"@
    
    Invoke-RemoteCommand $deployCmd
    
    Write-Host "Application deployed!" -ForegroundColor Green
}

# ============================================================
# STEP 5: Nginx Configuration
# ============================================================
if (-not $SkipNginx) {
    Write-Step "5" "Nginx Reverse Proxy Configuration"
    
    scp -i $SSHKeyPath "$LocalAppDir\scripts\deploy\04-nginx-config.sh" "${ServerUser}@${ServerIP}:/tmp/"
    Invoke-RemoteCommand "chmod +x /tmp/04-nginx-config.sh && bash /tmp/04-nginx-config.sh" -AsRoot
    
    Write-Host "Nginx configured!" -ForegroundColor Green
}

# ============================================================
# STEP 6: PM2 Startup on Boot
# ============================================================
Write-Step "6" "Enabling PM2 startup on boot"
Invoke-RemoteCommand "pm2 startup systemd -u $ServerUser --hp /home/$ServerUser 2>/dev/null; pm2 save" -AsRoot

# ============================================================
# STEP 7: Verify Deployment
# ============================================================
Write-Step "7" "Verifying Deployment"

Write-Host "Testing API health..." -ForegroundColor Yellow
$healthCheck = Invoke-RemoteCommand "curl -s http://localhost:5000/api/health"
Write-Host "Health: $healthCheck" -ForegroundColor Cyan

Write-Host ""
Write-Host "Testing Nginx..." -ForegroundColor Yellow
$nginxCheck = Invoke-RemoteCommand "curl -s -o /dev/null -w '%{http_code}' http://localhost/"
Write-Host "Nginx HTTP status: $nginxCheck" -ForegroundColor Cyan

Write-Host ""
Write-Host "PM2 Status:" -ForegroundColor Yellow
Invoke-RemoteCommand "pm2 status"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URL: http://$Domain" -ForegroundColor White
Write-Host "  IP:  http://$ServerIP" -ForegroundColor White
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "  1. Point DNS A record for $Domain to $ServerIP" -ForegroundColor White
Write-Host "  2. Run SSL: .\deploy-to-server.ps1 -SkipKeySetup -SkipServerSetup -SkipDbSetup -SkipUpload -SkipDeploy -SkipNginx" -ForegroundColor White
Write-Host "  3. For code updates: .\deploy-to-server.ps1 -OnlyRedeploy" -ForegroundColor White
Write-Host ""
