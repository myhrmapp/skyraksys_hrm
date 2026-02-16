// Test the exact API call that the frontend TimesheetHistory component makes
const axios = require('axios');

async function testHistoryAPI() {
  try {
    console.log('🔍 Testing History Page API Call...\n');

    // First, let's try to get a valid token
    // Try different login combinations
    const loginAttempts = [
      { email: 'employee@company.com', password: 'employee123' },
      { email: 'employee@company.com', password: 'password' },
      { email: 'employee@company.com', password: 'admin123' },
      { email: 'john@company.com', password: 'password' },
      { email: 'test@company.com', password: 'password' }
    ];

    let token = null;
    let userInfo = null;

    for (const attempt of loginAttempts) {
      try {
        console.log(`🔐 Trying login: ${attempt.email} / ${attempt.password}`);
        const loginResponse = await axios.post('http://localhost:8080/api/auth/login', attempt);
        
        if (loginResponse.data.success) {
          token = loginResponse.data.data.accessToken;
          userInfo = loginResponse.data.data.user;
          console.log(`✅ Login successful for ${attempt.email}`);
          console.log(`   User: ${userInfo.firstName} ${userInfo.lastName}`);
          console.log(`   Role: ${userInfo.role}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
      }
    }

    if (!token) {
      console.log('\n❌ Could not authenticate with any credentials');
      return;
    }

    // Now test the timesheets API call that History component makes
    console.log('\n📊 Testing /api/timesheets endpoint (History component call)...');
    
    const timesheetsResponse = await axios.get('http://localhost:8080/api/timesheets', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const timesheets = timesheetsResponse.data.data || timesheetsResponse.data;
    console.log(`Found ${timesheets.length} timesheets\n`);

    if (timesheets.length === 0) {
      console.log('❌ No timesheets returned from API');
      return;
    }

    // Check the structure of returned data
    console.log('📋 First timesheet structure:');
    const firstTimesheet = timesheets[0];
    console.log(JSON.stringify(firstTimesheet, null, 2));

    // Look for Week 38 specifically
    console.log('\n🎯 Looking for Week 38 (2025-09-15) timesheets...');
    const week38Timesheets = timesheets.filter(ts => {
      const weekStart = ts.weekStartDate;
      return weekStart === '2025-09-15' || (weekStart && weekStart.includes('2025-09-15'));
    });

    if (week38Timesheets.length > 0) {
      console.log(`✅ Found ${week38Timesheets.length} Week 38 timesheets in API response:`);
      week38Timesheets.forEach((ts, index) => {
        console.log(`${index + 1}. ID: ${ts.id?.substring(0, 8)}...`);
        console.log(`   Week: ${ts.weekStartDate}`);
        console.log(`   Project: ${ts.project?.name || ts.Project?.name || 'Missing project data'}`);
        console.log(`   Task: ${ts.task?.name || ts.Task?.name || 'Missing task data'}`);
        console.log(`   Status: ${ts.status}`);
        console.log(`   Hours: ${ts.totalHoursWorked}`);
        console.log(`   Has Project Object: ${!!ts.project || !!ts.Project}`);
        console.log(`   Has Task Object: ${!!ts.task || !!ts.Task}`);
        console.log('');
      });
    } else {
      console.log('❌ No Week 38 timesheets found in API response');
      
      // Show what weeks are available
      console.log('\n📅 Available weeks in API response:');
      const uniqueWeeks = [...new Set(timesheets.map(ts => ts.weekStartDate))].sort().reverse();
      uniqueWeeks.slice(0, 10).forEach(week => {
        const count = timesheets.filter(ts => ts.weekStartDate === week).length;
        console.log(`   ${week}: ${count} timesheet(s)`);
      });
    }

    // Test TimesheetHistory component's expected data format
    console.log('\n🔧 Testing TimesheetHistory data processing...');
    
    // Simulate the groupTimesheetsByWeek function
    const dayjs = require('dayjs');
    const isoWeek = require('dayjs/plugin/isoWeek');
    dayjs.extend(isoWeek);

    const weekGroups = {};
    timesheets.forEach(timesheet => {
      const weekStartDate = dayjs(timesheet.weekStartDate);
      const weekStart = weekStartDate.startOf('isoWeek');
      const weekKey = weekStart.format('YYYY-MM-DD');
      
      if (!weekGroups[weekKey]) {
        weekGroups[weekKey] = {
          weekStart: weekStart,
          weekEnd: weekStart.endOf('week'),
          timesheets: [],
          totalHours: 0,
          status: timesheet.status,
          canEdit: false
        };
      }
      
      weekGroups[weekKey].timesheets.push(timesheet);
      weekGroups[weekKey].totalHours += parseFloat(timesheet.totalHoursWorked) || 0;
    });

    const weeklyGroups = Object.values(weekGroups).sort((a, b) => b.weekStart.valueOf() - a.weekStart.valueOf());
    
    console.log(`📊 After grouping: ${weeklyGroups.length} week groups`);
    weeklyGroups.slice(0, 5).forEach((group, index) => {
      console.log(`${index + 1}. ${group.weekStart.format('MMM DD, YYYY')}: ${group.timesheets.length} timesheets, ${group.totalHours}h`);
    });

  } catch (error) {
    console.error('❌ Error testing History API:', error.response?.data || error.message);
  }
}

testHistoryAPI();