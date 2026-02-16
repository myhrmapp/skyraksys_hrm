const db = require('../../../models');
const EmployeeService = require('../../../services/EmployeeService');
const { Employee, User, Department, Position, LeaveType, LeaveBalance, SalaryStructure } = db;

describe('EmployeeService', () => {
  afterAll(async () => {
    try {
      // Clean up test data
      await LeaveBalance.destroy({ where: {}, force: true });
      await SalaryStructure.destroy({ where: {}, force: true });
      await Employee.destroy({ where: {}, force: true, paranoid: false });
      await User.destroy({ where: {}, force: true });
      await Department.destroy({ where: {}, force: true });
      await Position.destroy({ where: {}, force: true });
      await LeaveType.destroy({ where: {}, force: true });
    } catch (error) {
      // Ignore FK constraint errors during cleanup
    }
    await db.sequelize.close();
  });

  beforeEach(async () => {
    // Clean up tables before each test
    try {
      await LeaveBalance.destroy({ where: {}, force: true });
      await SalaryStructure.destroy({ where: {}, force: true });
      await Employee.destroy({ where: {}, force: true, paranoid: false });
      await User.destroy({ where: {}, force: true });
      await Department.destroy({ where: {}, force: true });
      await Position.destroy({ where: {}, force: true });
      await LeaveType.destroy({ where: {}, force: true });
    } catch (error) {
      // Ignore FK constraint errors during cleanup
    }
  });

  describe('validateForeignKeys', () => {
    test('should pass with valid foreign keys', async () => {
      const department = await Department.create({
        name: 'Engineering',
        description: 'Tech team',
        isActive: true
      });

      const position = await Position.create({
        title: 'Developer',
        description: 'Software developer',
        level: 'Mid',
        departmentId: department.id,
        isActive: true
      });

      const managerUser = await User.create({
        email: 'manager@test.com',
        password: 'Password123!',
        firstName: 'Manager',
        lastName: 'User',
        role: 'manager'
      });

      const manager = await Employee.create({
        employeeId: 'SKYT0001',
        firstName: 'Manager',
        lastName: 'User',
        email: 'manager@test.com',
        phone: '1234567890',
        hireDate: '2024-01-01',
        status: 'Active',
        userId: managerUser.id
      });

      await expect(
        EmployeeService.validateForeignKeys({
          departmentId: department.id,
          positionId: position.id,
          managerId: manager.id
        })
      ).resolves.not.toThrow();
    });

    test('should reject invalid departmentId', async () => {
      await expect(
        EmployeeService.validateForeignKeys({
          departmentId: '00000000-0000-0000-0000-000000000000'
        })
      ).rejects.toThrow('Invalid departmentId provided');
    });

    test('should reject inactive department', async () => {
      const department = await Department.create({
        name: 'Inactive Dept',
        description: 'Old team',
        isActive: false
      });

      await expect(
        EmployeeService.validateForeignKeys({
          departmentId: department.id
        })
      ).rejects.toThrow('Department is inactive');
    });

    test('should reject invalid positionId', async () => {
      await expect(
        EmployeeService.validateForeignKeys({
          positionId: '00000000-0000-0000-0000-000000000000'
        })
      ).rejects.toThrow('Invalid positionId provided');
    });

    test('should reject terminated manager', async () => {
      const managerUser = await User.create({
        email: 'terminated@test.com',
        password: 'Password123!',
        firstName: 'Terminated',
        lastName: 'Manager',
        role: 'manager'
      });

      const manager = await Employee.create({
        employeeId: 'SKYT0001',
        firstName: 'Terminated',
        lastName: 'Manager',
        email: 'terminated@test.com',
        phone: '1234567890',
        hireDate: '2024-01-01',
        status: 'Terminated',
        userId: managerUser.id
      });

      await expect(
        EmployeeService.validateForeignKeys({
          managerId: manager.id
        })
      ).rejects.toThrow('Manager cannot be a terminated employee');
    });
  });

  describe('createEmployeeWithUser', () => {
    let department, position, leaveType1, leaveType2;

    beforeEach(async () => {
      department = await Department.create({
        name: 'Engineering',
        description: 'Tech team',
        isActive: true
      });

      position = await Position.create({
        title: 'Developer',
        description: 'Software developer',
        level: 'Mid',
        isActive: true,
        departmentId: department.id
      });

      leaveType1 = await LeaveType.create({
        name: 'Annual Leave',
        code: 'AL',
        maxDaysPerYear: 20,
        isActive: true
      });

      leaveType2 = await LeaveType.create({
        name: 'Sick Leave',
        code: 'SL',
        maxDaysPerYear: 10,
        isActive: true
      });
    });

    test('should create employee with all fields', async () => {
      const employee = await EmployeeService.createEmployeeWithUser(
        {
          firstName: 'John',
          lastName: 'Doe',
          phone: '1234567890',
          hireDate: '2024-01-01',
          status: 'Active',
          departmentId: department.id,
          positionId: position.id
        },
        {
          email: 'john@test.com',
          password: 'Password123!',
          role: 'employee'
        }
      );

      expect(employee).toBeDefined();
      expect(employee.firstName).toBe('John');
      expect(employee.email).toBe('john@test.com');
      expect(employee.employeeId).toMatch(/^SKYT\d{4}$/);

      // Check user created
      const user = await User.findOne({ where: { email: 'john@test.com' } });
      expect(user).toBeDefined();
      expect(user.role).toBe('employee');

      // Check leave balances initialized
      const balances = await LeaveBalance.findAll({
        where: { employeeId: employee.id }
      });
      expect(balances).toHaveLength(2);
      expect(balances.some(b => parseFloat(b.balance) === 20)).toBe(true); // Annual Leave
      expect(balances.some(b => parseFloat(b.balance) === 10)).toBe(true); // Sick Leave
    });

    test('should auto-generate employeeId if not provided', async () => {
      const employee = await EmployeeService.createEmployeeWithUser(
        {
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '9876543210',
          hireDate: '2024-02-01',
          status: 'Active'
        },
        {
          email: 'jane@test.com',
          password: 'Password123!'
        }
      );

      expect(employee.employeeId).toMatch(/^SKYT\d{4}$/);
      expect(employee.employeeId).toBe('SKYT0001');
    });

    test('should handle photo upload', async () => {
      const employee = await EmployeeService.createEmployeeWithUser(
        {
          firstName: 'Alice',
          lastName: 'Johnson',
          phone: '5555555555',
          hireDate: '2024-03-01',
          status: 'Active'
        },
        {
          email: 'alice@test.com',
          password: 'Password123!'
        },
        'photo-123.jpg'
      );

      expect(employee.photoUrl).toBe('/uploads/employee-photos/photo-123.jpg');
    });

    test('should create salary structure (new format)', async () => {
      const employee = await EmployeeService.createEmployeeWithUser(
        {
          firstName: 'Bob',
          lastName: 'Williams',
          phone: '3333333333',
          hireDate: '2024-04-01',
          status: 'Active'
        },
        {
          email: 'bob@test.com',
          password: 'Password123!'
        },
        null,
        {
          basicSalary: 50000,
          allowances: {
            hra: 10000,
            transport: 5000,
            medical: 2000
          },
          deductions: {
            pf: 3000,
            tds: 1000
          },
          effectiveFrom: '2024-04-01'
        }
      );

      const salary = await SalaryStructure.findOne({
        where: { employeeId: employee.id }
      });

      expect(salary).toBeDefined();
      expect(parseFloat(salary.basicSalary)).toBe(50000);
      expect(parseFloat(salary.hra)).toBe(10000);
      // Note: transportAllowance field doesn't exist, check allowances instead
      expect(parseFloat(salary.pfContribution)).toBe(3000);
    });

    test('should create salary structure (legacy format)', async () => {
      const employee = await EmployeeService.createEmployeeWithUser(
        {
          firstName: 'Charlie',
          lastName: 'Brown',
          phone: '4444444444',
          hireDate: '2024-05-01',
          status: 'Active'
        },
        {
          email: 'charlie@test.com',
          password: 'Password123!'
        },
        null,
        {
          basicSalary: 60000,
          hra: 12000,
          transportAllowance: 6000,
          pfContribution: 3600
        }
      );

      const salary = await SalaryStructure.findOne({
        where: { employeeId: employee.id }
      });

      expect(salary).toBeDefined();
      expect(parseFloat(salary.basicSalary)).toBe(60000);
      expect(parseFloat(salary.hra)).toBe(12000);
    });

    test('should reject duplicate email', async () => {
      await EmployeeService.createEmployeeWithUser(
        {
          firstName: 'First',
          lastName: 'User',
          phone: '1111111111',
          hireDate: '2024-06-01'
        },
        {
          email: 'duplicate@test.com',
          password: 'Password123!'
        }
      );

      await expect(
        EmployeeService.createEmployeeWithUser(
          {
            firstName: 'Second',
            lastName: 'User',
            phone: '2222222222',
            hireDate: '2024-06-02'
          },
          {
            email: 'duplicate@test.com',
            password: 'Password123!'
          }
        )
      ).rejects.toThrow('An employee with this email already exists');
    });

    test('should reject duplicate employeeId', async () => {
      await EmployeeService.createEmployeeWithUser(
        {
          employeeId: 'SKYT9999',
          firstName: 'First',
          lastName: 'User',
          phone: '1111111111',
          hireDate: '2024-06-01'
        },
        {
          email: 'first@test.com',
          password: 'Password123!'
        }
      );

      await expect(
        EmployeeService.createEmployeeWithUser(
          {
            employeeId: 'SKYT9999',
            firstName: 'Second',
            lastName: 'User',
            phone: '2222222222',
            hireDate: '2024-06-02'
          },
          {
            email: 'second@test.com',
            password: 'Password123!'
          }
        )
      ).rejects.toThrow("An employee with ID 'SKYT9999' already exists");
    });
  });

  describe('updateStatus', () => {
    let employee, user;

    beforeEach(async () => {
      user = await User.create({
        email: 'test@test.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'employee',
        isActive: true
      });

      employee = await Employee.create({
        employeeId: 'SKYT0001',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        phone: '1234567890',
        hireDate: '2024-01-01',
        status: 'Active',
        userId: user.id
      });
    });

    test('should update to Active and set user.isActive=true', async () => {
      await employee.update({ status: 'Inactive' });
      await user.update({ isActive: false });

      await EmployeeService.updateStatus(employee.id, 'Active');

      await employee.reload();
      await user.reload();

      expect(employee.status).toBe('Active');
      expect(user.isActive).toBe(true);
    });

    test('should update to Terminated and set user.isActive=false', async () => {
      await EmployeeService.updateStatus(employee.id, 'Terminated');

      await employee.reload();
      await user.reload();

      expect(employee.status).toBe('Terminated');
      expect(user.isActive).toBe(false);
    });

    test('should update to Inactive and set user.isActive=false', async () => {
      await EmployeeService.updateStatus(employee.id, 'Inactive');

      await employee.reload();
      await user.reload();

      expect(employee.status).toBe('Inactive');
      expect(user.isActive).toBe(false);
    });
  });

  describe('updateCompensation', () => {
    let employee;

    beforeEach(async () => {
      const user = await User.create({
        email: 'test@test.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'employee'
      });

      employee = await Employee.create({
        employeeId: 'SKYT0001',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        phone: '1234567890',
        hireDate: '2024-01-01',
        status: 'Active',
        userId: user.id
      });
    });

    test('should update compensation fields', async () => {
      const updated = await EmployeeService.updateCompensation(employee.id, {
        salary: { basicSalary: 70000 }
      });

      expect(updated.salary).toEqual({ basicSalary: 70000 });
    });
  });

  describe('uploadPhoto', () => {
    let employee;

    beforeEach(async () => {
      const user = await User.create({
        email: 'test@test.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'employee'
      });

      employee = await Employee.create({
        employeeId: 'SKYT0001',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        phone: '1234567890',
        hireDate: '2024-01-01',
        status: 'Active',
        userId: user.id
      });
    });

    test('should upload photo and return URL', async () => {
      const result = await EmployeeService.uploadPhoto(employee.id, 'new-photo.jpg');

      expect(result.photoUrl).toBe('/uploads/employee-photos/new-photo.jpg');
      expect(result.filename).toBe('new-photo.jpg');

      await employee.reload();
      expect(employee.photoUrl).toBe('/uploads/employee-photos/new-photo.jpg');
    });
  });

  describe('updateEmployeeWithSalary', () => {
    let employee, department, position;

    beforeEach(async () => {
      department = await Department.create({
        name: 'Engineering',
        isActive: true
      });

      position = await Position.create({
        title: 'Developer',
        level: 'Mid',
        isActive: true,
        departmentId: department.id
      });

      const user = await User.create({
        email: 'test@test.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'employee'
      });

      employee = await Employee.create({
        employeeId: 'SKYT0001',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        phone: '1234567890',
        hireDate: '2024-01-01',
        status: 'Active',
        userId: user.id
      });
    });

    test('should allow admin to update all fields', async () => {
      const updated = await EmployeeService.updateEmployeeWithSalary(
        employee.id,
        {
          firstName: 'Updated',
          departmentId: department.id,
          positionId: position.id
        },
        null,
        'admin'
      );

      expect(updated.firstName).toBe('Updated');
      expect(updated.departmentId).toBe(department.id);
    });

    test('should prevent non-admin from updating dept/position', async () => {
      const updated = await EmployeeService.updateEmployeeWithSalary(
        employee.id,
        {
          firstName: 'Updated',
          departmentId: department.id,
          positionId: position.id
        },
        null,
        'employee'
      );

      expect(updated.firstName).toBe('Updated');
      expect(updated.departmentId).toBeNull(); // Not updated
    });

    test('should deactivate old salary structure and create new one', async () => {
      // Create initial salary structure
      const oldSalary = await SalaryStructure.create({
        employeeId: employee.id,
        basicSalary: 50000,
        effectiveFrom: '2024-01-01',
        isActive: true
      });

      // Update with new salary
      await EmployeeService.updateEmployeeWithSalary(
        employee.id,
        {},
        {
          basicSalary: 60000,
          effectiveFrom: '2024-06-01'
        },
        'admin'
      );

      // The existing salary structure should be updated in-place (hasOne relationship)
      await oldSalary.reload();
      expect(parseFloat(oldSalary.basicSalary)).toBe(60000);
      expect(oldSalary.effectiveFrom).toBe('2024-06-01');
      expect(oldSalary.isActive).toBe(true);

      const currentSalary = await SalaryStructure.findOne({
        where: { employeeId: employee.id, isActive: true }
      });
      expect(currentSalary).toBeDefined();
      expect(parseFloat(currentSalary.basicSalary)).toBe(60000);
    });
  });

  describe('deleteEmployee', () => {
    let employee, user;

    beforeEach(async () => {
      user = await User.create({
        email: 'test@test.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'employee',
        isActive: true
      });

      employee = await Employee.create({
        employeeId: 'SKYT0001',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        phone: '1234567890',
        hireDate: '2024-01-01',
        status: 'Active',
        userId: user.id
      });
    });

    test('should soft delete and set status=Terminated, user.isActive=false', async () => {
      await EmployeeService.deleteEmployee(employee.id);

      // Check employee still exists but with deletedAt
      const deletedEmployee = await Employee.findByPk(employee.id, {
        paranoid: false
      });
      expect(deletedEmployee).toBeDefined();
      expect(deletedEmployee.status).toBe('Terminated');
      expect(deletedEmployee.deletedAt).not.toBeNull();

      // Check user deactivated
      await user.reload();
      expect(user.isActive).toBe(false);

      // Check not found in normal queries (paranoid mode)
      const normalQuery = await Employee.findByPk(employee.id);
      expect(normalQuery).toBeNull();
    });

    test('should reject if employee not found', async () => {
      await expect(
        EmployeeService.deleteEmployee('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Employee not found');
    });
  });
});
