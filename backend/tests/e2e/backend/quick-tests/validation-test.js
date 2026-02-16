const axios = require('axios');
const { sequelize } = require('./models');

async function directValidationCheck() {
  console.log('🔍 DIRECT VALIDATION CHECK\n');
  
  const Employee = sequelize.models.Employee;
  const Project = sequelize.models.Project;
  const Task = sequelize.models.Task;
  const Timesheet = sequelize.models.Timesheet;
  
  // Get data directly from database
  const employee = await Employee.findOne();
  const project = await Project.findOne({ where: { isActive: true } });
  const task = await Task.findOne({ where: { isActive: true } });
  
  console.log('📋 Database Records:');
  console.log(`Employee: ${employee.firstName} ${employee.lastName} (${employee.id})`);
  console.log(`Project: ${project.name} (${project.id}, Active: ${project.isActive})`);
  console.log(`Task: ${task ? task.name + ' (' + task.id + ', Active: ' + task.isActive + ')' : 'None'}`);
  
  // Test direct model creation
  console.log('\n🧪 Direct Model Creation Test:');
  try {
    const timesheet = await Timesheet.create({
      employeeId: employee.id,
      projectId: project.id,
      workDate: '2025-07-08',
      hoursWorked: 8,
      description: 'Direct model test'
    });
    console.log('✅ Direct model creation SUCCESS:', timesheet.id);
  } catch (error) {
    console.log('❌ Direct model creation FAILED:', error.message);
    if (error.errors) {
      error.errors.forEach(err => console.log(`  - ${err.path}: ${err.message}`));
    }
  }
  
  // Test API call with detailed error
  console.log('\n🧪 API Call Test:');
  try {
    const loginResponse = await axios.post('http://localhost:8080/api/auth/login', {
      email: 'admin@test.com',
      password: 'admin123'
    });
    const token = loginResponse.data.data.accessToken;
    
    const response = await axios.post('http://localhost:8080/api/timesheets', {
      employeeId: employee.id,
      projectId: project.id,
      workDate: '2025-07-07',
      hoursWorked: 8,
      description: 'API test entry'
    }, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API call SUCCESS:', response.data.message);
    return true;
    
  } catch (error) {
    console.log('❌ API call FAILED:', error.response?.data?.message || error.message);
    
    if (error.response?.data) {
      console.log('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Check if it's a server error and look at constraints
    if (error.response?.status === 500) {
      console.log('\n📋 Checking database constraints...');
      const queryInterface = sequelize.getQueryInterface();
      const indexes = await queryInterface.showIndex('timesheets');
      console.log('Current indexes:');
      indexes.forEach(idx => {
        console.log(`- ${idx.name}: unique=${idx.unique}, fields=${JSON.stringify(idx.fields)}`);
      });
    }
    return false;
  }
}

directValidationCheck().catch(console.error);
