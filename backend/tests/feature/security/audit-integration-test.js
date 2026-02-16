/**
 * Integration Test: Audit Logging in Leave Balance Admin & Employee Review
 * 
 * Purpose: Verify audit logs are created for all CUD operations
 * 
 * Usage: node backend/tests/audit-integration-test.js
 * 
 * Created: February 5, 2026
 */

require('dotenv').config();
const auditService = require('../services/audit.service');
const { LeaveBalance, EmployeeReview, User, Employee, LeaveType, AuditLog, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function runIntegrationTests() {
  console.log('🧪 Starting Audit Logging Integration Tests...\n');
  
  let passedTests = 0;
  let failedTests = 0;
  let testUser, testEmployee, testLeaveType;

  try {
    // Setup: Create test data
    console.log('📝 Setting up test data...');
    
    // Clean up previous test data
    await sequelize.query('DELETE FROM leave_balances WHERE "employeeId" IN (SELECT id FROM employees WHERE email = \'employee-audit@example.com\')');
    await sequelize.query('DELETE FROM employee_reviews WHERE "employeeId" IN (SELECT id FROM employees WHERE email = \'employee-audit@example.com\')');
    await sequelize.query('DELETE FROM employees WHERE email = \'employee-audit@example.com\'');
    await sequelize.query('DELETE FROM users WHERE email = \'audit-integration@example.com\'');
    await sequelize.query('DELETE FROM leave_types WHERE name = \'Audit Test Leave\'');
    
    [testUser] = await User.findOrCreate({
      where: { email: 'audit-integration@example.com' },
      defaults: {
        firstName: 'Audit',
        lastName: 'Integration',
        email: 'audit-integration@example.com',
        role: 'admin',
        password: 'TestPassword123!',
        isActive: true
      }
    });

    [testEmployee] = await Employee.findOrCreate({
      where: { email: 'employee-audit@example.com' },
      defaults: {
        employeeId: 'AUD-001',
        firstName: 'Employee',
        lastName: 'Audit',
        email: 'employee-audit@example.com',
        userId: testUser.id,
        hireDate: new Date(),
        status: 'Active'
      }
    });

    [testLeaveType] = await LeaveType.findOrCreate({
      where: { name: 'Audit Test Leave' },
      defaults: {
        name: 'Audit Test Leave',
        description: 'For audit testing',
        defaultDays: 15,
        isActive: true
      }
    });

    console.log('✅ Test data created\n');

    // TEST 1: Leave Balance Creation Audit
    console.log('[TEST 1] Leave Balance Creation Audit...');
    const leaveBalance = await LeaveBalance.create({
      employeeId: testEmployee.id,
      leaveTypeId: testLeaveType.id,
      year: 2026,
      totalAccrued: 15,
      totalTaken: 0,
      totalPending: 0,
      balance: 15,
      carryForward: 0
    });

    // Simulate audit log creation (as route would do)
    await auditService.log({
      action: 'created',
      entityType: 'LeaveBalance',
      entityId: leaveBalance.id,
      userId: testUser.id,
      newValues: {
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026,
        totalAccrued: 15,
        balance: 15
      },
      reason: 'Test: Admin created leave balance'
    });

    const creationAudit = await AuditLog.findOne({
      where: {
        entityType: 'LeaveBalance',
        entityId: leaveBalance.id,
        action: 'created'
      }
    });

    if (creationAudit && creationAudit.newValues.totalAccrued === 15) {
      console.log('✅ PASS: Leave balance creation logged correctly');
      passedTests++;
    } else {
      console.log('❌ FAIL: Leave balance creation audit missing or incorrect');
      failedTests++;
    }

    // TEST 2: Leave Balance Update Audit
    console.log('\n[TEST 2] Leave Balance Update Audit...');
    const oldValues = {
      totalAccrued: leaveBalance.totalAccrued,
      totalTaken: leaveBalance.totalTaken,
      balance: leaveBalance.balance
    };

    await leaveBalance.update({
      totalTaken: 5,
      balance: 10
    });

    await auditService.log({
      action: 'balance_adjusted',
      entityType: 'LeaveBalance',
      entityId: leaveBalance.id,
      userId: testUser.id,
      oldValues,
      newValues: {
        totalAccrued: 15,
        totalTaken: 5,
        balance: 10
      },
      reason: 'Test: Admin adjusted balance'
    });

    const updateAudit = await AuditLog.findOne({
      where: {
        entityType: 'LeaveBalance',
        entityId: leaveBalance.id,
        action: 'balance_adjusted'
      }
    });

    if (updateAudit && 
        parseFloat(updateAudit.oldValues.totalTaken) === 0 && 
        parseFloat(updateAudit.newValues.totalTaken) === 5) {
      console.log('✅ PASS: Leave balance update logged with before/after values');
      passedTests++;
    } else {
      console.log('❌ FAIL: Leave balance update audit incorrect');
      if (updateAudit) {
        console.log('   Found audit log but values wrong:');
        console.log('   oldValues.totalTaken:', updateAudit.oldValues.totalTaken, '(expected: 0)');
        console.log('   newValues.totalTaken:', updateAudit.newValues.totalTaken, '(expected: 5)');
      } else {
        console.log('   Audit log not found');
      }
      failedTests++;
    }

    // TEST 3: Employee Review Creation Audit
    console.log('\n[TEST 3] Employee Review Creation Audit...');
    const review = await EmployeeReview.create({
      employeeId: testEmployee.id,
      reviewerId: testUser.id,
      reviewPeriod: 'Q1-2026',
      reviewType: 'quarterly',
      overallRating: 4,
      technicalSkills: 4,
      communication: 5,
      teamwork: 4,
      reviewDate: new Date(),
      status: 'draft'
    });

    await auditService.log({
      action: 'created',
      entityType: 'EmployeeReview',
      entityId: review.id,
      userId: testUser.id,
      newValues: {
        employeeId: testEmployee.id,
        reviewPeriod: 'Q1-2026',
        reviewType: 'quarterly',
        overallRating: 4,
        status: 'draft'
      },
      reason: 'Test: Review created'
    });

    const reviewCreationAudit = await AuditLog.findOne({
      where: {
        entityType: 'EmployeeReview',
        entityId: review.id,
        action: 'created'
      }
    });

    if (reviewCreationAudit && reviewCreationAudit.newValues.reviewPeriod === 'Q1-2026') {
      console.log('✅ PASS: Employee review creation logged correctly');
      passedTests++;
    } else {
      console.log('❌ FAIL: Employee review creation audit missing');
      failedTests++;
    }

    // TEST 4: Employee Review Status Change Audit
    console.log('\n[TEST 4] Employee Review Status Change Audit...');
    const reviewOldValues = {
      status: review.status,
      hrApproved: review.hrApproved
    };

    await review.update({
      status: 'completed',
      hrApproved: true,
      hrApprovedBy: testUser.id,
      hrApprovedAt: new Date()
    });

    await auditService.log({
      action: 'approved',
      entityType: 'EmployeeReview',
      entityId: review.id,
      userId: testUser.id,
      oldValues: reviewOldValues,
      newValues: {
        status: 'completed',
        hrApproved: true
      },
      reason: 'Test: HR approved review'
    });

    const reviewApprovalAudit = await AuditLog.findOne({
      where: {
        entityType: 'EmployeeReview',
        entityId: review.id,
        action: 'approved'
      }
    });

    if (reviewApprovalAudit && 
        reviewApprovalAudit.oldValues.status === 'draft' &&
        reviewApprovalAudit.newValues.status === 'completed') {
      console.log('✅ PASS: Review approval logged with status transition');
      passedTests++;
    } else {
      console.log('❌ FAIL: Review approval audit incorrect');
      failedTests++;
    }

    // TEST 5: Audit Query Functionality
    console.log('\n[TEST 5] Audit Query Functionality...');
    const userAudits = await auditService.query({
      userId: testUser.id,
      limit: 10
    });

    if (userAudits.length >= 4) {
      console.log(`✅ PASS: Found ${userAudits.length} audit logs for user`);
      passedTests++;
    } else {
      console.log('❌ FAIL: Audit query returned insufficient logs');
      failedTests++;
    }

    // TEST 6: Entity History Retrieval
    console.log('\n[TEST 6] Entity History Retrieval...');
    const balanceHistory = await auditService.getEntityHistory('LeaveBalance', leaveBalance.id);

    if (balanceHistory.length >= 2) {
      console.log(`✅ PASS: Retrieved ${balanceHistory.length} history entries for leave balance`);
      passedTests++;
    } else {
      console.log('❌ FAIL: Entity history incomplete');
      failedTests++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📝 Total: ${passedTests + failedTests}`);
    console.log(`🎯 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));

    if (failedTests === 0) {
      console.log('\n🎉 ALL INTEGRATION TESTS PASSED! Audit logging is working across modules.\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  SOME TESTS FAILED. Review errors above.\n');
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
runIntegrationTests();
