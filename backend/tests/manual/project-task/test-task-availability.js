const axios = require('axios');

async function testTaskAvailability() {
  const baseURL = 'http://localhost:8080/api';
  
  try {
    // Login as admin to get a token
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@company.com',
      password: 'Kx9mP7qR2nF8sA5t'
    });
    
    const token = loginResponse.data.data.accessToken;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ Login successful');
    
    // Get tasks to see their availability
    console.log('\n📋 Checking task availability...');
    const tasksResponse = await axios.get(`${baseURL}/tasks`, { headers });
    const tasks = tasksResponse.data.data || tasksResponse.data;
    
    console.log(`Found ${tasks.length} tasks:`);
    tasks.forEach(task => {
      console.log(`- ${task.name}: availableToAll=${task.availableToAll}, assignedTo=${task.assignedTo || 'none'}`);
    });
    
    // Try to create a timesheet with a task that might not be available
    console.log('\n➕ Testing timesheet creation with task availability...');
    
    // Find a task that is NOT available to all
    const restrictedTask = tasks.find(task => !task.availableToAll);
    
    if (restrictedTask) {
      console.log(`Testing with restricted task: ${restrictedTask.name}`);
      
      const timesheetData = {
        weekStartDate: '2025-09-22', // Monday of next week
        projectId: restrictedTask.projectId,
        taskId: restrictedTask.id,
        mondayHours: 8,
        tuesdayHours: 8,
        description: 'Testing task availability validation'
      };
      
      try {
        const createResponse = await axios.post(`${baseURL}/timesheets`, timesheetData, { headers });
        console.log(`✅ Timesheet created successfully: ${createResponse.data.data.id}`);
        
        // Try to submit the timesheet
        console.log('\n📤 Testing timesheet submission...');
        const submitResponse = await axios.put(`${baseURL}/timesheets/${createResponse.data.data.id}/submit`, {}, { headers });
        console.log('✅ Timesheet submitted successfully');
        
      } catch (error) {
        if (error.response?.status === 403) {
          console.log('✅ Task availability validation working: ' + error.response.data.message);
        } else {
          console.log('❌ Unexpected error:', error.response?.data || error.message);
        }
      }
    } else {
      console.log('ℹ️ All tasks are available to all employees - cannot test restriction');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testTaskAvailability();