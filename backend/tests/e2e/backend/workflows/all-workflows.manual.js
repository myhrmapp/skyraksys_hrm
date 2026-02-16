const axios = require('axios');
const fs = require('fs').promises; // Use promises version of fs

const BASE_URL = 'http://localhost:8080/api';
const PROGRESS_FILE = 'TEST_PROGRESS.md';

const credentials = {
  admin: { email: 'admin@company.com', password: 'Kx9mP7qR2nF8sA5t' },
  hr: { email: 'hr@company.com', password: 'Lw3nQ6xY8mD4vB7h' },
  employee: { email: 'employee@company.com', password: 'Mv4pS9wE2nR6kA8j' },
};

const state = {
  adminToken: null,
  hrToken: null,
  employeeToken: null,
  newEmployeeId: null,
  leaveRequestId: null,
  timesheetId: null,
};

async function updateProgressDocument(workflowName, status, message = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `## ${workflowName}
- Status: ${status}
- Timestamp: ${timestamp}
- Message: ${message}

`;
  try {
    await fs.appendFile(PROGRESS_FILE, logEntry);
    console.log(`Progress updated for ${workflowName}: ${status}`);
  } catch (error) {
    console.error(`Failed to update progress document for ${workflowName}:`, error.message);
  }
}

async function login(role) {
  try {
    console.log(`\n--- Logging in as ${role} ---`);
    const response = await axios.post(`${BASE_URL}/auth/login`, credentials[role]);
    state[`${role}Token`] = response.data.data.accessToken;
    console.log(`${role} login successful.`);
    return true;
  } catch (error) {
    console.error(`${role} login failed:`, error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message);
    throw new Error(`Failed to login as ${role}`);
  }
}

// --- Employee Management Functions ---

async function createEmployee() {
  try {
    console.log('\nCreating a new employee...');
    const response = await axios.post(`${BASE_URL}/employees`, {
      firstName: 'Test',
      lastName: 'Employee',
      email: `test.employee.${Date.now()}@company.com`,
      hireDate: '2025-01-15',
      departmentId: 1, // Assuming department with ID 1 exists
      positionId: 2, // Assuming position with ID 2 exists
    }, {
      headers: { Authorization: `Bearer ${state.adminToken}` },
    });
    state.newEmployeeId = response.data.data.id;
    console.log(`Employee created successfully. ID: ${state.newEmployeeId}`);
    return true;
  } catch (error) {
    console.error('Create employee failed:', error.response ? error.response.data : error.message);
    throw new Error('Failed to create employee');
  }
}

async function getEmployee() {
  try {
    console.log('\nGetting the new employee...');
    const response = await axios.get(`${BASE_URL}/employees/${state.newEmployeeId}`, {
      headers: { Authorization: `Bearer ${state.adminToken}` },
    });
    console.log(`Employee details retrieved successfully.`);
    return true;
  } catch (error) {
    console.error('Get employee failed:', error.response ? error.response.data : error.message);
    throw new Error('Failed to get employee');
  }
}

async function updateEmployee() {
  try {
    console.log('\nUpdating the new employee...');
    await axios.put(`${BASE_URL}/employees/${state.newEmployeeId}`, {
      phone: '1234567890',
    }, {
      headers: { Authorization: `Bearer ${state.adminToken}` },
    });
    console.log(`Employee updated successfully.`);
    return true;
  } catch (error) {
    console.error('Update employee failed:', error.response ? error.response.data : error.message);
    throw new Error('Failed to update employee');
  }
}

async function deactivateEmployee() {
  try {
    console.log('\nDeactivating the new employee...');
    await axios.delete(`${BASE_URL}/employees/${state.newEmployeeId}`, {
      headers: { Authorization: `Bearer ${state.adminToken}` },
    });
    console.log(`Employee deactivated successfully.`);
    return true;
  } catch (error) {
    console.error('Deactivate employee failed:', error.response ? error.response.data : error.message);
    throw new Error('Failed to deactivate employee');
  }
}

// --- Leave Management Functions ---

async function requestLeave() {
  try {
    console.log('\nRequesting leave as employee...');
    const response = await axios.post(`${BASE_URL}/leaves`, {
      leaveTypeId: 1, // Assuming leave type with ID 1 exists
      startDate: '2025-02-10',
      endDate: '2025-02-12',
      reason: 'Vacation',
    }, {
      headers: { Authorization: `Bearer ${state.employeeToken}` },
    });
    state.leaveRequestId = response.data.data.id;
    console.log(`Leave request submitted successfully. ID: ${state.leaveRequestId}`);
    return true;
  } catch (error) {
    console.error('Request leave failed:', error.response ? error.response.data : error.message);
    throw new Error('Failed to request leave');
  }
}

