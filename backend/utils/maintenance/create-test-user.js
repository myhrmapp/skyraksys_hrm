// Create test user for timesheet testing
require('dotenv').config();
const bcrypt = require('bcryptjs'); // Use bcryptjs instead
const { User, Employee, Department } = require('./models');

if (process.env.NODE_ENV === 'production') {
  console.error('\u274c ERROR: This script must NOT be run in production!');
  process.exit(1);
}

async function createTestUser() {
  console.log('\n=== Creating Test User ===\n');

  try {
    // Create or get department
    let department = await Department.findOne({ where: { name: 'IT' } });
    if (!department) {
      department = await Department.create({
        name: 'IT',
        description: 'Information Technology',
        isActive: true
      });
      console.log('✅ Created IT department');
    }

    // Check if test user already exists
    let user = await User.findOne({ where: { email: 'test@skyraksys.com' } });
    if (user) {
      console.log('✅ Test user already exists');
    } else {
      // Create test user
      const defaultPwd = process.env.DEV_DEFAULT_PASSWORD || 'DevReset@2026!';
      const hashedPassword = await bcrypt.hash(defaultPwd, 12);
      user = await User.create({
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test@skyraksys.com',
        password: hashedPassword,
        role: 'employee',
        isActive: true
      });
      console.log('✅ Created test user');
    }

    // Check if employee exists for this user
    let employee = await Employee.findOne({ where: { userId: user.id } });
    if (!employee) {
      employee = await Employee.create({
        userId: user.id,
        employeeId: 'EMP001',
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test@skyraksys.com',
        departmentId: department.id,
        status: 'Active',
        hireDate: new Date(),
        joiningDate: new Date()
      });
      console.log('✅ Created test employee');
    } else {
      console.log('✅ Test employee already exists');
    }

    console.log('\n📋 Test User Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${process.env.DEV_DEFAULT_PASSWORD ? '(from DEV_DEFAULT_PASSWORD env)' : 'DevReset@2026!'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Employee ID: ${employee.employeeId}`);
    console.log(`   Name: ${employee.firstName} ${employee.lastName}`);

    return { user, employee };

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    throw error;
  }
}

createTestUser().then(() => {
  console.log('\n🎉 Test user creation completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});