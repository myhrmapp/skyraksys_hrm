const axios = require('axios');
const dayjs = require('dayjs');

const BASE_URL = 'http://localhost:8080/api';
let token = null;

async function quickTimesheetTest() {
  console.log('🔧 QUICK TIMESHEET VALIDATION TEST\n');
  
  // Login
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'Skyraksys123$'
    });
    token = loginResponse.data.data.accessToken;
    console.log('✅ Logged in successfully');
  } catch (error) {
    console.log('❌ Login failed');
    return;
  }
  
  // Get employee
  const empResponse = await axios.get(`${BASE_URL}/employees`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const employee = empResponse.data.data[0];
  console.log(`✅ Using employee: ${employee.firstName}`);
  
  // Create project in database
  const { sequelize } = require('./models');
  const Project = sequelize.models.Project;
  
  let project = await Project.findOne({ where: { name: 'Quick Test Project' } });
  if (!project) {
    project = await Project.create({
      name: 'Quick Test Project',
      description: 'Quick test project',
      status: 'Active'
    });
  }
  console.log(`✅ Project ready: ${project.name}`);
  
  // Test minimal timesheet data
  const minimalTimesheet = {
    employeeId: employee.id,
    projectId: project.id,
    workDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    hoursWorked: 8,
    description: 'Quick test timesheet'
  };
  
  console.log('📝 Testing with minimal data:', JSON.stringify(minimalTimesheet, null, 2));
  
  try {
    const response = await axios.post(`${BASE_URL}/timesheets`, minimalTimesheet, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ SUCCESS! Timesheet created:', response.data);
  } catch (error) {
    console.log('❌ FAILED:', error.response?.data || error.message);
    
    // Try with additional fields
    const extendedTimesheet = {
      ...minimalTimesheet,
      clockInTime: '09:00',
      clockOutTime: '17:00',
      breakHours: 1
    };
    
    console.log('\n📝 Trying with extended data:', JSON.stringify(extendedTimesheet, null, 2));
    
    try {
      const response2 = await axios.post(`${BASE_URL}/timesheets`, extendedTimesheet, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ SUCCESS with extended data!', response2.data);
    } catch (error2) {
      console.log('❌ Still failed with extended data:', error2.response?.data || error2.message);
    }
  }
}

quickTimesheetTest().catch(console.error);
