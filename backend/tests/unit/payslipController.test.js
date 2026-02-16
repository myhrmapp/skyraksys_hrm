/**
 * PayslipController Unit Tests
 * 
 * Comprehensive test suite for PayslipController HTTP layer
 * 
 * @group unit
 * @group payroll
 */

const payslipController = require('../../controllers/payslipController');
const { payslipService } = require('../../services/PayslipService');
const ApiResponse = require('../../utils/ApiResponse');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../utils/errors');
const ExcelJS = require('exceljs');

// Mock dependencies
jest.mock('../../services/PayslipService');
jest.mock('../../utils/ApiResponse');
jest.mock('exceljs');

describe('PayslipController', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock request
    mockReq = {
      user: {
        id: 'user-123',
        role: 'admin',
        employeeId: 'emp-123'
      },
      userRole: 'admin',
      employeeId: 'emp-123',
      params: {},
      query: {},
      body: {},
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' }
    };

    // Mock response
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis()
    };

    // Mock next
    mockNext = jest.fn();

    // Mock ApiResponse
    ApiResponse.success = jest.fn((data, message) => ({
      success: true,
      message,
      data
    }));

    // Mock ExcelJS
    const mockWorksheet = {
      columns: [],
      addRow: jest.fn(),
      getRow: jest.fn().mockReturnValue({
        font: {},
        fill: {}
      })
    };

    const mockWorkbook = {
      addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
      xlsx: {
        write: jest.fn().mockResolvedValue(undefined)
      }
    };

    ExcelJS.Workbook = jest.fn().mockImplementation(() => mockWorkbook);
  });

  describe('getAll', () => {
    it('should get all payslips successfully', async () => {
      const mockResult = {
        payslips: [{ id: 'payslip-1' }],
        totalCount: 1,
        currentPage: 1,
        totalPages: 1
      };

      payslipService.getAllPayslips = jest.fn().mockResolvedValue(mockResult);

      mockReq.query = { page: '1', limit: '20' };

      await payslipController.getAll(mockReq, mockRes, mockNext);

      expect(payslipService.getAllPayslips).toHaveBeenCalledWith(
        expect.objectContaining({
          page: '1',
          limit: '20'
        }),
        expect.objectContaining({
          role: 'admin'
        })
      );
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      payslipService.getAllPayslips = jest.fn().mockRejectedValue(error);

      await payslipController.getAll(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getMyPayslips', () => {
    it('should get current user payslips successfully', async () => {
      const mockPayslips = [{ id: 'payslip-1' }];
      payslipService.getMyPayslips = jest.fn().mockResolvedValue(mockPayslips);

      await payslipController.getMyPayslips(mockReq, mockRes, mockNext);

      expect(payslipService.getMyPayslips).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-123'
        })
      );
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should get payslip by ID successfully', async () => {
      const mockPayslip = { id: 'payslip-1', netPay: 65000 };
      payslipService.getPayslipById = jest.fn().mockResolvedValue(mockPayslip);

      mockReq.params.id = 'payslip-1';

      await payslipController.getById(mockReq, mockRes, mockNext);

      expect(payslipService.getPayslipById).toHaveBeenCalledWith(
        'payslip-1',
        expect.objectContaining({ role: 'admin' })
      );
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('calculatePreview', () => {
    it('should calculate preview successfully', async () => {
      const mockResult = {
        employee: { id: 'emp-1' },
        calculation: { netPay: 65000 }
      };

      payslipService.calculatePreview = jest.fn().mockResolvedValue(mockResult);

      mockReq.body = {
        employeeId: 'emp-1',
        salaryStructure: { basicSalary: 50000 },
        attendance: { presentDays: 22 }
      };

      await payslipController.calculatePreview(mockReq, mockRes, mockNext);

      expect(payslipService.calculatePreview).toHaveBeenCalledWith(
        'emp-1',
        { basicSalary: 50000 },
        { presentDays: 22 },
        undefined,
        expect.objectContaining({ role: 'admin' })
      );
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should throw ValidationError for missing employeeId', async () => {
      mockReq.body = {};

      await payslipController.calculatePreview(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validateEmployees', () => {
    it('should validate employees successfully', async () => {
      const mockResult = {
        totalEmployees: 2,
        validEmployees: [{ id: 'emp-1' }],
        invalidEmployees: [{ id: 'emp-2', issues: ['No salary structure'] }],
        canProceed: true
      };

      payslipService.validateEmployees = jest.fn().mockResolvedValue(mockResult);

      mockReq.body = {
        employeeIds: ['emp-1', 'emp-2'],
        month: 1,
        year: 2026
      };

      await payslipController.validateEmployees(mockReq, mockRes, mockNext);

      expect(payslipService.validateEmployees).toHaveBeenCalledWith(
        ['emp-1', 'emp-2'],
        1,
        2026
      );
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('generatePayslips', () => {
    it('should generate payslips successfully', async () => {
      const mockResult = {
        payslips: [{ id: 'payslip-1' }],
        count: 1,
        errors: []
      };

      payslipService.generatePayslips = jest.fn().mockResolvedValue(mockResult);

      mockReq.body = {
        employeeIds: ['emp-1'],
        month: 1,
        year: 2026
      };

      await payslipController.generatePayslips(mockReq, mockRes, mockNext);

      expect(payslipService.generatePayslips).toHaveBeenCalledWith(
        ['emp-1'],
        1,
        2026,
        undefined,
        {},
        expect.objectContaining({ role: 'admin' })
      );
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should throw ValidationError for missing employeeIds', async () => {
      mockReq.body = { month: 1, year: 2026 };

      await payslipController.generatePayslips(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should throw ValidationError for empty employeeIds array', async () => {
      mockReq.body = { employeeIds: [], month: 1, year: 2026 };

      await payslipController.generatePayslips(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('generateAllPayslips', () => {
    it('should generate all payslips successfully', async () => {
      const mockResult = {
        payslips: [{ id: 'payslip-1' }, { id: 'payslip-2' }],
        count: 2
      };

      payslipService.generateAllPayslips = jest.fn().mockResolvedValue(mockResult);

      mockReq.body = { month: 1, year: 2026 };

      await payslipController.generateAllPayslips(mockReq, mockRes, mockNext);

      expect(payslipService.generateAllPayslips).toHaveBeenCalledWith(
        1,
        2026,
        undefined,
        undefined,
        expect.objectContaining({ role: 'admin' })
      );
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('updatePayslip', () => {
    it('should update payslip successfully', async () => {
      const mockPayslip = { id: 'payslip-1', netPay: 70000 };
      payslipService.updatePayslip = jest.fn().mockResolvedValue(mockPayslip);

      mockReq.params.id = 'payslip-1';
      mockReq.body = {
        earnings: { basic: 60000 },
        deductions: { pf: 6000 },
        reason: 'Salary revision approved'
      };

      await payslipController.updatePayslip(mockReq, mockRes, mockNext);

      expect(payslipService.updatePayslip).toHaveBeenCalledWith(
        'payslip-1',
        { earnings: { basic: 60000 }, deductions: { pf: 6000 } },
        'Salary revision approved',
        expect.objectContaining({ role: 'admin' }),
        '127.0.0.1',
        'test-agent'
      );
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should throw ValidationError for missing reason', async () => {
      mockReq.params.id = 'payslip-1';
      mockReq.body = { earnings: { basic: 60000 } };

      await payslipController.updatePayslip(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('finalizePayslip', () => {
    it('should finalize payslip successfully', async () => {
      const mockPayslip = { id: 'payslip-1', status: 'finalized' };
      payslipService.finalizePayslip = jest.fn().mockResolvedValue(mockPayslip);

      mockReq.params.id = 'payslip-1';

      await payslipController.finalizePayslip(mockReq, mockRes, mockNext);

      expect(payslipService.finalizePayslip).toHaveBeenCalledWith(
        'payslip-1',
        expect.objectContaining({ role: 'admin' })
      );
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('markAsPaid', () => {
    it('should mark payslip as paid successfully', async () => {
      const mockPayslip = { id: 'payslip-1', status: 'paid' };
      payslipService.markAsPaid = jest.fn().mockResolvedValue(mockPayslip);

      mockReq.params.id = 'payslip-1';

      await payslipController.markAsPaid(mockReq, mockRes, mockNext);

      expect(payslipService.markAsPaid).toHaveBeenCalledWith(
        'payslip-1',
        expect.objectContaining({ role: 'admin' })
      );
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('bulkFinalize', () => {
    it('should bulk finalize payslips successfully', async () => {
      const mockResult = {
        successful: [{ id: 'payslip-1' }],
        failed: []
      };

      payslipService.bulkFinalize = jest.fn().mockResolvedValue(mockResult);

      mockReq.body = { payslipIds: ['payslip-1', 'payslip-2'] };

      await payslipController.bulkFinalize(mockReq, mockRes, mockNext);

      expect(payslipService.bulkFinalize).toHaveBeenCalledWith(
        ['payslip-1', 'payslip-2'],
        expect.objectContaining({ role: 'admin' })
      );
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should throw ValidationError for empty array', async () => {
      mockReq.body = { payslipIds: [] };

      await payslipController.bulkFinalize(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('bulkMarkAsPaid', () => {
    it('should bulk mark as paid successfully', async () => {
      const mockResult = {
        successful: [{ id: 'payslip-1' }],
        failed: []
      };

      payslipService.bulkMarkAsPaid = jest.fn().mockResolvedValue(mockResult);

      mockReq.body = { payslipIds: ['payslip-1'] };

      await payslipController.bulkMarkAsPaid(mockReq, mockRes, mockNext);

      expect(payslipService.bulkMarkAsPaid).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('bulkDelete', () => {
    it('should bulk delete payslips successfully', async () => {
      const mockResult = {
        successful: [{ id: 'payslip-1' }],
        failed: []
      };

      payslipService.bulkDelete = jest.fn().mockResolvedValue(mockResult);

      mockReq.body = { payslipIds: ['payslip-1'] };

      await payslipController.bulkDelete(mockReq, mockRes, mockNext);

      expect(payslipService.bulkDelete).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('downloadPDF', () => {
    it('should download PDF successfully', async () => {
      const mockPayslip = {
        id: 'payslip-1',
        payslipNumber: 'PS202601SKYT1001',
        netPay: 65000,
        companyInfo: { name: 'Test Company' },
        employeeInfo: { name: 'John Doe' },
        earnings: { basic: 50000 },
        deductions: { pf: 5000 },
        grossEarnings: 50000,
        totalDeductions: 5000,
        netPayInWords: 'Sixty Five Thousand'
      };

      payslipService.getPayslipForPDF = jest.fn().mockResolvedValue(mockPayslip);

      mockReq.params.id = 'payslip-1';

      // Mock PDFDocument
      const mockDoc = {
        pipe: jest.fn(),
        end: jest.fn(),
        fontSize: jest.fn().mockReturnThis(),
        text: jest.fn().mockReturnThis(),
        rect: jest.fn().mockReturnThis(),
        fillAndStroke: jest.fn().mockReturnThis(),
        fillColor: jest.fn().mockReturnThis(),
        font: jest.fn().mockReturnThis(),
        stroke: jest.fn().mockReturnThis()
      };

      // We can't fully test PDF generation without mocking PDFDocument
      // but we can verify the service call and response headers
      await payslipController.downloadPDF(mockReq, mockRes, mockNext);

      expect(payslipService.getPayslipForPDF).toHaveBeenCalledWith(
        'payslip-1',
        expect.objectContaining({ role: 'admin' })
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('PS202601SKYT1001')
      );
    });
  });

  describe('getSummaryReport', () => {
    it('should get summary report successfully', async () => {
      const mockResult = {
        period: 'January 2026',
        summary: {
          totalPayslips: 10,
          totalNetPay: 650000
        }
      };

      payslipService.getSummaryReport = jest.fn().mockResolvedValue(mockResult);

      mockReq.query = { month: '1', year: '2026' };

      await payslipController.getSummaryReport(mockReq, mockRes, mockNext);

      expect(payslipService.getSummaryReport).toHaveBeenCalledWith(
        1,
        2026,
        undefined,
        expect.objectContaining({ role: 'admin' })
      );
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should throw ValidationError for missing month/year', async () => {
      mockReq.query = {};

      await payslipController.getSummaryReport(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('exportReport', () => {
    it('should export to Excel successfully', async () => {
      const mockPayslips = [
        {
          employee: { employeeId: 'SKYT1001' },
          employeeInfo: { name: 'John Doe' },
          payPeriod: 'January 2026',
          grossEarnings: 70000,
          totalDeductions: 5000,
          netPay: 65000,
          status: 'paid'
        }
      ];

      payslipService.getPayslipsForExport = jest.fn().mockResolvedValue(mockPayslips);

      mockReq.query = { month: '1', year: '2026', format: 'xlsx' };

      // This test requires mocking ExcelJS which is complex
      // We'll verify the service call at minimum
      await payslipController.exportReport(mockReq, mockRes, mockNext);

      expect(payslipService.getPayslipsForExport).toHaveBeenCalledWith(
        1,
        2026,
        expect.objectContaining({ role: 'admin' })
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('should export to CSV successfully', async () => {
      const mockPayslips = [
        {
          employee: { employeeId: 'SKYT1001' },
          employeeInfo: { name: 'John Doe' },
          payPeriod: 'January 2026',
          grossEarnings: 70000,
          totalDeductions: 5000,
          netPay: 65000,
          status: 'paid'
        }
      ];

      payslipService.getPayslipsForExport = jest.fn().mockResolvedValue(mockPayslips);

      mockReq.query = { month: '1', year: '2026', format: 'csv' };

      await payslipController.exportReport(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('Employee ID'));
    });
  });

  describe('RBAC', () => {
    it('should extract user context from request correctly', async () => {
      mockReq.user = { id: 'user-1', role: 'hr', employeeId: null };
      mockReq.userRole = 'hr';
      mockReq.employeeId = null;

      payslipService.getAllPayslips = jest.fn().mockResolvedValue({
        payslips: [],
        totalCount: 0
      });

      await payslipController.getAll(mockReq, mockRes, mockNext);

      expect(payslipService.getAllPayslips).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'user-1',
          role: 'hr'
        })
      );
    });
  });
});
