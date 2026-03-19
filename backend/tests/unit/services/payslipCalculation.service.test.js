const { payslipCalculationService } = require('../../../services/payslipCalculation.service');

describe('PayslipCalculationService', () => {
  const mockEmployee = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    basicSalary: 50000,
    transportAllowance: 5000,
    housingAllowance: 10000
  };

  const mockSalaryStructure = {
    basicSalary: 50000,
    hra: 10000,
    allowances: 10000
  };

  describe('calculatePayslip', () => {
    it('should calculate complete payslip for full month', () => {
      const attendance = {
        totalWorkingDays: 26,
        presentDays: 26,
        paidDays: 26,
        lopDays: 0
      };

      const result = payslipCalculationService.calculatePayslip(
        mockEmployee,
        mockSalaryStructure,
        attendance
      );

      expect(result.success).toBe(true);
      expect(result.grossSalary).toBeGreaterThan(0);
      expect(result.netPay).toBeGreaterThan(0);
      expect(result.earnings).toBeDefined();
      expect(result.deductions).toBeDefined();
    });

    it('should calculate payslip for partial month', () => {
      const attendance = {
        totalWorkingDays: 26,
        presentDays: 15,
        paidDays: 15,
        lopDays: 11
      };

      const result = payslipCalculationService.calculatePayslip(
        mockEmployee,
        mockSalaryStructure,
        attendance
      );

      expect(result.success).toBe(true);
      expect(result.grossSalary).toBeLessThan(70000); // Less than full month
    });

    it('should handle zero working days', () => {
      const attendance = {
        totalWorkingDays: 26,
        presentDays: 0,
        paidDays: 0,
        lopDays: 26
      };

      const result = payslipCalculationService.calculatePayslip(
        mockEmployee,
        mockSalaryStructure,
        attendance
      );

      expect(result.success).toBe(true);
      // Note: Service may still calculate allowances for zero days
      expect(result.netPay).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateEarnings', () => {
    it('should calculate all earnings components', () => {
      const result = payslipCalculationService.calculateEarnings(
        mockSalaryStructure,
        26,
        26,
        0,
        {}
      );

      expect(result.basicSalary).toBe(50000);
      expect(result.hra).toBe(10000);
      expect(result.allowances).toBe(10000);
    });

    it('should prorate earnings for partial month', () => {
      const result = payslipCalculationService.calculateEarnings(
        mockSalaryStructure,
        26,
        13,
        0,
        {}
      );

      expect(result.basicSalary).toBe(25000);
      expect(result.hra).toBe(5000);
    });
  });

  describe('calculateDeductions', () => {
    it('should calculate statutory deductions', () => {
      const earnings = {
        basicSalary: 50000,
        hra: 10000,
        transportAllowance: 5000,
        specialAllowance: 5000
      };
      const grossSalary = 70000;

      const result = payslipCalculationService.calculateDeductions(
        earnings,
        grossSalary,
        mockSalaryStructure,
        {}
      );

      expect(result).toBeDefined();
      expect(result.providentFund).toBeGreaterThanOrEqual(0);
      expect(result.professionalTax).toBeGreaterThanOrEqual(0);
    });

    it('should apply PF wage limit correctly', () => {
      const earnings = {
        basicSalary: 50000
      };
      const grossSalary = 50000;

      const result = payslipCalculationService.calculateDeductions(
        earnings,
        grossSalary,
        { basicSalary: 50000 },
        {}
      );

      // PF should be calculated on limited wage (15000)
      expect(result.providentFund).toBeLessThanOrEqual(1800); // 12% of 15000
    });
  });

  describe('calculateProfessionalTax', () => {
    it('should return 0 for income below threshold', () => {
      const result = payslipCalculationService.calculateProfessionalTax(20000);

      expect(result).toBe(0);
    });

    it('should calculate PT for income above threshold', () => {
      const result = payslipCalculationService.calculateProfessionalTax(30000);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(200);
    });
  });

  describe('calculateTDS', () => {
    it('should return 0 for income below exemption limit', () => {
      const result = payslipCalculationService.calculateTDS(200000);

      expect(result).toBe(0);
    });

    it('should calculate TDS for taxable income', () => {
      const result = payslipCalculationService.calculateTDS(1000000);

      expect(result).toBeGreaterThan(0);
    });

    it('should handle new tax regime', () => {
      const result = payslipCalculationService.calculateTDS(800000, { taxRegime: 'new' });

      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateEmployerContributions', () => {
    it('should calculate employer PF and ESIC', () => {
      const earnings = {
        basicSalary: 15000
      };
      const grossSalary = 20000;

      const result = payslipCalculationService.calculateEmployerContributions(
        earnings,
        grossSalary
      );

      expect(result.employerPF).toBeGreaterThan(0);
      expect(result.employerESIC).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateBulkPayslips', () => {
    it('should process multiple employee payslips', async () => {
      const employeesData = [
        {
          employee: mockEmployee,
          salaryStructure: mockSalaryStructure,
          attendance: { totalWorkingDays: 26, presentDays: 26, paidDays: 26 }
        },
        {
          employee: { ...mockEmployee, id: 2 },
          salaryStructure: mockSalaryStructure,
          attendance: { totalWorkingDays: 26, presentDays: 20, paidDays: 20 }
        }
      ];

      const results = await payslipCalculationService.calculateBulkPayslips(employeesData);

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
    });
  });
});
