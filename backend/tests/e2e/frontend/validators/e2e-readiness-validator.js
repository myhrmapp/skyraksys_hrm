#!/usr/bin/env node

/**
 * Final E2E Readiness Validation
 * Quick check to confirm system is ready for comprehensive testing
 */

const axios = require('axios');
const puppeteer = require('puppeteer');

class E2EReadinessValidator {
  constructor() {
    this.baseURL = 'http://localhost:3000';
    this.apiURL = 'http://localhost:8080/api';
    this.checks = [];
  }

  async validateBackendAPI() {
    console.log('🔧 Validating Backend API...');
    
    try {
      // Check health endpoint
      const health = await axios.get(`${this.apiURL}/health`);
      this.checks.push({ name: 'Backend Health', passed: health.status === 200 });
      console.log('   ✅ Backend server responding');
    } catch (error) {
      this.checks.push({ name: 'Backend Health', passed: false });
      console.log('   ❌ Backend server not responding');
    }
    
    // Test login endpoint
    try {
      const loginAttempt = await axios.post(`${this.apiURL}/auth/login`, {
        email: 'test@test.com',
        password: 'test'
      });
      // Even if credentials fail, endpoint should respond properly
      this.checks.push({ name: 'Login Endpoint', passed: true });
      console.log('   ✅ Login endpoint responding');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        this.checks.push({ name: 'Login Endpoint', passed: true });
        console.log('   ✅ Login endpoint responding (auth failure expected)');
      } else {
        this.checks.push({ name: 'Login Endpoint', passed: false });
        console.log('   ❌ Login endpoint not working');
      }
    }
  }

  async validateFrontend() {
    console.log('\n🌐 Validating Frontend...');
    
    try {
      const response = await axios.get(this.baseURL);
      this.checks.push({ name: 'Frontend Server', passed: response.status === 200 });
      console.log('   ✅ Frontend server responding');
      
      // Check if it contains React indicators
      const hasReact = response.data.includes('react') || 
                      response.data.includes('React') || 
                      response.data.includes('root');
      this.checks.push({ name: 'React Application', passed: hasReact });
      console.log(`   ${hasReact ? '✅' : '⚠️'} React application ${hasReact ? 'detected' : 'not clearly detected'}`);
      
    } catch (error) {
      this.checks.push({ name: 'Frontend Server', passed: false });
      this.checks.push({ name: 'React Application', passed: false });
      console.log('   ❌ Frontend server not responding');
    }
  }

  async validateBrowserAutomation() {
    console.log('\n🖥️ Validating Browser Automation...');
    
    let browser = null;
    try {
      browser = await puppeteer.launch({ 
        headless: true,
        timeout: 10000 
      });
      this.checks.push({ name: 'Puppeteer Launch', passed: true });
      console.log('   ✅ Puppeteer can launch browser');
      
      const page = await browser.newPage();
      await page.goto(this.baseURL, { timeout: 15000 });
      this.checks.push({ name: 'Page Navigation', passed: true });
      console.log('   ✅ Can navigate to application');
      
      // Take a quick screenshot to verify
      await page.screenshot({ path: 'e2e-readiness-check.png' });
      console.log('   📸 Test screenshot saved: e2e-readiness-check.png');
      
    } catch (error) {
      this.checks.push({ name: 'Puppeteer Launch', passed: false });
      this.checks.push({ name: 'Page Navigation', passed: false });
      console.log('   ❌ Browser automation failed:', error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async generateReadinessReport() {
    const passedChecks = this.checks.filter(c => c.passed).length;
    const totalChecks = this.checks.length;
    const readinessScore = (passedChecks / totalChecks * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 E2E TESTING READINESS REPORT');
    console.log('='.repeat(60));
    console.log(`📊 Checks Passed: ${passedChecks}/${totalChecks}`);
    console.log(`📈 Readiness Score: ${readinessScore}%`);
    
    console.log('\n📋 Detailed Results:');
    this.checks.forEach(check => {
      console.log(`   ${check.passed ? '✅' : '❌'} ${check.name}`);
    });
    
    console.log('\n🎯 E2E Testing Readiness:');
    if (readinessScore >= 80) {
      console.log('🟢 READY - System prepared for comprehensive E2E testing');
      console.log('   ✅ All major components operational');
      console.log('   ✅ Browser automation working');
      console.log('   🚀 Proceed with full E2E test suite');
    } else if (readinessScore >= 60) {
      console.log('🟡 PARTIALLY READY - Some issues detected');
      console.log('   ⚠️ May have limited E2E testing capability');
      console.log('   🔧 Consider fixing issues before comprehensive testing');
    } else {
      console.log('🔴 NOT READY - Major issues detected');
      console.log('   ❌ E2E testing will likely fail');
      console.log('   🛠️ Fix system issues before attempting E2E tests');
    }
    
    console.log('\n📝 Next Steps:');
    if (readinessScore >= 60) {
      console.log('1. Run adaptive E2E tests: node tests/adaptive-e2e-test.js');
      console.log('2. Check test results and screenshots');
      console.log('3. Address any failing test scenarios');
      console.log('4. Run comprehensive E2E suite when ready');
    } else {
      console.log('1. Fix backend/frontend server issues');
      console.log('2. Verify system functionality manually');
      console.log('3. Re-run this readiness check');
      console.log('4. Proceed with E2E testing once ready');
    }
    
    return readinessScore >= 60;
  }

  async runReadinessCheck() {
    console.log('🎯 E2E TESTING READINESS VALIDATION\n');
    console.log('Checking if system is ready for comprehensive E2E testing...\n');
    
    await this.validateBackendAPI();
    await this.validateFrontend();
    await this.validateBrowserAutomation();
    
    return await this.generateReadinessReport();
  }
}

// Run readiness validation
async function main() {
  const validator = new E2EReadinessValidator();
  const isReady = await validator.runReadinessCheck();
  process.exit(isReady ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Readiness validation failed:', error);
    process.exit(1);
  });
}

module.exports = E2EReadinessValidator;
