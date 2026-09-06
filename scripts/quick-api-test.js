/**
 * Quick API Health Check
 * Tests critical endpoints to verify deployment success
 * 
 * Usage: node scripts/quick-api-test.js [base-url]
 * Example: node scripts/quick-api-test.js http://localhost:5000
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.argv[2] || process.env.API_BASE_URL || 'http://localhost:5000';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const results = {
  passed: 0,
  failed: 0,
  total: 0
};

console.log(`${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.bold}   Quick API Health Check${colors.reset}`);
console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
console.log(`Target: ${BASE_URL}\n`);

/**
 * Make HTTP request
 */
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(options.timeout || 5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

/**
 * Test a single endpoint
 */
async function testEndpoint(name, path, expectedStatus, checks = {}) {
  results.total++;
  
  try {
    const start = Date.now();
    const response = await makeRequest(path);
    const duration = Date.now() - start;
    
    let passed = true;
    let reasons = [];
    
    // Check status code
    if (response.status !== expectedStatus) {
      passed = false;
      reasons.push(`Expected ${expectedStatus}, got ${response.status}`);
    }
    
    // Check for deprecation header (if specified)
    if (checks.deprecationHeader !== undefined) {
      const hasHeader = !!response.headers['x-deprecation-warning'];
      if (hasHeader !== checks.deprecationHeader) {
        passed = false;
        reasons.push(checks.deprecationHeader ? 
          'Missing deprecation header' : 
          'Unexpected deprecation header');
      }
    }
    
    // Check for API version header (if specified)
    if (checks.apiVersion) {
      const version = response.headers['x-api-version'];
      if (version !== checks.apiVersion) {
        passed = false;
        reasons.push(`Expected version ${checks.apiVersion}, got ${version || 'none'}`);
      }
    }
    
    // Check response time
    if (checks.maxDuration && duration > checks.maxDuration) {
      passed = false;
      reasons.push(`Slow response: ${duration}ms (max ${checks.maxDuration}ms)`);
    }
    
    if (passed) {
      results.passed++;
      console.log(`${colors.green}✅ ${name}${colors.reset} (${duration}ms)`);
    } else {
      results.failed++;
      console.log(`${colors.red}❌ ${name}${colors.reset}`);
      reasons.forEach(r => console.log(`   ${colors.red}→ ${r}${colors.reset}`));
    }
  } catch (error) {
    results.failed++;
    console.log(`${colors.red}❌ ${name} - ${error.message}${colors.reset}`);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(`${colors.bold}Running Tests...${colors.reset}\n`);
  
  // 1. Health endpoint
  await testEndpoint(
    'Health Check',
    '/api/health',
    200,
    { maxDuration: 1000 }
  );
  
  // 2. Legacy route (with deprecation)
  await testEndpoint(
    'Legacy Route (/api/employees)',
    '/api/employees',
    401, // Unauthorized (no token)
    { 
      deprecationHeader: true,
      apiVersion: 'legacy',
      maxDuration: 1000
    }
  );
  
  // 3. V1 route (no deprecation)
  await testEndpoint(
    'V1 Route (/api/v1/employees)',
    '/api/v1/employees',
    401, // Unauthorized (no token)
    { 
      deprecationHeader: false,
      maxDuration: 1000
    }
  );
  
  // 4. Route alias - leave-requests
  await testEndpoint(
    'Route Alias (/api/leave-requests)',
    '/api/leave-requests',
    401,
    { 
      deprecationHeader: true,
      apiVersion: 'legacy'
    }
  );
  
  // 5. Route alias - leaves
  await testEndpoint(
    'Route Alias (/api/leaves)',
    '/api/leaves',
    401,
    { 
      deprecationHeader: true,
      apiVersion: 'legacy'
    }
  );
  
  // 6. 404 handling
  await testEndpoint(
    '404 Handler',
    '/api/nonexistent',
    404
  );
  
  // Summary
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}Results${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  console.log(`Total:  ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}\n`);
  
  if (results.failed === 0) {
    console.log(`${colors.green}${colors.bold}✅ ALL TESTS PASSED${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}❌ ${results.failed} TEST(S) FAILED${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
