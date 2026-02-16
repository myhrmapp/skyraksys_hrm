const { Sequelize } = require('sequelize');
require('dotenv').config();

// SAFETY: Prevent accidental execution in production
if (process.env.NODE_ENV === 'production') {
  console.error('\n❌ FATAL: reset-database.js cannot be run in production!');
  console.error('   Set NODE_ENV to development or test to use this script.');
  process.exit(1);
}

// Database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'skyraksys_hrm',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    dialect: 'postgres',
    logging: console.log,
    define: {
      freezeTableName: true,
      timestamps: true,
      paranoid: true
    }
  }
);

async function resetDatabase() {
  console.log('🔄 STARTING DATABASE RESET AND RESEED\n');

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Force sync - this will drop and recreate all tables
    console.log('\n🗑️  Dropping all tables...');
    await sequelize.drop();
    console.log('✅ All tables dropped successfully');

    console.log('\n🔄 Recreating database schema...');
    await sequelize.sync({ force: true });
    console.log('✅ Database schema recreated');

    // Initialize models
    const db = require('./models');
    await db.sequelize.sync({ force: true });
    console.log('✅ Models synchronized');

    console.log('\n🔄 Creating fresh demo data...');
    
    // Create departments
    const { Department, Position, User, Employee, LeaveType, LeaveBalance, Project, Task } = db;
    
    const departments = await Department.bulkCreate([
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Engineering',
        description: 'Software development and technical teams',
        isActive: true
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Human Resources',
        description: 'HR management and employee relations',
        isActive: true
      }
    ]);
    console.log('✅ Departments created');

    // Create positions
    const positions = await Position.bulkCreate([
      {
        id: '33333333-3333-3333-3333-333333333333',
        title: 'Software Engineer',
        description: 'Full-stack software development',
        level: 'Mid',
        departmentId: '11111111-1111-1111-1111-111111111111',
        isActive: true
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        title: 'HR Manager',
        description: 'Human resources management',
        level: 'Senior',
        departmentId: '22222222-2222-2222-2222-222222222222',
        isActive: true
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        title: 'Senior Software Engineer',
        description: 'Senior level software development and mentoring',
        level: 'Senior',
        departmentId: '11111111-1111-1111-1111-111111111111',
        isActive: true
      }
    ]);
    console.log('✅ Positions created');

    // Create leave types
    const leaveTypes = await LeaveType.bulkCreate([
      {
        id: '66666666-6666-6666-6666-666666666666',
        name: 'Annual Leave',
        description: 'Yearly vacation days',
        maxDaysPerYear: 20,
        carryForward: true,
        maxCarryForwardDays: 5,
        isActive: true
      },
      {
        id: '77777777-7777-7777-7777-777777777777',
        name: 'Sick Leave',
        description: 'Medical leave for illness',
        maxDaysPerYear: 10,
        carryForward: false,
        maxCarryForwardDays: 0,
        isActive: true
      },
      {
        id: '88888888-8888-8888-8888-888888888888',
        name: 'Personal Leave',
        description: 'Personal time off',
        maxDaysPerYear: 5,
        carryForward: false,
        maxCarryForwardDays: 0,
        isActive: true
      }
    ]);
    console.log('✅ Leave types created');

    // Create users with strong passwords
    const bcrypt = require('bcryptjs');
    const defaultDevPassword = process.env.DEV_DEFAULT_PASSWORD || 'DevReset@2026!';
    const adminPassword = await bcrypt.hash(defaultDevPassword, 12);
    const hrPassword = await bcrypt.hash(defaultDevPassword, 12);
    const employeePassword = await bcrypt.hash(defaultDevPassword, 12);
    console.log(`ℹ️  All users created with password from DEV_DEFAULT_PASSWORD env var (or default dev password)`);

    const users = await User.bulkCreate([
      {
        id: '99999999-9999-9999-9999-999999999999',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@company.com',
        password: adminPassword,
        role: 'admin',
        isActive: true
      },
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        firstName: 'HR',
        lastName: 'Manager',
        email: 'hr@company.com',
        password: hrPassword,
        role: 'hr',
        isActive: true
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        firstName: 'John',
        lastName: 'Doe',
        email: 'employee@company.com',
        password: employeePassword,
        role: 'employee',
        isActive: true
      }
    ]);
    console.log('✅ Users created');

    // Create employees
    const employees = await Employee.bulkCreate([
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        employeeId: 'EMP001',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@company.com',
        hireDate: '2024-01-01',
        status: 'Active',
        nationality: 'Indian',
        employmentType: 'Full-time',
        probationPeriod: 0,
        noticePeriod: 1,
        userId: '99999999-9999-9999-9999-999999999999',
        departmentId: '11111111-1111-1111-1111-111111111111',
        positionId: '55555555-5555-5555-5555-555555555555'
      },
      {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        employeeId: 'EMP002',
        firstName: 'HR',
        lastName: 'Manager',
        email: 'hr@company.com',
        hireDate: '2024-01-15',
        status: 'Active',
        nationality: 'Indian',
        employmentType: 'Full-time',
        probationPeriod: 0,
        noticePeriod: 1,
        userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        departmentId: '22222222-2222-2222-2222-222222222222',
        positionId: '44444444-4444-4444-4444-444444444444'
      },
      {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        employeeId: 'EMP003',
        firstName: 'John',
        lastName: 'Doe',
        email: 'employee@company.com',
        hireDate: '2024-02-01',
        status: 'Active',
        nationality: 'Indian',
        employmentType: 'Full-time',
        probationPeriod: 6,
        noticePeriod: 1,
        userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        departmentId: '11111111-1111-1111-1111-111111111111',
        positionId: '33333333-3333-3333-3333-333333333333'
      }
    ]);
    console.log('✅ Employees created');

    // Create leave balances for each employee
    const currentYear = new Date().getFullYear();
    const leaveBalances = [];
    
    for (const employee of employees) {
      for (const leaveType of leaveTypes) {
        leaveBalances.push({
          id: `${employee.id.substring(0, 8)}-${leaveType.id.substring(0, 4)}-${currentYear}-${Math.random().toString(36).substring(2, 8)}`,
          year: currentYear,
          totalAccrued: leaveType.maxDaysPerYear,
          totalTaken: 0,
          totalPending: 0,
          balance: leaveType.maxDaysPerYear,
          carryForward: 0,
          employeeId: employee.id,
          leaveTypeId: leaveType.id
        });
      }
    }
    
    await LeaveBalance.bulkCreate(leaveBalances);
    console.log('✅ Leave balances created');

    // Create demo projects
    const projects = await Project.bulkCreate([
      {
        id: '12345678-1234-1234-1234-123456789001',
        name: 'Website Redesign',
        description: 'Complete website redesign and modernization',
        status: 'Active',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        isActive: true
      },
      {
        id: '12345678-1234-1234-1234-123456789002',
        name: 'Mobile Application',
        description: 'Cross-platform mobile app development',
        status: 'Active',
        startDate: '2025-03-01',
        endDate: '2025-10-31',
        isActive: true
      },
      {
        id: '12345678-1234-1234-1234-123456789003',
        name: 'Data Analytics Platform',
        description: 'Business intelligence and analytics dashboard',
        status: 'Active',
        startDate: '2025-06-01',
        endDate: '2025-12-31',
        isActive: true
      }
    ]);
    console.log('✅ Projects created');

    // Create demo tasks
    const tasks = await Task.bulkCreate([
      // Website Redesign Tasks
      {
        id: '12345678-1234-1234-1234-123456789011',
        name: 'Frontend Development',
        description: 'React.js frontend development and UI implementation',
        status: 'In Progress',
        priority: 'High',
        estimatedHours: 120,
        actualHours: 0,
        availableToAll: false,
        projectId: '12345678-1234-1234-1234-123456789001',
        assignedTo: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        isActive: true
      },
      {
        id: '12345678-1234-1234-1234-123456789012',
        name: 'Backend API Development',
        description: 'Node.js backend API development and database integration',
        status: 'Not Started',
        priority: 'High',
        estimatedHours: 80,
        actualHours: 0,
        availableToAll: true,
        projectId: '12345678-1234-1234-1234-123456789001',
        isActive: true
      },
      {
        id: '12345678-1234-1234-1234-123456789013',
        name: 'Database Design',
        description: 'Database schema design and optimization',
        status: 'Completed',
        priority: 'Medium',
        estimatedHours: 40,
        actualHours: 35,
        availableToAll: false,
        projectId: '12345678-1234-1234-1234-123456789001',
        assignedTo: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        isActive: true
      },
      
      // Mobile App Tasks
      {
        id: '12345678-1234-1234-1234-123456789014',
        name: 'iOS Development',
        description: 'Native iOS app development using Swift',
        status: 'Not Started',
        priority: 'High',
        estimatedHours: 100,
        actualHours: 0,
        availableToAll: true,
        projectId: '12345678-1234-1234-1234-123456789002',
        isActive: true
      },
      {
        id: '12345678-1234-1234-1234-123456789015',
        name: 'Android Development',
        description: 'Native Android app development using Kotlin',
        status: 'In Progress',
        priority: 'High',
        estimatedHours: 100,
        actualHours: 25,
        availableToAll: false,
        projectId: '12345678-1234-1234-1234-123456789002',
        assignedTo: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        isActive: true
      },
      
      // Analytics Platform Tasks
      {
        id: '12345678-1234-1234-1234-123456789016',
        name: 'Data Pipeline Setup',
        description: 'ETL pipeline development for data processing',
        status: 'Not Started',
        priority: 'Medium',
        estimatedHours: 60,
        actualHours: 0,
        availableToAll: true,
        projectId: '12345678-1234-1234-1234-123456789003',
        isActive: true
      },
      {
        id: '12345678-1234-1234-1234-123456789017',
        name: 'Dashboard Development',
        description: 'Interactive business intelligence dashboard',
        status: 'Not Started',
        priority: 'Medium',
        estimatedHours: 80,
        actualHours: 0,
        availableToAll: false,
        projectId: '12345678-1234-1234-1234-123456789003',
        assignedTo: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        isActive: true
      }
    ]);
    console.log('✅ Tasks created');

    console.log('\n🎉 DATABASE RESET AND RESEED COMPLETED SUCCESSFULLY!\n');
    console.log('📊 Summary of created data:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   👨‍💼 Employees: ${employees.length}`);
    console.log(`   🏢 Departments: ${departments.length}`);
    console.log(`   💼 Positions: ${positions.length}`);
    console.log(`   🏖️  Leave Types: ${leaveTypes.length}`);
    console.log(`   📈 Leave Balances: ${leaveBalances.length}`);
    console.log(`   📁 Projects: ${projects.length}`);
    console.log(`   📋 Tasks: ${tasks.length}`);

    const displayPwd = process.env.DEV_DEFAULT_PASSWORD ? '(from DEV_DEFAULT_PASSWORD env)' : 'DevReset@2026!';
    console.log('\n🔐 Login Credentials:');
    console.log(`   Admin: admin@company.com / ${displayPwd}`);
    console.log(`   HR: hr@company.com / ${displayPwd}`);
    console.log(`   Employee: employee@company.com / ${displayPwd}`);

  } catch (error) {
    console.error('❌ Database reset failed:', error);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
}

// Run the reset
resetDatabase();