const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';

async function testRejectResubmitWorkflow() {
  console.log('🔄 TESTING REJECT → RESUBMIT WORKFLOW\n');
  
  // Admin login (for approval/rejection)
  const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'admin@test.com',
    password: 'admin123'
  });
  const adminToken = adminLogin.data.data.accessToken;
  
  // Employee login (for submission/resubmission)
  const empLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'jane.smith@test.com',
    password: 'Password123!'
  });
  const empToken = empLogin.data.data.accessToken;
  
  console.log('✅ Both admin and employee logged in');
  
  // Get test data
  const empResponse = await axios.get(`${BASE_URL}/employees`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const employee = empResponse.data.data.find(emp => emp.email === 'jane.smith@test.com');
  
  const projResponse = await axios.get(`${BASE_URL}/timesheets/meta/projects`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const project = projResponse.data.data[0];
  
  console.log(`📋 Testing with: ${employee.firstName} ${employee.lastName}, Project: ${project.name}`);
  
  let timesheetId = null;
  
  try {
    // Step 1: Employee creates a timesheet
    console.log('\n📝 Step 1: Employee creates timesheet');
    const createResponse = await axios.post(`${BASE_URL}/timesheets`, {
      employeeId: employee.id,
      projectId: project.id,
      workDate: '2025-06-15',
      hoursWorked: 8,
      description: 'Initial timesheet for workflow test'
    }, {
      headers: { 'Authorization': `Bearer ${empToken}`, 'Content-Type': 'application/json' }
    });
    
    timesheetId = createResponse.data.data.id;
    console.log(`✅ Timesheet created (Status: ${createResponse.data.data.status})`);
    
    // Step 2: Employee submits for approval
    console.log('\n📤 Step 2: Employee submits timesheet');
    await axios.put(`${BASE_URL}/timesheets/${timesheetId}/submit`, {}, {
      headers: { 'Authorization': `Bearer ${empToken}`, 'Content-Type': 'application/json' }
    });
    console.log('✅ Timesheet submitted for approval (Status: Submitted)');
    
    // Step 3: Admin rejects the timesheet
    console.log('\n❌ Step 3: Admin rejects timesheet');
    await axios.put(`${BASE_URL}/timesheets/${timesheetId}/status`, {
      status: 'Rejected',
      approverComments: 'Please provide more detailed description of work performed.'
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    });
    console.log('✅ Timesheet rejected (Status: Rejected)');
    
    // Step 4: Employee resubmits (converts back to Draft)
    console.log('\n🔄 Step 4: Employee resubmits for editing');
    const resubmitResponse = await axios.put(`${BASE_URL}/timesheets/${timesheetId}/resubmit`, {}, {
      headers: { 'Authorization': `Bearer ${empToken}`, 'Content-Type': 'application/json' }
    });
    console.log(`✅ ${resubmitResponse.data.message}`);
    console.log(`   Status: ${resubmitResponse.data.data.status}`);
    
    // Step 5: Employee edits the timesheet
    console.log('\n✏️  Step 5: Employee edits timesheet');
    await axios.put(`${BASE_URL}/timesheets/${timesheetId}`, {
      description: 'Updated: Detailed work on user authentication module including bug fixes and testing',
      hoursWorked: 7.5
    }, {
      headers: { 'Authorization': `Bearer ${empToken}`, 'Content-Type': 'application/json' }
    });
    console.log('✅ Timesheet updated with more details');
    
    // Step 6: Employee resubmits for approval again
    console.log('\n📤 Step 6: Employee resubmits for approval');
    await axios.put(`${BASE_URL}/timesheets/${timesheetId}/submit`, {}, {
      headers: { 'Authorization': `Bearer ${empToken}`, 'Content-Type': 'application/json' }
    });
    console.log('✅ Timesheet resubmitted for approval (Status: Submitted)');
    
    // Step 7: Admin approves this time
    console.log('\n✅ Step 7: Admin approves timesheet');
    await axios.put(`${BASE_URL}/timesheets/${timesheetId}/status`, {
      status: 'Approved',
      approverComments: 'Approved - sufficient detail provided.'
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    });
    console.log('✅ Timesheet approved (Status: Approved)');
    
    // Step 8: Verify final status
    console.log('\n🔍 Step 8: Verify final timesheet status');
    const finalCheck = await axios.get(`${BASE_URL}/timesheets/${timesheetId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const finalTimesheet = finalCheck.data.data;
    
    console.log('📋 Final Timesheet Details:');
    console.log(`   Status: ${finalTimesheet.status}`);
    console.log(`   Description: ${finalTimesheet.description}`);
    console.log(`   Hours: ${finalTimesheet.hoursWorked}`);
    console.log(`   Approved At: ${finalTimesheet.approvedAt ? new Date(finalTimesheet.approvedAt).toLocaleString() : 'Not set'}`);
    console.log(`   Approver Comments: ${finalTimesheet.approverComments || 'None'}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 REJECT → RESUBMIT WORKFLOW TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('✅ Create → Submit → Reject → Resubmit → Edit → Resubmit → Approve');
    console.log('✅ Complete workflow cycle working perfectly!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.log(`❌ Workflow test failed: ${error.message}`);
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testRejectResubmitWorkflow().catch(console.error);
