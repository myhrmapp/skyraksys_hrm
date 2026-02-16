/**
 * Standalone Audit Service Test Script
 * 
 * Purpose: Quick validation of audit logging functionality without Jest overhead
 * 
 * Usage: node backend/tests/standalone-audit-test.js
 * 
 * Created: February 5, 2026
 */

require('dotenv').config();
const auditService = require('../services/audit.service');
const { AuditLog, User, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function runTests() {
  console.log('🧪 Starting Audit Service Standalone Tests...\n');
  
  let testUser;
  let passedTests = 0;
  let failedTests = 0;

  try {
    // Clean up test data
    console.log('📝 Cleaning up test data...');
    await AuditLog.destroy({ where: {}, force: true });
    
    // Find or create test user
    console.log('👤 Creating test user...');
    [testUser] = await User.findOrCreate({
      where: { email: 'audit-test@example.com' },
      defaults: {
        employeeId: 'AUDIT-TEST-001',
        firstName: 'Audit',
        lastName: 'Test',
        email: 'audit-test@example.com',
        role: 'admin',
        password: 'TestPassword123!',
        department: 'IT',
        position: 'Tester',
        hireDate: new Date(),
        status: 'active'
      }
    });
    console.log(`✅ Test user created: ${testUser.id}\n`);

    // TEST 1: Basic log creation
    console.log('[TEST 1] Basic log creation...');
    const log1 = await auditService.log({
      action: 'created',
      entityType: 'LeaveBalance',
      entityId: uuidv4(),
      userId: testUser.id,
      newValues: { balance: 15, year: 2026 },
      reason: 'Initial allocation'
    });
    
    if (log1 && log1.id && log1.action === 'created') {
      console.log('✅ PASS: Log created successfully');
      passedTests++;
    } else {
      console.log('❌ FAIL: Log creation failed');
      failedTests++;
    }

    // TEST 2: Sensitive field sanitization
    console.log('\n[TEST 2] Sensitive field sanitization...');
    const log2 = await auditService.log({
      action: 'updated',
      entityType: 'User',
      entityId: testUser.id,
      userId: testUser.id,
      oldValues: {
        email: 'old@example.com',
        password: 'PlaintextPassword123'
      },
      newValues: {
        email: 'new@example.com',
        password: 'NewPassword456'
      }
    });
    
    if (log2.oldValues.password === '[REDACTED]' && log2.newValues.password === '[REDACTED]') {
      console.log('✅ PASS: Passwords redacted correctly');
      passedTests++;
    } else {
      console.log('❌ FAIL: Password sanitization failed');
      console.log('   oldValues.password:', log2.oldValues.password);
      console.log('   newValues.password:', log2.newValues.password);
      failedTests++;
    }

    // TEST 3: IP address extraction
    console.log('\n[TEST 3] IP address extraction...');
    const mockReq = {
      headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' },
      get: function(header) { return this.headers[header.toLowerCase()]; }
    };
    
    const log3 = await auditService.log({
      action: 'updated',
      entityType: 'User',
      entityId: testUser.id,
      userId: testUser.id,
      req: mockReq
    });
    
    if (log3.ipAddress === '192.168.1.100') {
      console.log('✅ PASS: IP address extracted correctly');
      passedTests++;
    } else {
      console.log('❌ FAIL: IP address extraction failed');
      console.log('   Expected: 192.168.1.100, Got:', log3.ipAddress);
      failedTests++;
    }

    // TEST 4: Query by entity type
    console.log('\n[TEST 4] Query by entity type...');
    const logs = await auditService.query({
      entityType: 'LeaveBalance',
      limit: 10
    });
    
    if (logs.length >= 1 && logs[0].entityType === 'LeaveBalance') {
      console.log(`✅ PASS: Found ${logs.length} LeaveBalance log(s)`);
      passedTests++;
    } else {
      console.log('❌ FAIL: Query by entity type failed');
      failedTests++;
    }

    // TEST 5: Failed operation logging
    console.log('\n[TEST 5] Failed operation logging...');
    const log5 = await auditService.log({
      action: 'updated',
      entityType: 'LeaveBalance',
      entityId: uuidv4(),
      userId: testUser.id,
      success: false,
      errorMessage: 'Insufficient balance',
      duration: 125
    });
    
    if (log5.success === false && log5.errorMessage === 'Insufficient balance') {
      console.log('✅ PASS: Failed operation logged correctly');
      passedTests++;
    } else {
      console.log('❌ FAIL: Failed operation logging failed');
      failedTests++;
    }

    // TEST 6: sanitizeValues() method
    console.log('\n[TEST 6] sanitizeValues() method...');
    const sensitiveData = {
      email: 'test@example.com',
      password: 'secret123',
      apiKey: 'key123',
      normalField: 'visible'
    };
    
    const sanitized = auditService.sanitizeValues(sensitiveData);
    
    if (sanitized.password === '[REDACTED]' && 
        sanitized.apiKey === '[REDACTED]' && 
        sanitized.email === 'test@example.com' &&
        sanitized.normalField === 'visible') {
      console.log('✅ PASS: Sensitive values sanitized correctly');
      passedTests++;
    } else {
      console.log('❌ FAIL: sanitizeValues() failed');
      console.log('   Result:', sanitized);
      failedTests++;
    }

    // TEST 7: getEntityHistory()
    console.log('\n[TEST 7] getEntityHistory()...');
    const entityId = uuidv4();
    await auditService.log({
      action: 'created',
      entityType: 'EmployeeReview',
      entityId: entityId,
      userId: testUser.id,
      newValues: { rating: 5 }
    });
    await auditService.log({
      action: 'updated',
      entityType: 'EmployeeReview',
      entityId: entityId,
      userId: testUser.id,
      oldValues: { rating: 5 },
      newValues: { rating: 4 }
    });
    
    const history = await auditService.getEntityHistory('EmployeeReview', entityId);
    
    if (history.length === 2 && history[0].action === 'updated' && history[1].action === 'created') {
      console.log('✅ PASS: Entity history retrieved correctly');
      passedTests++;
    } else {
      console.log('❌ FAIL: getEntityHistory() failed');
      console.log('   Expected 2 logs, got:', history.length);
      failedTests++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📝 Total: ${passedTests + failedTests}`);
    console.log(`🎯 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));

    if (failedTests === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Audit logging infrastructure is working correctly.\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  SOME TESTS FAILED. Please review errors above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run tests
runTests();
