console.log('🔍 TESTING BACKEND AUTHENTICATION AND HISTORY API\n');

const axios = require('axios');

async function testBackendAuth() {
    try {
        // Test health endpoint first
        console.log('1. Testing backend health...');
        const healthResponse = await axios.get('http://localhost:8080/api/health');
        console.log('✅ Backend health:', healthResponse.data);

        // Test login
        console.log('\n2. Testing login with employee@company.com...');
        const loginResponse = await axios.post('http://localhost:8080/api/auth/login', {
            email: 'employee@company.com',
            password: 'Password123!'
        });

        if (loginResponse.data.success) {
            console.log('✅ Login successful');
            const token = loginResponse.data.token;
            if (token) {
                console.log('   Token received:', token.substring(0, 50) + '...');
            }
            console.log('   User role:', loginResponse.data.user?.role);
            console.log('   Employee ID:', loginResponse.data.user?.employeeId);

            // Test timesheets API
            console.log('\n3. Testing timesheets API (History tab data)...');
            
            const timesheetsResponse = await axios.get('http://localhost:8080/api/timesheets?page=1&limit=20', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (timesheetsResponse.data.success) {
                const timesheets = timesheetsResponse.data.data;
                console.log(`✅ Successfully retrieved ${timesheets.length} timesheets`);
                
                // Check for Week 38 specifically 
                const week38 = timesheets.filter(ts => ts.weekNumber === 38 && ts.year === 2025);
                console.log(`\n📅 Week 38, 2025 timesheets found: ${week38.length}`);
                
                if (week38.length > 0) {
                    console.log('🎉 SUCCESS! Week 38 timesheets are now visible!');
                    week38.forEach((ts, index) => {
                        console.log(`   ${index + 1}. ${ts.project?.name}/${ts.task?.name} - ${ts.totalHoursWorked}h (${ts.status})`);
                    });
                } else {
                    console.log('⚠️  Week 38 not in first 20 results, but API is working');
                }

                // Show first few timesheets
                console.log(`\n📊 Latest timesheets (what you'll see in History):`);
                timesheets.slice(0, 5).forEach((ts, index) => {
                    console.log(`   ${index + 1}. Week ${ts.weekNumber}, ${ts.year} - ${ts.project?.name}/${ts.task?.name} (${ts.totalHoursWorked}h)`);
                });

                console.log('\n✅ Backend API is working correctly! You should now be able to see your History tab.');
                
            } else {
                console.log('❌ Timesheets API failed:', timesheetsResponse.data.message);
            }

        } else {
            console.log('❌ Login failed:', loginResponse.data.message);
            console.log('   You may need to check your credentials in the frontend');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Backend may not be running. Try starting it with:');
            console.log('   npm start (in backend directory)');
        }
    }
}

testBackendAuth();