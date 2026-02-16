console.log('🔧 TESTING FIXED HISTORY API\n');

const axios = require('axios');

async function testFixedHistoryAPI() {
    try {
        console.log('🔐 Testing login...');
        
        // First login to get a token
        const loginResponse = await axios.post('http://localhost:8080/api/auth/login', {
            email: 'john@company.com',
            password: 'Password123!'
        });

        if (!loginResponse.data.success) {
            throw new Error(`Login failed: ${loginResponse.data.message}`);
        }

        const token = loginResponse.data.token;
        console.log('✅ Login successful, got token');

        // Test the timesheets API that History component uses
        console.log('\n📊 Testing fixed /api/timesheets endpoint...');
        
        const timesheetsResponse = await axios.get('http://localhost:8080/api/timesheets?page=1&limit=20', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!timesheetsResponse.data.success) {
            throw new Error(`API call failed: ${timesheetsResponse.data.message}`);
        }

        const timesheets = timesheetsResponse.data.data;
        console.log(`✅ Successfully retrieved ${timesheets.length} timesheets`);

        // Check for Week 38 specifically
        const week38Timesheets = timesheets.filter(ts => 
            ts.weekNumber === 38 && ts.year === 2025
        );

        console.log(`\n📅 Week 38, 2025 timesheets found: ${week38Timesheets.length}`);
        
        if (week38Timesheets.length > 0) {
            console.log('✅ Week 38 timesheets are now visible in History!');
            week38Timesheets.forEach((ts, index) => {
                console.log(`   ${index + 1}. Project: ${ts.project?.name || 'Unknown'}`);
                console.log(`      Task: ${ts.task?.name || 'Unknown'}`);
                console.log(`      Hours: ${ts.totalHoursWorked}`);
                console.log(`      Status: ${ts.status}`);
                console.log(`      Submitted: ${ts.submittedAt}`);
            });
        } else {
            console.log('❌ Week 38 timesheets still not found');
        }

        // Test pagination to see all weeks
        console.log(`\n📊 Weeks visible in first page (what History shows):`);
        const weeks = [...new Set(timesheets.map(ts => `Week ${ts.weekNumber}, ${ts.year}`))];
        weeks.forEach((week, index) => {
            console.log(`   ${index + 1}. ${week}`);
        });

        console.log(`\n✅ History API fix test completed successfully!`);
        console.log(`   Total timesheets: ${timesheets.length}`);
        console.log(`   Unique weeks shown: ${weeks.length}`);

    } catch (error) {
        console.error('❌ Error testing fixed History API:', error.response?.data || error.message);
    }
}

testFixedHistoryAPI();