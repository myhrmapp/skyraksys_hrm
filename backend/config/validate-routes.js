/**
 * Route Configuration Validator
 * Ensures all routes are properly configured and mounted
 * 
 * Run this before committing route changes:
 * node backend/config/validate-routes.js
 */

const path = require('path');
const fs = require('fs');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}🔍 Route Configuration Validator${colors.reset}\n`);

// Step 1: Check config/routes.js exists
const routesConfigPath = path.join(__dirname, 'routes.js');
if (!fs.existsSync(routesConfigPath)) {
  console.log(`${colors.red}❌ config/routes.js not found!${colors.reset}`);
  process.exit(1);
}
console.log(`${colors.green}✅ config/routes.js exists${colors.reset}`);

// Step 2: Parse route imports from config/routes.js
const routesConfig = fs.readFileSync(routesConfigPath, 'utf8');
const importRegex = /require\('\.\.\/routes\/(.+?)'\)/g;
const imports = [];
let match;
while ((match = importRegex.exec(routesConfig)) !== null) {
  imports.push(match[1]);
}
console.log(`${colors.green}✅ Found ${imports.length} route imports${colors.reset}`);

// Step 3: Verify all imported files exist
const routesDir = path.join(__dirname, '..', 'routes');
let missingFiles = 0;
let existingFiles = 0;

imports.forEach(file => {
  // Add .js extension if not present
  const fileName = file.endsWith('.js') ? file : file + '.js';
  const filePath = path.join(routesDir, fileName);
  if (fs.existsSync(filePath)) {
    existingFiles++;
  } else {
    console.log(`${colors.red}❌ Missing: ${fileName}${colors.reset}`);
    missingFiles++;
  }
});

if (missingFiles === 0) {
  console.log(`${colors.green}✅ All ${existingFiles} route files exist${colors.reset}`);
} else {
  console.log(`${colors.red}❌ ${missingFiles} route files missing!${colors.reset}`);
  process.exit(1);
}

// Step 4: Count route mounts (v1 and legacy)
const v1Routes = (routesConfig.match(/app\.use\('\/api\/v1\//g) || []).length;
const legacyRoutes = (routesConfig.match(/app\.use\('\/api\/(?!v1)/g) || []).length;

console.log(`${colors.green}✅ ${v1Routes} routes mounted on /api/v1/*${colors.reset}`);
console.log(`${colors.green}✅ ${legacyRoutes} routes mounted on /api/* (legacy)${colors.reset}`);

// Step 5: Verify deprecation middleware exists
if (routesConfig.includes('deprecationMiddleware')) {
  console.log(`${colors.green}✅ Deprecation middleware defined${colors.reset}`);
} else {
  console.log(`${colors.yellow}⚠️  No deprecation middleware found${colors.reset}`);
}

// Step 6: Check for duplicate route paths
const v1Paths = routesConfig.match(/app\.use\('\/api\/v1\/[^']+'/g) || [];
const v1UniqueCount = new Set(v1Paths).size;
if (v1Paths.length === v1UniqueCount) {
  console.log(`${colors.green}✅ No duplicate v1 routes${colors.reset}`);
} else {
  console.log(`${colors.red}❌ ${v1Paths.length - v1UniqueCount} duplicate v1 routes!${colors.reset}`);
}

// Step 7: Verify setupRoutes is exported
if (routesConfig.includes('module.exports') && routesConfig.includes('setupRoutes')) {
  console.log(`${colors.green}✅ setupRoutes exported${colors.reset}`);
} else {
  console.log(`${colors.red}❌ setupRoutes not properly exported!${colors.reset}`);
  process.exit(1);
}

// Step 8: Check debug routes conditional
if (routesConfig.includes('debugEnvs') && routesConfig.includes("['development', 'test']")) {
  console.log(`${colors.green}✅ Debug routes conditionally enabled${colors.reset}`);
} else {
  console.log(`${colors.yellow}⚠️  Debug routes configuration not found${colors.reset}`);
}

// Final summary
console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.green}✅ Route configuration validation PASSED${colors.reset}`);
console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

console.log(`📊 Summary:`);
console.log(`   - Route imports: ${imports.length}`);
console.log(`   - Existing files: ${existingFiles}`);
console.log(`   - V1 routes: ${v1Routes}`);
console.log(`   - Legacy routes: ${legacyRoutes}`);
console.log(`   - Total routes: ${v1Routes + legacyRoutes}`);
console.log('');

process.exit(0);
