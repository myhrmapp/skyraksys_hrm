const db = require('../../../models');

describe('PayrollData Model', () => {
  let testEmployee, testUser, testDepartment, testPosition, testCreator;

  beforeEach(async () => {
    const uniqueId = Math.floor(Math.random() * 100000);
    
    testDepartment = await db.Department.create({
      name: `Test Department ${uniqueId}`,
      code: `TD${uniqueId}`
    });

    testPosition = await db.Position.create({
      title: `Test Position ${uniqueId}`,
      code: `TP${uniqueId}`,
      departmentId: testDepartment.id
    });

    testUser = await db.User.create({
      firstName: 'Test',
      lastName: 'User',
      email: `test${uniqueId}@example.com`,
      password: 'hashedpassword',
      role: 'employee'
    });

    testEmployee = await db.Employee.create({
      userId: testUser.id,
      employeeId: `EMP${uniqueId}`,
      firstName: 'Test',
      lastName: 'Employee',
      email: `emp${uniqueId}@company.com`,
      hireDate: '2024-01-01',
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      status: 'Active'
    });

    testCreator = await db.User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: `admin${uniqueId}@example.com`,
      password: 'hashedpassword',
      role: 'admin'
    });
  });

  afterEach(async () => {
    await db.PayrollData.destroy({ where: {}, force: true });
    await db.Employee.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
    await db.Position.destroy({ where: {}, force: true });
    await db.Department.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create payroll data with required fields', async () => {
      const payrollData = await db.PayrollData.create({
        employeeId: testEmployee.id,
        payPeriod: '2026-02',
        payPeriodStart: '2026-02-01',
        payPeriodEnd: '2026-02-28',
        createdBy: testCreator.id
      });

      expect(payrollData.id).toBeDefined();
      expect(payrollData.employeeId).toBe(testEmployee.id);
      expect(payrollData.payPeriod).toBe('2026-02');
    });

    it('should fail without employeeId', async () => {
      await expect(db.PayrollData.create({
        payPeriod: '2026-02',
        payPeriodStart: '2026-02-01',
        payPeriodEnd: '2026-02-28',
        createdBy: testCreator.id
      })).rejects.toThrow();
    });

    it('should fail without payPeriod', async () => {
      await expect(db.PayrollData.create({
        employeeId: testEmployee.id,
        payPeriodStart: '2026-02-01',
        payPeriodEnd: '2026-02-28',
        createdBy: testCreator.id
      })).rejects.toThrow();
    });

    it('should fail without createdBy', async () => {
      await expect(db.PayrollData.create({
        employeeId: testEmployee.id,
        payPeriod: '2026-02',
        payPeriodStart: '2026-02-01',
        payPeriodEnd: '2026-02-28'
      })).rejects.toThrow();
    });
  });

  describe('Unique Constraint', () => {
    it('should enforce unique employeeId + payPeriod combination', async () => {
      await db.PayrollData.create({
        employeeId: testEmployee.id,
        payPeriod: '2026-03',
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        createdBy: testCreator.id
      });

      await expect(db.PayrollData.create({
        employeeId: testEmployee.id,
        payPeriod: '2026-03',
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        createdBy: testCreator.id
      })).rejects.toThrow();
    });
  });

  describe('Status Enum Validation', () => {
    it('should accept valid status: draft', async () => {
      const payrollData = await db.PayrollData.create({
        employeeId: testEmployee.id,
        payPeriod: '2026-04',
        payPeriodStart: '2026-04-01',
        payPeriodEnd: '2026-04-30',
        status: 'draft',
        createdBy: testCreator.id
      });

      expect(payrollData.status).toBe('draft');
    });

    it('should accept valid status: calculated', async () => {
      const payrollData = await db.PayrollData.create({
        employeeId: testEmployee.id,
        payPeriod: '2026-05',
        payPeriodStart: '2026-05-01',
        payPeriodEnd: '2026-05-31',
        status: 'calculated',
        createdBy: testCreator.id
      });

      expect(payrollData.status).toBe('calculated');
    });

    it('should reject invalid status', async () => {
      await expect(db.PayrollData.create({
        employeeId: testEmployee.id,
        payPeriod: '2026-06',
        payPeriodStart: '2026-06-01',
        payPeriodEnd: '2026-06-30',
        status: 'invalid_status',
        createdBy: testCreator.id
      })).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should apply default totalWorkingDays as 21', async () => {
      const payrollData = await db.PayrollData.create({
        employeeId: testEmployee.id,
        payPeriod: '2026-07',
        payPeriodStart: '2026-07-01',
        payPeriodEnd: '2026-07-31',
        createdBy: testCreator.id
      });

      expect(payrollData.totalWorkingDays).toBe(21);
    });

    it('should apply default presentDays as 21', async () => {
      const payrollData = await db.PayrollData.create({
        employeeId: testEmployee.id,
        payPeriod: '2026-08',
        payPeriodStart: '2026-08-01',
        payPeriodEnd: '2026-08-31',
        createdBy: testCreator.id
      });

      expect(payrollData.presentDays).toBe(21);
    });

    it('should apply default status as draft', async () => {
      const payrollData = await db.PayrollData.create({
        employeeId: testEmployee.id,
        payPeriod: '2026-09',
        payPeriodStart: '2026-09-01',
        payPeriodEnd: '2026-09-30',
        createdBy: testCreator.id
      });

      expect(payrollData.status).toBe('draft');
    });

    it('should apply default paymentMode as bank_transfer', async () => {
      const payrollData = await db.PayrollData.create({
        employeeId: testEmployee.id,
        payPeriod: '2026-10',
        payPeriodStart: '2026-10-01',
        payPeriodEnd: '2026-10-31',
        createdBy: testCreator.id
      });

      expect(payrollData.paymentMode).toBe('bank_transfer');
    });
  });

  describe('JSON Fields', () => {
    it('should store variableEarnings as JSON', async () => {
      const payrollData = await db.PayrollData.create({
        employeeId: testEmployee.id,
        payPeriod: '2026-11',
        payPeriodStart: '2026-11-01',
        payPeriodEnd: '2026-11-30',
        variableEarnings: {
          performanceBonus: 5000,
          overtimeAllowance: 2000
        },
        createdBy: testCreator.id
      });

      expect(payrollData.variableEarnings.performanceBonus).toBe(5000);
      expect(payrollData.variableEarnings.overtimeAllowance).toBe(2000);
    });

    it('should store variableDeductions as JSON', async () => {
      const payrollData = await db.PayrollData.create({
        employeeId: testEmployee.id,
        payPeriod: '2026-12',
        payPeriodStart: '2026-12-01',
        payPeriodEnd: '2026-12-31',
        variableDeductions: {
          loanEmi: 1500,
          lateFine: 200
        },
        createdBy: testCreator.id
      });

      expect(payrollData.variableDeductions.loanEmi).toBe(1500);
      expect(payrollData.variableDeductions.lateFine).toBe(200);
    });
  });
});
