const PayrollService = require('../../services/PayrollService');
const db = require('../../models');
const { testDataHelpers } = require('../utils/testDataHelpers');

describe('PayrollService', () => {
  let testEmployee, testSalaryStructure;

  beforeEach(async () => {
    await testDataHelpers.clearTestData();
    
    // Create test employee
    testEmployee = await testDataHelpers.createTestEmployee({
      firstName: 'Test',
      lastName: 'Employee',
      email: 'test.employee@test.com',
      department: 'IT',
      position: 'Developer'
    });

    // Create salary structure
    testSalaryStructure = await db.SalaryStructure.create({
      employeeId: testEmployee.id,
      basicSalary: 50000,
      hra: 12000, // Total allowances (combines what was 10000 HRA + 2000 transport)
      tds: 5000, // 10% of 50000
      otherDeductions: 500, // Health Insurance
      effectiveFrom: new Date()
    });

    // Update employee with salary structure
    await testEmployee.update({ salaryStructureId: testSalaryStructure.id });
  });

  afterEach(async () => {
    await testDataHelpers.clearTestData();
  });

  describe('calculatePayroll', () => {
    it('should calculate payroll correctly', async () => {
      const payPeriodStart = new Date();
      const payPeriodEnd = new Date();
      payPeriodEnd.setDate(payPeriodEnd.getDate() + 29); // 30-day period

      const calculation = await PayrollService.calculatePayroll(
        testEmployee.id,
        payPeriodStart,
        payPeriodEnd
      );

      expect(calculation).toBeDefined();
      expect(calculation.basicSalary).toBe(50000);
      expect(calculation.totalAllowances).toBe(12000); // HRA total
      expect(calculation.totalDeductions).toBe(5500); // tds 5000 + other 500
      expect(calculation.grossPay).toBe(62000); // 50000 + 12000
      expect(calculation.netPay).toBe(56500); // 62000 - 5500
    });

    it('should apply overrides correctly', async () => {
      const payPeriodStart = new Date();
      const payPeriodEnd = new Date();
      payPeriodEnd.setDate(payPeriodEnd.getDate() + 29);

      const overrides = {
        basicSalary: 60000,
        allowances: [
          { name: 'Bonus', amount: 5000, isPercentage: false }
        ],
        deductions: [
          { name: 'Extra Deduction', amount: 1000, isPercentage: false }
        ]
      };

      const calculation = await PayrollService.calculatePayroll(
        testEmployee.id,
        payPeriodStart,
        payPeriodEnd,
        overrides
      );

      expect(calculation.basicSalary).toBe(60000);
      expect(calculation.allowances.some(a => a.name === 'Bonus')).toBe(true);
      expect(calculation.deductions.some(d => d.name === 'Extra Deduction')).toBe(true);
    });

    it('should throw error for employee without salary structure', async () => {
      // Create employee without salary structure
      const empWithoutSalary = await testDataHelpers.createTestEmployee({
        firstName: 'No',
        lastName: 'Salary',
        email: 'no.salary@test.com'
      });

      const payPeriodStart = new Date();
      const payPeriodEnd = new Date();
      payPeriodEnd.setDate(payPeriodEnd.getDate() + 29);

      await expect(PayrollService.calculatePayroll(
        empWithoutSalary.id,
        payPeriodStart,
        payPeriodEnd
      )).rejects.toThrow('Employee does not have a salary structure assigned');
    });
  });

  describe('createPayroll', () => {
    it('should create payroll with items', async () => {
      const payPeriodStart = new Date();
      const payPeriodEnd = new Date();
      payPeriodEnd.setDate(payPeriodEnd.getDate() + 29);

      const result = await PayrollService.createPayroll(
        testEmployee.id,
        payPeriodStart,
        payPeriodEnd
      );

      expect(result).toBeDefined();
      expect(result.employeeId).toBe(testEmployee.id);
      expect(result.status).toBe('draft');
      expect(result.payrollItems).toBeDefined();
      expect(result.payrollItems.length).toBeGreaterThan(0);
      
      // Check allowance items (only HRA — no transportAllowance field in model)
      const allowanceItems = result.payrollItems.filter(item => item.type === 'allowance');
      expect(allowanceItems.length).toBe(1);
      
      // Check deduction items
      const deductionItems = result.payrollItems.filter(item => item.type === 'deduction');
      expect(deductionItems.length).toBe(2);
    });

    it('should prevent duplicate payroll creation', async () => {
      const payPeriodStart = new Date();
      const payPeriodEnd = new Date();
      payPeriodEnd.setDate(payPeriodEnd.getDate() + 29);

      // Create first payroll
      await PayrollService.createPayroll(
        testEmployee.id,
        payPeriodStart,
        payPeriodEnd
      );

      // Try to create duplicate
      await expect(PayrollService.createPayroll(
        testEmployee.id,
        payPeriodStart,
        payPeriodEnd
      )).rejects.toThrow('Payroll already exists for this employee and pay period');
    });
  });

  describe('approvePayroll', () => {
    let payroll;

    beforeEach(async () => {
      const payPeriodStart = new Date();
      const payPeriodEnd = new Date();
      payPeriodEnd.setDate(payPeriodEnd.getDate() + 29);

      payroll = await PayrollService.createPayroll(
        testEmployee.id,
        payPeriodStart,
        payPeriodEnd
      );
    });

    it('should approve draft payroll', async () => {
      const approverId = testEmployee.userId;
      const comments = 'Payroll approved';

      const result = await PayrollService.approvePayroll(
        payroll.id,
        approverId,
        comments
      );

      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe(approverId);
      expect(result.approvalComments).toBe(comments);
      expect(result.approvedAt).toBeDefined();
    });

    it('should reject non-draft payroll approval', async () => {
      // First approve the payroll
      await PayrollService.approvePayroll(payroll.id, testEmployee.userId, 'First approval');

      // Try to approve again
      await expect(PayrollService.approvePayroll(payroll.id, testEmployee.userId, 'Second approval'))
        .rejects.toThrow('Payroll is not in draft status');
    });
  });

  describe('processPayroll', () => {
    let approvedPayroll;

    beforeEach(async () => {
      const payPeriodStart = new Date();
      const payPeriodEnd = new Date();
      payPeriodEnd.setDate(payPeriodEnd.getDate() + 29);

      const payroll = await PayrollService.createPayroll(
        testEmployee.id,
        payPeriodStart,
        payPeriodEnd
      );

      approvedPayroll = await PayrollService.approvePayroll(
        payroll.id,
        testEmployee.userId,
        'Approved for processing'
      );
    });

    it('should process approved payroll', async () => {
      const processedBy = testEmployee.userId;
      const paymentDetails = {
        bankAccount: '1234567890',
        transactionId: 'TXN001'
      };

      const result = await PayrollService.processPayroll(
        approvedPayroll.id,
        processedBy,
        paymentDetails
      );

      expect(result.status).toBe('paid');
      expect(result.updatedBy).toBe(processedBy);
      expect(result.disbursementDate).toBeDefined();
      expect(JSON.parse(result.calculationNotes)).toEqual(paymentDetails);
    });

    it('should reject non-approved payroll processing', async () => {
      // Create new draft payroll
      const payPeriodStart = new Date();
      payPeriodStart.setMonth(payPeriodStart.getMonth() + 1);
      const payPeriodEnd = new Date(payPeriodStart);
      payPeriodEnd.setDate(payPeriodEnd.getDate() + 29);

      const draftPayroll = await PayrollService.createPayroll(
        testEmployee.id,
        payPeriodStart,
        payPeriodEnd
      );

      await expect(PayrollService.processPayroll(draftPayroll.id, testEmployee.userId, {}))
        .rejects.toThrow('Payroll is not approved');
    });
  });

  describe('generatePayslip', () => {
    let processedPayroll;

    beforeEach(async () => {
      const payPeriodStart = new Date();
      const payPeriodEnd = new Date();
      payPeriodEnd.setDate(payPeriodEnd.getDate() + 29);

      const payroll = await PayrollService.createPayroll(
        testEmployee.id,
        payPeriodStart,
        payPeriodEnd
      );

      const approved = await PayrollService.approvePayroll(payroll.id, testEmployee.userId, 'Approved');
      processedPayroll = await PayrollService.processPayroll(approved.id, testEmployee.userId, {});
    });

    it('should generate comprehensive payslip', async () => {
      const payslip = await PayrollService.generatePayslip(processedPayroll.id);

      expect(payslip).toBeDefined();
      expect(payslip.employee.name).toBe('Test Employee');
      expect(payslip.employee.department).toBe('IT');
      expect(payslip.payPeriod.start).toBeDefined();
      expect(payslip.payPeriod.end).toBeDefined();
      expect(payslip.earnings.basicSalary).toBe(50000);
      expect(payslip.earnings.allowances.length).toBe(1);
      expect(payslip.deductions.length).toBe(2);
      expect(payslip.netPay).toBe(56500);
      expect(payslip.generatedAt).toBeDefined();
    });
  });

  describe('getPayrollSummary', () => {
    beforeEach(async () => {
      // Create multiple employees and payrolls
      const employee2 = await testDataHelpers.createTestEmployee({
        firstName: 'Second',
        lastName: 'Employee',
        email: 'second@test.com',
        department: 'HR'
      });

      const salaryStructure2 = await db.SalaryStructure.create({
        employeeId: employee2.id,
        basicSalary: 40000,
        hra: 0,
        transportAllowance: 0,
        tds: 0,
        otherDeductions: 0,
        effectiveFrom: new Date()
      });

      await employee2.update({ salaryStructureId: salaryStructure2.id });

      // Use fixed dates within the current month to ensure they fall within summary query
      const payPeriodStart = new Date();
      payPeriodStart.setDate(2); // 2nd of current month
      
      const payPeriodEnd = new Date();
      payPeriodEnd.setDate(25); // 25th of current month

      // Create payrolls for both employees
      await PayrollService.createPayroll(testEmployee.id, payPeriodStart, payPeriodEnd);
      await PayrollService.createPayroll(employee2.id, payPeriodStart, payPeriodEnd);
    });

    it('should return correct payroll summary', async () => {
      const startDate = new Date();
      startDate.setDate(1); // Start of month
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // End of month

      const summary = await PayrollService.getPayrollSummary(startDate, endDate);

      expect(summary.totalEmployees).toBe(2);
      expect(summary.totalGrossPay).toBe(102000); // 62000 + 40000
      expect(summary.totalNetPay).toBe(96500); // 56500 + 40000
      expect(summary.statusBreakdown.draft).toBe(2);
      expect(summary.departmentBreakdown.IT).toBeDefined();
      expect(summary.departmentBreakdown.HR).toBeDefined();
      expect(summary.departmentBreakdown.IT.employees).toBe(1);
      expect(summary.departmentBreakdown.HR.employees).toBe(1);
    });

    it('should filter by department', async () => {
      const startDate = new Date();
      startDate.setDate(1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);

      const summary = await PayrollService.getPayrollSummary(
        startDate,
        endDate,
        { department: 'IT' }
      );

      expect(summary.totalEmployees).toBe(1);
      expect(summary.totalGrossPay).toBe(62000);
    });
  });

  describe('performPayrollCalculation', () => {
    it('should handle percentage-based allowances and deductions', async () => {
      const employee = await db.Employee.findByPk(testEmployee.id, {
        include: [{ model: db.SalaryStructure, as: 'salaryStructure' }]
      });

      const calculation = await PayrollService.performPayrollCalculation(
        employee,
        new Date(),
        new Date(),
        {}
      );

      // House Rent Allowance: flat value from salaryStructure.hra = 12000
      const hraAllowance = calculation.allowances.find(a => a.name === 'House Rent Allowance');
      expect(hraAllowance.amount).toBe(12000);

      // Note: transportAllowance field does not exist in SalaryStructure model
      // so no Transport Allowance is produced

      // Income Tax: 10% of 50000 = 5000
      const incomeTax = calculation.deductions.find(d => d.name === 'Income Tax');
      expect(incomeTax.amount).toBe(5000);

      // Health Insurance: Fixed 500
      const healthInsurance = calculation.deductions.find(d => d.name === 'Other Deductions');
      expect(healthInsurance.amount).toBe(500);
    });
  });
});
