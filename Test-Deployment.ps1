# =============================================================================
# PowerShell Local Testing Script for rhel-production-deploy-v5.sh
# =============================================================================

param(
    [switch]$ValidateOnly
)

# Colors for output
$colors = @{
    Red = "Red"
    Green = "Green" 
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
}

function Write-TestResult {
    param(
        [string]$Message,
        [string]$Status = "INFO"
    )
    
    switch ($Status) {
        "PASS" { Write-Host "[PASS] $Message" -ForegroundColor Green }
        "FAIL" { Write-Host "[FAIL] $Message" -ForegroundColor Red }
        "WARN" { Write-Host "[WARN] $Message" -ForegroundColor Yellow }
        "TEST" { Write-Host "[TEST] $Message" -ForegroundColor Blue }
        default { Write-Host "[INFO] $Message" -ForegroundColor Cyan }
    }
}

# Test 1: File Existence and Readability
function Test-FileAccess {
    Write-TestResult "Checking script file access..." "TEST"
    
    $scriptPath = "$PSScriptRoot\rhel-production-deploy-v5.sh"
    
    if (Test-Path $scriptPath) {
        $fileSize = (Get-Item $scriptPath).Length
        Write-TestResult "Script file exists ($([math]::Round($fileSize/1024, 1)) KB)" "PASS"
        return $true
    } else {
        Write-TestResult "Script file not found at: $scriptPath" "FAIL"
        return $false
    }
}

# Test 2: Function Definition Check
function Test-Functions {
    Write-TestResult "Checking function definitions..." "TEST"
    
    $scriptContent = Get-Content "$PSScriptRoot\rhel-production-deploy-v5.sh" -Raw
    
    $requiredFunctions = @(
        "setup_rhel_environment",
        "install_nodejs", 
        "setup_postgresql",
        "clone_application",
        "quick_backend_setup",
        "start_backend_service",
        "setup_database_schema_light",
        "configure_frontend",
        "configure_nginx",
        "configure_pm2",
        "finalize_npm_security",
        "seed_database",
        "show_deployment_summary"
    )
    
    $missingFunctions = @()
    $foundFunctions = 0
    
    foreach ($func in $requiredFunctions) {
        if ($scriptContent -match "^$func\(\) \{" -or $scriptContent -match "\n$func\(\) \{") {
            $foundFunctions++
        } else {
            $missingFunctions += $func
        }
    }
    
    Write-TestResult "Found $foundFunctions/$($requiredFunctions.Count) required functions"
    
    if ($missingFunctions.Count -eq 0) {
        Write-TestResult "All required functions are defined" "PASS"
        return $true
    } else {
        Write-TestResult "Missing functions: $($missingFunctions -join ', ')" "FAIL"
        return $false
    }
}

# Test 3: Variable Declaration Check
function Test-Variables {
    Write-TestResult "Checking critical variables..." "TEST"
    
    $scriptContent = Get-Content "$PSScriptRoot\rhel-production-deploy-v5.sh" -Raw
    
    $requiredVars = @(
        "PROD_SERVER_IP",
        "PROD_DB_NAME", 
        "PROD_DB_USER",
        "APP_DIR",
        "BACKEND_PORT",
        "GITHUB_REPO",
        "PG_VERSION",
        "PG_DATA_DIR",
        "PG_SERVICE"
    )
    
    $missingVars = @()
    $foundVars = 0
    
    foreach ($var in $requiredVars) {
        if ($scriptContent -match "$var\s*=") {
            $foundVars++
        } else {
            $missingVars += $var
        }
    }
    
    Write-TestResult "Found $foundVars/$($requiredVars.Count) critical variables"
    
    if ($missingVars.Count -eq 0) {
        Write-TestResult "All critical variables are declared" "PASS"
        return $true
    } else {
        Write-TestResult "Missing variables: $($missingVars -join ', ')" "FAIL"
        return $false
    }
}

# Test 4: npm Configuration Safety Check
function Test-NpmConfig {
    Write-TestResult "Checking npm configuration safety..." "TEST"
    
    $scriptContent = Get-Content "$PSScriptRoot\rhel-production-deploy-v5.sh" -Raw
    
    $problematicConfigs = @(
        "npm config set tmp",
        "npm config set shrinkwrap", 
        "npm config set update-notifier false",
        "npm config set progress false",
        "npm config set loglevel error"
    )
    
    $foundIssues = @()
    
    foreach ($config in $problematicConfigs) {
        if ($scriptContent -match [regex]::Escape($config)) {
            $foundIssues += $config
        }
    }
    
    if ($foundIssues.Count -eq 0) {
        Write-TestResult "No problematic npm configurations found" "PASS"
        return $true
    } else {
        Write-TestResult "Found potentially problematic configs: $($foundIssues -join ', ')" "WARN"
        Write-TestResult "These may cause compatibility issues with npm 11.6.3" "WARN"
        return $true  # Treat as warning, not failure
    }
}

