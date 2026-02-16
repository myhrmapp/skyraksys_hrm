const axios = require('axios');
const colors = require('colors');

// Test configuration
const BASE_URL = 'http://localhost:8080/api';

// Known test users (from existing demo data)
const TEST_USERS = {
  admin: { email: 'admin@test.com', password: 'admin123', token: null, name: 'Admin User' },
  hr: { email: 'hr@test.com', password: 'admin123', token: null, name: 'HR Manager' },
  manager: { email: 'manager@test.com', password: 'admin123', token: null, name: 'Manager' },
  employee: { email: 'employee@test.com', password: 'admin123', token: null, name: 'Employee' }
};

let passCount = 0;
let failCount = 0;

function logResult(test, passed, details = '') {
  if (passed) {
    passCount++;
    console.log(`✅ ${test}`.green);
  } else {
    failCount++;
    console.log(`❌ ${test}`.red);
  }
  if (details) console.log(`   ${details}`.gray);
}

async function makeRequest(method, endpoint, data = null, userType = 'admin') {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USERS[userType].token}`
      }
    };
    
    if (data) config.data = data;
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status || 500
    };
  }
}

async function quickTest() {
  console.log(`
${'*'.repeat(60)}
    HRM SYSTEM - QUICK VALIDATION TEST
${'*'.repeat(60)}
  `.cyan);

  // Test 1: Authentication
  console.log('\n📝 Testing Authentication...'.yellow);
  for (const [role, user] of Object.entries(TEST_USERS)) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: user.email,
        password: user.password
      });
      
      if (response.data.success) {
        user.token = response.data.data.accessToken;
        user.id = response.data.data.user.id;
        logResult(`${role.toUpperCase()} login (${user.name})`, true);
      } else {
        logResult(`${role.toUpperCase()} login (${user.name})`, false, response.data.message);
      }
    } catch (error) {
      logResult(`${role.toUpperCase()} login (${user.name})`, false, error.response?.data?.message || 'Connection failed');
    }
  }

  // Test 2: Employee Management
  console.log('\n👥 Testing Employee Management...'.yellow);
  
  // List employees with different roles
  for (const [role, user] of Object.entries(TEST_USERS)) {
    if (user.token) {
      const result = await makeRequest('GET', '/employees', null, role);
      logResult(`List employees as ${role}`, result.success,
        result.success ? `Found ${result.data.data?.length || 0} employees` : result.error);
    }
  }

  // Test 3: Department & Position Management
  console.log('\n🏢 Testing Metadata Management...'.yellow);
  
  const result1 = await makeRequest('GET', '/employees/meta/departments', null, 'admin');
  logResult('Get departments', result1.success,
    result1.success ? `Found ${result1.data.data?.length || 0} departments` : result1.error);
  
  const result2 = await makeRequest('GET', '/employees/meta/positions', null, 'admin');
  logResult('Get positions', result2.success,
    result2.success ? `Found ${result2.data.data?.length || 0} positions` : result2.error);

  // Test 4: Leave Management
  console.log('\n🏖️ Testing Leave Management...'.yellow);
  
  const result3 = await makeRequest('GET', '/leaves/types', null, 'admin');
  logResult('Get leave types', result3.success,
    result3.success ? `Found ${result3.data.data?.length || 0} leave types` : result3.error);
  
  const result4 = await makeRequest('GET', '/leaves/requests', null, 'admin');
  logResult('Get leave requests', result4.success,
    result4.success ? `Found ${result4.data.data?.length || 0} leave requests` : result4.error);

  // Test 5: Timesheet Management
  console.log('\n⏰ Testing Timesheet Management...'.yellow);
  
  const result5 = await makeRequest('GET', '/timesheets', null, 'admin');
  logResult('Get timesheets', result5.success,
    result5.success ? `Found ${result5.data.data?.length || 0} timesheets` : result5.error);

  // Test 6: Payroll Management
  console.log('\n💰 Testing Payroll Management...'.yellow);
  
  const result6 = await makeRequest('GET', '/payroll', null, 'admin');
  logResult('Get payroll records', result6.success,
    result6.success ? `Found ${result6.data.data?.length || 0} payroll records` : result6.error);

  // Test 7: Role-based Access Control
  console.log('\n🔒 Testing Role-based Access Control...'.yellow);
  
  // Test employee trying to access admin endpoint
  const result7 = await makeRequest('POST', '/employees', { firstName: 'Test', lastName: 'User' }, 'employee');
  logResult('Employee blocked from creating employee', !result7.success && result7.status === 403,
    result7.success ? 'Should have been blocked!' : 'Correctly denied access');

  // Summary
  console.log(`\n${'='.repeat(60)}`.cyan);
  console.log(`    TEST RESULTS`.cyan.bold);
  console.log(`${'='.repeat(60)}`.cyan);
  console.log(`Total Tests: ${passCount + failCount}`);
  console.log(`Passed: ${passCount}`.green);
  console.log(`Failed: ${failCount}`.red);
  console.log(`Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`.cyan);
  
  if (failCount === 0) {
    console.log(`\n🎉 All tests passed! HRM System is working correctly.`.green.bold);
  } else {
    console.log(`\n⚠️  Some tests failed. Please check the system configuration.`.yellow.bold);
  }
}

// Run the quick test
quickTest().catch(error => {
  console.error('\n💥 Test execution failed:', error.message);
  process.exit(1);
});
