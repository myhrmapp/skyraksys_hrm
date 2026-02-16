// Test auto-bulk submission when clicking submit on individual timesheet
const axios = require('axios');

const API_BASE = 'http://localhost:8080/api';

async function testAutoBulkSubmission() {
  try {
    console.log('🧪 Testing auto-bulk submission when multiple tasks exist...\n');
    
    // Login
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'employee@company.com',
      password: 'Password123!'
    });
    
    const token = loginResponse.data.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Login successful\n');
    
    // Create two timesheets for Nov 10-16, 2025 (fresh week)
    const weekStartDate = '2025-11-10';
    const projects = await axios.get(`${API_BASE}/projects`, { headers });
    const projectList = projects.data.data || projects.data;
    
    // Get available tasks
    const tasksResponse = await axios.get(`${API_BASE}/tasks`, { headers });
    const tasks = tasksResponse.data.data || tasksResponse.data;
    
    if (tasks.length < 2) {
      console.log('❌ Need at least 2 available tasks for this test');
      return;
    }
    
    console.log(`✅ Found ${tasks.length} available tasks\n`);
    
    console.log('📝 Creating two timesheets for the same week...');
    
    // Create first timesheet
    const timesheet1Data = {
      projectId: projectList[0]?.id,
      taskId: tasks[0].id,
      weekStartDate: weekStartDate,
      mondayHours: 8,
      tuesdayHours: 0,
      wednesdayHours: 0,
      thursdayHours: 0,
      fridayHours: 0,
      saturdayHours: 0,
      sundayHours: 0,
      description: 'First task of the week'
    };
    
    const timesheet1Response = await axios.post(`${API_BASE}/timesheets`, timesheet1Data, { headers });
    const timesheet1Id = timesheet1Response.data.id || timesheet1Response.data.data?.id;
    console.log(`✅ Created timesheet 1: ${timesheet1Id} (${tasks[0].name})`);
    
    // Create second timesheet with different task
    const timesheet2Data = {
      projectId: projectList[1]?.id || projectList[0]?.id, // Different project if available
      taskId: tasks[1].id, // Different task
      weekStartDate: weekStartDate,
      mondayHours: 0,
      tuesdayHours: 8,
      wednesdayHours: 0,
      thursdayHours: 0,
      fridayHours: 0,
      saturdayHours: 0,
      sundayHours: 0,
      description: 'Second task of the week'
    };
    
    const timesheet2Response = await axios.post(`${API_BASE}/timesheets`, timesheet2Data, { headers });
    const timesheet2Id = timesheet2Response.data.id || timesheet2Response.data.data?.id;
    console.log(`✅ Created timesheet 2: ${timesheet2Id} (${tasks[1].name})\n`);
    
    // Now try to submit one of them individually - should trigger auto-bulk submission
    console.log('🚀 Attempting individual submission (should auto-trigger bulk submission)...');
    
    try {
      const submitResponse = await axios.put(`${API_BASE}/timesheets/${timesheet1Id}/submit`, {}, { headers });
      
      console.log('✅ Submission successful!');
      console.log('Response:', JSON.stringify(submitResponse.data, null, 2));
      
      // Check final status of both timesheets
      console.log('\n📊 Checking final status...');
      const week46Response = await axios.get(`${API_BASE}/timesheets?year=2025&weekNumber=46`, { headers });
      const timesheets = week46Response.data.data || week46Response.data.timesheets || [];
      
      console.log(`\n✅ Final results for week 46 (Nov 10-16, 2025):`);
      console.log(`   Total timesheets: ${timesheets.length}`);
      
      timesheets.forEach((ts, index) => {
        console.log(`   ${index + 1}. ID: ${ts.id}`);
        console.log(`      Status: ${ts.status}`);
        console.log(`      Project: ${ts.project?.name}`);
        console.log(`      Task: ${ts.task?.name}`);
        console.log(`      Hours: ${ts.totalHoursWorked}`);
        console.log(`      Submitted: ${ts.submittedAt || 'Not submitted'}`);
      });
      
      const submittedCount = timesheets.filter(ts => ts.status === 'Submitted').length;
      
      if (submittedCount === timesheets.length && timesheets.length >= 2) {
        console.log('\n🎉 SUCCESS! Auto-bulk submission worked perfectly!');
        console.log('   Both timesheets were submitted automatically when clicking submit on one.');
      } else {
        console.log('\n⚠️ Partial success - check individual timesheet statuses above');
      }
      
    } catch (submitError) {
      console.log('❌ Submission failed:');
      console.log('Status:', submitError.response?.status);
      console.log('Error:', submitError.response?.data?.message || submitError.message);
      if (submitError.response?.data) {
        console.log('Details:', JSON.stringify(submitError.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAutoBulkSubmission();