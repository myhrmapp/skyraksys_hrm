/**
 * PayslipService Unit Tests
 * 
 * Comprehensive test suite for PayslipService business logic
 * 
 * @group unit
 * @group payroll
 */

const { payslipService, PayslipService } = require('../../services/PayslipService');
const { payslipCalculationService } = require('../../services/payslipCalculation.service');
const { payslipTemplateService } = require('../../services/payslipTemplate.service');
const db = require('../../models');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../utils/errors');

// Mock dependencies
jest.mock('../../models', () => ({
  sequelize: {
    transaction: jest.fn()
  },
  Payslip: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn()
  },
  Employee: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn()
  },
  PayslipTemplate: {
    findByPk: jest.fn(),
    findOne: jest.fn()
  },
  SalaryStructure: {},
  Timesheet: {
    findAll: jest.fn()
  },
  LeaveRequest: {
    findAll: jest.fn()
  },
  PayslipAuditLog: {
    create: jest.fn()
  },
  PayrollData: {
    create: jest.fn(),
    findAll: jest.fn(),
    bulkCreate: jest.fn()
  },
  Department: {},
  Position: {},
  LeaveType: {}
}));
jest.mock('../../services/payslipCalculation.service');
jest.mock('../../services/payslipTemplate.service');
jest.mock('../../services/holiday.service', () => ({
  getHolidayDateSet: jest.fn().mockResolvedValue(new Set()),
  getHolidaysBetween: jest.fn().mockResolvedValue([]),
  countHolidaysBetween: jest.fn().mockResolvedValue(0)
}));

