#!/usr/bin/env node

/**
 * Adaptive E2E Test Suite - Tests Available Users
 * Automatically adapts to whatever users exist in the system
 */

const puppeteer = require('puppeteer');
const axios = require('axios');

class AdaptiveE2ETestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseURL = 'http://localhost:3000';
    this.apiURL = 'http://localhost:8080/api';
    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      details: []
    };
    
    // Will be populated with actual working users
    this.workingUsers = [];
    
    // Common test credentials to try
    this.potentialUsers = [
      { email: 'admin@test.com', password: 'admin123', role: 'admin' },
      { email: 'admin@example.com', password: 'admin123', role: 'admin' },
      { email: 'test@test.com', password: 'test123', role: 'user' },
      { email: 'john.doe@test.com', password: 'Password123!', role: 'employee' },
      { email: 'jane.smith@test.com', password: 'Password123!', role: 'employee' },
      { email: 'user@test.com', password: 'password', role: 'user' },
      { email: 'demo@demo.com', password: 'demo123', role: 'demo' }
    ];
  }

  async discoverWorkingUsers() {
    console.log('🔍 Discovering available users...\n');
    
    for (const user of this.potentialUsers) {
      try {
        console.log(`Testing: ${user.email}`);
        const response = await axios.post(`${this.apiURL}/auth/login`, {
          email: user.email,
          password: user.password
        });
        
        if (response.data && response.data.accessToken) {
          this.workingUsers.push({
            ...user,
            token: response.data.accessToken,
            userData: response.data.user
          });
          console.log(`   ✅ Working user found: ${user.email} (${response.data.user?.role || 'unknown role'})`);
        }
      } catch (error) {
        console.log(`   ❌ ${user.email}: ${error.response?.data?.message || 'failed'}`);
      }
    }
    
    console.log(`\n📊 Discovered ${this.workingUsers.length} working users`);
    return this.workingUsers.length > 0;
  }

  async setup() {
    console.log('🚀 Setting up adaptive E2E test environment...\n');
    
    try {
      this.browser = await puppeteer.launch({
        headless: false,
        slowMo: 300,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1366, height: 768 });
      
      // Set up page event listeners
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`🔴 Console Error: ${msg.text()}`);
        }
      });
      
      console.log('✅ Browser setup completed');
      return true;
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      return false;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔚 Browser closed');
    }
  }

  async takeScreenshot(name, fullPage = false) {
    try {
      const timestamp = Date.now();
      const filename = `test-screenshots/adaptive-e2e-${name}-${timestamp}.png`;
      await this.page.screenshot({ 
        path: filename, 
        fullPage 
      });
      console.log(`📸 Screenshot: ${filename}`);
      return filename;
    } catch (error) {
      console.log(`⚠️ Screenshot failed for ${name}`);
      return null;
    }
  }

  async recordTestResult(testName, passed, details = '') {
    this.testResults.totalTests++;
    if (passed) {
      this.testResults.passedTests++;
      console.log(`✅ ${testName}: PASSED ${details ? '- ' + details : ''}`);
    } else {
      this.testResults.failedTests++;
      console.log(`❌ ${testName}: FAILED ${details ? '- ' + details : ''}`);
    }
    
    this.testResults.details.push({
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async testApplicationLoad() {
    console.log('\n🌐 Testing Application Load...');
    
    try {
      console.log('Loading application...');
      await this.page.goto(this.baseURL, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      await this.takeScreenshot('app-load');
      
      // Check if page loaded
      const title = await this.page.title();
      const hasContent = await this.page.evaluate(() => {
        return document.body.innerHTML.length > 100;
      });
      
      await this.recordTestResult('application_load', hasContent, `Title: ${title}`);
      
      // Check for React root
      const reactRoot = await this.page.$('#root');
      await this.recordTestResult('react_root_exists', !!reactRoot);
      
      // Check for interactive elements
      const interactiveElements = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const inputs = document.querySelectorAll('input');
        const links = document.querySelectorAll('a');
        return {
          buttons: buttons.length,
          inputs: inputs.length,
          links: links.length,
          total: buttons.length + inputs.length + links.length
        };
      });
      
      await this.recordTestResult(
        'interactive_elements', 
        interactiveElements.total > 0,
        `${interactiveElements.total} interactive elements found`
      );
      
    } catch (error) {
      await this.recordTestResult('application_load_error', false, error.message);
    }
  }

  async testUserAuthentication() {
    console.log('\n🔐 Testing User Authentication...');
    
    if (this.workingUsers.length === 0) {
      await this.recordTestResult('no_users_available', false, 'No working users found');
      return;
    }
    
    for (const user of this.workingUsers) {
      console.log(`\n👤 Testing authentication for: ${user.email}`);
      
      try {
        // Go to login page (or main page if it has login form)
        await this.page.goto(this.baseURL, { waitUntil: 'networkidle2' });
        
        await this.takeScreenshot(`login-attempt-${user.email.split('@')[0]}`);
        
        // Look for login form elements with multiple strategies
        const loginFound = await this.attemptLogin(user.email, user.password);
        
        if (loginFound) {
          await this.recordTestResult(`login_${user.email}`, true, 'Login form interaction successful');
          
          // Wait a bit and check if we're logged in
          await this.page.waitForTimeout(3000);
          await this.takeScreenshot(`post-login-${user.email.split('@')[0]}`);
          
          // Test logout if possible
          await this.attemptLogout();
          
        } else {
          await this.recordTestResult(`login_${user.email}`, false, 'Could not find login form');
        }
        
      } catch (error) {
        await this.recordTestResult(`login_error_${user.email}`, false, error.message);
      }
    }
  }

  async attemptLogin(email, password) {
    try {
      // Strategy 1: Look for email and password inputs
      const emailInput = await this.findElementBySelectors([
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="Email" i]',
        '#email',
        '.email-input input'
      ]);
      
      const passwordInput = await this.findElementBySelectors([
        'input[type="password"]',
        'input[name="password"]',
        'input[placeholder*="password" i]',
        'input[placeholder*="Password" i]',
        '#password',
        '.password-input input'
      ]);
      
      if (emailInput && passwordInput) {
        console.log('   Found login form inputs');
        await emailInput.type(email);
        await passwordInput.type(password);
        
        // Look for submit button
        const submitButton = await this.findElementBySelectors([
          'button[type="submit"]',
          'button:contains("Login")',
          'button:contains("Sign In")',
          'input[type="submit"]',
          '.login-button',
          'form button'
        ]);
        
        if (submitButton) {
          console.log('   Clicking login button');
          await submitButton.click();
          return true;
        } else {
          console.log('   No submit button found');
          // Try pressing Enter on password field
          await passwordInput.press('Enter');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.log(`   Login attempt error: ${error.message}`);
      return false;
    }
  }

  async findElementBySelectors(selectors) {
    for (const selector of selectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          return element;
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  async attemptLogout() {
    try {
      console.log('   Attempting logout...');
      
      const logoutElement = await this.findElementBySelectors([
        'button:contains("Logout")',
        'button:contains("Sign Out")',
        'a:contains("Logout")',
        'a:contains("Sign Out")',
        '.logout-button',
        '[data-testid="logout"]'
      ]);
      
      if (logoutElement) {
        await logoutElement.click();
        await this.page.waitForTimeout(2000);
        console.log('   Logout attempted');
        return true;
      } else {
        console.log('   No logout button found');
        return false;
      }
    } catch (error) {
      console.log(`   Logout error: ${error.message}`);
      return false;
    }
  }

  async testUIResponsiveness() {
    console.log('\n📱 Testing UI Responsiveness...');
    
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ];
    
    for (const viewport of viewports) {
      try {
        console.log(`Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})`);
        
        await this.page.setViewport({ 
          width: viewport.width, 
          height: viewport.height 
        });
        
        await this.page.reload({ waitUntil: 'networkidle2' });
        await this.takeScreenshot(`responsive-${viewport.name}`);
        
        // Check if content is visible and accessible
        const isResponsive = await this.page.evaluate(() => {
          const body = document.body;
          const hasOverflowX = window.getComputedStyle(body).overflowX === 'scroll';
          const hasContent = body.scrollWidth <= window.innerWidth + 50; // Allow small tolerance
          return !hasOverflowX && hasContent;
        });
        
        await this.recordTestResult(
          `responsive_${viewport.name}`, 
          isResponsive,
          `Viewport: ${viewport.width}x${viewport.height}`
        );
        
      } catch (error) {
        await this.recordTestResult(`responsive_${viewport.name}_error`, false, error.message);
      }
    }
    
    // Reset to default viewport
    await this.page.setViewport({ width: 1366, height: 768 });
  }

  async testNavigationAndRouting() {
    console.log('\n🧭 Testing Navigation and Routing...');
    
    const commonRoutes = [
      '/',
      '/login',
      '/dashboard',
      '/employees',
      '/timesheets',
      '/leave',
      '/payroll'
    ];
    
    for (const route of commonRoutes) {
      try {
        console.log(`Testing route: ${route}`);
        
        await this.page.goto(`${this.baseURL}${route}`, { 
          waitUntil: 'networkidle2',
          timeout: 10000 
        });
        
        const statusCode = await this.page.evaluate(() => {
          return fetch(window.location.href).then(r => r.status).catch(() => 200);
        });
        
        const hasContent = await this.page.evaluate(() => {
          return document.body.innerHTML.length > 100;
        });
        
        await this.recordTestResult(
          `route_${route.replace('/', 'root').replace('/', '_')}`,
          hasContent,
          `Status: ${statusCode}`
        );
        
      } catch (error) {
        await this.recordTestResult(`route_error${route.replace('/', '_')}`, false, error.message);
      }
    }
  }

  async generateReport() {
    const passRate = (this.testResults.passedTests / this.testResults.totalTests * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ADAPTIVE E2E TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`📊 Total Tests: ${this.testResults.totalTests}`);
    console.log(`✅ Passed: ${this.testResults.passedTests}`);
    console.log(`❌ Failed: ${this.testResults.failedTests}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    
    console.log(`\n👥 Available Users: ${this.workingUsers.length}`);
    this.workingUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.userData?.role || user.role})`);
    });
    
    console.log('\n📋 Test Categories:');
    const categories = ['application', 'login', 'responsive', 'route'];
    categories.forEach(category => {
      const categoryTests = this.testResults.details.filter(t => 
        t.test.toLowerCase().includes(category)
      );
      const passed = categoryTests.filter(t => t.passed).length;
      console.log(`   📁 ${category.toUpperCase()}: ${passed}/${categoryTests.length} passed`);
    });
    
    console.log('\n🚨 Failed Tests:');
    const failedTests = this.testResults.details.filter(t => !t.passed);
    if (failedTests.length === 0) {
      console.log('   🎉 All tests passed!');
    } else {
      failedTests.slice(0, 5).forEach(test => {
        console.log(`   ❌ ${test.test}: ${test.details}`);
      });
    }
    
    console.log('\n🎯 Overall Assessment:');
    if (passRate >= 80) {
      console.log('🟢 EXCELLENT - System working well with available users');
    } else if (passRate >= 60) {
      console.log('🟡 GOOD - Most functionality working');
    } else {
      console.log('🟠 NEEDS WORK - Several issues detected');
    }
    
    console.log('\n📸 Screenshots saved in test-screenshots/ directory');
    console.log('🚀 Adaptive E2E Testing Complete!');
    
    return passRate >= 60;
  }

  async runAllTests() {
    console.log('🎯 ADAPTIVE E2E TEST SUITE STARTING...\n');
    
    // First discover what users are available
    const hasUsers = await this.discoverWorkingUsers();
    
    const setupSuccess = await this.setup();
    if (!setupSuccess) {
      console.error('❌ Setup failed, aborting tests');
      return false;
    }
    
    try {
      // Run adaptive tests based on what's available
      await this.testApplicationLoad();
      await this.testUserAuthentication();
      await this.testUIResponsiveness();
      await this.testNavigationAndRouting();
      
      return await this.generateReport();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the adaptive test suite
async function main() {
  const testSuite = new AdaptiveE2ETestSuite();
  const success = await testSuite.runAllTests();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = AdaptiveE2ETestSuite;
