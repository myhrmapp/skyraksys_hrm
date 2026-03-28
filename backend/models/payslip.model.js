module.exports = (sequelize, DataTypes) => {
  const Payslip = sequelize.define('Payslip', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id'
      }
    },
    payrollDataId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'payroll_data',
        key: 'id'
      }
    },
    payPeriod: {
      type: DataTypes.STRING,
      allowNull: false // e.g., "January 2024", "2024-01"
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 12
      },
      comment: 'Month of the payslip (1-12)'
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2000,
        max: 2100
      },
      comment: 'Year of the payslip'
    },
    payPeriodStart: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    payPeriodEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    // Template information
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'payslip_templates',
        key: 'id'
      }
    },
    templateVersion: {
      type: DataTypes.STRING,
      defaultValue: '1.0'
    },
    // Employee information snapshot
    employeeInfo: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Snapshot of employee details at payslip generation time'
    },
    // Company information
    companyInfo: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Company details for payslip header'
    },
    // Complete earnings breakdown
    earnings: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
      comment: 'All earnings components with amounts'
    },
    // Complete deductions breakdown
    deductions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
      comment: 'All deduction components with amounts'
    },
    // Attendance details
    attendance: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        totalWorkingDays: 21,
        presentDays: 21,
        absentDays: 0,
        lopDays: 0,
        paidDays: 21,
        overtimeHours: 0
      },
      comment: 'Attendance breakdown for the month'
    },
    // Calculated totals
    grossEarnings: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total of all earnings'
    },
    totalDeductions: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total of all deductions'
    },
    netPay: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Gross earnings minus total deductions'
    },
    netPayInWords: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Net pay amount in words'
    },
    // Additional information
    payslipNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Unique payslip identifier'
    },
    payDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date when salary was paid'
    },
    generatedDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date when payslip was generated'
    },
    generatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User ID who generated the payslip'
    },
    status: {
      type: DataTypes.ENUM('draft', 'finalized', 'paid', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft',
      comment: 'Current status of the payslip'
    },
    // Calculation metadata
    calculationDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed calculation breakdown and formulas used'
    },
    // PDF generation metadata
    pdfMetadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'PDF generation details and file paths'
    },
    // Additional flexible data storage
    additionalData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Any additional payslip specific data'
    },
    // Version control for payslip modifications
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Version number for tracking modifications'
    },
    // Lock field to prevent modifications
    isLocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Prevents modifications when locked'
    },
    // Manual edit tracking
    manuallyEdited: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicates if payslip was manually edited'
    },
    lastEditedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who last edited the payslip'
    },
    lastEditedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last edit'
    },
    // Finalization tracking
    finalizedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When payslip was finalized'
    },
    finalizedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who finalized the payslip'
    },
    // Payment tracking
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When payslip was marked as paid'
    },
    paidBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who marked as paid'
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Method of payment (bank transfer, cheque, etc.)'
    },
    paymentReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Payment transaction reference number'
    }
  }, {
    tableName: 'payslips',
    timestamps: true,
    paranoid: true, // Soft delete support
    indexes: [
      {
        unique: true,
        fields: ['employeeId', 'month', 'year'],
        name: 'idx_payslips_emp_period'
      },
      {
        fields: ['month', 'year'],
        name: 'idx_payslips_month_year'
      },
      {
        fields: ['status'],
        name: 'idx_payslips_status'
      },
      {
        unique: true,
        fields: ['payslipNumber'],
        name: 'idx_payslips_number'
      },
      {
        fields: ['templateId'],
        name: 'idx_payslips_template'
      },
      {
        fields: ['payrollDataId'],
        name: 'idx_payslips_payroll_data'
      },
      {
        fields: ['generatedBy'],
        name: 'idx_payslips_generated_by'
      },
      {
        fields: ['isLocked'],
        name: 'idx_payslips_locked'
      }
    ],
    hooks: {
      beforeCreate: async (payslip, options) => {
        // Generate payslip number if not provided
        if (!payslip.payslipNumber) {
          const year = payslip.year || new Date().getFullYear();
          const month = payslip.month || (new Date().getMonth() + 1);
          const employeeId = payslip.employeeId;
          payslip.payslipNumber = `PS${year}${month.toString().padStart(2, '0')}${employeeId.toString().padStart(4, '0')}`;
        }
      },
      beforeUpdate: async (payslip, options) => {
        // Prevent updates if ALREADY locked (unless forcing)
        if (payslip.previous('isLocked') && payslip.changed() && !options.force) {
          throw new Error('Cannot modify locked payslip');
        }
        // Increment version on updates
        if (payslip.changed() && !payslip.changed('updatedAt')) {
          payslip.version = (payslip.version || 1) + 1;
        }
      }
    }
  });

  Payslip.associate = function(models) {
    // Employee association
    Payslip.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      as: 'employee',
      onDelete: 'RESTRICT'
    });

    // Template association
    Payslip.belongsTo(models.PayslipTemplate, {
      foreignKey: 'templateId',
      as: 'template',
      onDelete: 'RESTRICT'
    });

    // Payroll data association
    Payslip.belongsTo(models.PayrollData, {
      foreignKey: 'payrollDataId',
      as: 'payrollData',
      onDelete: 'RESTRICT'
    });

    // Generated by user association (if User model exists)
    if (models.User) {
      Payslip.belongsTo(models.User, {
        foreignKey: 'generatedBy',
        as: 'generator',
        onDelete: 'SET NULL'
      });
    }
  };

  // Instance methods
  Payslip.prototype.lock = function() {
    this.isLocked = true;
    this.status = 'finalized';
    return this.save();
  };

  Payslip.prototype.unlock = function(force = false) {
    if (!force && this.status === 'paid') {
      throw new Error('Cannot unlock paid payslip');
    }
    this.isLocked = false;
    return this.save();
  };

  Payslip.prototype.markAsPaid = function() {
    this.status = 'paid';
    this.payDate = new Date();
    this.isLocked = true;
    return this.save();
  };

  // Class methods
  Payslip.findByEmployee = function(employeeId, options = {}) {
    return this.findAll({
      where: { employeeId },
      include: [
        { model: this.sequelize.models.Employee, as: 'employee' },
        { model: this.sequelize.models.PayslipTemplate, as: 'template' }
      ],
      order: [['year', 'DESC'], ['month', 'DESC']],
      ...options
    });
  };

  Payslip.findByMonthYear = function(month, year, options = {}) {
    return this.findAll({
      where: { month, year },
      include: [
        { model: this.sequelize.models.Employee, as: 'employee' },
        { model: this.sequelize.models.PayslipTemplate, as: 'template' }
      ],
      ...options
    });
  };

  Payslip.generateBulkPayslips = async function(payrollDataIds, templateId, generatedBy) {
    const PayrollData = this.sequelize.models.PayrollData;
    const { Op } = require('sequelize');
    
    // Fetch all payroll data at once to avoid N+1
    const payrollDataRecords = await PayrollData.findAll({
      where: { 
        id: { [Op.in]: payrollDataIds },
        status: 'approved'
      },
      include: [{ model: this.sequelize.models.Employee, as: 'employee' }]
    });

    // Bulk create all payslips at once
    const payslipDataArray = payrollDataRecords.map(payrollData => ({
      employeeId: payrollData.employeeId,
      month: payrollData.month,
      year: payrollData.year,
      templateId,
      payrollDataId: payrollData.id,
      employeeInfo: payrollData.employee,
      earnings: payrollData.earnings,
      deductions: payrollData.deductions,
      attendance: payrollData.attendance,
      grossEarnings: payrollData.grossEarnings,
      totalDeductions: payrollData.totalDeductions,
      netPay: payrollData.netPay,
      companyInfo: payrollData.employee?.department?.company || {},
      generatedBy
    }));

    const payslips = await this.bulkCreate(payslipDataArray);
    
    return payslips;
  };

  return Payslip;
};