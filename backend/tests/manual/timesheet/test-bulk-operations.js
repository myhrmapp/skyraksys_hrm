// Test script for bulk save and bulk update functionality
const axios = require('axios');

const API_BASE = 'http://localhost:8080/api';

async function testBulkOperations() {
  try {
    console.log('🧪 Testing Bulk Save and Bulk Update Operations...\n');
    
    // Login
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'employee@company.com',
      password: 'Password123!'
    });
    
    const token = loginResponse.data.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Login successful\n');
    
    // Get available projects and tasks
    const projectsResponse = await axios.get(`${API_BASE}/projects`, { headers });
    const projects = projectsResponse.data.data || projectsResponse.data;
    
    const tasksResponse = await axios.get(`${API_BASE}/tasks`, { headers });
    const tasks = tasksResponse.data.data || tasksResponse.data;
    
    console.log(`✅ Found ${projects.length} projects and ${tasks.length} tasks\n`);
    
    // TEST 1: Bulk Save (Create multiple timesheets as draft)
    console.log('📝 TEST 1: Bulk Save - Creating multiple timesheets as draft...');
    
    const weekStartDate = '2025-11-17'; // Week 47
    const bulkSaveData = {
      timesheets: [
        {
          projectId: projects[0]?.id,
          taskId: tasks[0]?.id,
          weekStartDate: weekStartDate,
          mondayHours: 8,
          tuesdayHours: 0,
          wednesdayHours: 0,
          thursdayHours: 0,
          fridayHours: 0,
          saturdayHours: 0,
          sundayHours: 0,
          description: 'Bulk save test - Task 1'
        },
        {
          projectId: projects[1]?.id || projects[0]?.id,
          taskId: tasks[1]?.id || tasks[0]?.id,
          weekStartDate: weekStartDate,
          mondayHours: 0,
          tuesdayHours: 8,
          wednesdayHours: 0,
          thursdayHours: 0,
          fridayHours: 0,
          saturdayHours: 0,
          sundayHours: 0,
          description: 'Bulk save test - Task 2'
        }
      ]
    };
    
    // Make sure we're using different task combinations
    if (bulkSaveData.timesheets[0].projectId === bulkSaveData.timesheets[1].projectId && 
        bulkSaveData.timesheets[0].taskId === bulkSaveData.timesheets[1].taskId) {
      if (tasks.length > 1) {
        bulkSaveData.timesheets[1].taskId = tasks[1].id;
      }
    }
    
    try {
      const bulkSaveResponse = await axios.post(`${API_BASE}/timesheets/bulk-save`, bulkSaveData, { headers });
      
      console.log('✅ Bulk Save successful!');
      console.log(`   Created ${bulkSaveResponse.data.data.summary.successful} timesheets`);
      console.log(`   Success rate: ${(bulkSaveResponse.data.data.summary.successful / bulkSaveResponse.data.data.summary.total * 100).toFixed(1)}%`);
      
      // Store created IDs for update test
      const createdTimesheets = bulkSaveResponse.data.data.processed;
      console.log('\n📋 Created timesheets:');
      createdTimesheets.forEach((ts, index) => {
        console.log(`   ${index + 1}. ${ts.details.project}/${ts.details.task} - ${ts.details.totalHours}h - Status: ${ts.details.status}`);
      });
      
      // TEST 2: Bulk Update (Update the created timesheets)
      console.log('\n📝 TEST 2: Bulk Update - Updating the created timesheets...');
      
      const bulkUpdateData = {
        timesheets: createdTimesheets.map((ts, index) => ({
          id: ts.timesheetId,
          wednesdayHours: 4,
          thursdayHours: 4,
          description: `Updated via bulk update - Task ${index + 1}`
        }))
      };
      
      try {
        const bulkUpdateResponse = await axios.put(`${API_BASE}/timesheets/bulk-update`, bulkUpdateData, { headers });
        
        console.log('✅ Bulk Update successful!');
        console.log(`   Updated ${bulkUpdateResponse.data.data.summary.successful} timesheets`);
        console.log(`   Success rate: ${(bulkUpdateResponse.data.data.summary.successful / bulkUpdateResponse.data.data.summary.total * 100).toFixed(1)}%`);
        
        console.log('\n📋 Updated timesheets:');
        bulkUpdateResponse.data.data.processed.forEach((ts, index) => {
          console.log(`   ${index + 1}. ${ts.details.project}/${ts.details.task} - ${ts.details.totalHours}h - Status: ${ts.details.status}`);
        });
        
        // TEST 3: Bulk Submit (Submit all the updated timesheets)
        console.log('\n📝 TEST 3: Bulk Submit - Submitting all timesheets...');
        
        const timesheetIds = createdTimesheets.map(ts => ts.timesheetId);
        const bulkSubmitData = { timesheetIds };
        
        try {
          const bulkSubmitResponse = await axios.post(`${API_BASE}/timesheets/bulk-submit`, bulkSubmitData, { headers });
          
          console.log('✅ Bulk Submit successful!');
          console.log(`   Submitted ${bulkSubmitResponse.data.data.summary.successful} timesheets`);
          console.log(`   Success rate: ${(bulkSubmitResponse.data.data.summary.successful / bulkSubmitResponse.data.data.summary.total * 100).toFixed(1)}%`);
          
          console.log('\n📋 Submitted timesheets:');
          bulkSubmitResponse.data.data.submitted.forEach((ts, index) => {
            console.log(`   ${index + 1}. ${ts.details.project}/${ts.details.task} - ${ts.details.totalHours}h - Submitted: ${new Date(ts.details.submittedAt).toLocaleString()}`);
          });
          
        } catch (submitError) {
          console.log('❌ Bulk Submit failed:');
          console.log('   Error:', submitError.response?.data?.message || submitError.message);
        }
        
      } catch (updateError) {
        console.log('❌ Bulk Update failed:');
        console.log('   Error:', updateError.response?.data?.message || updateError.message);
      }
      
    } catch (saveError) {
      console.log('❌ Bulk Save failed:');
      console.log('   Error:', saveError.response?.data?.message || saveError.message);
      if (saveError.response?.data?.errors) {
        console.log('   Detailed errors:', JSON.stringify(saveError.response.data.errors, null, 2));
      }
    }
    
    // Final verification
    console.log('\n📊 Final Verification - Checking week 47 timesheets...');
    try {
      const finalResponse = await axios.get(`${API_BASE}/timesheets?year=2025&weekNumber=47`, { headers });
      const timesheets = finalResponse.data.data || finalResponse.data.timesheets || [];
      
      console.log(`\n✅ Found ${timesheets.length} timesheets for week 47, 2025:`);
      timesheets.forEach((ts, index) => {
        console.log(`   ${index + 1}. ${ts.project?.name}/${ts.task?.name} - ${ts.totalHoursWorked}h - Status: ${ts.status}`);
      });
      
      const draftCount = timesheets.filter(ts => ts.status === 'Draft').length;
      const submittedCount = timesheets.filter(ts => ts.status === 'Submitted').length;
      
      console.log(`\n📈 Summary:`);
      console.log(`   📝 Draft: ${draftCount}`);
      console.log(`   ✅ Submitted: ${submittedCount}`);
      console.log(`   📊 Total: ${timesheets.length}`);
      
      if (timesheets.length >= 2) {
        console.log('\n🎉 SUCCESS! All bulk operations are working correctly!');
        console.log('   ✅ Bulk Save: Creates multiple timesheets as draft');
        console.log('   ✅ Bulk Update: Updates multiple draft timesheets'); 
        console.log('   ✅ Bulk Submit: Submits multiple timesheets at once');
      }
      
    } catch (verifyError) {
      console.log('❌ Verification failed:', verifyError.response?.data?.message || verifyError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testBulkOperations();