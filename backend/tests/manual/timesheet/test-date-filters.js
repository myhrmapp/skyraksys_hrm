console.log('🔍 TESTING WITH FRONTEND DATE FILTERS\n');

const axios = require('axios');

async function testWithDateFilters() {
    try {
        // Login
        const loginResponse = await axios.post('http://localhost:8080/api/auth/login', {
            email: 'employee@company.com',
            password: 'Password123!'
        });

        const token = loginResponse.data.data.accessToken;
        console.log('✅ Login successful');

        // Test 1: Get more timesheets to see if Week 38 is there
        console.log('\n1. Testing with higher limit to find Week 38...');
        const moreDataResponse = await axios.get('http://localhost:8080/api/timesheets?limit=50&sortBy=weekStartDate&sortOrder=DESC', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const allTimesheets = moreDataResponse.data.data;
        console.log(`📊 Total timesheets with limit 50: ${allTimesheets.length}`);
        
        const week38All = allTimesheets.filter(ts => ts.weekNumber === 38 && ts.year === 2025);
        console.log(`📅 Week 38, 2025 found in expanded results: ${week38All.length}`);

        if (week38All.length > 0) {
            console.log('\n🎯 Week 38 timesheets found:');
            week38All.forEach((ts, index) => {
                console.log(`   ${index + 1}. Week ${ts.weekNumber}, ${ts.year} (${ts.weekStartDate} to ${ts.weekEndDate})`);
                console.log(`      ${ts.project?.name}/${ts.task?.name} - ${ts.totalHoursWorked}h (${ts.status})`);
            });
        }

        // Test 2: Try with specific date range filter (like the frontend is using)
        console.log('\n2. Testing with September 2025 date range filter...');
        const dateFilterResponse = await axios.get('http://localhost:8080/api/timesheets?startDate=2025-09-01&endDate=2025-09-30&limit=50', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const filteredTimesheets = dateFilterResponse.data.data;
        console.log(`📊 Timesheets in Sep 2025 date range: ${filteredTimesheets.length}`);

        if (filteredTimesheets.length > 0) {
            console.log('\n📋 September 2025 timesheets:');
            filteredTimesheets.forEach((ts, index) => {
                console.log(`   ${index + 1}. Week ${ts.weekNumber}, ${ts.year} (${ts.weekStartDate})`);
                console.log(`      ${ts.project?.name}/${ts.task?.name} - ${ts.totalHoursWorked}h (${ts.status})`);
            });
        } else {
            console.log('❌ No timesheets found in September 2025 date range');
            console.log('   This could be why the frontend shows "No Timesheet History Found"');
        }

        // Test 3: Check what date range actually contains Week 38
        console.log('\n3. Checking actual date range for Week 38...');
        if (week38All.length > 0) {
            const sample = week38All[0];
            console.log(`📅 Week 38 actual date range: ${sample.weekStartDate} to ${sample.weekEndDate}`);
            console.log(`   This ${sample.weekStartDate >= '2025-09-01' && sample.weekStartDate <= '2025-09-30' ? 'IS' : 'IS NOT'} within Sep 2025 filter (2025-09-01 to 2025-09-30)`);
        }

        // Test 4: Check if backend supports the date filtering the frontend expects
        console.log('\n4. Testing backend date filtering capability...');
        try {
            const testFilterResponse = await axios.get('http://localhost:8080/api/timesheets?year=2025&weekNumber=38', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const specificWeekResults = testFilterResponse.data.data;
            console.log(`📊 Week 38, 2025 specific filter results: ${specificWeekResults.length}`);
            
            if (specificWeekResults.length > 0) {
                console.log('✅ Backend supports week-specific filtering');
                console.log('   Frontend could use this to directly fetch Week 38 data');
            }
        } catch (error) {
            console.log('❌ Backend may not support week-specific filtering:', error.response?.status);
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testWithDateFilters();