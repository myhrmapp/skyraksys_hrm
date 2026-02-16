const db = require('../../../models');

describe('Employee Model', () => {
  let testDepartment, testPosition, testUser;

  beforeEach(async () => {
    // Create dependencies
    testDepartment = await db.Department.create({
      name: 'Test Department',
      code: 'TD001'
    });

    testPosition = await db.Position.create({
      title: 'Test Position',
      code: 'TP001',
      departmentId: testDepartment.id
    });

    testUser = await db.User.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'hashedpassword',
      role: 'employee'
    });
  });

  afterEach(async () => {
    // Clean up in reverse order of dependencies
    await db.Employee.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
    await db.Position.destroy({ where: {}, force: true });
    await db.Department.destroy({ where: {}, force: true });
  });

  describe('Employee Creation', () => {
    it('should create employee with required fields', async () => {
      const employee = await db.Employee.create({
        userId: testUser.id,
        employeeId: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        phone: '9876543210',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id,
        status: 'Active'
      });

      expect(employee.id).toBeDefined();
      expect(employee.employeeId).toBe('EMP001');
      expect(employee.firstName).toBe('John');
      expect(employee.status).toBe('Active');
    });

    it('should fail with duplicate employeeId', async () => {
      await db.Employee.create({
        userId: testUser.id,
        employeeId: 'EMP002',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john1@company.com',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id
      });

      await expect(db.Employee.create({
        employeeId: 'EMP002',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@company.com',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id
      })).rejects.toThrow();
    });

    it('should validate email format', async () => {
      await expect(db.Employee.create({
        employeeId: 'EMP003',
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id
      })).rejects.toThrow();
    });

    it('should validate phone number length', async () => {
      await expect(db.Employee.create({
        employeeId: 'EMP004',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@company.com',
        phone: '123', // Too short
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id
      })).rejects.toThrow();
    });
  });

  describe('Statutory Details Validation', () => {
    it('should validate Aadhaar number format', async () => {
      await expect(db.Employee.create({
        employeeId: 'EMP005',
        firstName: 'Test',
        lastName: 'User',
        email: 'test5@company.com',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id,
        aadhaarNumber: '123' // Invalid format
      })).rejects.toThrow();
    });

    it('should accept valid Aadhaar number', async () => {
      const employee = await db.Employee.create({
        employeeId: 'EMP006',
        firstName: 'Test',
        lastName: 'User',
        email: 'test6@company.com',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id,
        aadhaarNumber: '123456789012'
      });

      expect(employee.aadhaarNumber).toBe('123456789012');
    });

    it('should validate PAN number format', async () => {
      await expect(db.Employee.create({
        employeeId: 'EMP007',
        firstName: 'Test',
        lastName: 'User',
        email: 'test7@company.com',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id,
        panNumber: 'INVALID'
      })).rejects.toThrow();
    });

    it('should accept valid PAN number', async () => {
      const employee = await db.Employee.create({
        employeeId: 'EMP008',
        firstName: 'Test',
        lastName: 'User',
        email: 'test8@company.com',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id,
        panNumber: 'ABCDE1234F'
      });

      expect(employee.panNumber).toBe('ABCDE1234F');
    });

    it('should validate IFSC code format', async () => {
      await expect(db.Employee.create({
        employeeId: 'EMP009',
        firstName: 'Test',
        lastName: 'User',
        email: 'test9@company.com',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id,
        ifscCode: 'INVALID'
      })).rejects.toThrow();
    });

    it('should accept valid IFSC code', async () => {
      const employee = await db.Employee.create({
        employeeId: 'EMP010',
        firstName: 'Test',
        lastName: 'User',
        email: 'test10@company.com',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id,
        ifscCode: 'SBIN0001234'
      });

      expect(employee.ifscCode).toBe('SBIN0001234');
    });
  });

  describe('Employment Status', () => {
    it('should accept valid employment statuses', async () => {
      const statuses = ['Active', 'Inactive', 'On Leave', 'Terminated'];

      for (const status of statuses) {
        const employee = await db.Employee.create({
          employeeId: `EMP-${status}`,
          firstName: 'Test',
          lastName: 'User',
          email: `${status.toLowerCase().replace(/\s+/g, '-')}@company.com`,
          hireDate: '2024-01-01',
          departmentId: testDepartment.id,
          positionId: testPosition.id,
          status: status
        });

        expect(employee.status).toBe(status);
      }
    });

    it('should default to Active status', async () => {
      const employee = await db.Employee.create({
        employeeId: 'EMP011',
        firstName: 'Test',
        lastName: 'User',
        email: 'test11@company.com',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id
      });

      expect(employee.status).toBe('Active');
    });
  });

  describe('Employment Type', () => {
    it('should accept valid employment types', async () => {
      const types = ['Full-time', 'Part-time', 'Contract', 'Intern'];

      for (const type of types) {
        const employee = await db.Employee.create({
          employeeId: `EMP-${type}`,
          firstName: 'Test',
          lastName: 'User',
          email: `${type.toLowerCase().replace('-', '')}@company.com`,
          hireDate: '2024-01-01',
          departmentId: testDepartment.id,
          positionId: testPosition.id,
          employmentType: type
        });

        expect(employee.employmentType).toBe(type);
      }
    });

    it('should default to Full-time', async () => {
      const employee = await db.Employee.create({
        employeeId: 'EMP012',
        firstName: 'Test',
        lastName: 'User',
        email: 'test12@company.com',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id
      });

      expect(employee.employmentType).toBe('Full-time');
    });
  });

  describe('Manager Hierarchy', () => {
    it('should support manager assignment', async () => {
      const manager = await db.Employee.create({
        employeeId: 'MGR001',
        firstName: 'Manager',
        lastName: 'User',
        email: 'manager@company.com',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id
      });

      const employee = await db.Employee.create({
        employeeId: 'EMP013',
        firstName: 'Test',
        lastName: 'User',
        email: 'test13@company.com',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id,
        managerId: manager.id
      });

      expect(employee.managerId).toBe(manager.id);
    });
  });

  describe('Personal Details', () => {
    it('should validate PIN code format', async () => {
      await expect(db.Employee.create({
        employeeId: 'EMP014',
        firstName: 'Test',
        lastName: 'User',
        email: 'test14@company.com',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id,
        pinCode: '123' // Invalid - must be 6 digits
      })).rejects.toThrow();
    });

    it('should accept valid PIN code', async () => {
      const employee = await db.Employee.create({
        employeeId: 'EMP015',
        firstName: 'Test',
        lastName: 'User',
        email: 'test15@company.com',
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id,
        pinCode: '560001'
      });

      expect(employee.pinCode).toBe('560001');
    });

    it('should accept valid gender values', async () => {
      const genders = ['Male', 'Female', 'Other'];

      for (const gender of genders) {
        const employee = await db.Employee.create({
          employeeId: `EMP-${gender}`,
          firstName: 'Test',
          lastName: 'User',
          email: `${gender.toLowerCase()}@company.com`,
          hireDate: '2024-01-01',
          departmentId: testDepartment.id,
          positionId: testPosition.id,
          gender: gender
        });

        expect(employee.gender).toBe(gender);
      }
    });
  });

  describe('Date Fields', () => {
    it('should store date fields correctly', async () => {
      const employee = await db.Employee.create({
        employeeId: 'EMP016',
        firstName: 'Test',
        lastName: 'User',
        email: 'test16@company.com',
        hireDate: '2024-01-01',
        joiningDate: '2024-01-15',
        dateOfBirth: '1990-05-20',
        departmentId: testDepartment.id,
        positionId: testPosition.id
      });

      expect(employee.hireDate).toBeDefined();
      expect(employee.joiningDate).toBeDefined();
      expect(employee.dateOfBirth).toBeDefined();
    });
  });
});