describe('PayslipService', () => {
  let mockTransaction;
  let mockCurrentUser;

  beforeEach(() => {
    // Reset specific mocks but keep module structure
    jest.clearAllMocks();

    // Re-setup model mocks after clear
    db.Payslip.findByPk = jest.fn();
    db.Payslip.findOne = jest.fn();
    db.Payslip.findAll = jest.fn();
    db.Payslip.create = jest.fn();
    db.Payslip.update = jest.fn();
    db.Payslip.destroy = jest.fn();
    db.Employee.findByPk = jest.fn();
    db.Employee.findOne = jest.fn();
    db.Employee.findAll = jest.fn();
    db.Timesheet.findAll = jest.fn();
    db.LeaveRequest.findAll = jest.fn();
    db.PayslipAuditLog.create = jest.fn();
    db.PayrollData.create = jest.fn();
    db.PayrollData.bulkCreate = jest.fn();

    // Mock transaction
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
      LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' }
    };

    db.sequelize = {
      transaction: jest.fn(async (cbOrOptions) => {
        if (typeof cbOrOptions === 'function') {
          // Callback (auto-commit) pattern: db.sequelize.transaction(async (t) => { ... })
          return cbOrOptions(mockTransaction);
        }
        // Managed pattern: const t = await db.sequelize.transaction()
        return mockTransaction;
      })
    };

    // Mock current user
    mockCurrentUser = {
      id: 'user-123',
      role: 'admin',
      employeeId: 'emp-123'
    };
  });

  describe('calculatePreview', () => {
    it('should calculate payslip preview successfully', async () => {
      const mockEmployee = {
        id: 'emp-1',
        employeeId: 'SKYT1001',
        firstName: 'John',
        lastName: 'Doe',
        salaryStructure: {
          basicSalary: 50000,
          isActive: true,
          toJSON: jest.fn().mockReturnValue({ basicSalary: 50000, isActive: true })
        },
        toJSON: jest.fn().mockReturnValue({ id: 'emp-1', employeeId: 'SKYT1001' })
      };

      const mockCalculation = {
        success: true,
        grossSalary: 70000,
        totalDeductions: 5000,
        netPay: 65000,
        earnings: { basic: 50000, hra: 20000 },
        deductions: { pf: 5000 }
      };

      db.Employee.findByPk = jest.fn().mockResolvedValue(mockEmployee);
      payslipCalculationService.calculatePayslip = jest.fn().mockReturnValue(mockCalculation);

      const result = await payslipService.calculatePreview(
        'emp-1',
        null,
        { presentDays: 22 },
        {},
        mockCurrentUser
      );

      expect(result).toHaveProperty('employee');
      expect(result).toHaveProperty('calculation');
      expect(result.calculation.netPay).toBe(65000);
      expect(db.Employee.findByPk).toHaveBeenCalledWith('emp-1', expect.any(Object));
      expect(payslipCalculationService.calculatePayslip).toHaveBeenCalled();
    });

    it('should throw ForbiddenError for non-admin/HR users', async () => {
      const nonAdminUser = { id: 'user-2', role: 'employee' };

      await expect(
        payslipService.calculatePreview('emp-1', null, {}, {}, nonAdminUser)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError for non-existent employee', async () => {
      db.Employee.findByPk = jest.fn().mockResolvedValue(null);

      await expect(
        payslipService.calculatePreview('invalid-id', null, {}, {}, mockCurrentUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if salary structure missing', async () => {
      const mockEmployee = {
        id: 'emp-1',
        salaryStructure: null,
        toJSON: jest.fn().mockReturnValue({ id: 'emp-1' })
      };

      db.Employee.findByPk = jest.fn().mockResolvedValue(mockEmployee);

      await expect(
        payslipService.calculatePreview('emp-1', null, {}, {}, mockCurrentUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('validateEmployees', () => {
    it('should validate employees successfully', async () => {
      const mockEmployees = [
        {
          id: 'emp-1',
          employeeId: 'SKYT1001',
          firstName: 'John',
          lastName: 'Doe',
          status: 'Active',
          salaryStructure: { isActive: true },
          department: { name: 'IT' }
        }
      ];

      db.Employee.findAll = jest.fn().mockResolvedValue(mockEmployees);
      db.Timesheet.findAll = jest.fn().mockResolvedValue([{ employeeId: 'emp-1', status: 'approved' }]);
      db.Payslip.findAll = jest.fn().mockResolvedValue([]);

      const result = await payslipService.validateEmployees(['emp-1'], 1, 2026);

      expect(result.totalEmployees).toBe(1);
      expect(result.validEmployees).toHaveLength(1);
      expect(result.invalidEmployees).toHaveLength(0);
      expect(result.canProceed).toBe(true);
    });

    it('should identify employees with no salary structure', async () => {
      const mockEmployees = [
        {
          id: 'emp-1',
          employeeId: 'SKYT1001',
          firstName: 'John',
          lastName: 'Doe',
          status: 'Active',
          salaryStructure: null,
          department: { name: 'IT' }
        }
      ];

      db.Employee.findAll = jest.fn().mockResolvedValue(mockEmployees);
      db.Timesheet.findAll = jest.fn().mockResolvedValue([]);
      db.Payslip.findAll = jest.fn().mockResolvedValue([]);

      const result = await payslipService.validateEmployees(['emp-1'], 1, 2026);

      expect(result.validEmployees).toHaveLength(0);
      expect(result.invalidEmployees).toHaveLength(1);
      expect(result.invalidEmployees[0].issues).toContain('No salary structure configured');
    });

    it('should identify employees with existing payslips', async () => {
      const mockEmployees = [
        {
          id: 'emp-1',
          employeeId: 'SKYT1001',
          firstName: 'John',
          lastName: 'Doe',
          status: 'Active',
          salaryStructure: { isActive: true },
          department: { name: 'IT' }
        }
      ];

      db.Employee.findAll = jest.fn().mockResolvedValue(mockEmployees);
      db.Timesheet.findAll = jest.fn().mockResolvedValue([{ employeeId: 'emp-1', status: 'approved' }]);
      db.Payslip.findAll = jest.fn().mockResolvedValue([{ 
        employeeId: 'emp-1',
        payslipNumber: 'PS202601SKYT1001',
        status: 'finalized' 
      }]);

      const result = await payslipService.validateEmployees(['emp-1'], 1, 2026);

      expect(result.invalidEmployees).toHaveLength(1);
      expect(result.invalidEmployees[0].issues[0]).toContain('Payslip already exists');
    });

    it('should throw ValidationError for empty employee array', async () => {
      await expect(
        payslipService.validateEmployees([], 1, 2026)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('generatePayslips', () => {
    it('should generate payslips successfully', async () => {
      const mockTemplate = { id: 'template-1', name: 'Default' };
      const mockEmployee = {
        id: 'emp-1',
        employeeId: 'SKYT1001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        salaryStructure: { basicSalary: 50000, isActive: true },
        department: { name: 'IT' },
        position: { name: 'Developer' }
      };

      const mockCalculation = {
        success: true,
        grossSalary: 70000,
        totalDeductions: 5000,
        netPay: 65000,
        netPayInWords: 'Sixty Five Thousand Only',
        earnings: { basic: 50000, hra: 20000 },
        deductions: { pf: 5000 },
        attendance: { totalWorkingDays: 22, presentDays: 22, lopDays: 0, paidDays: 22 },
        calculationMetadata: {}
      };

      payslipTemplateService.getDefaultTemplateFromDB = jest.fn().mockResolvedValue({ data: mockTemplate });
      db.Payslip.findOne = jest.fn().mockResolvedValue(null);
      db.Employee.findAll = jest.fn().mockResolvedValue([mockEmployee]);
      db.Timesheet.findAll = jest.fn().mockResolvedValue([]);
      db.LeaveRequest.findAll = jest.fn().mockResolvedValue([]);
      payslipCalculationService.calculatePayslip = jest.fn().mockReturnValue(mockCalculation);
      
      db.PayrollData = {
        create: jest.fn().mockResolvedValue({ id: 'payroll-1' })
      };
      db.Payslip = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ 
          id: 'payslip-1', 
          payslipNumber: 'PS202601SKYT1001',
          netPay: 65000
        })
      };

      const result = await payslipService.generatePayslips(
        ['emp-1'],
        1,
        2026,
        null,
        {},
        mockCurrentUser
      );

      expect(result.count).toBe(1);
      expect(result.payslips).toHaveLength(1);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should skip employees with existing payslips', async () => {
      const mockTemplate = { id: 'template-1' };
      
      payslipTemplateService.getDefaultTemplateFromDB = jest.fn().mockResolvedValue({ data: mockTemplate });
      db.Employee.findAll = jest.fn().mockResolvedValue([]);
      db.Payslip.findOne = jest.fn().mockResolvedValue({ id: 'existing' });

      const result = await payslipService.generatePayslips(
        ['emp-1'],
        1,
        2026,
        null,
        {},
        mockCurrentUser
      );

      expect(result.count).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('already exists');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      payslipTemplateService.getDefaultTemplateFromDB = jest.fn().mockRejectedValue(new Error('Template error'));

      await expect(
        payslipService.generatePayslips(['emp-1'], 1, 2026, null, {}, mockCurrentUser)
      ).rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw ForbiddenError for non-admin/HR users', async () => {
      const nonAdminUser = { id: 'user-2', role: 'employee' };

      await expect(
        payslipService.generatePayslips(['emp-1'], 1, 2026, null, {}, nonAdminUser)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('updatePayslip', () => {
    it('should update draft payslip successfully', async () => {
      const mockPayslip = {
        id: 'payslip-1',
        status: 'draft',
        earnings: { basic: 50000 },
        deductions: { pf: 5000 },
        grossEarnings: 50000,
        totalDeductions: 5000,
        netPay: 45000,
        update: jest.fn().mockResolvedValue(true),
        reload: jest.fn().mockResolvedValue(true),
        employee: { id: 'emp-1', employeeId: 'SKYT1001' }
      };

      db.Payslip.findByPk = jest.fn().mockResolvedValue(mockPayslip);
      db.PayslipAuditLog = {
        create: jest.fn().mockResolvedValue({})
      };

      const result = await payslipService.updatePayslip(
        'payslip-1',
        { earnings: { basic: 55000 }, deductions: { pf: 5500 } },
        'Salary revision approved by management',
        mockCurrentUser,
        '127.0.0.1',
        'test-agent'
      );

      expect(mockPayslip.update).toHaveBeenCalled();
      expect(db.PayslipAuditLog.create).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw ValidationError for finalized payslip', async () => {
      const mockPayslip = {
        id: 'payslip-1',
        status: 'finalized'
      };

      db.Payslip.findByPk = jest.fn().mockResolvedValue(mockPayslip);

      await expect(
        payslipService.updatePayslip(
          'payslip-1',
          { earnings: { basic: 55000 } },
          'test reason',
          mockCurrentUser
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for short reason', async () => {
      await expect(
        payslipService.updatePayslip(
          'payslip-1',
          { earnings: { basic: 55000 } },
          'short',
          mockCurrentUser
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('finalizePayslip', () => {
    it('should finalize draft payslip successfully', async () => {
      const mockPayslip = {
        id: 'payslip-1',
        status: 'draft',
        update: jest.fn().mockResolvedValue(true)
      };

      db.Payslip.findByPk = jest.fn().mockResolvedValue(mockPayslip);

      const result = await payslipService.finalizePayslip('payslip-1', mockCurrentUser);

      expect(mockPayslip.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'finalized'
      }));
    });

    it('should throw ValidationError for non-draft payslip', async () => {
      const mockPayslip = {
        id: 'payslip-1',
        status: 'finalized',
        update: jest.fn().mockResolvedValue(true)
      };

      db.Payslip.findByPk = jest.fn().mockResolvedValue(mockPayslip);

      await expect(
        payslipService.finalizePayslip('payslip-1', mockCurrentUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('markAsPaid', () => {
    it('should mark finalized payslip as paid', async () => {
      const mockPayslip = {
        id: 'payslip-1',
        status: 'finalized',
        payslipNumber: 'PS1',
        update: jest.fn().mockResolvedValue(true)
      };

      db.Payslip.findByPk = jest.fn().mockResolvedValue(mockPayslip);

      const result = await payslipService.markAsPaid('payslip-1', mockCurrentUser);

      expect(mockPayslip.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ValidationError for non-finalized payslip', async () => {
      const mockPayslip = {
        id: 'payslip-1',
        status: 'draft',
        update: jest.fn().mockResolvedValue(true)
      };

      db.Payslip.findByPk = jest.fn().mockResolvedValue(mockPayslip);

      await expect(
        payslipService.markAsPaid('payslip-1', mockCurrentUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('bulkFinalize', () => {
    it('should finalize multiple payslips successfully', async () => {
      const mockPayslips = [
        { id: 'payslip-1', payslipNumber: 'PS1', status: 'draft', update: jest.fn().mockResolvedValue(true) },
        { id: 'payslip-2', payslipNumber: 'PS2', status: 'draft', update: jest.fn().mockResolvedValue(true) }
      ];

      // Mock findByPk to return different payslips for each call
      db.Payslip.findByPk = jest.fn()
        .mockResolvedValueOnce(mockPayslips[0])
        .mockResolvedValueOnce(mockPayslips[1]);

      const result = await payslipService.bulkFinalize(
        ['payslip-1', 'payslip-2'],
        mockCurrentUser
      );

      expect(result.successful.length).toBeGreaterThan(0);
    });
  });

  describe('bulkDelete', () => {
    it('should only allow admin to delete', async () => {
      const hrUser = { id: 'user-2', role: 'hr' };

      await expect(
        payslipService.bulkDelete(['payslip-1'], hrUser)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should delete draft payslips successfully', async () => {
      const mockPayslip = {
        id: 'payslip-1',
        payslipNumber: 'PS1',
        status: 'draft',
        destroy: jest.fn().mockResolvedValue(true)
      };

      db.Payslip.findByPk = jest.fn().mockResolvedValue(mockPayslip);

      const result = await payslipService.bulkDelete(['payslip-1'], mockCurrentUser);

      expect(result.successful).toHaveLength(1);
      expect(mockPayslip.destroy).toHaveBeenCalled();
    });
  });

  describe('getPayslipById', () => {
    it('should return payslip for admin', async () => {
      const mockPayslip = {
        id: 'payslip-1',
        employeeId: 'emp-1',
        employee: { id: 'emp-1' }
      };

      db.Payslip.findByPk = jest.fn().mockResolvedValue(mockPayslip);

      const result = await payslipService.getPayslipById('payslip-1', mockCurrentUser);

      expect(result).toEqual(mockPayslip);
    });

    it('should throw ForbiddenError for employee accessing others payslip', async () => {
      const mockPayslip = {
        id: 'payslip-1',
        employeeId: 'emp-2'
      };

      const employeeUser = { id: 'user-2', role: 'employee', employeeId: 'emp-1' };

      db.Payslip.findByPk = jest.fn().mockResolvedValue(mockPayslip);

      await expect(
        payslipService.getPayslipById('payslip-1', employeeUser)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getSummaryReport', () => {
    it('should generate summary report successfully', async () => {
      const mockPayslips = [
        {
          grossEarnings: 70000,
          totalDeductions: 5000,
          netPay: 65000,
          status: 'paid',
          employee: { departmentId: 'dept-1' }
        },
        {
          grossEarnings: 80000,
          totalDeductions: 6000,
          netPay: 74000,
          status: 'finalized',
          employee: { departmentId: 'dept-1' }
        }
      ];

      db.Payslip.findAll = jest.fn().mockResolvedValue(mockPayslips);

      const result = await payslipService.getSummaryReport(1, 2026, null, mockCurrentUser);

      expect(result.summary.totalPayslips).toBe(2);
      expect(result.summary.totalNetPay).toBe(139000);
      expect(result.summary.statusBreakdown.paid).toBe(1);
      expect(result.summary.statusBreakdown.finalized).toBe(1);
    });

    it('should throw ForbiddenError for non-admin/HR users', async () => {
      const employeeUser = { id: 'user-2', role: 'employee' };

      await expect(
        payslipService.getSummaryReport(1, 2026, null, employeeUser)
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
