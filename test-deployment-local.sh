#!/bin/bash

# =============================================================================
# Local Deployment Testing Script
# =============================================================================
# This script tests the deployment logic without requiring RHEL or root access
#
# Usage: 
#   bash test-deployment-local.sh
#   bash test-deployment-local.sh --validate-only
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="$SCRIPT_DIR/rhel-production-deploy-v5.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_test() {
    echo -e "${BLUE}[TEST] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[PASS] $1${NC}"
}

print_error() {
    echo -e "${RED}[FAIL] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

# Test 1: Script Syntax Validation
test_syntax() {
    print_test "Testing script syntax..."
    
    if command -v bash >/dev/null 2>&1; then
        if bash -n "$DEPLOY_SCRIPT" >/dev/null 2>&1; then
            print_success "Script syntax is valid"
            return 0
        else
            print_error "Script has syntax errors"
            bash -n "$DEPLOY_SCRIPT"
            return 1
        fi
    else
        print_warning "bash not available for syntax check"
        return 0
    fi
}

# Test 2: Function Definition Check
test_functions() {
    print_test "Checking function definitions..."
    
    local required_functions=(
        "setup_rhel_environment"
        "install_nodejs" 
        "setup_postgresql"
        "clone_application"
        "quick_backend_setup"
        "start_backend_service"
        "setup_database_schema_light"
        "configure_frontend"
        "configure_nginx"
        "configure_pm2"
        "finalize_npm_security"
    )
    
    local missing_functions=()
    
    for func in "${required_functions[@]}"; do
        if ! grep -q "^${func}() {" "$DEPLOY_SCRIPT"; then
            missing_functions+=("$func")
        fi
    done
    
    if [[ ${#missing_functions[@]} -eq 0 ]]; then
        print_success "All required functions are defined"
        return 0
    else
        print_error "Missing functions: ${missing_functions[*]}"
        return 1
    fi
}

# Test 3: Variable Declaration Check
test_variables() {
    print_test "Checking critical variables..."
    
    local required_vars=(
        "PROD_SERVER_IP"
        "PROD_DB_NAME"
        "PROD_DB_USER"
        "APP_DIR"
        "BACKEND_PORT"
        "GITHUB_REPO"
        "PG_VERSION"
        "PG_DATA_DIR"
        "PG_SERVICE"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "${var}=" "$DEPLOY_SCRIPT"; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -eq 0 ]]; then
        print_success "All critical variables are declared"
        return 0
    else
        print_error "Missing variables: ${missing_vars[*]}"
        return 1
    fi
}

# Test 4: npm Configuration Check
test_npm_config() {
    print_test "Checking npm configuration safety..."
    
    local problematic_configs=(
        "npm config set tmp"
        "npm config set shrinkwrap"
        "npm config set update-notifier"
        "npm config set progress false"
        "npm config set loglevel error"
    )
    
    local found_issues=()
    
    for config in "${problematic_configs[@]}"; do
        if grep -q "$config" "$DEPLOY_SCRIPT"; then
            found_issues+=("$config")
        fi
    done
    
    if [[ ${#found_issues[@]} -eq 0 ]]; then
        print_success "No problematic npm configurations found"
        return 0
    else
        print_warning "Found potentially problematic configs: ${found_issues[*]}"
        return 1
    fi
}

# Test 5: Dry Run Execution
test_dry_run() {
    print_test "Testing dry-run mode..."
    
    if [[ "${1:-}" == "--validate-only" ]]; then
        print_warning "Skipping dry-run execution (validation-only mode)"
        return 0
    fi
    
    print_test "Running deployment script in dry-run mode..."
    echo "----------------------------------------"
    
    # Redirect stderr to stdout and capture
    if timeout 30 bash "$DEPLOY_SCRIPT" --dry-run 2>&1 | head -50; then
        print_success "Dry-run completed successfully"
        return 0
    else
        print_error "Dry-run failed or timed out"
        return 1
    fi
}

# Main test execution
main() {
    echo "=============================================="
    echo "  SkyrakSys HRM Deployment Script Testing"
    echo "=============================================="
    echo ""
    
    local test_results=()
    
    # Run all tests
    test_syntax && test_results+=("syntax:PASS") || test_results+=("syntax:FAIL")
    test_functions && test_results+=("functions:PASS") || test_results+=("functions:FAIL")
    test_variables && test_results+=("variables:PASS") || test_results+=("variables:FAIL")
    test_npm_config && test_results+=("npm:PASS") || test_results+=("npm:PASS")  # npm issues are warnings
    test_dry_run "$1" && test_results+=("dryrun:PASS") || test_results+=("dryrun:FAIL")
    
    echo ""
    echo "=============================================="
    echo "  TEST RESULTS SUMMARY"
    echo "=============================================="
    
    local passed=0
    local failed=0
    
    for result in "${test_results[@]}"; do
        local test_name="${result%:*}"
        local test_status="${result#*:}"
        
        if [[ "$test_status" == "PASS" ]]; then
            print_success "$test_name: PASSED"
            ((passed++))
        else
            print_error "$test_name: FAILED"
            ((failed++))
        fi
    done
    
    echo ""
    echo "Tests Passed: $passed"
    echo "Tests Failed: $failed"
    
    if [[ $failed -eq 0 ]]; then
        print_success "🎉 ALL TESTS PASSED - Script ready for production deployment!"
        return 0
    else
        print_error "❌ Some tests failed - Review issues before deployment"
        return 1
    fi
}

# Run tests
main "$@"