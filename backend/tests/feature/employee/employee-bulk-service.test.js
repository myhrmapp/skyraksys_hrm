const db = require('../../../models');
const EmployeeBulkService = require('../../../services/employee/EmployeeBulkService');

describe('EmployeeBulkService', () => {
  let bulkService;
  let department1, department2;
  let position1, position2;
  let employee1, employee2, employee3;

  beforeEach(async () => {
    bulkService = new EmployeeBulkService(db);

    // Clean up with try/catch to ignore FK errors
    try {
      await db.Employee.destroy({ where: {}, force: true, paranoid: false });
      await db.Department.destroy({ where: {}, force: true, paranoid: false });
      await db.Position.destroy({ where: {}, force: true, paranoid: false });
    } catch (err) {
      // Ignore FK errors
    }

    // Create test data
    department1 = await db.Department.create({
      name: 'Engineering',
      isActive: true
    });

    department2 = await db.Department.create({
      name: 'Sales',
      isActive: false // Inactive
    });

    position1 = await db.Position.create({
      title: 'Developer',
      departmentId: department1.id,
      isActive: true
    });

    position2 = await db.Position.create({
      title: 'Manager',
      departmentId: department1.id,
      isActive: true
    });

    employee1 = await db.Employee.create({
      employeeId: 'SKYT0001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      phone: '1234567890',
      status: 'Active',
      departmentId: department1.id,
      positionId: position1.id,
      hireDate: '2023-01-15'
    });

    employee2 = await db.Employee.create({
      employeeId: 'SKYT0002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@test.com',
      phone: '0987654321',
      status: 'Active',
      departmentId: department1.id,
      positionId: position1.id,
      hireDate: '2023-02-20',
      managerId: employee1.id
    });

    employee3 = await db.Employee.create({
      employeeId: 'SKYT0003',
      firstName: 'Bob',
      lastName: 'Manager',
      email: 'bob.manager@test.com',
      phone: '5555555555',
      status: 'Terminated',
      departmentId: department1.id,
      positionId: position2.id,
      hireDate: '2022-06-10'
    });
  });

  afterAll(async () => {
    try {
      await db.Employee.destroy({ where: {}, force: true, paranoid: false });
      await db.Department.destroy({ where: {}, force: true, paranoid: false });
      await db.Position.destroy({ where: {}, force: true, paranoid: false });
    } catch (err) {
      // Ignore
    }
    await db.sequelize.close();
  });

  describe('bulkUpdateEmployees', () => {
    test('should update status for multiple employees', async () => {
      const result = await bulkService.bulkUpdateEmployees(
        [employee1.id, employee2.id],
        { status: 'Inactive' }
      );

      expect(result.updated).toBe(2);

      const updated1 = await db.Employee.findByPk(employee1.id);
      const updated2 = await db.Employee.findByPk(employee2.id);

      expect(updated1.status).toBe('Inactive');
      expect(updated2.status).toBe('Inactive');
    });

    test('should update departmentId for multiple employees', async () => {
      const newDept = await db.Department.create({
        name: 'Marketing',
        isActive: true
      });

      const result = await bulkService.bulkUpdateEmployees(
        [employee1.id, employee2.id],
        { departmentId: newDept.id }
      );

      expect(result.updated).toBe(2);

      const updated1 = await db.Employee.findByPk(employee1.id);
      const updated2 = await db.Employee.findByPk(employee2.id);

      expect(updated1.departmentId).toBe(newDept.id);
      expect(updated2.departmentId).toBe(newDept.id);
    });

    test('should update managerId for multiple employees', async () => {
      const result = await bulkService.bulkUpdateEmployees(
        [employee2.id],
        { managerId: employee1.id }
      );

      expect(result.updated).toBe(1);

      const updated = await db.Employee.findByPk(employee2.id);
      expect(updated.managerId).toBe(employee1.id);
    });

    test('should reject non-whitelisted fields', async () => {
      await expect(
        bulkService.bulkUpdateEmployees(
          [employee1.id],
          { firstName: 'Hacker', salary: 999999 }
        )
      ).rejects.toThrow('No valid fields to update');
    });

    test('should reject empty employee IDs array', async () => {
      await expect(
        bulkService.bulkUpdateEmployees([], { status: 'Active' })
      ).rejects.toThrow('Employee IDs array cannot be empty');
    });

    test('should validate departmentId FK', async () => {
      await expect(
        bulkService.bulkUpdateEmployees(
          [employee1.id],
          { departmentId: '00000000-0000-0000-0000-000000000000' }
        )
      ).rejects.toThrow('Invalid or inactive department');
    });

    test('should reject inactive departmentId', async () => {
      await expect(
        bulkService.bulkUpdateEmployees(
          [employee1.id],
          { departmentId: department2.id }
        )
      ).rejects.toThrow('Invalid or inactive department');
    });

    test('should reject terminated manager', async () => {
      await expect(
        bulkService.bulkUpdateEmployees(
          [employee1.id],
          { managerId: employee3.id }
        )
      ).rejects.toThrow('Manager cannot be terminated');
    });
  });

  describe('exportToCSV', () => {
    test('should export all employees to CSV', async () => {
      const csv = await bulkService.exportToCSV();

      expect(csv).toContain('Employee ID,First Name,Last Name,Email,Phone,Department,Position,Status,Hire Date');
      expect(csv).toContain('SKYT0001');
      expect(csv).toContain('John');
      expect(csv).toContain('john.doe@test.com');
      expect(csv).toContain('Engineering');
      expect(csv).toContain('Developer');

      // Count rows (header + 3 employees)
      const rows = csv.split('\n');
      expect(rows.length).toBe(4); // Header + 3 employees
    });

    test('should export with search filter', async () => {
      const csv = await bulkService.exportToCSV({ search: 'Jane' });

      expect(csv).toContain('Jane');
      expect(csv).not.toContain('John');
      expect(csv).not.toContain('Bob');

      const rows = csv.split('\n');
      expect(rows.length).toBe(2); // Header + 1 employee
    });

    test('should export with department filter', async () => {
      const csv = await bulkService.exportToCSV({ department: department1.id });

      expect(csv).toContain('SKYT0001');
      expect(csv).toContain('SKYT0002');
      expect(csv).toContain('SKYT0003');

      const rows = csv.split('\n');
      expect(rows.length).toBe(4); // Header + 3 employees (all in dept1)
    });

    test('should export with status filter', async () => {
      const csv = await bulkService.exportToCSV({ status: 'Active' });

      expect(csv).toContain('SKYT0001');
      expect(csv).toContain('SKYT0002');
      expect(csv).not.toContain('SKYT0003'); // Terminated

      const rows = csv.split('\n');
      expect(rows.length).toBe(3); // Header + 2 active employees
    });

    test('should handle CSV escaping correctly', async () => {
      // Create employee with special characters
      await db.Employee.create({
        employeeId: 'SKYT0004',
        firstName: 'Test"Quote',
        lastName: 'User',
        email: 'test@test.com',
        phone: '1111111111',
        status: 'Active',
        departmentId: department1.id,
        positionId: position1.id,
        hireDate: '2023-03-01'
      });

      const csv = await bulkService.exportToCSV({ search: 'Test' });

      // Quotes should be escaped as ""
      expect(csv).toContain('Test""Quote');
    });
  });

  describe('detectConflicts', () => {
    test('should detect duplicate emails in input', async () => {
      const employees = [
        { email: 'duplicate@test.com', employeeId: 'SKYT0010' },
        { email: 'duplicate@test.com', employeeId: 'SKYT0011' }
      ];

      const conflicts = await bulkService.detectConflicts(employees);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some(c => c.type === 'duplicate_in_input')).toBe(true);
      expect(conflicts.some(c => c.value === 'duplicate@test.com')).toBe(true);
    });

    test('should detect duplicate employeeIds in input', async () => {
      const employees = [
        { email: 'test1@test.com', employeeId: 'SKYT0020' },
        { email: 'test2@test.com', employeeId: 'SKYT0020' }
      ];

      const conflicts = await bulkService.detectConflicts(employees);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some(c => c.type === 'duplicate_in_input')).toBe(true);
      expect(conflicts.some(c => c.value === 'SKYT0020')).toBe(true);
    });

    test('should detect existing emails in database', async () => {
      const employees = [
        { email: 'john.doe@test.com', employeeId: 'SKYT0030' }
      ];

      const conflicts = await bulkService.detectConflicts(employees);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some(c => c.type === 'exists_in_database')).toBe(true);
      expect(conflicts.some(c => c.value === 'john.doe@test.com')).toBe(true);
    });

    test('should detect existing employeeIds in database', async () => {
      const employees = [
        { email: 'new@test.com', employeeId: 'SKYT0001' }
      ];

      const conflicts = await bulkService.detectConflicts(employees);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some(c => c.type === 'exists_in_database')).toBe(true);
      expect(conflicts.some(c => c.value === 'SKYT0001')).toBe(true);
    });

    test('should return empty array if no conflicts', async () => {
      const employees = [
        { email: 'newuser@test.com', employeeId: 'SKYT0040' }
      ];

      const conflicts = await bulkService.detectConflicts(employees);

      expect(conflicts.length).toBe(0);
    });
  });

  describe('validateCSVImport', () => {
    test('should validate required fields', async () => {
      const rows = [
        { firstName: '', lastName: 'Test', email: 'test@test.com', hireDate: '2023-01-01' },
        { firstName: 'Valid', lastName: 'User', email: 'valid@test.com', hireDate: '2023-01-01' }
      ];

      const result = await bulkService.validateCSVImport(rows);

      expect(result.invalid.length).toBe(1);
      expect(result.invalid[0].errors).toContain('First name is required');
      expect(result.valid.length).toBe(1);
    });

    test('should validate email format', async () => {
      const rows = [
        { firstName: 'Test', lastName: 'User', email: 'invalid-email', hireDate: '2023-01-01' }
      ];

      const result = await bulkService.validateCSVImport(rows);

      expect(result.invalid.length).toBe(1);
      expect(result.invalid[0].errors).toContain('Invalid email format');
    });

    test('should detect duplicate existing email', async () => {
      const rows = [
        { firstName: 'Test', lastName: 'User', email: 'john.doe@test.com', hireDate: '2023-01-01' }
      ];

      const result = await bulkService.validateCSVImport(rows);

      expect(result.invalid.length).toBe(1);
      expect(result.invalid[0].errors).toContain('Email already exists');
    });
  });
});
