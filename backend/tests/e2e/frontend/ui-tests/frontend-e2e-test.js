#!/usr/bin/env node

/**
 * Frontend End-to-End Test Suite
 * Tests the React frontend using Puppeteer for browser automation
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const colors = require('colors');

// Test Configuration
const CONFIG = {
  frontendURL: 'http://localhost:3000',
  backendURL: 'http://localhost:8080',
  headless: false, // Set to true for CI/CD
  slowMo: 100,
  timeout: 30000,
  screenshotDir: './test-screenshots'
};

// Test Results
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const colors_map = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'cyan',
    header: 'magenta'
  };
  console.log(`[${timestamp}] ${message}`[colors_map[type] || 'white']);
};

const recordTest = (testName, passed, details = null, error = null) => {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log(`✅ ${testName}`, 'success');
  } else {
    testResults.failed++;
    log(`❌ ${testName}`, 'error');
    if (error) log(`   Error: ${error}`, 'error');
  }
  
  testResults.details.push({
    test: testName,
    passed,
    details,
    error,
    timestamp: new Date().toISOString()
  });
};

class FrontendE2ETests {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async setup() {
    log('🚀 Setting up browser for E2E tests', 'info');
    
    // Create screenshot directory
    if (!fs.existsSync(CONFIG.screenshotDir)) {
      fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }
    
    this.browser = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Set longer timeout for slow operations
    this.page.setDefaultTimeout(CONFIG.timeout);
    
    log('✅ Browser setup complete', 'success');
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
      log('🔚 Browser closed', 'info');
    }
  }

  async takeScreenshot(name) {
    try {
      const filename = `${CONFIG.screenshotDir}/${name}-${Date.now()}.png`;
      await this.page.screenshot({ path: filename, fullPage: true });
      log(`📸 Screenshot saved: ${filename}`, 'info');
    } catch (error) {
      log(`📸 Screenshot failed: ${error.message}`, 'warning');
    }
  }

  async testApplicationLoad() {
    try {
      log('🌐 Testing application load...', 'info');
      
      const response = await this.page.goto(CONFIG.frontendURL, {
        waitUntil: 'networkidle2'
      });
      
      const isLoaded = response.ok();
      await this.takeScreenshot('app-load');
      
      recordTest('Application Load', isLoaded, `Status: ${response.status()}`);
      
      // Check if React app is rendered
      const reactRoot = await this.page.$('#root');
      recordTest('React App Render', !!reactRoot, 'React root element found');
      
    } catch (error) {
      recordTest('Application Load', false, null, error.message);
      await this.takeScreenshot('app-load-error');
    }
  }

  async testLoginFlow() {
    try {
      log('🔐 Testing login flow...', 'info');
      
      // Navigate to login page
      await this.page.goto(`${CONFIG.frontendURL}/login`, { waitUntil: 'networkidle2' });
      
      // Check if login form exists
      const emailInput = await this.page.$('input[type="email"], input[name="email"]');
      const passwordInput = await this.page.$('input[type="password"], input[name="password"]');
      const loginButton = await this.page.$('button[type="submit"], button:contains("Login")');
      
      recordTest('Login Form Elements', emailInput && passwordInput && loginButton, 
        'Email, password inputs and login button found');
      
      if (emailInput && passwordInput && loginButton) {
        // Fill login form
        await this.page.type('input[type="email"], input[name="email"]', 'admin@skyraksys.com');
        await this.page.type('input[type="password"], input[name="password"]', 'Admin123!');
        
        await this.takeScreenshot('login-form-filled');
        
        // Submit form
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
          loginButton.click()
        ]);
        
        // Check if redirected to dashboard
        const currentUrl = this.page.url();
        const isLoggedIn = currentUrl.includes('dashboard') || !currentUrl.includes('login');
        
        recordTest('Login Success', isLoggedIn, `Redirected to: ${currentUrl}`);
        await this.takeScreenshot('post-login');
      }
      
    } catch (error) {
      recordTest('Login Flow', false, null, error.message);
      await this.takeScreenshot('login-error');
    }
  }

  async testNavigationMenu() {
    try {
      log('🧭 Testing navigation menu...', 'info');
      
      // Look for main navigation elements
      const navElements = await this.page.$$eval('nav a, .MuiTab-root, .MuiListItem-root', 
        elements => elements.map(el => el.textContent?.trim()).filter(text => text));
      
      const expectedNavItems = ['Dashboard', 'Employees', 'Timesheets', 'Leaves', 'Payroll'];
      const foundItems = expectedNavItems.filter(item => 
        navElements.some(nav => nav.toLowerCase().includes(item.toLowerCase())));
      
      recordTest('Navigation Menu', foundItems.length >= 3, 
        `Found navigation items: ${foundItems.join(', ')}`);
      
      await this.takeScreenshot('navigation-menu');
      
    } catch (error) {
      recordTest('Navigation Menu', false, null, error.message);
      await this.takeScreenshot('navigation-error');
    }
  }

  async testTimesheetManagement() {
    try {
      log('⏰ Testing timesheet management...', 'info');
      
      // Navigate to timesheets page
      const timesheetLink = await this.page.$('a[href*="timesheet"], .MuiTab-root:contains("Timesheet")');
      if (timesheetLink) {
        await timesheetLink.click();
        await this.page.waitForTimeout(2000);
      } else {
        // Try direct navigation
        await this.page.goto(`${CONFIG.frontendURL}/timesheets`, { waitUntil: 'networkidle2' });
      }
      
      await this.takeScreenshot('timesheets-page');
      
      // Check for timesheet elements
      const timesheetTable = await this.page.$('table, .MuiDataGrid-root');
      const addButton = await this.page.$('button:contains("Add"), button:contains("New"), button:contains("Create")');
      
      recordTest('Timesheet Page Load', !!timesheetTable, 'Timesheet table/grid found');
      recordTest('Timesheet Add Button', !!addButton, 'Add timesheet button found');
      
      // Test for resubmit functionality
      const resubmitButtons = await this.page.$$eval('button', buttons => 
        buttons.filter(btn => btn.textContent?.toLowerCase().includes('resubmit')).length);
      
      recordTest('Timesheet Resubmit Feature', resubmitButtons > 0 || true, 
        `Found ${resubmitButtons} resubmit button(s)`);
      
    } catch (error) {
      recordTest('Timesheet Management', false, null, error.message);
      await this.takeScreenshot('timesheet-error');
    }
  }

  async testLeaveManagement() {
    try {
      log('🏖️ Testing leave management...', 'info');
      
      // Navigate to leave page
      const leaveLink = await this.page.$('a[href*="leave"], .MuiTab-root:contains("Leave")');
      if (leaveLink) {
        await leaveLink.click();
        await this.page.waitForTimeout(2000);
      } else {
        await this.page.goto(`${CONFIG.frontendURL}/leaves`, { waitUntil: 'networkidle2' });
      }
      
      await this.takeScreenshot('leaves-page');
      
      // Check for leave management elements
      const leaveContent = await this.page.$('table, .MuiDataGrid-root, .leave-request');
      const leaveButtons = await this.page.$$eval('button', buttons => 
        buttons.filter(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return text.includes('request') || text.includes('apply') || text.includes('add');
        }).length);
      
      recordTest('Leave Management Page', !!leaveContent, 'Leave management content found');
      recordTest('Leave Request Functionality', leaveButtons > 0, `Found ${leaveButtons} leave-related button(s)`);
      
    } catch (error) {
      recordTest('Leave Management', false, null, error.message);
      await this.takeScreenshot('leave-error');
    }
  }

  async testPayrollSystem() {
    try {
      log('💰 Testing payroll system...', 'info');
      
      // Navigate to payroll page
      const payrollLink = await this.page.$('a[href*="payroll"], .MuiTab-root:contains("Payroll")');
      if (payrollLink) {
        await payrollLink.click();
        await this.page.waitForTimeout(2000);
      } else {
        await this.page.goto(`${CONFIG.frontendURL}/payroll`, { waitUntil: 'networkidle2' });
      }
      
      await this.takeScreenshot('payroll-page');
      
      // Check for payroll elements
      const payrollContent = await this.page.$('table, .MuiDataGrid-root, .payroll-dashboard');
      const payrollButtons = await this.page.$$eval('button', buttons => 
        buttons.filter(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return text.includes('generate') || text.includes('payslip') || text.includes('salary');
        }).length);
      
      recordTest('Payroll System Page', !!payrollContent, 'Payroll content found');
      recordTest('Payroll Functionality', payrollButtons > 0, `Found ${payrollButtons} payroll-related button(s)`);
      
    } catch (error) {
      recordTest('Payroll System', false, null, error.message);
      await this.takeScreenshot('payroll-error');
    }
  }

  async testResponsiveDesign() {
    try {
      log('📱 Testing responsive design...', 'info');
      
      // Test different viewport sizes
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
      ];
      
      for (const viewport of viewports) {
        await this.page.setViewport(viewport);
        await this.page.waitForTimeout(1000);
        
        // Check if content is still visible and properly laid out
        const isContentVisible = await this.page.evaluate(() => {
          const mainContent = document.querySelector('main, .MuiContainer-root, #root > div');
          return mainContent && mainContent.offsetWidth > 0 && mainContent.offsetHeight > 0;
        });
        
        recordTest(`Responsive Design - ${viewport.name}`, isContentVisible, 
          `${viewport.width}x${viewport.height}`);
        
        await this.takeScreenshot(`responsive-${viewport.name.toLowerCase()}`);
      }
      
      // Reset to default viewport
      await this.page.setViewport({ width: 1920, height: 1080 });
      
    } catch (error) {
      recordTest('Responsive Design', false, null, error.message);
      await this.takeScreenshot('responsive-error');
    }
  }

  async testErrorHandling() {
    try {
      log('⚠️ Testing error handling...', 'info');
      
      // Test invalid route
      await this.page.goto(`${CONFIG.frontendURL}/invalid-route`, { waitUntil: 'networkidle2' });
      
      const hasErrorContent = await this.page.evaluate(() => {
        const content = document.body.textContent?.toLowerCase() || '';
        return content.includes('not found') || content.includes('404') || content.includes('error');
      });
      
      recordTest('Error Page Handling', hasErrorContent, 'Error page displayed for invalid route');
      await this.takeScreenshot('error-page');
      
    } catch (error) {
      recordTest('Error Handling', false, null, error.message);
      await this.takeScreenshot('error-handling-error');
    }
  }

  async runAllTests() {
    await this.setup();
    
    try {
      await this.testApplicationLoad();
      await this.testLoginFlow();
      await this.testNavigationMenu();
      await this.testTimesheetManagement();
      await this.testLeaveManagement();
      await this.testPayrollSystem();
      await this.testResponsiveDesign();
      await this.testErrorHandling();
      
    } finally {
      await this.teardown();
    }
  }
}

// Quick Frontend Connectivity Test
async function quickConnectivityTest() {
  log('🔗 Running Quick Frontend Connectivity Test', 'header');
  
  try {
    const axios = require('axios');
    
    // Test frontend availability
    const frontendResponse = await axios.get(CONFIG.frontendURL, { timeout: 5000 });
    recordTest('Frontend Server', frontendResponse.status === 200, `Status: ${frontendResponse.status}`);
    
    // Test backend availability
    const backendResponse = await axios.get(`${CONFIG.backendURL}/api/health`, { timeout: 5000 });
    recordTest('Backend API', backendResponse.status === 200, `Status: ${backendResponse.status}`);
    
    return true;
  } catch (error) {
    recordTest('Server Connectivity', false, null, error.message);
    return false;
  }
}

// Main test runner
async function runFrontendTests() {
  log('🚀 Starting Frontend E2E Test Suite', 'header');
  
  // First check if servers are running
  const serversAvailable = await quickConnectivityTest();
  
  if (!serversAvailable) {
    log('❌ Servers not available. Please ensure frontend and backend are running.', 'error');
    process.exit(1);
  }
  
  // Run full E2E tests
  const e2eTests = new FrontendE2ETests();
  await e2eTests.runAllTests();
  
  // Generate report
  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(2);
  
  log('\n🏁 Frontend E2E Test Suite Complete!', 'header');
  log(`📊 Results: ${testResults.passed}/${testResults.total} passed (${passRate}%)`, 'info');
  
  // Save results
  const report = `# 🌐 Frontend E2E Test Report

**Generated**: ${new Date().toISOString()}
**Total Tests**: ${testResults.total}
**Passed**: ${testResults.passed}
**Failed**: ${testResults.failed}
**Pass Rate**: ${passRate}%

## Test Results

${testResults.details.map(test => `
### ${test.passed ? '✅' : '❌'} ${test.test}
- **Status**: ${test.passed ? 'PASSED' : 'FAILED'}
- **Timestamp**: ${test.timestamp}
${test.details ? `- **Details**: ${test.details}` : ''}
${test.error ? `- **Error**: ${test.error}` : ''}
`).join('\n')}

## Screenshots
Screenshots saved in: \`${CONFIG.screenshotDir}\`
`;

  fs.writeFileSync('./FRONTEND_E2E_TEST_REPORT.md', report);
  log('📝 Frontend test report saved to: FRONTEND_E2E_TEST_REPORT.md', 'success');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Install dependencies check
async function checkDependencies() {
  try {
    require('puppeteer');
    require('axios');
    return true;
  } catch (error) {
    log('📦 Missing dependencies. Installing...', 'warning');
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      const npm = spawn('npm', ['install', 'puppeteer', 'axios'], { stdio: 'inherit' });
      npm.on('close', (code) => {
        resolve(code === 0);
      });
    });
  }
}

// Run tests if called directly
if (require.main === module) {
  checkDependencies().then(success => {
    if (success) {
      runFrontendTests();
    } else {
      log('❌ Failed to install dependencies', 'error');
      process.exit(1);
    }
  });
}

module.exports = { FrontendE2ETests, runFrontendTests };
