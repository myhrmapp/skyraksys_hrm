const { sequelize } = require('./models');
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');

async function setupComprehensiveTestData() {
  console.log('Setting up comprehensive test data...\n');
  
  try {
    // Get models
    const { User, Employee, Department, Position, LeaveType, LeaveBalance, RefreshToken } = sequelize.models;
    
    // Clear existing data (except system data)
    console.log('Cleaning existing test data...');
    await RefreshToken.destroy({ where: {} });
    await LeaveBalance.destroy({ where: {} });
    
    // Delete employees and users that match our test data
    const testEmails = [
      'admin@test.com', 'hr@test.com', 'manager@test.com', 'employee@test.com',
      'priya.sharma@test.com', 'rajesh.kumar@test.com'
    ];
    
    await Employee.destroy({ where: { email: testEmails }, force: true });
    await User.destroy({ where: { email: testEmails }, force: true });
    
    // Clear test departments and positions
    await Department.destroy({ 
      where: { 
        name: ['Engineering', 'Human Resources', 'Sales & Marketing', 'Finance & Accounting'] 
      }, 
      force: true 
    });
    await Position.destroy({ 
      where: { 
        title: ['Software Engineer', 'Senior Software Engineer', 'HR Manager', 'Sales Executive', 'Accountant', 'System Administrator'] 
      }, 
      force: true 
    });
    
    // Create Departments
    console.log('Creating departments...');
    const departmentData = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Engineering',
        description: 'Software development and technical operations'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Human Resources',
        description: 'HR management and employee relations'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Sales & Marketing',
        description: 'Sales operations and marketing campaigns'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Finance & Accounting',
        description: 'Financial management and accounting'
      }
    ];
    
    const departments = [];
    for (const deptData of departmentData) {
      try {
        const dept = await Department.create(deptData);
        departments.push(dept);
        console.log(`✓ Created department: ${dept.name}`);
      } catch (error) {
        // Try to find existing department
        const existingDept = await Department.findOne({ where: { name: deptData.name } });
        if (existingDept) {
          departments.push(existingDept);
          console.log(`✓ Using existing department: ${existingDept.name}`);
        } else {
          console.log(`✗ Failed to create department: ${deptData.name} - ${error.message}`);
        }
      }
    }
    
    // Create Positions
    console.log('Creating positions...');
    const positionData = [
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        title: 'Software Engineer',
        description: 'Develops and maintains software applications',
        level: 'Mid',
        departmentId: '550e8400-e29b-41d4-a716-446655440001' // Engineering
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        title: 'Senior Software Engineer',
        description: 'Senior developer with team lead responsibilities',
        level: 'Senior',
        departmentId: '550e8400-e29b-41d4-a716-446655440001' // Engineering
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440003',
        title: 'HR Manager',
        description: 'Manages human resources and employee relations',
        level: 'Manager',
        departmentId: '550e8400-e29b-41d4-a716-446655440002' // Human Resources
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440004',
        title: 'Sales Executive',
        description: 'Handles sales activities and client relationships',
        level: 'Mid',
        departmentId: '550e8400-e29b-41d4-a716-446655440003' // Sales & Marketing
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440005',
        title: 'Accountant',
        description: 'Manages financial records and transactions',
        level: 'Mid',
        departmentId: '550e8400-e29b-41d4-a716-446655440004' // Finance & Accounting
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440006',
        title: 'System Administrator',
        description: 'Manages IT infrastructure and systems',
        level: 'Senior',
        departmentId: '550e8400-e29b-41d4-a716-446655440001' // Engineering
      }
    ];
    
    const positions = [];
    for (const posData of positionData) {
      try {
        const pos = await Position.create(posData);
        positions.push(pos);
        console.log(`✓ Created position: ${pos.title}`);
      } catch (error) {
        // Try to find existing position
        const existingPos = await Position.findOne({ where: { title: posData.title } });
        if (existingPos) {
          positions.push(existingPos);
          console.log(`✓ Using existing position: ${existingPos.title}`);
        } else {
          console.log(`✗ Failed to create position: ${posData.title} - ${error.message}`);
        }
      }
    }
    
    // Create Leave Types
    console.log('Creating leave types...');
    const leaveTypes = await LeaveType.bulkCreate([
      {
        id: '770e8400-e29b-41d4-a716-446655440001',
        name: 'Annual Leave',
        description: 'Yearly vacation leave',
        daysAllowed: 21,
        carryForward: true,
        maxCarryForward: 5
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440002',
        name: 'Sick Leave',
        description: 'Medical leave for illness',
        daysAllowed: 12,
        carryForward: false,
        maxCarryForward: 0
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440003',
        name: 'Maternity Leave',
        description: 'Maternity leave for new mothers',
        daysAllowed: 180,
        carryForward: false,
        maxCarryForward: 0
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440004',
        name: 'Paternity Leave',
        description: 'Paternity leave for new fathers',
        daysAllowed: 15,
        carryForward: false,
        maxCarryForward: 0
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440005',
        name: 'Casual Leave',
        description: 'Short-term personal leave',
        daysAllowed: 10,
        carryForward: false,
        maxCarryForward: 0
      }
    ], { updateOnDuplicate: ['name', 'description', 'daysAllowed', 'carryForward', 'maxCarryForward'] });
    
    // Create Test Users and Employees
    console.log('Creating test users and employees...');
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const testUserData = [
      {
        user: {
          id: '440e8400-e29b-41d4-a716-446655440001',
          email: 'admin@test.com',
          password: hashedPassword,
          role: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          isActive: true,
          isEmailVerified: true
        },
        employee: {
          id: '330e8400-e29b-41d4-a716-446655440001',
          employeeId: 'ADM001',
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@test.com',
          phone: '9876543210',
          hireDate: '2023-01-01',
          status: 'Active',
          departmentId: '550e8400-e29b-41d4-a716-446655440002', // HR
          positionId: '660e8400-e29b-41d4-a716-446655440006', // System Admin
          userId: '440e8400-e29b-41d4-a716-446655440001',
          // Personal Details
          dateOfBirth: '1985-06-15',
          gender: 'Male',
          address: '123 Admin Street, Tech Park',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400001',
          nationality: 'Indian',
          maritalStatus: 'Married',
          // Employment Details
          employmentType: 'Full-time',
          workLocation: 'Mumbai HQ',
          joiningDate: '2023-01-01',
          confirmationDate: '2023-07-01',
          probationPeriod: 6,
          noticePeriod: 30,
          // Emergency Contact
          emergencyContactName: 'Jane Admin',
          emergencyContactPhone: '9876543211',
          emergencyContactRelation: 'Spouse',
          // Statutory Information
          aadhaarNumber: '123456789001',
          panNumber: 'ADMIN1234A',
          uanNumber: '123456789001',
          pfNumber: 'PF/ADM/001',
          esiNumber: 'ESI/ADM/001',
          // Bank Details
          bankName: 'State Bank of India',
          bankAccountNumber: '1234567890001',
          ifscCode: 'SBIN0001234',
          bankBranch: 'Mumbai Main Branch',
          accountHolderName: 'Admin User'
        }
      },
      {
        user: {
          id: '440e8400-e29b-41d4-a716-446655440002',
          email: 'hr@test.com',
          password: hashedPassword,
          role: 'hr',
          firstName: 'Sarah',
          lastName: 'Johnson',
          isActive: true,
          isEmailVerified: true
        },
        employee: {
          id: '330e8400-e29b-41d4-a716-446655440002',
          employeeId: 'HR001',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'hr@test.com',
          phone: '9876543212',
          hireDate: '2023-02-01',
          status: 'Active',
          departmentId: '550e8400-e29b-41d4-a716-446655440002', // HR
          positionId: '660e8400-e29b-41d4-a716-446655440003', // HR Manager
          userId: '440e8400-e29b-41d4-a716-446655440002',
          // Personal Details
          dateOfBirth: '1988-09-22',
          gender: 'Female',
          address: '456 HR Colony, Business District',
          city: 'Delhi',
          state: 'Delhi',
          pinCode: '110001',
          nationality: 'Indian',
          maritalStatus: 'Single',
          // Employment Details
          employmentType: 'Full-time',
          workLocation: 'Delhi Office',
          joiningDate: '2023-02-01',
          confirmationDate: '2023-08-01',
          probationPeriod: 6,
          noticePeriod: 30,
          // Emergency Contact
          emergencyContactName: 'Robert Johnson',
          emergencyContactPhone: '9876543213',
          emergencyContactRelation: 'Father',
          // Statutory Information
          aadhaarNumber: '123456789002',
          panNumber: 'HRMAN1234B',
          uanNumber: '123456789002',
          pfNumber: 'PF/HR/001',
          esiNumber: 'ESI/HR/001',
          // Bank Details
          bankName: 'HDFC Bank',
          bankAccountNumber: '1234567890002',
          ifscCode: 'HDFC0001234',
          bankBranch: 'Delhi Corporate Branch',
          accountHolderName: 'Sarah Johnson'
        }
      },
      {
        user: {
          id: '440e8400-e29b-41d4-a716-446655440003',
          email: 'manager@test.com',
          password: hashedPassword,
          role: 'manager',
          firstName: 'Mike',
          lastName: 'Wilson',
          isActive: true,
          isEmailVerified: true
        },
        employee: {
          id: '330e8400-e29b-41d4-a716-446655440003',
          employeeId: 'MGR001',
          firstName: 'Mike',
          lastName: 'Wilson',
          email: 'manager@test.com',
          phone: '9876543213',
          hireDate: '2023-01-15',
          status: 'Active',
          departmentId: '550e8400-e29b-41d4-a716-446655440001', // Engineering
          positionId: '660e8400-e29b-41d4-a716-446655440002', // Senior Software Engineer
          userId: '440e8400-e29b-41d4-a716-446655440003',
          // Personal Details
          dateOfBirth: '1982-11-30',
          gender: 'Male',
          address: '789 Manager Towers, IT Corridor',
          city: 'Bangalore',
          state: 'Karnataka',
          pinCode: '560001',
          nationality: 'Indian',
          maritalStatus: 'Married',
          // Employment Details
          employmentType: 'Full-time',
          workLocation: 'Bangalore Tech Park',
          joiningDate: '2023-01-15',
          confirmationDate: '2023-07-15',
          probationPeriod: 6,
          noticePeriod: 60,
          // Emergency Contact
          emergencyContactName: 'Lisa Wilson',
          emergencyContactPhone: '9876543214',
          emergencyContactRelation: 'Spouse',
          // Statutory Information
          aadhaarNumber: '123456789003',
          panNumber: 'MGRMK1234C',
          uanNumber: '123456789003',
          pfNumber: 'PF/MGR/001',
          esiNumber: 'ESI/MGR/001',
          // Bank Details
          bankName: 'ICICI Bank',
          bankAccountNumber: '1234567890003',
          ifscCode: 'ICIC0001234',
          bankBranch: 'Bangalore Electronic City',
          accountHolderName: 'Mike Wilson'
        }
      },
      {
        user: {
          id: '440e8400-e29b-41d4-a716-446655440004',
          email: 'employee@test.com',
          password: hashedPassword,
          role: 'employee',
          firstName: 'John',
          lastName: 'Doe',
          isActive: true,
          isEmailVerified: true
        },
        employee: {
          id: '330e8400-e29b-41d4-a716-446655440004',
          employeeId: 'EMP001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'employee@test.com',
          phone: '9876543214',
          hireDate: '2024-03-01',
          status: 'Active',
          departmentId: '550e8400-e29b-41d4-a716-446655440001', // Engineering
          positionId: '660e8400-e29b-41d4-a716-446655440001', // Software Engineer
          userId: '440e8400-e29b-41d4-a716-446655440004',
          managerId: '330e8400-e29b-41d4-a716-446655440003', // Reports to Mike Wilson
          // Personal Details
          dateOfBirth: '1995-04-12',
          gender: 'Male',
          address: '321 Employee Heights, Software City',
          city: 'Pune',
          state: 'Maharashtra',
          pinCode: '411001',
          nationality: 'Indian',
          maritalStatus: 'Single',
          // Employment Details
          employmentType: 'Full-time',
          workLocation: 'Pune Development Center',
          joiningDate: '2024-03-01',
          confirmationDate: '2024-09-01',
          probationPeriod: 6,
          noticePeriod: 30,
          // Emergency Contact
          emergencyContactName: 'Mary Doe',
          emergencyContactPhone: '9876543215',
          emergencyContactRelation: 'Mother',
          // Statutory Information
          aadhaarNumber: '123456789004',
          panNumber: 'EMPJD1234D',
          uanNumber: '123456789004',
          pfNumber: 'PF/EMP/001',
          esiNumber: 'ESI/EMP/001',
          // Bank Details
          bankName: 'Axis Bank',
          bankAccountNumber: '1234567890004',
          ifscCode: 'UTIB0001234',
          bankBranch: 'Pune FC Road Branch',
          accountHolderName: 'John Doe'
        }
      },
      // Additional employees without user accounts
      {
        user: null,
        employee: {
          id: '330e8400-e29b-41d4-a716-446655440005',
          employeeId: 'EMP002',
          firstName: 'Priya',
          lastName: 'Sharma',
          email: 'priya.sharma@test.com',
          phone: '9876543215',
          hireDate: '2024-04-01',
          status: 'Active',
          departmentId: '550e8400-e29b-41d4-a716-446655440003', // Sales
          positionId: '660e8400-e29b-41d4-a716-446655440004', // Sales Executive
          managerId: '330e8400-e29b-41d4-a716-446655440003', // Reports to Mike Wilson
          // Personal Details
          dateOfBirth: '1992-07-18',
          gender: 'Female',
          address: '654 Sales Avenue, Commercial Complex',
          city: 'Hyderabad',
          state: 'Telangana',
          pinCode: '500001',
          nationality: 'Indian',
          maritalStatus: 'Married',
          // Employment Details
          employmentType: 'Full-time',
          workLocation: 'Hyderabad Sales Office',
          joiningDate: '2024-04-01',
          confirmationDate: '2024-10-01',
          probationPeriod: 6,
          noticePeriod: 30,
          // Emergency Contact
          emergencyContactName: 'Raj Sharma',
          emergencyContactPhone: '9876543216',
          emergencyContactRelation: 'Spouse',
          // Statutory Information
          aadhaarNumber: '123456789005',
          panNumber: 'EMPPS1234E',
          uanNumber: '123456789005',
          pfNumber: 'PF/EMP/002',
          esiNumber: 'ESI/EMP/002',
          // Bank Details
          bankName: 'Bank of Baroda',
          bankAccountNumber: '1234567890005',
          ifscCode: 'BARB0001234',
          bankBranch: 'Hyderabad Begumpet Branch',
          accountHolderName: 'Priya Sharma'
        }
      },
      {
        user: null,
        employee: {
          id: '330e8400-e29b-41d4-a716-446655440006',
          employeeId: 'EMP003',
          firstName: 'Rajesh',
          lastName: 'Kumar',
          email: 'rajesh.kumar@test.com',
          phone: '9876543216',
          hireDate: '2024-05-15',
          status: 'Active',
          departmentId: '550e8400-e29b-41d4-a716-446655440004', // Finance
          positionId: '660e8400-e29b-41d4-a716-446655440005', // Accountant
          managerId: '330e8400-e29b-41d4-a716-446655440002', // Reports to Sarah (HR Manager acts as Finance head)
          // Personal Details
          dateOfBirth: '1990-12-05',
          gender: 'Male',
          address: '987 Finance Plaza, Banking District',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pinCode: '600001',
          nationality: 'Indian',
          maritalStatus: 'Married',
          // Employment Details
          employmentType: 'Full-time',
          workLocation: 'Chennai Finance Center',
          joiningDate: '2024-05-15',
          confirmationDate: '2024-11-15',
          probationPeriod: 6,
          noticePeriod: 30,
          // Emergency Contact
          emergencyContactName: 'Sunita Kumar',
          emergencyContactPhone: '9876543217',
          emergencyContactRelation: 'Spouse',
          // Statutory Information
          aadhaarNumber: '123456789006',
          panNumber: 'EMPRK1234F',
          uanNumber: '123456789006',
          pfNumber: 'PF/EMP/003',
          esiNumber: 'ESI/EMP/003',
          // Bank Details
          bankName: 'Canara Bank',
          bankAccountNumber: '1234567890006',
          ifscCode: 'CNRB0001234',
          bankBranch: 'Chennai T.Nagar Branch',
          accountHolderName: 'Rajesh Kumar'
        }
      }
    ];
    
    // Create users and employees
    for (const data of testUserData) {
      if (data.user) {
        await User.create(data.user);
        console.log(`Created user: ${data.user.email} (${data.user.role})`);
      }
      
      await Employee.create(data.employee);
      console.log(`Created employee: ${data.employee.firstName} ${data.employee.lastName} (${data.employee.employeeId})`);
    }
    
    // Create leave balances for all employees
    console.log('Creating leave balances...');
    const employees = await Employee.findAll();
    const allLeaveTypes = await LeaveType.findAll();
    
    for (const employee of employees) {
      for (const leaveType of allLeaveTypes) {
        await LeaveBalance.create({
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          totalDays: leaveType.daysAllowed,
          usedDays: Math.floor(Math.random() * 5), // Random used days 0-4
          remainingDays: leaveType.daysAllowed - Math.floor(Math.random() * 5),
          year: new Date().getFullYear()
        });
      }
    }
    
    console.log(`\n✅ Test data setup complete!`);
    console.log(`Created:`);
    console.log(`- ${departments.length} departments`);
    console.log(`- ${positions.length} positions`);
    console.log(`- ${leaveTypes.length} leave types`);
    console.log(`- 4 users with login accounts`);
    console.log(`- 6 employees total (including 2 without login)`);
    console.log(`- Leave balances for all employees`);
    console.log(`\nTest accounts:`);
    console.log(`- admin@test.com (password: admin123) - System Administrator`);
    console.log(`- hr@test.com (password: admin123) - HR Manager`);
    console.log(`- manager@test.com (password: admin123) - Engineering Manager`);
    console.log(`- employee@test.com (password: admin123) - Software Engineer`);
    
  } catch (error) {
    console.error('Error setting up test data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupComprehensiveTestData()
    .then(() => {
      console.log('\nTest data setup completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\nFailed to setup test data:', error);
      process.exit(1);
    });
}

module.exports = { setupComprehensiveTestData };