# Test 5: Script Structure Check
function Test-Structure {
    Write-TestResult "Checking script structure..." "TEST"
    
    $scriptContent = Get-Content "$PSScriptRoot\rhel-production-deploy-v5.sh" -Raw
    
    $checks = @{
        "Shebang" = $scriptContent -match "^#!/bin/bash"
        "Error handling" = $scriptContent -match "set -euo pipefail"
        "Main function" = $scriptContent -match "main\(\) \{"
        "Script execution" = $scriptContent -match "main.*\`"\$@\`""
        "Dry-run support" = $scriptContent -match "DRY_RUN"
        "Logging setup" = $scriptContent -match "LOGFILE"
    }
    
    $passed = 0
    $total = $checks.Count
    
    foreach ($check in $checks.GetEnumerator()) {
        if ($check.Value) {
            Write-TestResult "$($check.Key): Found" "PASS"
            $passed++
        } else {
            Write-TestResult "$($check.Key): Missing" "FAIL"
        }
    }
    
    Write-TestResult "Structure check: $passed/$total elements found"
    return $passed -eq $total
}

# Test 6: Version Consistency Check
function Test-Versions {
    Write-TestResult "Checking version consistency..." "TEST"
    
    $scriptContent = Get-Content "$PSScriptRoot\rhel-production-deploy-v5.sh" -Raw
    
    # Check for v4.0 references (should be v5.0)
    $v4References = ($scriptContent | Select-String "v4\.0" -AllMatches).Matches.Count
    $v5References = ($scriptContent | Select-String "v5\.0" -AllMatches).Matches.Count
    
    Write-TestResult "Found $v5References v5.0 references and $v4References v4.0 references"
    
    if ($v4References -eq 0 -and $v5References -gt 0) {
        Write-TestResult "Version consistency check passed" "PASS"
        return $true
    } elseif ($v4References -gt 0) {
        Write-TestResult "Found old v4.0 references - should be updated to v5.0" "WARN" 
        return $true  # Warning, not failure
    } else {
        Write-TestResult "No version references found" "FAIL"
        return $false
    }
}

# Test 7: Dry Run Feature Check
function Test-DryRun {
    Write-TestResult "Testing dry-run feature..." "TEST"
    
    if ($ValidateOnly) {
        Write-TestResult "Skipping dry-run execution (validation-only mode)" "WARN"
        return $true
    }
    
    # Since we can't run bash directly, we'll check for dry-run infrastructure
    $scriptContent = Get-Content "$PSScriptRoot\rhel-production-deploy-v5.sh" -Raw
    
    $dryRunFeatures = @{
        "Dry-run parameter check" = $scriptContent -match "--dry-run"
        "Command overrides" = $scriptContent -match "function dnf\(\)"
        "DRY_RUN variable" = $scriptContent -match "DRY_RUN=.*true"
    }
    
    $passed = 0
    foreach ($feature in $dryRunFeatures.GetEnumerator()) {
        if ($feature.Value) {
            $passed++
        }
    }
    
    if ($passed -eq $dryRunFeatures.Count) {
        Write-TestResult "Dry-run infrastructure is properly implemented" "PASS"
        return $true
    } else {
        Write-TestResult "Dry-run infrastructure incomplete ($passed/$($dryRunFeatures.Count))" "FAIL"
        return $false
    }
}

# Main test execution
function Main {
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "  SkyrakSys HRM Deployment Script Testing"      -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host ""
    
    $testResults = @()
    
    # Run all tests
    $testResults += @{ Name = "File Access"; Result = (Test-FileAccess) }
    $testResults += @{ Name = "Functions"; Result = (Test-Functions) }
    $testResults += @{ Name = "Variables"; Result = (Test-Variables) }
    $testResults += @{ Name = "npm Config"; Result = (Test-NpmConfig) }
    $testResults += @{ Name = "Structure"; Result = (Test-Structure) }
    $testResults += @{ Name = "Versions"; Result = (Test-Versions) }
    $testResults += @{ Name = "Dry Run"; Result = (Test-DryRun) }
    
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "  TEST RESULTS SUMMARY"                         -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    
    $passed = 0
    $failed = 0
    
    foreach ($test in $testResults) {
        if ($test.Result) {
            Write-TestResult "$($test.Name): PASSED" "PASS"
            $passed++
        } else {
            Write-TestResult "$($test.Name): FAILED" "FAIL"
            $failed++
        }
    }
    
    Write-Host ""
    Write-Host "Tests Passed: $passed" -ForegroundColor Green
    Write-Host "Tests Failed: $failed" -ForegroundColor Red
    
    if ($failed -eq 0) {
        Write-TestResult "🎉 ALL TESTS PASSED - Script ready for production deployment!" "PASS"
        return $true
    } else {
        Write-TestResult "❌ Some tests failed - Review issues before deployment" "FAIL"
        return $false
    }
}

# Run the tests
Main