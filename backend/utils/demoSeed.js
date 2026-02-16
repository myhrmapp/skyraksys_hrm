const bcrypt = require('bcryptjs');
const db = require('../models');

async function seedUsersDepartmentsPositionsLeaves() {
  // Create departments
  const itDept = await db.Department.create({ name: 'Information Technology', description: 'IT Department' });
  const hrDept = await db.Department.create({ name: 'Human Resources', description: 'HR Department' });

  // Create positions
  const adminPos = await db.Position.create({ title: 'System Administrator', description: 'System Admin', departmentId: itDept.id });
  const devPos = await db.Position.create({ title: 'Software Developer', description: 'Developer', departmentId: itDept.id });
  const hrPos = await db.Position.create({ title: 'HR Manager', description: 'HR Manager', departmentId: hrDept.id });

  // Create leave types
  const leaveTypes = [
    { name: 'Annual Leave', maxDaysPerYear: 21, description: 'Annual vacation leave' },
    { name: 'Sick Leave', maxDaysPerYear: 12, description: 'Medical leave' },
    { name: 'Personal Leave', maxDaysPerYear: 5, description: 'Personal leave' }
  ];
  for (const lt of leaveTypes) await db.LeaveType.create(lt);

  // Strong demo passwords
  const pw = { admin: 'Kx9mP7qR2nF8sA5t', hr: 'Lw3nQ6xY8mD4vB7h', employee: 'Mv4pS9wE2nR6kA8j' };

  // Admin user
  const adminUser = await db.User.create({
    firstName: 'System', lastName: 'Administrator', email: 'admin@company.com',
    password: await bcrypt.hash(pw.admin, 12), role: 'admin', isActive: true
  });
  await db.Employee.create({
    userId: adminUser.id, employeeId: 'EMP001', firstName: 'System', lastName: 'Administrator',
    email: 'admin@company.com', departmentId: itDept.id, positionId: adminPos.id, hireDate: new Date(),
    salary: 80000, status: 'Active'
  });

  // HR user
  const hrUser = await db.User.create({
    firstName: 'HR', lastName: 'Manager', email: 'hr@company.com',
    password: await bcrypt.hash(pw.hr, 12), role: 'hr', isActive: true
  });
  await db.Employee.create({
    userId: hrUser.id, employeeId: 'EMP002', firstName: 'HR', lastName: 'Manager', email: 'hr@company.com',
    departmentId: hrDept.id, positionId: hrPos.id, hireDate: new Date(), salary: 60000, status: 'Active'
  });

  // Employee user
  const employeeUser = await db.User.create({
    firstName: 'John', lastName: 'Developer', email: 'employee@company.com',
    password: await bcrypt.hash(pw.employee, 12), role: 'employee', isActive: true
  });
  const employee = await db.Employee.create({
    userId: employeeUser.id, employeeId: 'EMP003', firstName: 'John', lastName: 'Developer',
    email: 'employee@company.com', departmentId: itDept.id, positionId: devPos.id, hireDate: new Date(),
    salary: 50000, status: 'Active'
  });

  // Create leave balances
  const allLeaveTypes = await db.LeaveType.findAll();
  for (const leaveType of allLeaveTypes) {
    await db.LeaveBalance.create({
      employeeId: employee.id,
      leaveTypeId: leaveType.id,
      year: new Date().getFullYear(),
      totalAccrued: leaveType.maxDaysPerYear || leaveType.maxDays || 21,
      totalTaken: 0,
      totalPending: 0,
      balance: leaveType.maxDaysPerYear || leaveType.maxDays || 21,
      carryForward: 0
    });
  }

  console.log('✅ Demo users created successfully');
  console.log('   Admin: admin@company.com / Kx9mP7qR2nF8sA5t');
  console.log('   HR: hr@company.com / Lw3nQ6xY8mD4vB7h');
  console.log('   Employee: employee@company.com / Mv4pS9wE2nR6kA8j');
}

