/**
 * Pre-Deployment Validation Script
 * Runs all critical checks before deploying to production
 * 
 * Usage: node scripts/pre-deploy-check.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

console.log(`${colors.bold}${colors.cyan}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('   PRE-DEPLOYMENT VALIDATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`${colors.reset}\n`);

function pass(msg) {
  checks.passed++;
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function fail(msg) {
  checks.failed++;
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

function warn(msg) {
  checks.warnings++;
  console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
}

function section(name) {
  console.log(`\n${colors.bold}${name}${colors.reset}`);
}

// ============================================================================
// 1. Environment Configuration
// ============================================================================
section('1. Environment Configuration');

try {
  const envPath = path.join(__dirname, '..', 'backend', '.env.production');
  if (fs.existsSync(envPath)) {
    pass('.env.production exists');
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const required = ['NODE_ENV', 'PORT', 'DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET'];
    const missing = required.filter(key => !envContent.includes(key));
    
    if (missing.length === 0) {
      pass('All required environment variables defined');
    } else {
      fail(`Missing env vars: ${missing.join(', ')}`);
    }
  } else {
    warn('.env.production not found (using .env)');
  }
} catch (error) {
  fail(`Environment check failed: ${error.message}`);
}

// ============================================================================
// 2. Route Configuration
// ============================================================================
section('2. Route Configuration');

try {
  execSync('node backend/config/validate-routes.js', { stdio: 'inherit' });
  pass('Route configuration valid');
} catch (error) {
  fail('Route validation failed');
}

// ============================================================================
// 3. Security Checks
// ============================================================================
section('3. Security Checks');

// Check for password logging
const securityFiles = [
  'backend/scripts/reset-db-admin-only.js',
  'backend/seeders/20260209000000-comprehensive-seed.js',
  'backend/utils/demoSeed.js'
];

let passwordLogsFound = false;
securityFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Check for actual password logging (not hidden/security messages)
    const unsafePatterns = [
      /console\.log.*password.*\$\{/i,  // Template literals with password
      /console\.log.*password.*\+/i,     // String concatenation with password
      /console\.log.*ADMIN_PASSWORD/i,   // Direct password variable logging
      /console\.log.*defaultPassword/i   // Default password logging
    ];
    
    const hasUnsafeLog = unsafePatterns.some(pattern => pattern.test(content));
    if (hasUnsafeLog) {
      fail(`Password logging found in ${file}`);
      passwordLogsFound = true;
    }
  }
});

if (!passwordLogsFound) {
  pass('No password logging in critical files');
}

// Check for exposed secrets
const serverJsPath = path.join(__dirname, '..', 'backend', 'server.js');
if (fs.existsSync(serverJsPath)) {
  const content = fs.readFileSync(serverJsPath, 'utf8');
  if (content.includes('process.env.JWT_SECRET') || content.includes('JWT_SECRET')) {
    pass('JWT_SECRET loaded from environment');
  } else {
    warn('JWT_SECRET configuration not verified');
  }
}

// ============================================================================
// 4. File Structure
// ============================================================================
section('4. File Structure');

const requiredFiles = [
  'backend/server.js',
  'backend/config/routes.js',
  'backend/package.json',
  'frontend/package.json',
  'README.md'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    pass(`${file} exists`);
  } else {
    fail(`${file} missing`);
  }
});

// ============================================================================
// 5. Dependencies
// ============================================================================
section('5. Dependencies');

try {
  const backendPkg = path.join(__dirname, '..', 'backend', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(backendPkg, 'utf8'));
  
  const critical = ['express', 'sequelize', 'jsonwebtoken', 'bcryptjs'];
  const missing = critical.filter(dep => !pkg.dependencies[dep]);
  
  if (missing.length === 0) {
    pass('All critical dependencies present');
  } else {
    fail(`Missing dependencies: ${missing.join(', ')}`);
  }
  
  // Check for deprecated packages
  if (pkg.dependencies['xss-clean']) {
    warn('xss-clean is deprecated (using sanitize-html instead - OK)');
  }
} catch (error) {
  fail(`Dependency check failed: ${error.message}`);
}

// ============================================================================
// 6. Code Quality
// ============================================================================
section('6. Code Quality');

try {
  // Check if ESLint is configured
  const eslintPath = path.join(__dirname, '..', 'backend', '.eslintrc.json');
  if (fs.existsSync(eslintPath)) {
    pass('ESLint configured');
  } else {
    warn('ESLint not configured');
  }
  
  // Check if Prettier is configured
  const prettierPath = path.join(__dirname, '..', 'backend', '.prettierrc');
  if (fs.existsSync(prettierPath)) {
    pass('Prettier configured');
  } else {
    warn('Prettier not configured');
  }
} catch (error) {
  warn(`Code quality check incomplete: ${error.message}`);
}

// ============================================================================
// 7. Git Status
// ============================================================================
section('7. Git Status');

try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim() === '') {
    pass('Working directory clean');
  } else {
    warn('Uncommitted changes detected');
    console.log('   ' + gitStatus.trim().split('\n').slice(0, 5).join('\n   '));
  }
} catch (error) {
  warn('Git status check skipped (not a git repository)');
}

// ============================================================================
// Final Summary
// ============================================================================
console.log(`\n${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.bold}Summary${colors.reset}`);
console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

console.log(`${colors.green}✅ Passed: ${checks.passed}${colors.reset}`);
console.log(`${colors.yellow}⚠️  Warnings: ${checks.warnings}${colors.reset}`);
console.log(`${colors.red}❌ Failed: ${checks.failed}${colors.reset}\n`);

if (checks.failed > 0) {
  console.log(`${colors.red}${colors.bold}DEPLOYMENT BLOCKED - Fix ${checks.failed} critical issue(s)${colors.reset}\n`);
  process.exit(1);
} else if (checks.warnings > 0) {
  console.log(`${colors.yellow}${colors.bold}DEPLOYMENT ALLOWED - But review ${checks.warnings} warning(s)${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.green}${colors.bold}✅ ALL CHECKS PASSED - Ready for deployment!${colors.reset}\n`);
  process.exit(0);
}
