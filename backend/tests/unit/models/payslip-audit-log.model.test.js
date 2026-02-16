const db = require('../../../models');

describe('PayslipAuditLog Model', () => {
  let testUser, testDepartment, testPosition, testEmployee, testPayrollData, testPayslip;

  beforeEach(async () => {
    const uniqueId = Math.floor(Math.random() * 100000);
    
    testDepartment = await db.Department.create({
      name: `Test Dept ${uniqueId}`,
      code: `TD${uniqueId}`
    });

    testPosition = await db.Position.create({
      title: `Test Position ${uniqueId}`,
      code: `TP${uniqueId}`,
      departmentId: testDepartment.id
    });

    testUser = await db.User.create({
      firstName: 'Payslip',
      lastName: 'Admin',
      email: `payslip${uniqueId}@example.com`,
      password: 'hashedPassword123',
      role: 'admin'
    });

    testEmployee = await db.Employee.create({
      employeeId: `EMP${uniqueId}`,
      firstName: 'Test',
      lastName: 'Employee',
      email: `emp${uniqueId}@example.com`,
      phone: '1234567890',
      userId: testUser.id,
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      hireDate: new Date('2024-01-01'),
      status: 'Active'
    });

    testPayrollData = await db.PayrollData.create({
      employeeId: testEmployee.id,
      payPeriod: '2026-02',
      payPeriodStart: new Date('2026-02-01'),
      payPeriodEnd: new Date('2026-02-28'),
      totalWorkingDays: 20,
      presentDays: 20,
      basicSalary: 50000,
      grossSalary: 60000,
      totalDeductions: 5000,
      netSalary: 55000,
      createdBy: testUser.id
    });

    testPayslip = await db.Payslip.create({
      employeeId: testEmployee.id,
      payrollDataId: testPayrollData.id,
      payPeriod: '2026-02',
      month: 2,
      year: 2026,
      payPeriodStart: '2026-02-01',
      payPeriodEnd: '2026-02-28',
      payslipNumber: `PS-${uniqueId}`,
      employeeInfo: { name: 'Test Employee', id: testEmployee.employeeId },
      companyInfo: { name: 'Test Company', address: '123 Test St' }
    });
  });

  afterEach(async () => {
    await db.PayslipAuditLog.destroy({ where: {}, force: true });
    await db.Payslip.destroy({ where: {}, force: true });
    await db.PayrollData.destroy({ where: {}, force: true });
    await db.Employee.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
    await db.Position.destroy({ where: {}, force: true });
    await db.Department.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create payslip audit log with required fields', async () => {
      const auditLog = await db.PayslipAuditLog.create({
        payslipId: testPayslip.id,
        action: 'status_change',
        performedBy: testUser.id
      });

      expect(auditLog.id).toBeDefined();
      expect(auditLog.payslipId).toBe(testPayslip.id);
      expect(auditLog.action).toBe('status_change');
      expect(auditLog.performedBy).toBe(testUser.id);
    });

    it('should fail without payslipId', async () => {
      await expect(db.PayslipAuditLog.create({
        action: 'finalize',
        performedBy: testUser.id
      })).rejects.toThrow();
    });

    it('should fail without action', async () => {
      await expect(db.PayslipAuditLog.create({
        payslipId: testPayslip.id,
        performedBy: testUser.id
      })).rejects.toThrow();
    });

    it('should fail without performedBy', async () => {
      await expect(db.PayslipAuditLog.create({
        payslipId: testPayslip.id,
        action: 'mark_paid'
      })).rejects.toThrow();
    });
  });

  describe('Action Enum Values', () => {
    it('should accept valid action values', async () => {
      const actions = ['manual_edit', 'status_change', 'finalize', 'mark_paid', 'regenerate'];
      
      for (const action of actions) {
        const log = await db.PayslipAuditLog.create({
          payslipId: testPayslip.id,
          action,
          performedBy: testUser.id
        });
        expect(log.action).toBe(action);
      }
    });

    it('should reject invalid action values', async () => {
      await expect(db.PayslipAuditLog.create({
        payslipId: testPayslip.id,
        action: 'invalid_action',
        performedBy: testUser.id
      })).rejects.toThrow();
    });
  });

  describe('Optional Fields', () => {
    it('should store reason for manual edits', async () => {
      const auditLog = await db.PayslipAuditLog.create({
        payslipId: testPayslip.id,
        action: 'manual_edit',
        performedBy: testUser.id,
        reason: 'Correcting overtime calculation error'
      });

      expect(auditLog.reason).toBe('Correcting overtime calculation error');
    });

    it('should store changes as JSON for audit trail', async () => {
      const auditLog = await db.PayslipAuditLog.create({
        payslipId: testPayslip.id,
        action: 'manual_edit',
        performedBy: testUser.id,
        changes: {
          before: { overtime: 0 },
          after: { overtime: 5000 }
        }
      });

      expect(auditLog.changes).toEqual({
        before: { overtime: 0 },
        after: { overtime: 5000 }
      });
    });

    it('should store ipAddress and userAgent', async () => {
      const auditLog = await db.PayslipAuditLog.create({
        payslipId: testPayslip.id,
        action: 'finalize',
        performedBy: testUser.id,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0'
      });

      expect(auditLog.ipAddress).toBe('192.168.1.100');
      expect(auditLog.userAgent).toBe('Mozilla/5.0');
    });
  });
});
