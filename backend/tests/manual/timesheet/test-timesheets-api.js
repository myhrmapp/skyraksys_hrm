// Test the timesheets API endpoint to see what data it returns
const axios = require('axios');

async function testTimesheetsAPI() {
  try {
    console.log('🔍 Testing /api/timesheets endpoint...\n');

    // First, let's try to login and get a token
    const loginResponse = await axios.post('http://localhost:8080/api/auth/login', {
      email: 'employee@company.com', // John Developer's email
      password: 'employee123' // Try common password
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful, got token');

    // Now call the timesheets endpoint
    const timesheetsResponse = await axios.get('http://localhost:8080/api/timesheets', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const timesheets = timesheetsResponse.data.data;
    console.log(`📊 Found ${timesheets.length} timesheets for this user\n`);

    // Filter for Week 37, 2025
    const week37Timesheets = timesheets.filter(t => 
      t.weekStartDate === '2025-09-08' || 
      (new Date(t.weekStartDate) >= new Date('2025-09-08') && 
       new Date(t.weekStartDate) <= new Date('2025-09-14'))
    );

    console.log(`📅 Week 37 timesheets for this user: ${week37Timesheets.length}`);
    
    if (week37Timesheets.length > 0) {
      week37Timesheets.forEach((ts, index) => {
        console.log(`${index + 1}. ID: ${ts.id}`);
        console.log(`   Project: ${ts.Project?.name || 'Unknown'}`);
        console.log(`   Task: ${ts.Task?.name || 'Unknown'}`);
        console.log(`   Status: ${ts.status}`);
        console.log(`   Total Hours: ${ts.totalHoursWorked}`);
        console.log(`   Week Start: ${ts.weekStartDate}`);
        console.log('');
      });
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Network Error:', error.message);
    }
  }
}

testTimesheetsAPI();