async function approveLeave() {
  try {
    console.log('\nApproving leave as admin...');
    await axios.put(`${BASE_URL}/leaves/${state.leaveRequestId}/approve`, {
      status: 'Approved',
    }, {
      headers: { Authorization: `Bearer ${state.adminToken}` },
    });
    console.log(`Leave request approved successfully.`);
    return true;
  } catch (error) {
    console.error('Approve leave failed:', error.response ? error.response.data : error.message);
    throw new Error('Failed to approve leave');
  }
}

// --- Timesheet Management Functions ---

async function submitTimesheet() {
  try {
    console.log('\nSubmitting timesheet as employee...');
    const response = await axios.post(`${BASE_URL}/timesheets`, {
      projectId: 1, // Assuming project with ID 1 exists
      workDate: '2025-01-20',
      hoursWorked: 8,
      description: 'Worked on feature X',
    }, {
      headers: { Authorization: `Bearer ${state.employeeToken}` },
    });
    state.timesheetId = response.data.data.id;
    console.log(`Timesheet submitted successfully. ID: ${state.timesheetId}`);
    return true;
  } catch (error) {
    console.error('Submit timesheet failed:', error.response ? error.response.data : error.message);
    throw new Error('Failed to submit timesheet');
  }
}

async function approveTimesheet() {
  try {
    console.log('\nApproving timesheet as admin...');
    await axios.put(`${BASE_URL}/timesheets/${state.timesheetId}/approve`, {
      status: 'Approved',
    }, {
      headers: { Authorization: `Bearer ${state.adminToken}` },
    });
    console.log(`Timesheet approved successfully.`);
    return true;
  } catch (error) {
    console.error('Approve timesheet failed:', error.response ? error.response.data : error.message);
    throw new Error('Failed to approve timesheet');
  }
}

// --- Payroll Management Functions ---

async function generatePayroll() {
  try {
    console.log('\nGenerating payroll as HR...');
    await axios.post(`${BASE_URL}/payroll/generate`, {
      month: 1,
      year: 2025,
    }, {
      headers: { Authorization: `Bearer ${state.hrToken}` },
    });
    console.log(`Payroll generated successfully.`);
    return true;
  } catch (error) {
    console.error('Generate payroll failed:', error.response ? error.response.data : error.message);
    throw new Error('Failed to generate payroll');
  }
}

async function delay(ms) {  return new Promise(resolve => setTimeout(resolve, ms));}async function runTests() {  // Initialize progress document  await fs.writeFile(PROGRESS_FILE, '# Workflow Test Progress Report\n\n');  let overallSuccess = true;  // --- Authentication Workflow ---  console.log('\n--- Starting Authentication Workflow ---');  console.log('Waiting for server to be ready...');  await delay(5000); // Wait for 5 seconds
  try {
    await login('admin');
    await login('hr');
    await login('employee');
    await updateProgressDocument('Authentication Workflow', 'SUCCESS');
  } catch (error) {
    overallSuccess = false;
    await updateProgressDocument('Authentication Workflow', 'FAILED', error.message);
  }

  // --- Employee Management Workflow (as Admin) ---
  if (overallSuccess) { // Only proceed if previous steps were successful
    console.log('\n--- Starting Employee Management Workflow (as Admin) ---');
    try {
      await createEmployee();
      await getEmployee();
      await updateEmployee();
      await deactivateEmployee();
      await updateProgressDocument('Employee Management Workflow', 'SUCCESS');
    } catch (error) {
      overallSuccess = false;
      await updateProgressDocument('Employee Management Workflow', 'FAILED', error.message);
    }
  }

  // --- Leave Management Workflow ---
  if (overallSuccess) {
    console.log('\n--- Starting Leave Management Workflow ---');
    try {
      await requestLeave();
      await approveLeave();
      await updateProgressDocument('Leave Management Workflow', 'SUCCESS');
    } catch (error) {
      overallSuccess = false;
      await updateProgressDocument('Leave Management Workflow', 'FAILED', error.message);
    }
  }

  // --- Timesheet Management Workflow ---
  if (overallSuccess) {
    console.log('\n--- Starting Timesheet Management Workflow ---');
    try {
      await submitTimesheet();
      await approveTimesheet();
      await updateProgressDocument('Timesheet Management Workflow', 'SUCCESS');
    } catch (error) {
      overallSuccess = false;
      await updateProgressDocument('Timesheet Management Workflow', 'FAILED', error.message);
    }
  }

  // --- Payroll Management Workflow (as HR) ---
  if (overallSuccess) {
    console.log('\n--- Starting Payroll Management Workflow (as HR) ---');
    try {
      await generatePayroll();
      await updateProgressDocument('Payroll Management Workflow', 'SUCCESS');
    } catch (error) {
      overallSuccess = false;
      await updateProgressDocument('Payroll Management Workflow', 'FAILED', error.message);
    }
  }

  console.log('\n--- All workflow tests completed. Check TEST_PROGRESS.md for details. ---');
  if (!overallSuccess) {
    console.error('\n--- Some workflows failed. Please check the logs and TEST_PROGRESS.md ---');
  }
}

runTests();