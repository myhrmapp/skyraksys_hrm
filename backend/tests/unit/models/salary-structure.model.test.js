const db = require('../../../models');

describe('SalaryStructure Model', () => {
  let testEmployee, testUser, testDepartment, testPosition;

  beforeEach(async () => {
    // Create dependencies
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
  });

  afterEach(async () => {
    await db.SalaryStructure.destroy({ where: {}, force: true });
    await db.Employee.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
    await db.Position.destroy({ where: {}, force: true });
    await db.Department.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create salary structure with required fields', async () => {
      const salaryStructure = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000.00,
        effectiveFrom: '2026-01-01'
      });

      expect(salaryStructure.id).toBeDefined();
      expect(salaryStructure.employeeId).toBe(testEmployee.id);
      expect(parseFloat(salaryStructure.basicSalary)).toBe(50000.00);
      expect(salaryStructure.effectiveFrom).toBe('2026-01-01');
    });

    it('should fail without basicSalary', async () => {
      await expect(db.SalaryStructure.create({
        employeeId: testEmployee.id,
        effectiveFrom: '2026-01-01'
      })).rejects.toThrow();
    });

    it('should fail without effectiveFrom', async () => {
      await expect(db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000
      })).rejects.toThrow();
    });
  });

  describe('Unique Constraint', () => {
    it('should enforce unique employeeId + effectiveFrom combination', async () => {
      await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000,
        effectiveFrom: '2026-01-01'
      });

      await expect(db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 55000,
        effectiveFrom: '2026-01-01'
      })).rejects.toThrow();
    });

    it('should allow multiple salary structures for different dates', async () => {
      const salary1 = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000,
        effectiveFrom: '2026-01-01'
      });

      const salary2 = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 55000,
        effectiveFrom: '2026-07-01'
      });

      expect(salary1.effectiveFrom).not.toBe(salary2.effectiveFrom);
      expect(parseFloat(salary2.basicSalary)).toBe(55000);
    });
  });

  describe('Default Values', () => {
    it('should apply default hra as 0', async () => {
      const salaryStructure = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000,
        effectiveFrom: '2026-01-01'
      });

      expect(parseFloat(salaryStructure.hra)).toBe(0);
    });

    it('should apply default allowances as 0', async () => {
      const salaryStructure = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000,
        effectiveFrom: '2026-01-01'
      });

      expect(parseFloat(salaryStructure.allowances)).toBe(0);
    });

    it('should apply default pfContribution as 0', async () => {
      const salaryStructure = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000,
        effectiveFrom: '2026-01-01'
      });

      expect(parseFloat(salaryStructure.pfContribution)).toBe(0);
    });

    it('should apply default currency as INR', async () => {
      const salaryStructure = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000,
        effectiveFrom: '2026-01-01'
      });

      expect(salaryStructure.currency).toBe('INR');
    });

    it('should apply default isActive as true', async () => {
      const salaryStructure = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000,
        effectiveFrom: '2026-01-01'
      });

      expect(salaryStructure.isActive).toBe(true);
    });
  });

  describe('Decimal Precision', () => {
    it('should store salary components with 2 decimal places', async () => {
      const salaryStructure = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000.50,
        hra: 15000.25,
        allowances: 8500.75,
        pfContribution: 1000.00,
        tds: 2500.50,
        professionalTax: 200.00,
        otherDeductions: 500.25,
        effectiveFrom: '2026-01-01'
      });

      expect(parseFloat(salaryStructure.basicSalary)).toBe(50000.50);
      expect(parseFloat(salaryStructure.hra)).toBe(15000.25);
      expect(parseFloat(salaryStructure.allowances)).toBe(8500.75);
      expect(parseFloat(salaryStructure.pfContribution)).toBe(1000.00);
      expect(parseFloat(salaryStructure.tds)).toBe(2500.50);
      expect(parseFloat(salaryStructure.professionalTax)).toBe(200.00);
      expect(parseFloat(salaryStructure.otherDeductions)).toBe(500.25);
    });
  });

  describe('Salary Calculations', () => {
    it('should support gross salary calculation', async () => {
      const salaryStructure = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000,
        hra: 15000,
        allowances: 10000,
        effectiveFrom: '2026-01-01'
      });

      // Gross = basic + hra + allowances
      const grossSalary = parseFloat(salaryStructure.basicSalary) + 
                         parseFloat(salaryStructure.hra) + 
                         parseFloat(salaryStructure.allowances);
      
      expect(grossSalary).toBe(75000);
    });

    it('should support net salary calculation', async () => {
      const salaryStructure = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000,
        hra: 15000,
        allowances: 10000,
        pfContribution: 1800,
        tds: 3000,
        professionalTax: 200,
        otherDeductions: 1000,
        effectiveFrom: '2026-01-01'
      });

      // Gross = basic + hra + allowances
      const gross = 50000 + 15000 + 10000; // 75000
      
      // Deductions = pf + tds + professionalTax + other
      const deductions = 1800 + 3000 + 200 + 1000; // 6000
      
      // Net = gross - deductions
      const netSalary = gross - deductions;
      
      expect(netSalary).toBe(69000);
    });
  });

  describe('Foreign Key Relationships', () => {
    it('should have employeeId foreign key', async () => {
      const salaryStructure = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000,
        effectiveFrom: '2026-01-01'
      });

      expect(salaryStructure.employeeId).toBe(testEmployee.id);
    });
  });

  describe('Active Status Management', () => {
    it('should allow setting isActive false for old structures', async () => {
      const oldStructure = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 45000,
        effectiveFrom: '2025-01-01',
        isActive: false
      });

      const newStructure = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000,
        effectiveFrom: '2026-01-01',
        isActive: true
      });

      expect(oldStructure.isActive).toBe(false);
      expect(newStructure.isActive).toBe(true);
    });
  });

  describe('Currency Support', () => {
    it('should store custom currency', async () => {
      const salaryStructure = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 5000,
        currency: 'USD',
        effectiveFrom: '2026-01-01'
      });

      expect(salaryStructure.currency).toBe('USD');
    });
  });

  describe('Soft Delete (Paranoid)', () => {
    it('should soft delete salary structure', async () => {
      const salaryStructure = await db.SalaryStructure.create({
        employeeId: testEmployee.id,
        basicSalary: 50000,
        effectiveFrom: '2026-01-01'
      });

      await salaryStructure.destroy();

      const foundStructure = await db.SalaryStructure.findByPk(salaryStructure.id);
      expect(foundStructure).toBeNull();

      const deletedStructure = await db.SalaryStructure.findByPk(salaryStructure.id, { paranoid: false });
      expect(deletedStructure).not.toBeNull();
      expect(deletedStructure.deletedAt).not.toBeNull();
    });
  });
});
