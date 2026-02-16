// Test script to reproduce the Oct 20-26 multiple task submission issue
const axios = require('axios');

const API_BASE = 'http://localhost:8080/api';

async function testOct20MultipleSubmission() {
  try {
    console.log('🧪 Testing multiple task submission for Oct 20-26, 2025...\n');
    
    // Login first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'employee@company.com',
      password: 'Password123!'
    });
    
    const token = loginResponse.data.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Login successful\n');
    
    // Get available projects
    console.log('📋 Getting available projects...');
    const projectsResponse = await axios.get(`${API_BASE}/projects`, { headers });
    const projects = projectsResponse.data.data || projectsResponse.data;
    
    console.log(`✅ Found ${projects.length} projects\n`);
    
    // Try to create two different timesheets for Oct 20-26, 2025
    const weekStartDate = '2025-10-20';
    const testData = [
      {
        projectId: projects[0]?.id,
        taskId: projects[0]?.tasks?.[0]?.id || '12345678-1234-1234-1234-123456789011',
        weekStartDate: weekStartDate,
        mondayHours: 0,
        tuesdayHours: 8,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        description: 'Second Task Test'
      },
      {
        projectId: projects[1]?.id || projects[0]?.id,
        taskId: projects[1]?.tasks?.[0]?.id || '12345678-1234-1234-1234-123456789014',
        weekStartDate: weekStartDate,
        mondayHours: 0,
        tuesdayHours: 0,
        wednesdayHours: 8,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        description: 'Third Task Test'
      }
    ];
    
    console.log('📝 Attempting to create multiple timesheets for the same week...');
    
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
        console.log(`   Details: ${JSON.stringify(error.response?.data?.details || {}, null, 2)}`);
        
        // Check specific error types
        if (error.response?.data?.message?.includes('already exists')) {
          console.log('   🔍 This is a duplicate prevention error');
        }
        if (error.response?.data?.message?.includes('constraint')) {
          console.log('   🔍 This is a database constraint error');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testOct20MultipleSubmission();