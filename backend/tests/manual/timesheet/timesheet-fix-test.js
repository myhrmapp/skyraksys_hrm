const axios = require('axios');
const dayjs = require('dayjs');

const BASE_URL = 'http://localhost:8080/api';
let token = null;

async function quickTimesheetFix() {
  console.log('🔧 TIMESHEET ISSUE DIAGNOSIS\n');
  
  // Login
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
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
  console.log(`✅ Employee: ${employee.firstName} (ID: ${employee.id})`);
  
  // Check if projects exist via API
  try {
    const projectsResponse = await axios.get(`${BASE_URL}/timesheets/meta/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (projectsResponse.data.success && projectsResponse.data.data.length > 0) {
      const project = projectsResponse.data.data[0];
      console.log(`✅ Project found via API: ${project.name} (ID: ${project.id})`);
      
      // Try creating timesheet with API project
      const timesheetData = {
        employeeId: employee.id,
        projectId: project.id,
        workDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
        hoursWorked: 8,
        description: 'Testing timesheet with API project'
      };
      
      console.log('📝 Creating timesheet:', JSON.stringify(timesheetData, null, 2));
      
      try {
        const response = await axios.post(`${BASE_URL}/timesheets`, timesheetData, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ SUCCESS! Timesheet created:', response.data);
      } catch (error) {
        console.log('❌ FAILED:', error.response?.data || error.message);
      }
      
    } else {
      console.log('⚠️  No projects found via API, creating one...');
      
      // Create project directly in database
      const { sequelize } = require('./models');
      const Project = sequelize.models.Project;
      
      let project = await Project.findOne({ where: { name: 'Fix Test Project' } });
      if (!project) {
        project = await Project.create({
          name: 'Fix Test Project',
          description: 'Project for fixing timesheet issues',
          status: 'Active',
          isActive: true
        });
      }
      console.log(`✅ Project created in DB: ${project.name} (ID: ${project.id})`);
      
      // Now try creating timesheet
      const timesheetData = {
        employeeId: employee.id,
        projectId: project.id,
        workDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
        hoursWorked: 8,
        description: 'Testing timesheet with DB project'
      };
      
      console.log('📝 Creating timesheet:', JSON.stringify(timesheetData, null, 2));
      
      try {
        const response = await axios.post(`${BASE_URL}/timesheets`, timesheetData, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ SUCCESS! Timesheet created:', response.data);
      } catch (error) {
        console.log('❌ FAILED with DB project:', error.response?.data || error.message);
        
        // Check the specific validation error
        if (error.response?.data?.details) {
          console.log('📋 Validation details:', error.response.data.details);
        }
        
        // Try with even simpler data
        const simpleData = {
          employeeId: employee.id,
          projectId: project.id,
          workDate: '2025-08-06',
          hoursWorked: 8,
          description: 'Simple test'
        };
        
        console.log('📝 Trying with simple data:', JSON.stringify(simpleData, null, 2));
        
        try {
          const response2 = await axios.post(`${BASE_URL}/timesheets`, simpleData, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('✅ SUCCESS with simple data!', response2.data);
        } catch (error2) {
          console.log('❌ Still failed with simple data:', error2.response?.data || error2.message);
        }
      }
    }
  } catch (error) {
    console.log('❌ Error getting projects:', error.message);
  }
}

quickTimesheetFix().catch(console.error);
