# Docker Desktop Installation Guide for Windows

## Step 1: Download Docker Desktop

1. Go to: https://www.docker.com/products/docker-desktop
2. Click "Download for Windows"
3. Run the installer: `Docker Desktop Installer.exe`

## Step 2: Installation Options

- Check "Use WSL 2 instead of Hyper-V" (recommended)
- Check "Add shortcut to desktop"
- Click Install

## Step 3: After Installation

1. **Restart your computer** (required)
2. Launch "Docker Desktop" from Start menu
3. Accept the Docker Subscription Service Agreement
4. Skip the tutorial (optional)
5. Wait for Docker to start (you'll see "Docker Desktop is running" in system tray)

## Step 4: Verify Installation

Open PowerShell and run:
```powershell
docker --version
docker ps
```

You should see Docker version and an empty container list.

## System Requirements

- Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 or higher)
- OR Windows 11 64-bit
- Hyper-V and Containers Windows features enabled
- 4GB RAM minimum
- BIOS-level hardware virtualization enabled

## Troubleshooting

**If Docker won't start:**
1. Enable WSL 2:
   ```powershell
   wsl --install
   wsl --set-default-version 2
   ```
2. Enable Hyper-V (if using Hyper-V backend):
   - Control Panel → Programs → Turn Windows features on or off
   - Check "Hyper-V" and "Containers"
   - Restart

**If you get "Docker Desktop requires Windows 10 Pro":**
- You can use WSL 2 backend instead (no Pro license needed)
- Or use Docker Toolbox (older, not recommended)

## Next Steps

Once Docker Desktop is running:
```powershell
cd d:\skyraksys_hrm1\skyraksys_hrm_app
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\download-docker-images.ps1
```

This will download the 3 required images (~310MB total).

## Alternative: Quick Check

If you're not sure about your Windows version:
```powershell
systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
```

---
Download Link: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
