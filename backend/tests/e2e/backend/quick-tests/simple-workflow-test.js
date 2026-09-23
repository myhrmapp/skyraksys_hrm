const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';

async function testResubmitWorkflow() {
  console.log('🔄 TESTING REJECT → RESUBMIT WORKFLOW\n');
  
  // Admin login
  const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'admin@test.com',
    password: 'Skyraksys123$'
  });
  const adminToken = adminLogin.data.data.accessToken;
  console.log('✅ Admin logged in');
  
  // Get all employees to find one we can use
  const empResponse = await axios.get(`${BASE_URL}/employees`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const employee = empResponse.data.data[0]; // Use first employee
  
  const projResponse = await axios.get(`${BASE_URL}/timesheets/meta/projects`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const project = projResponse.data.data[0];
  
  console.log(`📋 Using: ${employee.firstName} ${employee.lastName} (${employee.email}), Project: ${project.name}`);
  
  try {
    // Step 1: Admin creates a timesheet for employee
    console.log('\n📝 Step 1: Create timesheet');
    const createResponse = await axios.post(`${BASE_URL}/timesheets`, {
      employeeId: employee.id,
      projectId: project.id,
      workDate: '2025-06-12',
      hoursWorked: 8,
      description: 'Workflow test - initial version'
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    });
    
    const timesheetId = createResponse.data.data.id;
    console.log(`✅ Timesheet created (ID: ${timesheetId}, Status: ${createResponse.data.data.status})`);
    
    // Step 2: Submit for approval
    console.log('\n📤 Step 2: Submit timesheet');
    await axios.put(`${BASE_URL}/timesheets/${timesheetId}/submit`, {}, {
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    });
    console.log('✅ Timesheet submitted (Status: Submitted)');
    
    // Step 3: Reject the timesheet
    console.log('\n❌ Step 3: Reject timesheet');
    await axios.put(`${BASE_URL}/timesheets/${timesheetId}/status`, {
      status: 'Rejected',
      approverComments: 'Please add more specific details about the tasks completed.'
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    });
    console.log('✅ Timesheet rejected (Status: Rejected)');
    
    // Step 4: Test the resubmit endpoint
    console.log('\n🔄 Step 4: Test resubmit functionality');
    const resubmitResponse = await axios.put(`${BASE_URL}/timesheets/${timesheetId}/resubmit`, {}, {
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    });
    console.log(`✅ ${resubmitResponse.data.message}`);
    console.log(`   Status changed to: ${resubmitResponse.data.data.status}`);
    
    // Step 5: Verify timesheet is now editable
    console.log('\n✏️  Step 5: Edit the timesheet');
    const updateResponse = await axios.put(`${BASE_URL}/timesheets/${timesheetId}`, {
      description: 'Updated: Completed user interface improvements, fixed 3 bugs in authentication system, and performed comprehensive testing',
      hoursWorked: 8.5
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    });
    console.log('✅ Timesheet successfully updated');
    
    // Step 6: Resubmit for approval
    console.log('\n📤 Step 6: Resubmit for approval');
    await axios.put(`${BASE_URL}/timesheets/${timesheetId}/submit`, {}, {
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    });
    console.log('✅ Timesheet resubmitted (Status: Submitted)');
    
    // Step 7: Approve this time
    console.log('\n✅ Step 7: Approve timesheet');
    await axios.put(`${BASE_URL}/timesheets/${timesheetId}/status`, {
      status: 'Approved',
      approverComments: 'Approved - excellent detail provided.'
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    });
    console.log('✅ Timesheet approved (Status: Approved)');
    
    // Step 8: Final verification
    console.log('\n🔍 Step 8: Final verification');
    const finalCheck = await axios.get(`${BASE_URL}/timesheets/${timesheetId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const finalTimesheet = finalCheck.data.data;
    
    console.log('\n📋 Final Timesheet Status:');
    console.log(`   Status: ${finalTimesheet.status}`);
    console.log(`   Description: ${finalTimesheet.description.substring(0, 80)}...`);
    console.log(`   Hours: ${finalTimesheet.hoursWorked}`);
    console.log(`   Approved At: ${finalTimesheet.approvedAt ? new Date(finalTimesheet.approvedAt).toLocaleString() : 'Not set'}`);
    console.log(`   Approver Comments: ${finalTimesheet.approverComments}`);
    
    // Test error cases
    console.log('\n🧪 Step 9: Test error cases');
    
    // Try to resubmit an approved timesheet (should fail)
    try {
      await axios.put(`${BASE_URL}/timesheets/${timesheetId}/resubmit`, {}, {
        headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
      });
      console.log('❌ ERROR: Should not be able to resubmit approved timesheet');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly prevented resubmitting approved timesheet');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 REJECT → RESUBMIT WORKFLOW COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(70));
    console.log('✅ Draft → Submit → Reject → Resubmit → Edit → Resubmit → Approve');
    console.log('✅ Error handling for invalid resubmit attempts');
    console.log('✅ Complete rejection and resubmission cycle working!');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    if (error.response?.data) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testResubmitWorkflow().catch(console.error);
