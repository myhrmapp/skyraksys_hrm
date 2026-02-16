// Test script to verify multiple task submission works
const axios = require('axios');

const API_BASE = 'http://localhost:8080/api';

async function testMultipleTaskSubmission() {
  try {
    console.log('🧪 Testing multiple task submission for Sep 29 - Oct 5, 2025...\n');
    
    // First, login to get token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'employee@company.com',
      password: 'Password123!'
    });
    
    const token = loginResponse.data.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Login successful\n');
    
    // Get available projects and tasks
    console.log('📋 Getting available projects...');
    const projectsResponse = await axios.get(`${API_BASE}/projects`, { headers });
    const projects = projectsResponse.data.data || projectsResponse.data;
    
    console.log(`✅ Found ${projects.length} projects\n`);
    
    // Try to create multiple timesheets for the same week
    const weekStartDate = '2025-09-29';
    const testData = [
      {
        projectId: projects[0]?.id,
        taskId: projects[0]?.tasks?.[0]?.id || '12345678-1234-1234-1234-123456789011',
        weekStartDate: weekStartDate,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        description: 'Testing Task 1'
      },
      {
        projectId: projects[1]?.id || projects[0]?.id,
        taskId: projects[1]?.tasks?.[0]?.id || '12345678-1234-1234-1234-123456789014',
        weekStartDate: weekStartDate,
        mondayHours: 0,
        tuesdayHours: 8,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        description: 'Testing Task 2'
      }
    ];
    
    console.log('📝 Creating multiple timesheets...');
    
    for (let i = 0; i < testData.length; i++) {
      try {
        console.log(`\n⏳ Creating timesheet ${i + 1}...`);
        console.log(`   Project: ${testData[i].projectId}`);
        console.log(`   Task: ${testData[i].taskId}`);
        console.log(`   Week: ${testData[i].weekStartDate}`);
        
        const response = await axios.post(`${API_BASE}/timesheets`, testData[i], { headers });
        
        console.log(`✅ Timesheet ${i + 1} created successfully!`);
        console.log(`   ID: ${response.data.id}`);
        
        // Try to submit it
        console.log(`⏳ Submitting timesheet ${i + 1}...`);
        const submitResponse = await axios.put(`${API_BASE}/timesheets/${response.data.id}/submit`, {}, { headers });
        
        console.log(`✅ Timesheet ${i + 1} submitted successfully!`);
        
      } catch (error) {
        console.log(`❌ Error with timesheet ${i + 1}:`);
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Error: ${error.response?.data?.message || error.message}`);
        
        if (error.response?.data?.error?.includes('unique constraint')) {
          console.log('   🔍 This indicates the constraint fix may not be working properly');
        }
      }
    }
    
    // Check final status
    console.log('\n📊 Checking final timesheet status...');
    const timesheetsResponse = await axios.get(`${API_BASE}/timesheets?year=2025&weekNumber=40`, { headers });
    const timesheets = timesheetsResponse.data.data || timesheetsResponse.data.timesheets || [];
    
    console.log(`\n✅ Final results:`);
    console.log(`   Total timesheets for week 40, 2025: ${timesheets.length}`);
    
    timesheets.forEach((ts, index) => {
      console.log(`   ${index + 1}. Status: ${ts.status}, Project: ${ts.project?.name}, Task: ${ts.task?.name}`);
    });
    
    if (timesheets.length >= 2) {
      console.log('\n🎉 SUCCESS! Multiple tasks per week submission is working!');
    } else {
      console.log('\n⚠️  Only one timesheet found - constraint may still be blocking');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testMultipleTaskSubmission();