const axios = require('axios');
const dayjs = require('dayjs');
const colors = require('colors');

// Test configuration
const BASE_URL = 'http://localhost:8080/api';
const TEST_USERS = {
  admin: { email: 'admin@test.com', password: 'admin123', token: null }
};

let passCount = 0;
let failCount = 0;
let testData = {};

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
      status: error.response?.status || 500,
      details: error.response?.data
    };
  }
}

async function setupTestData() {
  console.log('🔧 SETTING UP TEST DATA FOR WORKFLOWS\n'.cyan.bold);
  
  // Login first
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    });
    
    if (loginResponse.data.success) {
      TEST_USERS.admin.token = loginResponse.data.data.accessToken;
      logResult('Admin authentication', true);
    } else {
      logResult('Admin authentication', false, loginResponse.data.message);
      return;
    }
  } catch (error) {
    logResult('Admin authentication', false, 'Login failed');
    return;
  }
  
  // Get employees
  const empResult = await makeRequest('GET', '/employees');
  if (empResult.success && empResult.data.data.length > 0) {
    testData.employee = empResult.data.data[0];
    logResult('Load test employee', true, `Using employee: ${testData.employee.firstName}`);
  } else {
    logResult('Load test employee', false, 'No employees found');
    return;
  }
  
  // Create project directly in database
  try {
    const { sequelize } = require('./models');
    const Project = sequelize.models.Project;
    
    let project = await Project.findOne({ where: { name: 'HRM Test Project' } });
    if (!project) {
      project = await Project.create({
        name: 'HRM Test Project',
        description: 'Test project for HRM system workflows',
        status: 'Active',
        startDate: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
        endDate: dayjs().add(60, 'days').format('YYYY-MM-DD'),
        managerId: testData.employee.id
      });
    }
    testData.project = project;
    logResult('Setup test project', true, `Project: ${project.name}`);
  } catch (error) {
    logResult('Setup test project', false, error.message);
    return;
  }
  
  // Create leave type directly in database
  try {
    const { sequelize } = require('./models');
    const LeaveType = sequelize.models.LeaveType;
    
    let leaveType = await LeaveType.findOne({ where: { name: 'Annual Leave' } });
    if (!leaveType) {
      leaveType = await LeaveType.create({
        name: 'Annual Leave',
        description: 'Annual leave for employees',
        daysAllowed: 21,
        carryForward: true,
        maxCarryForward: 5
      });
    }
    testData.leaveType = leaveType;
    logResult('Setup leave type', true, `Leave type: ${leaveType.name}`);
  } catch (error) {
    logResult('Setup leave type', false, error.message);
    return;
  }
  
  // Create leave balance
  try {
    const { sequelize } = require('./models');
    const LeaveBalance = sequelize.models.LeaveBalance;
    
    const currentYear = new Date().getFullYear();
    let leaveBalance = await LeaveBalance.findOne({
      where: {
        employeeId: testData.employee.id,
        leaveTypeId: testData.leaveType.id,
        year: currentYear
      }
    });
    
    if (!leaveBalance) {
      leaveBalance = await LeaveBalance.create({
        employeeId: testData.employee.id,
        leaveTypeId: testData.leaveType.id,
        year: currentYear,
        allocated: 21,
        used: 0,
        balance: 21
      });
    }
    testData.leaveBalance = leaveBalance;
    logResult('Setup leave balance', true, `Balance: ${leaveBalance.balance} days`);
  } catch (error) {
    logResult('Setup leave balance', false, error.message);
    return;
  }
}

async function testFixedWorkflows() {
  console.log('\n📝 TESTING FIXED WORKFLOWS\n'.yellow.bold);
  
  // Test 1: Leave Request Creation
  const leaveRequest = {
    employeeId: testData.employee.id,
    leaveTypeId: testData.leaveType.id,
    startDate: dayjs().add(7, 'days').format('YYYY-MM-DD'),
    endDate: dayjs().add(9, 'days').format('YYYY-MM-DD'),
    reason: 'Fixed workflow test for leave management system'
  };
  
  const leaveResult = await makeRequest('POST', '/leaves', leaveRequest);
  logResult('Create leave request with proper data', leaveResult.success,
    leaveResult.success ? 'Leave request created successfully' : leaveResult.error);
  
  // Test 2: Timesheet Creation
  const timesheetEntry = {
    employeeId: testData.employee.id,
    projectId: testData.project.id,
    workDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    hoursWorked: 8,
    description: 'Fixed workflow test for timesheet management system',
    clockInTime: '09:00',
    clockOutTime: '18:00',
    breakHours: 1
  };
  
  const timesheetResult = await makeRequest('POST', '/timesheets', timesheetEntry);
  logResult('Create timesheet entry with proper data', timesheetResult.success,
    timesheetResult.success ? 'Timesheet entry created successfully' : timesheetResult.error);
  
  // Test 3: Payroll Generation (correct endpoint)
  const payrollData = {
    employeeId: testData.employee.id,
    month: dayjs().subtract(1, 'month').month() + 1, // 1-based month
    year: dayjs().subtract(1, 'month').year()
  };
  
  const payrollResult = await makeRequest('POST', '/payroll/generate', payrollData);
  logResult('Generate payroll with proper data', payrollResult.success,
    payrollResult.success ? 'Payroll generated successfully' : payrollResult.error);
  
  // Test 4: Get data to verify creation
  const verifyLeaves = await makeRequest('GET', '/leaves');
  const verifyTimesheets = await makeRequest('GET', '/timesheets');
  const verifyPayrolls = await makeRequest('GET', '/payroll');
  
  logResult('Verify leave records', verifyLeaves.success,
    verifyLeaves.success ? `Found ${verifyLeaves.data.data.length} leave records` : 'Failed to get leaves');
  
  logResult('Verify timesheet records', verifyTimesheets.success,
    verifyTimesheets.success ? `Found ${verifyTimesheets.data.data.length} timesheet records` : 'Failed to get timesheets');
  
  logResult('Verify payroll records', verifyPayrolls.success,
    verifyPayrolls.success ? `Found ${verifyPayrolls.data.data.length} payroll records` : 'Failed to get payrolls');
  
  // Summary
  console.log('\n📊 WORKFLOW FIX SUMMARY'.cyan.bold);
  const totalTests = passCount + failCount;
  const successRate = totalTests > 0 ? ((passCount / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passCount}`.green);
  console.log(`Failed: ${failCount}`.red);
  console.log(`Success Rate: ${successRate}%`.cyan);
  
  if (successRate >= 90) {
    console.log('\n🎉 PERFECT! All workflow issues have been resolved!'.green.bold);
  } else if (successRate >= 75) {
    console.log('\n✅ EXCELLENT! Major workflow issues resolved!'.green.bold);
  } else {
    console.log('\n⚠️  Still some issues to address.'.yellow.bold);
  }
}

async function runFixTest() {
  await setupTestData();
  if (testData.employee && testData.project && testData.leaveType) {
    await testFixedWorkflows();
  } else {
    console.log('❌ Setup failed, cannot test workflows'.red);
  }
}

runFixTest().catch(error => {
  console.error('\n💥 Fix test error:', error.message);
  process.exit(1);
});
