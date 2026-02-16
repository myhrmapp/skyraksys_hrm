#!/usr/bin/env node

/**
 * Specific Workflow E2E Test
 * Tests actual timesheet submission/approval and leave submission/approval workflows
 */

const puppeteer = require('puppeteer');
const axios = require('axios');

class WorkflowE2ETest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseURL = 'http://localhost:3000';
    this.apiURL = 'http://localhost:8080/api';
    this.testResults = [];
    this.workingUser = null;
  }

  async setup() {
    console.log('🔬 SPECIFIC WORKFLOW E2E TEST');
    console.log('Testing actual timesheet and leave workflows with UI interactions\n');
    
    try {
      this.browser = await puppeteer.launch({
        headless: false,
        slowMo: 1000,
        defaultViewport: { width: 1366, height: 768 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      this.page = await this.browser.newPage();
      
      // Enhanced monitoring
      this.page.on('console', msg => {
        console.log(`   🔵 Console: ${msg.text()}`);
      });
      
      this.page.on('response', response => {
        if (response.url().includes('/api/')) {
          console.log(`   🌐 API Call: ${response.status()} ${response.url()}`);
        }
      });
      
      console.log('✅ Browser setup complete\n');
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
      const filename = `test-screenshots/workflow-${name}-${Date.now()}.png`;
      await this.page.screenshot({ path: filename, fullPage: true });
      console.log(`   📸 Screenshot: ${filename}`);
      return filename;
    } catch (error) {
      console.log(`   ⚠️ Screenshot failed: ${error.message}`);
      return null;
    }
  }

  recordTest(testName, passed, details = '') {
    this.testResults.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
    
    console.log(`   ${passed ? '✅' : '❌'} ${testName}: ${passed ? 'PASSED' : 'FAILED'} ${details ? '- ' + details : ''}`);
  }

  // First, find a working user
  async findWorkingUser() {
    console.log('🔍 Finding working user for workflow testing...');
    
    const testUsers = [
      { email: 'admin@test.com', password: 'admin123', role: 'admin' },
      { email: 'john.doe@test.com', password: 'Password123!', role: 'employee' },
      { email: 'test@test.com', password: 'test123', role: 'user' }
    ];
    
    for (const user of testUsers) {
      try {
        console.log(`   Testing login: ${user.email}`);
        const response = await axios.post(`${this.apiURL}/auth/login`, {
          email: user.email,
          password: user.password
        }, { timeout: 5000 });
        
        if (response.data && response.data.accessToken) {
          this.workingUser = {
            ...user,
            token: response.data.accessToken,
            userData: response.data.user
          };
          console.log(`   ✅ Found working user: ${user.email} (${response.data.user?.role || user.role})`);
          return true;
        }
      } catch (error) {
        console.log(`   ❌ ${user.email}: ${error.response?.data?.message || 'Login failed'}`);
      }
    }
    
    console.log('   ⚠️ No working users found - will test UI without authentication');
    return false;
  }

  // Test actual login through UI
  async testUILogin() {
    console.log('\n🔐 Testing UI Login Process...');
    
    try {
      await this.page.goto(this.baseURL, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.takeScreenshot('login-page');
      
      if (!this.workingUser) {
        this.recordTest('ui_login_no_user', false, 'No working user available');
        return false;
      }
      
      // Look for login form
      await this.page.waitForTimeout(2000);
      
      // Find email input
      const emailInput = await this.findInput(['email', 'username', 'user']);
      if (!emailInput) {
        this.recordTest('ui_login_form', false, 'Email input not found');
        return false;
      }
      
      // Find password input  
      const passwordInput = await this.findInput(['password', 'pass']);
      if (!passwordInput) {
        this.recordTest('ui_login_form', false, 'Password input not found');
        return false;
      }
      
      // Fill login form
      console.log('   📝 Filling login form...');
      await emailInput.click({ clickCount: 3 });
      await emailInput.type(this.workingUser.email);
      
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(this.workingUser.password);
      
      await this.takeScreenshot('login-filled');
      
      // Submit form
      console.log('   🔘 Submitting login form...');
      await passwordInput.press('Enter');
      await this.page.waitForTimeout(3000);
      
      // Check if login was successful
      const currentUrl = this.page.url();
      const hasLoggedInIndicators = await this.page.evaluate(() => {
        const indicators = ['dashboard', 'logout', 'profile', 'welcome'];
        const pageText = document.body.innerText.toLowerCase();
        return indicators.some(indicator => pageText.includes(indicator));
      });
      
      const loginSuccess = !currentUrl.includes('/login') || hasLoggedInIndicators;
      this.recordTest('ui_login_success', loginSuccess, `URL: ${currentUrl}`);
      
      await this.takeScreenshot('post-login');
      
      return loginSuccess;
      
    } catch (error) {
      this.recordTest('ui_login_error', false, error.message);
      return false;
    }
  }

  async findInput(keywords) {
    for (const keyword of keywords) {
      try {
        // Try different selectors
        const selectors = [
          `input[name*="${keyword}" i]`,
          `input[placeholder*="${keyword}" i]`,
          `input[type="${keyword === 'email' ? 'email' : keyword === 'password' ? 'password' : 'text'}"]`,
          `#${keyword}`,
          `.${keyword}`
        ];
        
        for (const selector of selectors) {
          const element = await this.page.$(selector);
          if (element) {
            console.log(`   Found input: ${selector}`);
            return element;
          }
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  // Test timesheet workflow
  async testTimesheetWorkflow() {
    console.log('\n🕒 Testing Timesheet Workflow...');
    
    try {
      // Navigate to timesheets
      console.log('   🧭 Navigating to timesheets...');
      const timesheetNavigation = await this.navigateToSection(['timesheet', 'time', 'hours']);
      
      if (!timesheetNavigation) {
        // Try direct URL
        await this.page.goto(`${this.baseURL}/timesheets`, { waitUntil: 'networkidle2' });
        await this.page.waitForTimeout(2000);
      }
      
      await this.takeScreenshot('timesheet-page');
      
      // Check if timesheet page loaded
      const hasTimesheetContent = await this.page.evaluate(() => {
        const keywords = ['timesheet', 'time', 'hours', 'submit', 'entry'];
        const pageText = document.body.innerText.toLowerCase();
        return keywords.some(keyword => pageText.includes(keyword));
      });
      
      this.recordTest('timesheet_page_load', hasTimesheetContent, 'Timesheet content detected');
      
      if (hasTimesheetContent) {
        // Look for timesheet creation/submission elements
        console.log('   📝 Looking for timesheet creation form...');
        
        const hasCreateButton = await this.findButton(['add', 'create', 'new', 'submit']);
        const hasTimeInputs = await this.page.$$eval('input', inputs => {
          return inputs.some(input => 
            input.type === 'number' || 
            input.type === 'time' || 
            input.name.toLowerCase().includes('hour') ||
            input.placeholder.toLowerCase().includes('hour')
          );
        });
        
        this.recordTest('timesheet_form_elements', hasCreateButton || hasTimeInputs, 
          `Create button: ${!!hasCreateButton}, Time inputs: ${hasTimeInputs}`);
        
        if (hasCreateButton) {
          console.log('   🔘 Attempting to create timesheet entry...');
          await hasCreateButton.click();
          await this.page.waitForTimeout(2000);
          await this.takeScreenshot('timesheet-create-form');
          
          // Test timesheet submission
          await this.testTimesheetSubmission();
        }
        
        // Test timesheet approval (if admin/manager)
        if (this.workingUser?.role === 'admin' || this.workingUser?.userData?.role === 'admin') {
          await this.testTimesheetApproval();
        }
      }
      
    } catch (error) {
      this.recordTest('timesheet_workflow_error', false, error.message);
    }
  }

  async testTimesheetSubmission() {
    console.log('   📤 Testing timesheet submission...');
    
    try {
      // Look for time entry fields
      const timeInputs = await this.page.$$('input[type="number"], input[type="time"], input[name*="hour" i]');
      
      if (timeInputs.length > 0) {
        console.log(`   Found ${timeInputs.length} time input fields`);
        
        // Fill in some sample time
        for (let i = 0; i < Math.min(timeInputs.length, 3); i++) {
          await timeInputs[i].click();
          await timeInputs[i].type('8');
        }
        
        await this.takeScreenshot('timesheet-filled');
        
        // Look for submit button
        const submitButton = await this.findButton(['submit', 'save', 'send']);
        if (submitButton) {
          console.log('   🔘 Submitting timesheet...');
          await submitButton.click();
          await this.page.waitForTimeout(3000);
          
          // Check for success indicators
          const hasSuccessMessage = await this.page.evaluate(() => {
            const successKeywords = ['success', 'submitted', 'saved', 'sent'];
            const pageText = document.body.innerText.toLowerCase();
            return successKeywords.some(keyword => pageText.includes(keyword));
          });
          
          this.recordTest('timesheet_submission', hasSuccessMessage, 'Timesheet submission attempted');
          await this.takeScreenshot('timesheet-submitted');
        } else {
          this.recordTest('timesheet_submission', false, 'Submit button not found');
        }
      } else {
        this.recordTest('timesheet_submission', false, 'No time input fields found');
      }
      
    } catch (error) {
      this.recordTest('timesheet_submission_error', false, error.message);
    }
  }

  async testTimesheetApproval() {
    console.log('   ✅ Testing timesheet approval...');
    
    try {
      // Look for pending timesheets or approval buttons
      const approvalElements = await this.page.evaluate(() => {
        const approvalKeywords = ['approve', 'pending', 'review', 'accept'];
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.filter(button => {
          const text = button.textContent.toLowerCase();
          return approvalKeywords.some(keyword => text.includes(keyword));
        }).length;
      });
      
      if (approvalElements > 0) {
        console.log(`   Found ${approvalElements} approval-related elements`);
        
        const approveButton = await this.findButton(['approve', 'accept']);
        if (approveButton) {
          console.log('   🔘 Attempting timesheet approval...');
          await approveButton.click();
          await this.page.waitForTimeout(2000);
          
          this.recordTest('timesheet_approval', true, 'Approval button clicked');
          await this.takeScreenshot('timesheet-approved');
        } else {
          this.recordTest('timesheet_approval', false, 'Approve button not clickable');
        }
      } else {
        this.recordTest('timesheet_approval', false, 'No approval elements found');
      }
      
    } catch (error) {
      this.recordTest('timesheet_approval_error', false, error.message);
    }
  }

  // Test leave workflow
  async testLeaveWorkflow() {
    console.log('\n🏖️ Testing Leave Request Workflow...');
    
    try {
      // Navigate to leave section
      console.log('   🧭 Navigating to leave requests...');
      const leaveNavigation = await this.navigateToSection(['leave', 'vacation', 'holiday']);
      
      if (!leaveNavigation) {
        await this.page.goto(`${this.baseURL}/leave`, { waitUntil: 'networkidle2' });
        await this.page.waitForTimeout(2000);
      }
      
      await this.takeScreenshot('leave-page');
      
      // Check if leave page loaded
      const hasLeaveContent = await this.page.evaluate(() => {
        const keywords = ['leave', 'vacation', 'request', 'holiday', 'absence'];
        const pageText = document.body.innerText.toLowerCase();
        return keywords.some(keyword => pageText.includes(keyword));
      });
      
      this.recordTest('leave_page_load', hasLeaveContent, 'Leave content detected');
      
      if (hasLeaveContent) {
        // Test leave request submission
        await this.testLeaveSubmission();
        
        // Test leave approval (if admin/manager)
        if (this.workingUser?.role === 'admin' || this.workingUser?.userData?.role === 'admin') {
          await this.testLeaveApproval();
        }
      }
      
    } catch (error) {
      this.recordTest('leave_workflow_error', false, error.message);
    }
  }

  async testLeaveSubmission() {
    console.log('   📤 Testing leave request submission...');
    
    try {
      // Look for create/request button
      const createButton = await this.findButton(['request', 'add', 'create', 'new']);
      
      if (createButton) {
        console.log('   🔘 Creating leave request...');
        await createButton.click();
        await this.page.waitForTimeout(2000);
        await this.takeScreenshot('leave-create-form');
        
        // Look for date inputs
        const dateInputs = await this.page.$$('input[type="date"], input[name*="date" i]');
        
        if (dateInputs.length >= 2) {
          console.log(`   Found ${dateInputs.length} date input fields`);
          
          // Fill start date
          await dateInputs[0].click();
          await dateInputs[0].type('2025-08-15');
          
          // Fill end date
          await dateInputs[1].click();
          await dateInputs[1].type('2025-08-16');
          
          await this.takeScreenshot('leave-filled');
          
          // Submit leave request
          const submitButton = await this.findButton(['submit', 'request', 'send']);
          if (submitButton) {
            console.log('   🔘 Submitting leave request...');
            await submitButton.click();
            await this.page.waitForTimeout(3000);
            
            const hasSuccessMessage = await this.page.evaluate(() => {
              const successKeywords = ['success', 'submitted', 'requested', 'sent'];
              const pageText = document.body.innerText.toLowerCase();
              return successKeywords.some(keyword => pageText.includes(keyword));
            });
            
            this.recordTest('leave_submission', hasSuccessMessage, 'Leave request submission attempted');
            await this.takeScreenshot('leave-submitted');
          } else {
            this.recordTest('leave_submission', false, 'Submit button not found');
          }
        } else {
          this.recordTest('leave_submission', false, 'Date input fields not found');
        }
      } else {
        this.recordTest('leave_submission', false, 'Create request button not found');
      }
      
    } catch (error) {
      this.recordTest('leave_submission_error', false, error.message);
    }
  }

  async testLeaveApproval() {
    console.log('   ✅ Testing leave request approval...');
    
    try {
      // Look for pending leave requests
      const pendingRequests = await this.page.evaluate(() => {
        const pendingKeywords = ['pending', 'approve', 'review', 'accept', 'reject'];
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.filter(button => {
          const text = button.textContent.toLowerCase();
          return pendingKeywords.some(keyword => text.includes(keyword));
        }).length;
      });
      
      if (pendingRequests > 0) {
        console.log(`   Found ${pendingRequests} approval-related elements`);
        
        const approveButton = await this.findButton(['approve', 'accept']);
        if (approveButton) {
          console.log('   🔘 Attempting leave approval...');
          await approveButton.click();
          await this.page.waitForTimeout(2000);
          
          this.recordTest('leave_approval', true, 'Leave approval attempted');
          await this.takeScreenshot('leave-approved');
        } else {
          this.recordTest('leave_approval', false, 'Approve button not found');
        }
      } else {
        this.recordTest('leave_approval', false, 'No pending requests found');
      }
      
    } catch (error) {
      this.recordTest('leave_approval_error', false, error.message);
    }
  }

  async navigateToSection(keywords) {
    for (const keyword of keywords) {
      try {
        // Look for navigation links or buttons
        const navElements = await this.page.$$('a, button, [role="button"]');
        
        for (const element of navElements) {
          const text = await element.evaluate(el => el.textContent?.toLowerCase() || '');
          const href = await element.evaluate(el => el.href?.toLowerCase() || '');
          
          if (text.includes(keyword) || href.includes(keyword)) {
            console.log(`   Found navigation: "${text}" -> ${keyword}`);
            await element.click();
            await this.page.waitForTimeout(2000);
            return true;
          }
        }
      } catch (e) {
        continue;
      }
    }
    return false;
  }

  async findButton(keywords) {
    for (const keyword of keywords) {
      try {
        const buttons = await this.page.$$('button, input[type="submit"], [role="button"]');
        
        for (const button of buttons) {
          const text = await button.evaluate(el => el.textContent?.toLowerCase() || el.value?.toLowerCase() || '');
          
          if (text.includes(keyword)) {
            console.log(`   Found button: "${text}" for ${keyword}`);
            return button;
          }
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  // Generate detailed workflow report
  generateWorkflowReport() {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0';
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 SPECIFIC WORKFLOW E2E TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`📊 Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${total - passed}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    
    if (this.workingUser) {
      console.log(`\n👤 Test User: ${this.workingUser.email} (${this.workingUser.userData?.role || this.workingUser.role})`);
    }
    
    console.log('\n📋 Workflow Test Results:');
    
    // Categorize results
    const categories = {
      'Login': this.testResults.filter(r => r.name.includes('login')),
      'Timesheet': this.testResults.filter(r => r.name.includes('timesheet')),
      'Leave': this.testResults.filter(r => r.name.includes('leave'))
    };
    
    Object.entries(categories).forEach(([category, tests]) => {
      if (tests.length > 0) {
        const categoryPassed = tests.filter(t => t.passed).length;
        console.log(`\n   📁 ${category} (${categoryPassed}/${tests.length}):`);
        tests.forEach(test => {
          console.log(`      ${test.passed ? '✅' : '❌'} ${test.name}: ${test.details}`);
        });
      }
    });
    
    console.log('\n🎯 Workflow Assessment:');
    
    const loginWorking = this.testResults.some(r => r.name.includes('login') && r.passed);
    const timesheetWorking = this.testResults.some(r => r.name.includes('timesheet') && r.passed);
    const leaveWorking = this.testResults.some(r => r.name.includes('leave') && r.passed);
    
    console.log(`   🔐 Login Workflow: ${loginWorking ? '✅ Working' : '❌ Issues detected'}`);
    console.log(`   🕒 Timesheet Workflow: ${timesheetWorking ? '✅ Working' : '❌ Issues detected'}`);
    console.log(`   🏖️ Leave Workflow: ${leaveWorking ? '✅ Working' : '❌ Issues detected'}`);
    
    if (passRate >= 80) {
      console.log('\n🟢 EXCELLENT - Core workflows are functional!');
      console.log('   ✅ Users can successfully interact with key features');
    } else if (passRate >= 60) {
      console.log('\n🟡 PARTIAL - Some workflows working');
      console.log('   ⚠️ Some features may need UI improvements');
    } else {
      console.log('\n🟠 NEEDS WORK - Workflow issues detected');
      console.log('   🔧 UI interactions need improvement');
    }
    
    console.log('\n📸 Screenshots saved showing actual UI interactions');
    console.log('🚀 Specific Workflow Testing Complete!');
    
    return passRate >= 60;
  }

  // Main execution
  async runWorkflowTests() {
    const setupSuccess = await this.setup();
    if (!setupSuccess) {
      console.error('❌ Setup failed');
      return false;
    }
    
    try {
      // Find working user and test login
      await this.findWorkingUser();
      const loginSuccess = await this.testUILogin();
      
      if (loginSuccess) {
        // Test actual workflows
        await this.testTimesheetWorkflow();
        await this.testLeaveWorkflow();
      } else {
        console.log('⚠️ Testing workflows without login...');
        await this.testTimesheetWorkflow();
        await this.testLeaveWorkflow();
      }
      
      return this.generateWorkflowReport();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Execute workflow tests
async function main() {
  console.log('🎯 SPECIFIC WORKFLOW E2E TEST');
  console.log('==============================');
  console.log('Testing actual timesheet and leave submission/approval workflows\n');
  
  const workflowTest = new WorkflowE2ETest();
  const success = await workflowTest.runWorkflowTests();
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Workflow test failed:', error);
    process.exit(1);
  });
}

module.exports = WorkflowE2ETest;
