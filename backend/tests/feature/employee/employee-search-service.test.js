const db = require('../../../models');
const EmployeeSearchService = require('../../../services/employee/EmployeeSearchService');

describe('EmployeeSearchService', () => {
  let service;
  let adminEmployee, managerEmployee, employee1, employee2, employee3;
  let department1, department2, position1, position2;

  afterAll(async () => {
    try {
      await db.Employee.destroy({ where: {}, force: true, paranoid: false });
      await db.User.destroy({ where: {}, force: true });
      await db.Department.destroy({ where: {}, force: true });
      await db.Position.destroy({ where: {}, force: true });
    } catch (error) {
      // Ignore FK errors
    }
    await db.sequelize.close();
  });

  beforeEach(async () => {
    // Clean up
    try {
      await db.Employee.destroy({ where: {}, force: true, paranoid: false });
      await db.User.destroy({ where: {}, force: true });
      await db.Department.destroy({ where: {}, force: true });
      await db.Position.destroy({ where: {}, force: true });
    } catch (error) {
      // Ignore FK errors
    }

    service = new EmployeeSearchService(db);

    // Create test data
    department1 = await db.Department.create({
      name: 'Engineering',
      description: 'Tech team',
      isActive: true
    });

    department2 = await db.Department.create({
      name: 'Sales',
      description: 'Sales team',
      isActive: true
    });

    position1 = await db.Position.create({
      title: 'Developer',
      description: 'Software developer',
      level: 'Mid',
      departmentId: department1.id,
      isActive: true
    });

    position2 = await db.Position.create({
      title: 'Manager',
      description: 'Team manager',
      level: 'Senior',
      departmentId: department2.id,
      isActive: true
    });

    // Create users and employees
    const adminUser = await db.User.create({
      email: 'admin@test.com',
      password: 'Password123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true
    });

    adminEmployee = await db.Employee.create({
      employeeId: 'SKYT0001',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@test.com',
      phone: '1111111111',
      hireDate: '2024-01-01',
      status: 'Active',
      userId: adminUser.id,
      departmentId: department1.id,
      positionId: position2.id
    });

    const managerUser = await db.User.create({
      email: 'manager@test.com',
      password: 'Password123!',
      firstName: 'Manager',
      lastName: 'User',
      role: 'manager',
      isActive: true
    });

    managerEmployee = await db.Employee.create({
      employeeId: 'SKYT0002',
      firstName: 'Manager',
      lastName: 'User',
      email: 'manager@test.com',
      phone: '2222222222',
      hireDate: '2024-02-01',
      status: 'Active',
      userId: managerUser.id,
      departmentId: department1.id,
      positionId: position2.id
    });

    const user1 = await db.User.create({
      email: 'emp1@test.com',
      password: 'Password123!',
      firstName: 'Employee',
      lastName: 'One',
      role: 'employee',
      isActive: true
    });

    employee1 = await db.Employee.create({
      employeeId: 'SKYT0003',
      firstName: 'Employee',
      lastName: 'One',
      email: 'emp1@test.com',
      phone: '3333333333',
      hireDate: '2024-03-01',
      status: 'Active',
      userId: user1.id,
      departmentId: department1.id,
      positionId: position1.id,
      managerId: managerEmployee.id
    });

    const user2 = await db.User.create({
      email: 'emp2@test.com',
      password: 'Password123!',
      firstName: 'Employee',
      lastName: 'Two',
      role: 'employee',
      isActive: true
    });

    employee2 = await db.Employee.create({
      employeeId: 'SKYT0004',
      firstName: 'Employee',
      lastName: 'Two',
      email: 'emp2@test.com',
      phone: '4444444444',
      hireDate: '2024-04-01',
      status: 'Active',
      userId: user2.id,
      departmentId: department2.id,
      positionId: position1.id,
      managerId: managerEmployee.id
    });

    const user3 = await db.User.create({
      email: 'emp3@test.com',
      password: 'Password123!',
      firstName: 'Employee',
      lastName: 'Three',
      role: 'employee',
      isActive: true
    });

    employee3 = await db.Employee.create({
      employeeId: 'SKYT0005',
      firstName: 'Employee',
      lastName: 'Three',
      email: 'emp3@test.com',
      phone: '5555555555',
      hireDate: '2024-05-01',
      status: 'Inactive',
      userId: user3.id,
      departmentId: department1.id,
      positionId: position1.id
    });
  });

  describe('searchEmployees', () => {
    test('should allow admin to see all employees', async () => {
      const result = await service.searchEmployees(
        { page: 1, limit: 10 },
        'admin',
        adminEmployee.id
      );

      expect(result.employees.length).toBe(5);
      expect(result.pagination.total).toBe(5);
    });

    test('should allow manager to see self and team only', async () => {
      const result = await service.searchEmployees(
        { page: 1, limit: 10 },
        'manager',
        managerEmployee.id
      );

      // Manager + 2 subordinates
      expect(result.employees.length).toBe(3);
      expect(result.pagination.total).toBe(3);
    });

    test('should allow employee to see only self', async () => {
      const result = await service.searchEmployees(
        { page: 1, limit: 10 },
        'employee',
        employee1.id
      );

      expect(result.employees.length).toBe(1);
      expect(result.employees[0].id).toBe(employee1.id);
    });

    test('should filter by search term (firstName)', async () => {
      const result = await service.searchEmployees(
        { page: 1, limit: 10, search: 'Manager' },
        'admin',
        adminEmployee.id
      );

      expect(result.employees.length).toBe(1);
      expect(result.employees[0].firstName).toBe('Manager');
    });

    test('should filter by department', async () => {
      const result = await service.searchEmployees(
        { page: 1, limit: 10, department: department1.id },
        'admin',
        adminEmployee.id
      );

      // Admin, Manager, Employee1, Employee3 in department1
      expect(result.employees.length).toBe(4);
    });

    test('should filter by status', async () => {
      const result = await service.searchEmployees(
        { page: 1, limit: 10, status: 'Active' },
        'admin',
        adminEmployee.id
      );

      // All except employee3 (Inactive)
      expect(result.employees.length).toBe(4);
    });

    test('should filter by position', async () => {
      const result = await service.searchEmployees(
        { page: 1, limit: 10, position: position1.id },
        'admin',
        adminEmployee.id
      );

      // employee1, employee2, employee3 have position1
      expect(result.employees.length).toBe(3);
    });

    test('should apply pagination correctly', async () => {
      const result = await service.searchEmployees(
        { page: 2, limit: 2 },
        'admin',
        adminEmployee.id
      );

      expect(result.employees.length).toBe(2);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pages).toBe(3); // 5 employees / 2 per page = 3 pages
    });

    test('should sort by firstName ascending', async () => {
      const result = await service.searchEmployees(
        { page: 1, limit: 10, sort: 'firstName', order: 'asc' },
        'admin',
        adminEmployee.id
      );

      expect(result.employees[0].firstName).toBe('Admin');
      expect(result.employees[1].firstName).toBe('Employee');
    });

    test('should enforce role-based limit (admin: 1000, others: 100)', async () => {
      const result = await service.searchEmployees(
        { page: 1, limit: 5000 }, // Try to request 5000
        'employee',
        employee1.id
      );

      // Employee role limited to 100, but only 1 result (self)
      expect(result.pagination.limit).toBeLessThanOrEqual(100);
    });
  });

  describe('getManagerTeam', () => {
    test('should get manager own team', async () => {
      const team = await service.getManagerTeam(
        managerEmployee.id,
        managerEmployee.id,
        'manager'
      );

      expect(team.length).toBe(2); // employee1, employee2
      expect(team.every(e => e.status === 'Active')).toBe(true);
    });

    test('should allow admin to get any manager team', async () => {
      const team = await service.getManagerTeam(
        managerEmployee.id,
        adminEmployee.id,
        'admin'
      );

      expect(team.length).toBe(2);
    });

    test('should reject manager accessing other manager team', async () => {
      await expect(
        service.getManagerTeam(
          adminEmployee.id, // Different manager
          managerEmployee.id,
          'manager'
        )
      ).rejects.toThrow('You can only access your own team');
    });

    test('should include user, department, position associations', async () => {
      const team = await service.getManagerTeam(
        managerEmployee.id,
        managerEmployee.id,
        'manager'
      );

      expect(team[0].user).toBeDefined();
      expect(team[0].department).toBeDefined();
      expect(team[0].position).toBeDefined();
    });

    test('should order team by firstName, lastName', async () => {
      const team = await service.getManagerTeam(
        managerEmployee.id,
        managerEmployee.id,
        'manager'
      );

      // Employee One, Employee Two
      expect(team[0].lastName).toBe('One');
      expect(team[1].lastName).toBe('Two');
    });
  });

  describe('getManagersAndStatistics', () => {
    test('should get list of managers with subordinate count', async () => {
      const managers = await service.getManagers();

      expect(managers.length).toBe(1); // Only managerEmployee has subordinates
      expect(managers[0].id).toBe(managerEmployee.id);
      expect(managers[0].subordinateCount).toBe(2);
    });

    test('should get employee statistics for admin (all)', async () => {
      const stats = await service.getEmployeeStats('admin', adminEmployee.id);

      expect(stats.total).toBe(5);
      expect(stats.active).toBe(4);
      expect(stats.inactive).toBe(1);
    });

    test('should get employee statistics for manager (team only)', async () => {
      const stats = await service.getEmployeeStats('manager', managerEmployee.id);

      expect(stats.total).toBe(3); // Manager + 2 subordinates
      expect(stats.active).toBe(3);
    });

    test('should get employee statistics for employee (self only)', async () => {
      const stats = await service.getEmployeeStats('employee', employee1.id);

      expect(stats.total).toBe(1);
      expect(stats.active).toBe(1);
    });
  });

  describe('metadata', () => {
    test('should get department metadata with employee counts', async () => {
      const departments = await service.getDepartmentMetadata();

      expect(departments.length).toBe(2);
      
      const engineeringDept = departments.find(d => d.name === 'Engineering');
      expect(engineeringDept.employeeCount).toBe(3); // Admin, Manager, Employee1 (active only)

      const salesDept = departments.find(d => d.name === 'Sales');
      expect(salesDept.employeeCount).toBe(1); // Employee2
    });

    test('should get position metadata with employee counts', async () => {
      const positions = await service.getPositionMetadata();

      expect(positions.length).toBe(2);
      
      const developerPos = positions.find(p => p.title === 'Developer');
      expect(developerPos.employeeCount).toBe(2); // Employee1, Employee2 (active only)

      const managerPos = positions.find(p => p.title === 'Manager');
      expect(managerPos.employeeCount).toBe(2); // Admin, Manager
    });
  });

  describe('otherMethods', () => {
    test('should get employees by department', async () => {
      const employees = await service.getEmployeesByDepartment(department1.id);

      expect(employees.length).toBe(3); // Active only
    });

    test('should get employees by position', async () => {
      const employees = await service.getEmployeesByPosition(position1.id);

      expect(employees.length).toBe(2); // Active developers
    });

    test('should get employees by hire date range', async () => {
      const employees = await service.getEmployeesByHireDate(
        '2024-03-01',
        '2024-05-01'
      );

      expect(employees.length).toBe(3); // Employee1, Employee2, Employee3
    });

    test('should get employee by employeeId', async () => {
      const employee = await service.getByEmployeeId('SKYT0003');

      expect(employee.id).toBe(employee1.id);
      expect(employee.user).toBeDefined();
      expect(employee.manager).toBeDefined();
    });

    test('should throw error if employeeId not found', async () => {
      await expect(
        service.getByEmployeeId('SKYT9999')
      ).rejects.toThrow("Employee with ID 'SKYT9999' not found");
    });
  });
});
