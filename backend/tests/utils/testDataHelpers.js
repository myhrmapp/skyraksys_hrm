const db = require('../../models');
const bcrypt = require('bcryptjs');

const testDataHelpers = {
  clearTestData: async () => {
    // Debug db object
    console.log('Available models:', Object.keys(db));
    
    // Clear tables in reverse order of dependencies
    // await db.Payroll.destroy({ where: {}, force: true }); // Legacy
    await db.Payslip.destroy({ where: {}, force: true });
    await db.PayrollData.destroy({ where: {}, force: true });
    await db.Timesheet.destroy({ where: {}, force: true });
    await db.LeaveRequest.destroy({ where: {}, force: true });
    await db.LeaveBalance.destroy({ where: {}, force: true });
    await db.LeaveType.destroy({ where: {}, force: true });
    await db.Task.destroy({ where: {}, force: true });
    await db.Project.destroy({ where: {}, force: true });
    await db.SalaryStructure.destroy({ where: {}, force: true });
    await db.Employee.destroy({ where: {}, force: true });
    
    // Delete security sessions first to avoid foreign key constraint violation
    // Check if table exists before trying to delete
    try {
      const [results] = await db.sequelize.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'security_sessions'"
      );
      if (results.length > 0) {
        await db.sequelize.query('DELETE FROM security_sessions');
      }
    } catch (error) {
      // Table doesn't exist or deletion failed, continue anyway
      console.debug('security_sessions cleanup skipped:', error.message);
    }
    
    // Always try to delete users
    try {
      await db.User.destroy({ where: {}, force: true });
    } catch (error) {
      console.warn('Warning: Failed to destroy User table:', error.message);
    }
    
    await db.Position.destroy({ where: {}, force: true });
    await db.Department.destroy({ where: {}, force: true });
  },

  createTestEmployee: async (data = {}) => {
    // Create department if not exists
    let department = await db.Department.findOne({ where: { name: data.department || 'IT' } });
    if (!department) {
      department = await db.Department.create({
        name: data.department || 'IT',
        description: 'Test Department'
      });
    }

    // Create position if not exists
    let position = await db.Position.findOne({ where: { title: data.position || 'Developer' } });
    if (!position) {
      position = await db.Position.create({
        title: data.position || 'Developer',
        description: 'Test Position',
        departmentId: department.id
      });
    }

    // Create user
    const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
    const hashedPassword = await bcrypt.hash('Password123!', 12);
    
    let user;
    try {
      user = await db.User.create({
        firstName: data.firstName || 'Test',
        lastName: data.lastName || 'Employee',
        email: data.email || `test.${uniqueId}@example.com`,
        password: hashedPassword,
        role: data.role || 'employee',
        isActive: true
      });
    } catch (error) {
      console.error('❌ Failed to create test user:', error.message);
      if (error.parent) {
        console.error('   DB Error:', error.parent.message);
        console.error('   SQL:', error.parent.sql);
      }
      throw error;
    }

    // Create employee
    try {
      const employee = await db.Employee.create({
        userId: user.id,
        employeeId: `EMP${uniqueId}`,
        firstName: data.firstName || 'Test',
        lastName: data.lastName || 'Employee',
        email: data.email || `test.${uniqueId}@example.com`,
        departmentId: department.id,
        positionId: position.id,
        hireDate: new Date(),
        status: 'Active'
      });
      return employee;
    } catch (error) {
      console.error('❌ Failed to create test employee:', error.message);
      if (error.errors) {
        error.errors.forEach(e => console.error(`   Validation: ${e.message} (${e.path})`));
      }
      if (error.parent) {
        console.error('   DB Error:', error.parent.message);
      }
      throw error;
    }
  }
};

module.exports = { testDataHelpers };
