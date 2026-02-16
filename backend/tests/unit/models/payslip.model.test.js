const db = require('../../../models');

describe('Payslip Model', () => {
  let testEmployee, testUser, testDepartment, testPosition, testPayrollData, testCreator;

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

    testPayrollData = await db.PayrollData.create({
      employeeId: testEmployee.id,
      payPeriod: '2026-02',
      payPeriodStart: '2026-02-01',
      payPeriodEnd: '2026-02-28',
      createdBy: testCreator.id
    });
  });

  afterEach(async () => {
    await db.Payslip.destroy({ where: {}, force: true });
    await db.PayrollData.destroy({ where: {}, force: true });
    await db.Employee.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
    await db.Position.destroy({ where: {}, force: true });
    await db.Department.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create payslip with required fields', async () => {
      const payslip = await db.Payslip.create({
        employeeId: testEmployee.id,
        payrollDataId: testPayrollData.id,
        payPeriod: 'February 2026',
        month: 2,
        year: 2026,
        payPeriodStart: '2026-02-01',
        payPeriodEnd: '2026-02-28',
        payslipNumber: 'PAY-2026-02-001',
        employeeInfo: { name: 'Test Employee' },
        companyInfo: { name: 'Test Company' }
      });

      expect(payslip.id).toBeDefined();
      expect(payslip.payslipNumber).toBe('PAY-2026-02-001');
      expect(payslip.month).toBe(2);
      expect(payslip.year).toBe(2026);
    });

    it('should fail without employeeId', async () => {
      await expect(db.Payslip.create({
        payrollDataId: testPayrollData.id,
        payPeriod: 'February 2026',
        month: 2,
        year: 2026,
        payPeriodStart: '2026-02-01',
        payPeriodEnd: '2026-02-28',
        payslipNumber: 'PAY-2026-02-002',
        employeeInfo: {},
        companyInfo: {}
      })).rejects.toThrow();
    });

    it('should fail without payslipNumber', async () => {
      await expect(db.Payslip.create({
        employeeId: testEmployee.id,
        payrollDataId: testPayrollData.id,
        payPeriod: 'February 2026',
        month: 2,
        year: 2026,
        payPeriodStart: '2026-02-01',
        payPeriodEnd: '2026-02-28',
        employeeInfo: {},
        companyInfo: {}
      })).rejects.toThrow();
    });
  });

  describe('Status Enum Validation', () => {
    it('should accept valid status: draft', async () => {
      const payslip = await db.Payslip.create({
        employeeId: testEmployee.id,
        payrollDataId: testPayrollData.id,
        payPeriod: 'March 2026',
        month: 3,
        year: 2026,
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        payslipNumber: 'PAY-2026-03-001',
        status: 'draft',
        employeeInfo: {},
        companyInfo: {}
      });

      expect(payslip.status).toBe('draft');
    });

    it('should accept valid status: finalized', async () => {
      const payslip = await db.Payslip.create({
        employeeId: testEmployee.id,
        payrollDataId: testPayrollData.id,
        payPeriod: 'April 2026',
        month: 4,
        year: 2026,
        payPeriodStart: '2026-04-01',
        payPeriodEnd: '2026-04-30',
        payslipNumber: 'PAY-2026-04-001',
        status: 'finalized',
        employeeInfo: {},
        companyInfo: {}
      });

      expect(payslip.status).toBe('finalized');
    });

    it('should reject invalid status', async () => {
      await expect(db.Payslip.create({
        employeeId: testEmployee.id,
        payrollDataId: testPayrollData.id,
        payPeriod: 'May 2026',
        month: 5,
        year: 2026,
        payPeriodStart: '2026-05-01',
        payPeriodEnd: '2026-05-31',
        payslipNumber: 'PAY-2026-05-001',
        status: 'invalid_status',
        employeeInfo: {},
        companyInfo: {}
      })).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should apply default status as draft', async () => {
      const payslip = await db.Payslip.create({
        employeeId: testEmployee.id,
        payrollDataId: testPayrollData.id,
        payPeriod: 'June 2026',
        month: 6,
        year: 2026,
        payPeriodStart: '2026-06-01',
        payPeriodEnd: '2026-06-30',
        payslipNumber: 'PAY-2026-06-001',
        employeeInfo: {},
        companyInfo: {}
      });

      expect(payslip.status).toBe('draft');
    });

    it('should apply default version as 1', async () => {
      const payslip = await db.Payslip.create({
        employeeId: testEmployee.id,
        payrollDataId: testPayrollData.id,
        payPeriod: 'July 2026',
        month: 7,
        year: 2026,
        payPeriodStart: '2026-07-01',
        payPeriodEnd: '2026-07-31',
        payslipNumber: 'PAY-2026-07-001',
        employeeInfo: {},
        companyInfo: {}
      });

      expect(payslip.version).toBe(1);
    });

    it('should apply default isLocked as false', async () => {
      const payslip = await db.Payslip.create({
        employeeId: testEmployee.id,
        payrollDataId: testPayrollData.id,
        payPeriod: 'August 2026',
        month: 8,
        year: 2026,
        payPeriodStart: '2026-08-01',
        payPeriodEnd: '2026-08-31',
        payslipNumber: 'PAY-2026-08-001',
        employeeInfo: {},
        companyInfo: {}
      });

      expect(payslip.isLocked).toBe(false);
    });
  });

  describe('Month and Year Validation', () => {
    it('should validate month range (1-12)', async () => {
      await expect(db.Payslip.create({
        employeeId: testEmployee.id,
        payrollDataId: testPayrollData.id,
        payPeriod: 'Invalid',
        month: 13,
        year: 2026,
        payPeriodStart: '2026-01-01',
        payPeriodEnd: '2026-01-31',
        payslipNumber: 'PAY-2026-13-001',
        employeeInfo: {},
        companyInfo: {}
      })).rejects.toThrow();
    });

    it('should validate year range (2000-2100)', async () => {
      await expect(db.Payslip.create({
        employeeId: testEmployee.id,
        payrollDataId: testPayrollData.id,
        payPeriod: 'January 1999',
        month: 1,
        year: 1999,
        payPeriodStart: '1999-01-01',
        payPeriodEnd: '1999-01-31',
        payslipNumber: 'PAY-1999-01-001',
        employeeInfo: {},
        companyInfo: {}
      })).rejects.toThrow();
    });
  });

  describe('Foreign Key Relationships', () => {
    it('should have employeeId foreign key', async () => {
      const payslip = await db.Payslip.create({
        employeeId: testEmployee.id,
        payrollDataId: testPayrollData.id,
        payPeriod: 'September 2026',
        month: 9,
        year: 2026,
        payPeriodStart: '2026-09-01',
        payPeriodEnd: '2026-09-30',
        payslipNumber: 'PAY-2026-09-001',
        employeeInfo: {},
        companyInfo: {}
      });

      expect(payslip.employeeId).toBe(testEmployee.id);
    });

    it('should have payrollDataId foreign key', async () => {
      const payslip = await db.Payslip.create({
        employeeId: testEmployee.id,
        payrollDataId: testPayrollData.id,
        payPeriod: 'October 2026',
        month: 10,
        year: 2026,
        payPeriodStart: '2026-10-01',
        payPeriodEnd: '2026-10-31',
        payslipNumber: 'PAY-2026-10-001',
        employeeInfo: {},
        companyInfo: {}
      });

      expect(payslip.payrollDataId).toBe(testPayrollData.id);
    });
  });
});
