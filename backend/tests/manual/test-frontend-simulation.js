console.log('🔍 TESTING FRONTEND API CALL SIMULATION\n');

const axios = require('axios');

async function simulateFrontendCall() {
    try {
        // First, login to get the token (like the frontend would)
        console.log('1. Simulating frontend login...');
        const loginResponse = await axios.post('http://localhost:8080/api/auth/login', {
            email: 'employee@company.com',
            password: 'Password123!'
        });

        if (!loginResponse.data.success) {
            throw new Error('Login failed');
        }

        const token = loginResponse.data.data.accessToken;
        console.log('✅ Login successful, token received');

        // Now simulate the exact call TimesheetHistory.js makes
        console.log('\n2. Simulating TimesheetHistory component API call...');
        console.log('   Calling: GET /api/timesheets');
        
        const timesheetResponse = await axios.get('http://localhost:8080/api/timesheets', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ API Response received');
        console.log('   Success:', timesheetResponse.data.success);
        console.log('   Data type:', typeof timesheetResponse.data.data);
        console.log('   Data length:', Array.isArray(timesheetResponse.data.data) ? timesheetResponse.data.data.length : 'Not an array');

        if (timesheetResponse.data.success && Array.isArray(timesheetResponse.data.data)) {
            const timesheets = timesheetResponse.data.data;
            console.log(`\n📊 Retrieved ${timesheets.length} timesheets`);
            
            if (timesheets.length > 0) {
                console.log('\n📋 Sample timesheet structure:');
                const sample = timesheets[0];
                console.log('   Fields:', Object.keys(sample));
                console.log('   Week:', sample.weekNumber, sample.year);
                console.log('   Project:', sample.project?.name || 'No project data');
                console.log('   Task:', sample.task?.name || 'No task data');
                console.log('   Hours:', sample.totalHoursWorked);
                console.log('   Status:', sample.status);
            }

            // Check if Week 38 is in the results
            const week38 = timesheets.filter(ts => ts.weekNumber === 38 && ts.year === 2025);
            console.log(`\n📅 Week 38, 2025 in results: ${week38.length} timesheets`);

            // Check response format vs frontend expectations
            console.log('\n🔍 Response format analysis:');
            console.log('   Expected by frontend: response.success ? response.data : (response.data || [])');
            console.log('   Actual response.success:', timesheetResponse.data.success);
            console.log('   Actual response.data type:', typeof timesheetResponse.data.data);
            console.log('   Frontend would use:', timesheetResponse.data.success ? timesheetResponse.data.data : (timesheetResponse.data.data || []));

        } else {
            console.log('❌ API response format issue:');
            console.log('   Full response:', JSON.stringify(timesheetResponse.data, null, 2));
        }

    } catch (error) {
        console.error('❌ Error simulating frontend call:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('\n💡 Authentication issue detected!');
            console.log('   This could be why the frontend shows no data');
        }
    }
}

simulateFrontendCall();