require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User, Employee, Department, Position } = require('./models');

if (process.env.NODE_ENV === 'production') {
  console.error('\u274c ERROR: This script must NOT be run in production!');
  process.exit(1);
}

async function setupProperManagerHierarchy() {
  try {
    console.log('=== Setting Up Proper Manager Hierarchy & User Accounts ===\n');
    
    // Step 1: Get all employees and their current user data
    const employees = await Employee.findAll({
      include: [{
        model: User,
        as: 'user',
        required: false
      }, {
        model: Position,
        as: 'position',
        required: false
      }, {
        model: Department,
        as: 'department',
        required: false
      }]
    });
    
    console.log(`Found ${employees.length} employees to process\n`);
    
    // Step 2: Create/Update user accounts for all employees
    for (const employee of employees) {
      console.log(`Processing ${employee.firstName} ${employee.lastName}...`);
      
      let user = employee.user;
      let userRole = 'employee'; // Default role
      
      // Determine role based on position or existing data
      if (employee.position) {
        const positionTitle = employee.position.title.toLowerCase();
        if (positionTitle.includes('manager') || positionTitle.includes('head') || positionTitle.includes('lead')) {
          userRole = 'manager';
        } else if (positionTitle.includes('hr')) {
          userRole = 'hr';
        } else if (positionTitle.includes('admin') || positionTitle.includes('administrator')) {
          userRole = 'admin';
        }
      }
      
      // Create or update user account
      if (!user) {
        console.log(`  Creating new user account with role: ${userRole}`);
        
        // Generate default password
        const defaultPassword = process.env.DEV_DEFAULT_PASSWORD || 'DevReset@2026!';
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);
        
        user = await User.create({
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          password: hashedPassword,
          role: userRole,
          isActive: true,
          passwordChangedAt: new Date()
        });
        
        // Link employee to user
        await employee.update({ userId: user.id });
        
        console.log(`  ✅ User created - Email: ${employee.email}, Password: (default), Role: ${userRole}`);
      } else {
        // Update existing user role if needed
        if (user.role !== userRole) {
          await user.update({ role: userRole });
          console.log(`  ✅ Updated user role from ${user.role} to ${userRole}`);
        } else {
          console.log(`  ✅ User already exists with correct role: ${userRole}`);
        }
        
        // Ensure password is set (update if empty or default)
        if (!user.password || user.password.length < 10) {
          const defaultPassword = process.env.DEV_DEFAULT_PASSWORD || 'DevReset@2026!';
          const hashedPassword = await bcrypt.hash(defaultPassword, 12);
          await user.update({ 
            password: hashedPassword,
            passwordChangedAt: new Date()
          });
          console.log(`  ✅ Password set to default`);
        }
      }
    }
    
    console.log('\n=== Step 3: Setting Up Manager Hierarchy ===\n');
    
    // Step 3: Find all managers and assign them to employees
    const managers = await Employee.findAll({
      include: [{
        model: User,
        as: 'user',
        where: { role: 'manager' },
        required: true
      }, {
        model: Position,
        as: 'position',
        required: false
      }]
    });
    
    console.log(`Found ${managers.length} managers:`);
    managers.forEach(manager => {
      const positionTitle = manager.position?.title || 'No Position';
      console.log(`  - ${manager.firstName} ${manager.lastName} (${positionTitle})`);
    });
    
    // Step 4: Assign managers to employees based on department/hierarchy
    const regularEmployees = await Employee.findAll({
      include: [{
        model: User,
        as: 'user',
        where: { role: 'employee' },
        required: true
      }, {
        model: Department,
        as: 'department',
        required: false
      }]
    });
    
    console.log(`\nAssigning managers to ${regularEmployees.length} regular employees:`);
    
    for (const employee of regularEmployees) {
      // Try to find a manager in the same department first
      let assignedManager = null;
      
      if (employee.department) {
        assignedManager = managers.find(manager => 
          manager.departmentId === employee.departmentId
        );
      }
      
      // If no manager in same department, assign the first available manager
      if (!assignedManager && managers.length > 0) {
        assignedManager = managers[0];
      }
      
      if (assignedManager && employee.managerId !== assignedManager.id) {
        await employee.update({ managerId: assignedManager.id });
        console.log(`  ✅ ${employee.firstName} ${employee.lastName} now reports to ${assignedManager.firstName} ${assignedManager.lastName}`);
      } else if (assignedManager) {
        console.log(`  ✅ ${employee.firstName} ${employee.lastName} already reports to correct manager`);
      } else {
        console.log(`  ⚠️  No manager available for ${employee.firstName} ${employee.lastName}`);
      }
    }
    
    // Step 5: Special case for John Developer
    const john = await Employee.findByPk('614a6351-29b0-4819-950f-1deb9965926c');
    if (john && managers.length > 0) {
      const johnManager = managers.find(m => m.departmentId === john.departmentId) || managers[0];
      if (john.managerId !== johnManager.id) {
        await john.update({ managerId: johnManager.id });
        console.log(`\n🎯 John Developer specifically assigned to manager: ${johnManager.firstName} ${johnManager.lastName}`);
      }
    }
    
    console.log('\n=== Summary ===');
    console.log('✅ All employees now have user accounts with passwords');
    console.log('✅ Roles assigned based on position titles');
    console.log('✅ Manager hierarchy established');
    console.log('✅ Default password for all new accounts: (from DEV_DEFAULT_PASSWORD env or DevReset@2026!)');
    console.log('\n🔐 Users can now log in with their email and the default password!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

setupProperManagerHierarchy();
