// Test script for a clean week - Oct 27 - Nov 2, 2025
const axios = require('axios');

const API_BASE = 'http://localhost:8080/api';

async function testFreshWeekMultipleTasks() {
  try {
    console.log('🧪 Testing multiple task submission for fresh week Oct 27 - Nov 2, 2025...\n');
    
    // Login
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'employee@company.com',
      password: 'Password123!'
    });
    
    const token = loginResponse.data.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Login successful\n');
    
    // Get projects
    const projectsResponse = await axios.get(`${API_BASE}/projects`, { headers });
    const projects = projectsResponse.data.data || projectsResponse.data;
    console.log(`✅ Found ${projects.length} projects\n`);
    
    // Get tasks for different projects
    const tasksResponse = await axios.get(`${API_BASE}/tasks`, { headers });
    const tasks = tasksResponse.data.data || tasksResponse.data;
    console.log(`✅ Found ${tasks.length} tasks\n`);
    
    // Create two different timesheets for the same week but different project+task combinations
    const weekStartDate = '2025-10-27';
    const testData = [
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
        description: 'First task for this week'
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
        description: 'Second task for this week'
      }
    ];
    
    // Make sure we're using different project+task combinations
    if (testData[0].projectId === testData[1].projectId && testData[0].taskId === testData[1].taskId) {
      // If same project, try to use different task
      if (tasks.length > 1) {
        testData[1].taskId = tasks[1].id;
      } else {
        console.log('⚠️ Warning: Using same project+task combination - this should fail');
      }
    }
    
    console.log('📝 Creating multiple timesheets for the same week with different project+task combinations...\n');
    
    const createdTimesheets = [];
    
    for (let i = 0; i < testData.length; i++) {
      try {
        console.log(`⏳ Creating timesheet ${i + 1}...`);
        console.log(`   Project: ${testData[i].projectId}`);
        console.log(`   Task: ${testData[i].taskId}`);
        console.log(`   Week: ${testData[i].weekStartDate}`);
        console.log(`   Hours: ${Object.entries(testData[i]).filter(([key, value]) => key.includes('Hours') && value > 0).map(([key, value]) => `${key}: ${value}`).join(', ')}`);
        
        const response = await axios.post(`${API_BASE}/timesheets`, testData[i], { headers });
        
        console.log(`✅ Timesheet ${i + 1} created successfully!`);
        console.log(`   ID: ${response.data.id || response.data.data?.id}`);
        
        createdTimesheets.push(response.data.id || response.data.data?.id);
        
        // Submit it
        const timesheetId = response.data.id || response.data.data?.id;
        console.log(`⏳ Submitting timesheet ${i + 1}...`);
        const submitResponse = await axios.put(`${API_BASE}/timesheets/${timesheetId}/submit`, {}, { headers });
        
        console.log(`✅ Timesheet ${i + 1} submitted successfully!\n`);
        
      } catch (error) {
        console.log(`❌ Error with timesheet ${i + 1}:`);
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Error: ${error.response?.data?.message || error.message}`);
        if (error.response?.data?.details) {
          console.log(`   Details: ${JSON.stringify(error.response.data.details, null, 2)}`);
        }
        console.log('');
      }
    }
    
    // Check final results
    console.log('📊 Checking final results...');
    const timesheetsResponse = await axios.get(`${API_BASE}/timesheets?year=2025&weekNumber=44`, { headers });
    const timesheets = timesheetsResponse.data.data || timesheetsResponse.data.timesheets || [];
    
    console.log(`\n✅ Final results for week 44, 2025:`);
    console.log(`   Total timesheets: ${timesheets.length}`);
    
    timesheets.forEach((ts, index) => {
      console.log(`   ${index + 1}. Status: ${ts.status}, Project: ${ts.project?.name}, Task: ${ts.task?.name}, Hours: ${ts.totalHoursWorked}`);
    });
    
    if (timesheets.length >= 2) {
      console.log('\n🎉 SUCCESS! Multiple tasks per week submission is now working!');
    } else if (timesheets.length === 1) {
      console.log('\n⚠️ Only one timesheet found - check if tasks were different enough');
    } else {
      console.log('\n❌ No timesheets found - something went wrong');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testFreshWeekMultipleTasks();