async function seedProjectsAndTasks() {
  const { Project, Task } = db;
  await Project.bulkCreate([
    { id: '12345678-1234-1234-1234-123456789001', name: 'Website Development', description: 'Company website redesign and development', status: 'Active', startDate: '2025-01-01', endDate: '2025-12-31', budget: 50000.00, isActive: true },
    { id: '12345678-1234-1234-1234-123456789002', name: 'Mobile App', description: 'iOS and Android mobile application', status: 'Active', startDate: '2025-03-01', endDate: '2025-09-30', budget: 75000.00, isActive: true },
    { id: '12345678-1234-1234-1234-123456789003', name: 'Data Analytics', description: 'Business intelligence and data analytics platform', status: 'Active', startDate: '2025-06-01', endDate: '2025-12-31', budget: 30000.00, isActive: true }
  ], { ignoreDuplicates: true });

  await Task.bulkCreate([
    { id: '12345678-1234-1234-1234-123456789011', name: 'Frontend Development', description: 'React.js frontend development', status: 'In Progress', priority: 'High', estimatedHours: 120, projectId: '12345678-1234-1234-1234-123456789001', isActive: true },
    { id: '12345678-1234-1234-1234-123456789012', name: 'Backend Development', description: 'Node.js backend API development', status: 'In Progress', priority: 'High', estimatedHours: 80, projectId: '12345678-1234-1234-1234-123456789001', isActive: true },
    { id: '12345678-1234-1234-1234-123456789013', name: 'Database Design', description: 'Database schema design and optimization', status: 'Completed', priority: 'Medium', estimatedHours: 40, projectId: '12345678-1234-1234-1234-123456789001', isActive: true },
    { id: '12345678-1234-1234-1234-123456789014', name: 'iOS Development', description: 'iOS app development using Swift', status: 'Not Started', priority: 'High', estimatedHours: 100, projectId: '12345678-1234-1234-1234-123456789002', isActive: true },
    { id: '12345678-1234-1234-1234-123456789015', name: 'Android Development', description: 'Android app development using Kotlin', status: 'In Progress', priority: 'High', estimatedHours: 100, projectId: '12345678-1234-1234-1234-123456789002', isActive: true },
    { id: '12345678-1234-1234-1234-123456789016', name: 'Mobile UI/UX Design', description: 'Mobile app user interface and experience design', status: 'Completed', priority: 'Medium', estimatedHours: 60, projectId: '12345678-1234-1234-1234-123456789002', isActive: true },
    { id: '12345678-1234-1234-1234-123456789017', name: 'Data Pipeline Development', description: 'ETL pipeline development for data processing', status: 'In Progress', priority: 'Medium', estimatedHours: 80, projectId: '12345678-1234-1234-1234-123456789003', isActive: true },
    { id: '12345678-1234-1234-1234-123456789018', name: 'Dashboard Development', description: 'Business intelligence dashboard creation', status: 'Not Started', priority: 'Medium', estimatedHours: 60, projectId: '12345678-1234-1234-1234-123456789003', isActive: true }
  ], { ignoreDuplicates: true });

  console.log('✅ Demo projects and tasks created successfully');
}

async function seedAllDemoData() {
  await seedUsersDepartmentsPositionsLeaves();
  // Ensure a dedicated prod admin test account exists (for ops diagnostics)
  try {
    const existing = await db.User.findOne({ where: { email: 'prodadmin@company.com' } });
    if (!existing) {
      const user = await db.User.create({
        firstName: 'Prod', lastName: 'Admin', email: 'prodadmin@company.com',
        password: await bcrypt.hash('admin', 12), role: 'admin', isActive: true
      });
      await db.Employee.create({
        userId: user.id, employeeId: 'EMP900', firstName: 'Prod', lastName: 'Admin',
        email: 'prodadmin@company.com', departmentId: null, positionId: null, hireDate: new Date(),
        salary: 0, status: 'Active'
      }).catch(() => {});
      console.log('🔐 Seeded prodadmin@company.com with password "admin" (admin role)');
    }
  } catch (e) {
    console.log('⚠️  Unable to ensure prodadmin test account:', e.message);
  }
  await seedProjectsAndTasks();
}

async function purgeDemoData() {
  // Purge tasks then projects and seeded users/employees/leaves by known keys
  await db.Task.destroy({ where: { id: [
    '12345678-1234-1234-1234-123456789011','12345678-1234-1234-1234-123456789012','12345678-1234-1234-1234-123456789013',
    '12345678-1234-1234-1234-123456789014','12345678-1234-1234-1234-123456789015','12345678-1234-1234-1234-123456789016',
    '12345678-1234-1234-1234-123456789017','12345678-1234-1234-1234-123456789018'
  ] } });
  await db.Project.destroy({ where: { id: [
    '12345678-1234-1234-1234-123456789001','12345678-1234-1234-1234-123456789002','12345678-1234-1234-1234-123456789003'
  ] } });
  // Delete demo users and associated employees
  await db.Employee.destroy({ where: { email: ['admin@company.com','hr@company.com','employee@company.com'] } });
  await db.User.destroy({ where: { email: ['admin@company.com','hr@company.com','employee@company.com'] } });
  console.log('🧹 Purged demo data');
}

module.exports = { seedAllDemoData, purgeDemoData };
