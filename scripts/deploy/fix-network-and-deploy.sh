#!/bin/bash

# Fix server network connectivity and retry deployment

set -e

echo "================================"
echo "Network Diagnostics and Fix"
echo "================================"
echo ""

# Test basic connectivity
echo "[INFO] Testing basic connectivity..."
if ping -c 3 8.8.8.8 > /dev/null 2>&1; then
    echo "[SUCCESS] Internet connectivity OK"
else
    echo "[ERROR] No internet connectivity - check network configuration"
    exit 1
fi

# Test DNS resolution
echo "[INFO] Testing DNS resolution..."
if host google.com > /dev/null 2>&1; then
    echo "[SUCCESS] DNS resolution OK"
else
    echo "[WARNING] DNS resolution failing - fixing..."
    
    # Backup current resolv.conf
    sudo cp /etc/resolv.conf /etc/resolv.conf.backup
    
    # Use Google DNS
    echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf > /dev/null
    echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf > /dev/null
    
    echo "[SUCCESS] DNS fixed"
fi

# Test repository access
echo "[INFO] Testing repository access..."
if curl -s --connect-timeout 5 https://archive.ubuntu.com > /dev/null 2>&1; then
    echo "[SUCCESS] Ubuntu repositories accessible"
else
    echo "[WARNING] Repository access issues"
fi

# Backup and update sources.list to use main Ubuntu mirrors
echo "[INFO] Updating package sources to use reliable mirrors..."
sudo cp /etc/apt/sources.list /etc/apt/sources.list.backup

# Replace Hetzner mirrors with main Ubuntu mirrors
sudo sed -i 's|https://mirror.hetzner.com/ubuntu/packages|http://archive.ubuntu.com/ubuntu|g' /etc/apt/sources.list
sudo sed -i 's|https://mirror.hetzner.com/ubuntu/security|http://security.ubuntu.com/ubuntu|g' /etc/apt/sources.list

# Also check sources.list.d
if [ -d /etc/apt/sources.list.d ]; then
    for file in /etc/apt/sources.list.d/*.list; do
        if [ -f "$file" ]; then
            sudo sed -i 's|https://mirror.hetzner.com/ubuntu/packages|http://archive.ubuntu.com/ubuntu|g' "$file"
        fi
    done
fi

echo "[SUCCESS] Package sources updated"

# Update package lists
echo "[INFO] Updating package lists..."
sudo apt-get update -o Acquire::ForceIPv4=true

echo ""
echo "================================"
echo "Network Fix Complete"
echo "================================"
echo ""
echo "[INFO] Now running deployment script..."
echo ""

# Run the deployment script
bash /tmp/cleanup-and-deploy-docker.sh
