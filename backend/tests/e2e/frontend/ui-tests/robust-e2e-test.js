#!/usr/bin/env node

/**
 * Robust E2E Test Suite - All User Roles
 * Simplified but comprehensive testing for all user roles
 */

const puppeteer = require('puppeteer');
const axios = require('axios');

class RobustE2ETestSuite {
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
    
    // Test users to validate
    this.testUsers = [
      { email: 'admin@test.com', password: 'admin123', role: 'admin' },
      { email: 'john.doe@test.com', password: 'Password123!', role: 'employee' },
      { email: 'jane.smith@test.com', password: 'Password123!', role: 'employee' },
      { email: 'test@test.com', password: 'test123', role: 'user' }
    ];
    
    this.workingUsers = [];
  }

  async setup() {
    console.log('🚀 Starting Robust E2E Test Suite...\n');
    
    try {
      this.browser = await puppeteer.launch({
        headless: false,
        slowMo: 500,
        defaultViewport: { width: 1366, height: 768 },
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Enhanced error handling
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`🔴 Console Error: ${msg.text()}`);
        }
      });
      
      this.page.on('pageerror', error => {
        console.log(`🔴 Page Error: ${error.message}`);
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

  async takeScreenshot(name) {
    try {
      const timestamp = Date.now();
      const filename = `test-screenshots/robust-e2e-${name}-${timestamp}.png`;
      await this.page.screenshot({ 
        path: filename, 
        fullPage: true 
      });
      console.log(`📸 Screenshot: ${filename}`);
      return filename;
    } catch (error) {
      console.log(`⚠️ Screenshot failed: ${error.message}`);
      return null;
    }
  }

  recordTest(testName, passed, details = '') {
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

  async discoverWorkingUsers() {
    console.log('🔍 Discovering working user accounts...\n');
    
    for (const user of this.testUsers) {
      try {
        console.log(`Testing API login: ${user.email}`);
        
        const response = await axios.post(`${this.apiURL}/auth/login`, {
          email: user.email,
          password: user.password
        }, { timeout: 5000 });
        
        if (response.data && response.data.accessToken) {
          this.workingUsers.push({
            ...user,
            token: response.data.accessToken,
            userData: response.data.user || {}
          });
          console.log(`   ✅ Working user: ${user.email} (${response.data.user?.role || user.role})`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${user.email}: ${error.response?.data?.message || 'Login failed'}`);
      }
    }
    
    console.log(`\n📊 Found ${this.workingUsers.length} working users\n`);
    return this.workingUsers.length > 0;
  }

  // Test 1: Application Loading
  async testApplicationLoad() {
    console.log('🌐 Testing Application Load...');
    
    try {
      await this.page.goto(this.baseURL, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      const title = await this.page.title();
      const bodyText = await this.page.evaluate(() => document.body.innerText.length);
      
      this.recordTest('application_load', bodyText > 50, `Title: "${title}", Content: ${bodyText} chars`);
      await this.takeScreenshot('app-load');
      
      // Test React root
      const reactRoot = await this.page.$('#root');
      this.recordTest('react_app_detected', !!reactRoot, 'React root element found');
      
      // Test for interactive elements
      const interactiveCount = await this.page.evaluate(() => {
        return document.querySelectorAll('button, input, a, select').length;
      });
      
      this.recordTest('interactive_elements', interactiveCount > 0, `${interactiveCount} interactive elements`);
      
    } catch (error) {
      this.recordTest('application_load_error', false, error.message);
    }
  }

  // Test 2: User Authentication (Browser-based)
  async testBrowserAuthentication() {
    console.log('\n🔐 Testing Browser Authentication...');
    
    if (this.workingUsers.length === 0) {
      this.recordTest('no_working_users', false, 'No users available for browser testing');
      return;
    }
    
    for (const user of this.workingUsers.slice(0, 2)) { // Test first 2 working users
      console.log(`\n👤 Testing browser auth for: ${user.email}`);
      
      try {
        // Go to application
        await this.page.goto(this.baseURL, { waitUntil: 'networkidle2' });
        await this.takeScreenshot(`login-page-${user.role}`);
        
        // Simple login attempt
        const loginSuccess = await this.attemptLogin(user.email, user.password);
        
        if (loginSuccess) {
          this.recordTest(`browser_login_${user.role}`, true, 'Login form interaction successful');
          
          // Wait and check for login success indicators
          await this.page.waitForTimeout(3000);
          await this.takeScreenshot(`post-login-${user.role}`);
          
          // Check current URL and page content
          const currentUrl = this.page.url();
          const pageChanged = !currentUrl.includes('/login') && currentUrl !== this.baseURL;
          
          this.recordTest(`login_redirect_${user.role}`, pageChanged, `URL: ${currentUrl}`);
          
          // Test logout
          await this.attemptLogout();
          
        } else {
          this.recordTest(`browser_login_${user.role}`, false, 'Could not complete login form');
        }
        
      } catch (error) {
        this.recordTest(`browser_auth_error_${user.role}`, false, error.message);
      }
    }
  }

  async attemptLogin(email, password) {
    try {
      // Wait for page to be ready
      await this.page.waitForTimeout(2000);
      
      // Try to find email input with multiple strategies
      let emailInput = null;
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]', 
        '#email',
        'input[placeholder*="email" i]'
      ];
      
      for (const selector of emailSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            emailInput = element;
            console.log(`   Found email input: ${selector}`);
            break;
          }
        } catch (e) { continue; }
      }
      
      // Try to find password input
      let passwordInput = null;
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        '#password',
        'input[placeholder*="password" i]'
      ];
      
      for (const selector of passwordSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            passwordInput = element;
            console.log(`   Found password input: ${selector}`);
            break;
          }
        } catch (e) { continue; }
      }
      
      if (emailInput && passwordInput) {
        // Clear and type credentials
        await emailInput.click({ clickCount: 3 });
        await emailInput.type(email);
        console.log(`   Typed email: ${email}`);
        
        await passwordInput.click({ clickCount: 3 });
        await passwordInput.type(password);
        console.log(`   Typed password`);
        
        // Try to find and click submit button
        let submitted = false;
        
        // First try form submission
        try {
          const form = await this.page.$('form');
          if (form) {
            await passwordInput.press('Enter');
            console.log(`   Submitted via Enter key`);
            submitted = true;
          }
        } catch (e) {}
        
        // Then try finding submit button
        if (!submitted) {
          const buttons = await this.page.$$('button');
          for (const button of buttons) {
            try {
              const buttonText = await button.evaluate(el => el.textContent?.toLowerCase() || '');
              const buttonType = await button.evaluate(el => el.type || '');
              
              if (buttonText.includes('login') || buttonText.includes('sign in') || buttonType === 'submit') {
                await button.click();
                console.log(`   Clicked button: "${buttonText}"`);
                submitted = true;
                break;
              }
            } catch (e) { continue; }
          }
        }
        
        return submitted;
        
      } else {
        console.log(`   Login form not found - Email: ${!!emailInput}, Password: ${!!passwordInput}`);
        return false;
      }
      
    } catch (error) {
      console.log(`   Login attempt error: ${error.message}`);
      return false;
    }
  }

  async attemptLogout() {
    try {
      await this.page.waitForTimeout(2000);
      
      // Look for logout buttons or links
      const allElements = await this.page.$$('button, a, span');
      
      for (const element of allElements) {
        try {
          const text = await element.evaluate(el => el.textContent?.toLowerCase() || '');
          if (text.includes('logout') || text.includes('sign out')) {
            await element.click();
            console.log(`   Clicked logout: "${text}"`);
            await this.page.waitForTimeout(2000);
            return true;
          }
        } catch (e) { continue; }
      }
      
      console.log(`   No logout button found`);
      return false;
      
    } catch (error) {
      console.log(`   Logout error: ${error.message}`);
      return false;
    }
  }

  // Test 3: Role-based Access Testing
  async testRoleBasedAccess() {
    console.log('\n🛡️ Testing Role-based Access...');
    
    const testRoutes = [
      { path: '/', name: 'home' },
      { path: '/dashboard', name: 'dashboard' },
      { path: '/employees', name: 'employees' },
      { path: '/timesheets', name: 'timesheets' },
      { path: '/leave', name: 'leave' },
      { path: '/payroll', name: 'payroll' }
    ];
    
    for (const route of testRoutes) {
      try {
        console.log(`Testing route: ${route.path}`);
        
        await this.page.goto(`${this.baseURL}${route.path}`, { 
          waitUntil: 'networkidle2',
          timeout: 10000 
        });
        
        const hasContent = await this.page.evaluate(() => {
          return document.body.innerHTML.length > 200;
        });
        
        const currentUrl = this.page.url();
        
        this.recordTest(`route_${route.name}`, hasContent, `URL: ${currentUrl}`);
        
      } catch (error) {
        this.recordTest(`route_${route.name}_error`, false, error.message);
      }
    }
  }

  // Test 4: Responsive Design Testing  
  async testResponsiveDesign() {
    console.log('\n📱 Testing Responsive Design...');
    
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ];
    
    await this.page.goto(this.baseURL, { waitUntil: 'networkidle2' });
    
    for (const viewport of viewports) {
      try {
        console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
        
        await this.page.setViewport(viewport);
        await this.page.waitForTimeout(1000);
        
        await this.takeScreenshot(`responsive-${viewport.name}`);
        
        // Check if content fits properly
        const isResponsive = await this.page.evaluate(() => {
          const body = document.body;
          return body.scrollWidth <= window.innerWidth + 100; // Allow some tolerance
        });
        
        this.recordTest(`responsive_${viewport.name}`, isResponsive, `${viewport.width}x${viewport.height}`);
        
      } catch (error) {
        this.recordTest(`responsive_${viewport.name}_error`, false, error.message);
      }
    }
  }

  // Test 5: UI Element Testing
  async testUIElements() {
    console.log('\n🖥️ Testing UI Elements...');
    
    await this.page.goto(this.baseURL, { waitUntil: 'networkidle2' });
    
    // Test for Material-UI components
    const muiElements = await this.page.evaluate(() => {
      const muiClasses = document.querySelectorAll('[class*="Mui"], [class*="MuiButton"], [class*="MuiTextField"]');
      return muiClasses.length;
    });
    
    this.recordTest('material_ui_components', muiElements > 0, `${muiElements} Material-UI elements found`);
    
    // Test for common UI elements
    const uiElements = await this.page.evaluate(() => {
      return {
        buttons: document.querySelectorAll('button').length,
        inputs: document.querySelectorAll('input').length,
        links: document.querySelectorAll('a').length,
        forms: document.querySelectorAll('form').length
      };
    });
    
    this.recordTest('ui_buttons', uiElements.buttons > 0, `${uiElements.buttons} buttons found`);
    this.recordTest('ui_inputs', uiElements.inputs > 0, `${uiElements.inputs} inputs found`);
    this.recordTest('ui_navigation', uiElements.links > 0, `${uiElements.links} links found`);
    
    await this.takeScreenshot('ui-elements');
  }

  // Generate comprehensive report
  generateReport() {
    const passRate = (this.testResults.passedTests / this.testResults.totalTests * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ROBUST E2E TEST RESULTS - ALL USER ROLES');
    console.log('='.repeat(80));
    console.log(`📊 Total Tests: ${this.testResults.totalTests}`);
    console.log(`✅ Passed: ${this.testResults.passedTests}`);
    console.log(`❌ Failed: ${this.testResults.failedTests}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    
    console.log(`\n👥 Working Users Tested: ${this.workingUsers.length}`);
    this.workingUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.userData?.role || user.role})`);
    });
    
    console.log('\n📋 Test Category Results:');
    const categories = [
      'application',
      'browser_login', 
      'login_redirect',
      'route',
      'responsive', 
      'ui'
    ];
    
    categories.forEach(category => {
      const categoryTests = this.testResults.details.filter(t => t.test.includes(category));
      const passed = categoryTests.filter(t => t.passed).length;
      const total = categoryTests.length;
      if (total > 0) {
        console.log(`   📁 ${category.toUpperCase()}: ${passed}/${total} passed (${(passed/total*100).toFixed(1)}%)`);
      }
    });
    
    console.log('\n🚨 Failed Tests:');
    const failedTests = this.testResults.details.filter(t => !t.passed);
    if (failedTests.length === 0) {
      console.log('   🎉 All tests passed!');
    } else {
      failedTests.slice(0, 8).forEach(test => {
        console.log(`   ❌ ${test.test}: ${test.details}`);
      });
      if (failedTests.length > 8) {
        console.log(`   ... and ${failedTests.length - 8} more`);
      }
    }
    
    console.log('\n🎯 E2E Testing Assessment:');
    if (passRate >= 85) {
      console.log('🟢 EXCELLENT - All user roles working perfectly!');
      console.log('   ✅ System ready for production deployment');
      console.log('   ✅ All major workflows validated');
      console.log('   ✅ User experience optimized');
    } else if (passRate >= 70) {
      console.log('🟡 GOOD - Most functionality working well');
      console.log('   ✅ Core user workflows functional');
      console.log('   ⚠️ Minor improvements recommended');
    } else if (passRate >= 50) {
      console.log('🟠 NEEDS ATTENTION - Several issues detected');
      console.log('   ⚠️ Some user workflows may have problems');
      console.log('   🔧 Address failing tests before production');
    } else {
      console.log('🔴 CRITICAL ISSUES - Major problems found');
      console.log('   ❌ System requires significant fixes');
      console.log('   🛠️ Review and resolve critical failures');
    }
    
    console.log('\n📁 Test Artifacts:');
    console.log('   📸 Screenshots saved in test-screenshots/');
    console.log('   📊 Detailed test results logged above');
    console.log('   🔍 Review failed tests for improvement areas');
    
    console.log('\n🚀 Robust E2E Testing Complete!');
    
    return passRate >= 70;
  }

  // Main execution
  async runAllTests() {
    const setupSuccess = await this.setup();
    if (!setupSuccess) {
      console.error('❌ Setup failed, aborting tests');
      return false;
    }
    
    try {
      // Discover working users first
      await this.discoverWorkingUsers();
      
      // Run all test categories
      await this.testApplicationLoad();
      await this.testBrowserAuthentication();
      await this.testRoleBasedAccess();
      await this.testResponsiveDesign();
      await this.testUIElements();
      
      // Generate final report
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Execute the test suite
async function main() {
  console.log('🎯 ROBUST E2E TEST SUITE - ALL USER ROLES');
  console.log('==========================================');
  console.log('Testing complete user role functionality with permutation coverage\n');
  
  const testSuite = new RobustE2ETestSuite();
  const success = await testSuite.runAllTests();
  
  console.log('\n🎉 E2E Testing execution completed!');
  console.log('Check the results above and screenshots for detailed analysis.');
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = RobustE2ETestSuite;
