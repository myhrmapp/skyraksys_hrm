// Test bulk submission for the Oct 27 timesheets
const axios = require('axios');

const API_BASE = 'http://localhost:8080/api';

async function testBulkSubmission() {
  try {
    console.log('🧪 Testing bulk submission for Oct 27 - Nov 2, 2025 timesheets...\n');
    
    // Login
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'employee@company.com',
      password: 'Password123!'
    });
    
    const token = loginResponse.data.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Login successful\n');
    
    // Get timesheets for week 44 (Oct 27)
    console.log('📋 Getting timesheets for week 44...');
    const timesheetsResponse = await axios.get(`${API_BASE}/timesheets?year=2025&weekNumber=44`, { headers });
    const timesheets = timesheetsResponse.data.data || timesheetsResponse.data.timesheets || [];
    
    console.log(`✅ Found ${timesheets.length} timesheets for week 44:`);
    timesheets.forEach((ts, index) => {
      console.log(`   ${index + 1}. ID: ${ts.id}, Status: ${ts.status}, Project: ${ts.project?.name}, Task: ${ts.task?.name}`);
    });
    
    // Filter for draft timesheets only
    const draftTimesheets = timesheets.filter(ts => ts.status === 'Draft');
    console.log(`\n📝 Found ${draftTimesheets.length} draft timesheets to submit`);
    
    if (draftTimesheets.length === 0) {
      console.log('ℹ️ No draft timesheets to submit');
      return;
    }
    
    // Prepare bulk submission data
    const timesheetIds = draftTimesheets.map(ts => ts.id);
    
    console.log(`\n⏳ Submitting ${timesheetIds.length} timesheets in bulk...`);
    console.log(`   IDs: ${timesheetIds.join(', ')}`);
    
    const bulkSubmitResponse = await axios.post(`${API_BASE}/timesheets/bulk-submit`, {
      timesheetIds: timesheetIds
    }, { headers });
    
    console.log('✅ Bulk submission successful!');
    console.log('Response:', JSON.stringify(bulkSubmitResponse.data, null, 2));
    
    // Check final status
    console.log('\n📊 Checking final status...');
    const finalResponse = await axios.get(`${API_BASE}/timesheets?year=2025&weekNumber=44`, { headers });
    const finalTimesheets = finalResponse.data.data || finalResponse.data.timesheets || [];
    
    console.log(`\n✅ Final results:`);
    console.log(`   Total timesheets: ${finalTimesheets.length}`);
    
    finalTimesheets.forEach((ts, index) => {
      console.log(`   ${index + 1}. Status: ${ts.status}, Project: ${ts.project?.name}, Task: ${ts.task?.name}, Hours: ${ts.totalHoursWorked}`);
    });
    
    const submittedCount = finalTimesheets.filter(ts => ts.status === 'Submitted').length;
    console.log(`\n🎯 Successfully submitted: ${submittedCount}/${finalTimesheets.length} timesheets`);
    
    if (submittedCount === finalTimesheets.length && finalTimesheets.length >= 2) {
      console.log('\n🎉 SUCCESS! Multiple tasks per week can now be submitted using bulk submission!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testBulkSubmission();