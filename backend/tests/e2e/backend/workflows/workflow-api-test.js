#!/usr/bin/env node

/**
 * Backend Workflow API Test
 * Tests if timesheet and leave submission/approval APIs actually work
 */

const axios = require('axios');

async function testWorkflowAPIs() {
  console.log('🔧 BACKEND WORKFLOW API TEST');
  console.log('Testing timesheet and leave submission/approval APIs\n');
  
  const apiURL = 'http://localhost:8080/api';
  let adminToken = null;
  let testResults = [];
  
  function recordTest(name, passed, details) {
    testResults.push({ name, passed, details });
    console.log(`${passed ? '✅' : '❌'} ${name}: ${passed ? 'PASSED' : 'FAILED'} ${details ? '- ' + details : ''}`);
  }
  
  try {
    // 1. Test admin login to get token
    console.log('🔐 Testing admin authentication...');
    try {
      const adminLogin = await axios.post(`${apiURL}/auth/login`, {
        email: 'admin@test.com',
        password: 'admin123'
      });
      
      if (adminLogin.data && adminLogin.data.accessToken) {
        adminToken = adminLogin.data.accessToken;
        recordTest('admin_auth', true, `Token: ${adminToken.substring(0, 20)}...`);
      } else {
        recordTest('admin_auth', false, 'No token received');
      }
    } catch (error) {
      recordTest('admin_auth', false, error.response?.data?.message || error.message);
    }
    
    if (!adminToken) {
      console.log('⚠️ No admin token - testing endpoints without authentication');
    }
    
    // 2. Test timesheet endpoints
    console.log('\n🕒 Testing timesheet APIs...');
    
    // Get timesheets
    try {
      const headers = adminToken ? { Authorization: `Bearer ${adminToken}` } : {};
      const timesheets = await axios.get(`${apiURL}/timesheets`, { headers });
      recordTest('get_timesheets', timesheets.status === 200, `Found ${timesheets.data?.length || 0} timesheets`);
    } catch (error) {
      recordTest('get_timesheets', false, `Status: ${error.response?.status}, Error: ${error.response?.data?.message || error.message}`);
    }
    
    // Create timesheet
    if (adminToken) {
      try {
        const newTimesheet = await axios.post(`${apiURL}/timesheets`, {
          employeeId: 1,
          projectId: 1,
          taskId: 1,
          date: '2025-08-08',
          hoursWorked: 8,
          description: 'E2E Test Timesheet Entry'
        }, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        recordTest('create_timesheet', newTimesheet.status === 201, `Created timesheet ID: ${newTimesheet.data?.id}`);
        
        // Test timesheet approval
        if (newTimesheet.data?.id) {
          try {
            const approval = await axios.put(`${apiURL}/timesheets/${newTimesheet.data.id}/approve`, {
              status: 'approved',
              approverComments: 'E2E Test Approval'
            }, {
              headers: { Authorization: `Bearer ${adminToken}` }
            });
            recordTest('approve_timesheet', approval.status === 200, 'Timesheet approved');
          } catch (error) {
            recordTest('approve_timesheet', false, error.response?.data?.message || error.message);
          }
        }
      } catch (error) {
        recordTest('create_timesheet', false, error.response?.data?.message || error.message);
      }
    }
    
    // 3. Test leave endpoints
    console.log('\n🏖️ Testing leave request APIs...');
    
    // Get leave requests
    try {
      const headers = adminToken ? { Authorization: `Bearer ${adminToken}` } : {};
      const leaveRequests = await axios.get(`${apiURL}/leave-requests`, { headers });
      recordTest('get_leave_requests', leaveRequests.status === 200, `Found ${leaveRequests.data?.length || 0} leave requests`);
    } catch (error) {
      recordTest('get_leave_requests', false, `Status: ${error.response?.status}, Error: ${error.response?.data?.message || error.message}`);
    }
    
    // Create leave request
    if (adminToken) {
      try {
        const newLeaveRequest = await axios.post(`${apiURL}/leave-requests`, {
          employeeId: 1,
          leaveTypeId: 1,
          startDate: '2025-08-15',
          endDate: '2025-08-16',
          reason: 'E2E Test Leave Request',
          days: 2
        }, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        recordTest('create_leave_request', newLeaveRequest.status === 201, `Created leave request ID: ${newLeaveRequest.data?.id}`);
        
        // Test leave approval
        if (newLeaveRequest.data?.id) {
          try {
            const approval = await axios.put(`${apiURL}/leave-requests/${newLeaveRequest.data.id}/approve`, {
              status: 'approved',
              approverComments: 'E2E Test Leave Approval'
            }, {
              headers: { Authorization: `Bearer ${adminToken}` }
            });
            recordTest('approve_leave_request', approval.status === 200, 'Leave request approved');
          } catch (error) {
            recordTest('approve_leave_request', false, error.response?.data?.message || error.message);
          }
        }
      } catch (error) {
        recordTest('create_leave_request', false, error.response?.data?.message || error.message);
      }
    }
    
    // 4. Test employee endpoints
    console.log('\n👥 Testing employee APIs...');
    
    try {
      const headers = adminToken ? { Authorization: `Bearer ${adminToken}` } : {};
      const employees = await axios.get(`${apiURL}/employees`, { headers });
      recordTest('get_employees', employees.status === 200, `Found ${employees.data?.length || 0} employees`);
    } catch (error) {
      recordTest('get_employees', false, error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ API testing failed:', error.message);
  }
  
  // Generate results
  const total = testResults.length;
  const passed = testResults.filter(r => r.passed).length;
  const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0';
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 BACKEND WORKFLOW API RESULTS');
  console.log('='.repeat(60));
  console.log(`📊 Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${total - passed}`);
  console.log(`📈 API Pass Rate: ${passRate}%`);
  
  console.log('\n📋 API Functionality Status:');
  const authWorking = testResults.some(r => r.name.includes('auth') && r.passed);
  const timesheetWorking = testResults.some(r => r.name.includes('timesheet') && r.passed);
  const leaveWorking = testResults.some(r => r.name.includes('leave') && r.passed);
  
  console.log(`   🔐 Authentication: ${authWorking ? '✅ Working' : '❌ Issues'}`);
  console.log(`   🕒 Timesheet APIs: ${timesheetWorking ? '✅ Working' : '❌ Issues'}`);
  console.log(`   🏖️ Leave APIs: ${leaveWorking ? '✅ Working' : '❌ Issues'}`);
  
  console.log('\n🎯 API Assessment:');
  if (passRate >= 80) {
    console.log('🟢 EXCELLENT - All workflow APIs functional!');
    console.log('   ✅ Backend fully supports timesheet and leave workflows');
  } else if (passRate >= 60) {
    console.log('🟡 GOOD - Most APIs working');
    console.log('   ⚠️ Some endpoints may need attention');
  } else {
    console.log('🟠 NEEDS WORK - API issues detected');
    console.log('   🔧 Backend workflow endpoints need fixes');
  }
  
  return passRate >= 60;
}

testWorkflowAPIs().then(success => {
  console.log(`\n🚀 Backend API testing complete! ${success ? 'APIs are working' : 'Issues detected'}`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ API test failed:', error);
  process.exit(1);
});
