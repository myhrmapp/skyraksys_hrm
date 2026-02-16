/**
 * Payroll Controller
 * Handles HTTP requests for payroll operations
 * Delegates business logic to PayrollBusinessService
 * 
 * @module controllers/payrollController
 * @requires services/business/PayrollBusinessService
 * @requires services/data/PayrollDataService
 * @requires utils/ApiResponse
 */

const { payrollBusinessService } = require('../services/business');
const { payrollDataService } = require('../services/data');
const ApiResponse = require('../utils/ApiResponse');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');

/**
 * PayrollController
 * Manages payroll data, salary structures, and payslip generation
 */
const PayrollController = {
  
  /**
   * Get all payroll data with filters
   * @route GET /api/payroll-data
   * @access Admin/HR
   * @rbac Admin and HR can view all payroll data
   */
  async getAll(req, res, next) {
    try {
      const {
        month,
        year,
        employeeId,
        status,
        page = 1,
        limit = 20
      } = req.query;

      const where = {};
      // Note: PayrollData uses payPeriod field, not month/year
      if (employeeId) where.employeeId = employeeId;
      if (status) where.status = status;

      const options = {
        where,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      // BaseService.findAll returns {data, pagination}
      const result = await payrollDataService.findAllWithDetails(options);

      return res.json(ApiResponse.success(
        {
          payrollData: result.data,
          pagination: result.pagination
        },
        'Payroll data retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get payroll data by employee ID
   * @route GET /api/payroll-data/employee/:employeeId
   * @access Admin/HR/Employee (own data)
   * @rbac Employee can only view own payroll data
   */
  async getByEmployee(req, res, next) {
    try {
      const { employeeId } = req.params;
      const user = req.user;

      // RBAC: Employee can only view own data
      if (user.role === 'employee' && req.employeeId !== employeeId) {
        throw new ForbiddenError('You can only view your own payroll data');
      }

      const payrollData = await payrollDataService.findByEmployee(employeeId);

      return res.json(ApiResponse.success(
        payrollData,
        'Employee payroll data retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get single payroll record by ID
   * @route GET /api/payroll-data/:id
   * @access Admin/HR/Employee (own data)
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;

      const payroll = await payrollDataService.findByIdWithDetails(id);
      
      if (!payroll) {
        throw new NotFoundError('Payroll record not found');
      }

      // RBAC: Employee can only view own payroll
      if (user.role === 'employee' && payroll.employeeId !== req.employeeId) {
        throw new ForbiddenError('You can only view your own payroll data');
      }

      return res.json(ApiResponse.success(
        payroll,
        'Payroll record retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Calculate payroll for employee (preview calculation)
   * @route POST /api/payroll-data/calculate
   * @access Admin/HR
   * @business Calculates salary with allowances, deductions, EPF, ESI, TDS, PT
   */
  async calculatePayroll(req, res, next) {
    try {
      const { employeeId, month, year, attendance, overrides = {} } = req.body;

      // Convert month/year to period dates
      const payPeriodStart = new Date(year, month - 1, 1); // First day of month
      const payPeriodEnd = new Date(year, month, 0); // Last day of month

      const calculation = await payrollBusinessService.calculatePayroll(
        employeeId,
        payPeriodStart,
        payPeriodEnd,
        { attendance, ...overrides },
        req.user
      );

      return res.json(ApiResponse.success(
        calculation,
        'Payroll calculated successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create payroll record
   * @route POST /api/payroll-data
   * @access Admin/HR
   * @business Creates payroll with calculated earnings and deductions
   */
  async create(req, res, next) {
    try {
      const payroll = await payrollBusinessService.createPayroll(req.body, req.user);

      return res.status(201).json(ApiResponse.success(
        payroll,
        'Payroll record created successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update payroll record
   * @route PUT /api/payroll-data/:id
   * @access Admin/HR
   * @business Updates earnings, deductions, or overrides
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw new NotFoundError('Payroll record not found');
      }

      const updated = await payrollBusinessService.updatePayroll(id, req.body, req.user);

      return res.json(ApiResponse.success(
        updated,
        'Payroll record updated successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Submit payroll for processing (Draft → Processed)
   * @route POST /api/payroll-data/:id/submit
   * @access Admin/HR
   * @business Changes status from Draft to Processed
   */
  async submit(req, res, next) {
    try {
      const { id } = req.params;

      const processed = await payrollBusinessService.processPayroll(id, req.user);

      return res.json(ApiResponse.success(
        processed,
        'Payroll submitted for processing'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Approve payroll
   * @route POST /api/payroll-data/:id/approve
   * @access Admin/HR
   * @business Approves payroll and records approver details
   */
  async approve(req, res, next) {
    try {
      const { id } = req.params;
      const { comments = '' } = req.body;

      const approved = await payrollBusinessService.approvePayroll(id, req.user, comments);

      return res.json(ApiResponse.success(
        approved,
        'Payroll approved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Process payroll (mark as paid)
   * @route POST /api/payroll-data/:id/process
   * @access Admin
   * @business Marks payroll as processed and records payment details
   */
  async process(req, res, next) {
    try {
      const { id } = req.params;

      const processed = await payrollBusinessService.processPayroll(id, req.user);

      return res.json(ApiResponse.success(
        processed,
        'Payroll processed successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Generate payslip for payroll record
   * @route POST /api/payroll-data/:id/payslip
   * @access Admin/HR
   * @business Generates PDF payslip with earnings, deductions, net salary
   */
  async generatePayslip(req, res, next) {
    try {
      const { id } = req.params;

      const payslip = await payrollBusinessService.generatePayslip(id, req.user);

      return res.json(ApiResponse.success(
        payslip,
        'Payslip generated successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get payroll summary (statistics)
   * @route GET /api/payroll-data/summary
   * @access Admin/HR
   * @business Total payroll, employee count, status breakdown
   */
  async getSummary(req, res, next) {
    try {
      const { startDate, endDate, ...filters } = req.query;

      const summary = await payrollDataService.getPayrollSummary(
        startDate,
        endDate,
        filters
      );

      return res.json(ApiResponse.success(
        summary,
        'Payroll summary retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Bulk approve payroll records
   * @route POST /api/payroll-data/bulk-approve
   * @access Admin/HR
   * @business Approves multiple payroll records at once
   */
  async bulkApprove(req, res, next) {
    try {
      const { payrollIds, comments = '' } = req.body;

      if (!payrollIds || !Array.isArray(payrollIds) || payrollIds.length === 0) {
        throw new ValidationError('Payroll IDs array is required');
      }

      const results = [];
      for (const id of payrollIds) {
        try {
          const approved = await payrollBusinessService.approvePayroll(id, req.user, comments);
          results.push({ id, success: true, data: approved });
        } catch (error) {
          results.push({ id, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return res.json(ApiResponse.success(
        { results, successCount, totalCount: payrollIds.length },
        `${successCount} of ${payrollIds.length} payroll records approved`
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete payroll record
   * @route DELETE /api/payroll-data/:id
   * @access Admin
   * @business Soft delete (sets deletedAt) for draft payroll only
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw new NotFoundError('Payroll record not found');
      }

      const payroll = await payrollDataService.findById(id);
      if (!payroll) {
        throw new NotFoundError('Payroll record not found');
      }

      // Only draft payroll can be deleted
      if (payroll.status !== 'Draft') {
        throw new ValidationError('Only draft payroll can be deleted');
      }

      await payrollDataService.delete(id);

      return res.json(ApiResponse.success(
        null,
        'Payroll record deleted successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Import payroll data from CSV file
   * @route POST /api/payroll-data/import-csv
   * @access Admin
   */
  async importCSV(req, res, next) {
    const fs = require('fs');
    const csv = require('csv-parser');

    try {
      if (!req.file) {
        throw new ValidationError('No CSV file uploaded');
      }

      const results = [];
      const errors = [];
      const db = require('../models');

      // Parse CSV
      const stream = fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          try {
            // Validate and transform row data
            const payrollData = {
              employeeId: row.employeeId,
              payPeriod: row.payPeriod,
              payPeriodStart: new Date(row.payPeriodStart),
              payPeriodEnd: new Date(row.payPeriodEnd),
              totalWorkingDays: Number.parseInt(row.totalWorkingDays, 10),
              presentDays: Number.parseInt(row.presentDays, 10),
              lopDays: Number.parseInt(row.lopDays || 0, 10),
              overtimeHours: Number.parseFloat(row.overtimeHours || 0),
              grossSalary: Number.parseFloat(row.grossSalary),
              totalDeductions: Number.parseFloat(row.totalDeductions || 0),
              netSalary: Number.parseFloat(row.netSalary),
              status: row.status || 'draft'
            };
            results.push(payrollData);
          } catch (error) {
            errors.push({ row, error: error.message });
          }
        })
        .on('end', async () => {
          try {
            // Bulk insert valid records
            if (results.length > 0) {
              await db.PayrollData.bulkCreate(results, { validate: true });
            }

            // Cleanup uploaded file
            fs.unlinkSync(req.file.path);

            res.json(ApiResponse.success(
              {
                imported: results.length,
                errors: errors.length,
                errorDetails: errors
              },
              `${results.length} records imported successfully`
            ));
          } catch (error) {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
            next(error);
          }
        })
        .on('error', (error) => {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          next(error);
        });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  },

  /**
   * Export payroll data to CSV
   * @route GET /api/payroll-data/export-csv
   * @access Admin/HR
   */
  async exportCSV(req, res, next) {
    try {
      const { month, year, status } = req.query;
      const db = require('../models');

      const where = {};
      if (month) where.month = month;
      if (year) where.year = year;
      if (status) where.status = status;

      const payrollData = await db.PayrollData.findAll({
        where,
        include: [
          {
            model: db.Employee,
            as: 'employee',
            attributes: ['id', 'firstName', 'lastName', 'employeeId', 'email']
          }
        ],
        order: [['year', 'DESC'], ['month', 'DESC']]
      });

      // Generate CSV
      let csv = 'Employee ID,Name,Pay Period,Start Date,End Date,Working Days,Present Days,LOP Days,Gross Salary,Deductions,Net Salary,Status\n';
      
      payrollData.forEach(record => {
        const emp = record.employee;
        const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'N/A';
        const empId = emp ? emp.employeeId : 'N/A';
        csv += `${empId},"${empName}",${record.payPeriod},${record.payPeriodStart},${record.payPeriodEnd},${record.totalWorkingDays},${record.presentDays},${record.lopDays},${record.grossSalary},${record.totalDeductions},${record.netSalary},${record.status}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=payroll_${year || 'all'}_${month || 'all'}.csv`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

};

module.exports = PayrollController;
