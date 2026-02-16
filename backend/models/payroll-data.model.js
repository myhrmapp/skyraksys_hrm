const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PayrollData = sequelize.define('PayrollData', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id'
      }
    },
    payPeriod: {
      type: DataTypes.STRING,
      allowNull: false // Format: "YYYY-MM" or "January 2024"
    },
    payPeriodStart: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    payPeriodEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    // Attendance data
    totalWorkingDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 21
    },
    presentDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 21
    },
    absentDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lopDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    paidDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    overtimeHours: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    weeklyOffDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    holidays: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // Variable components for this period
    variableEarnings: {
      type: DataTypes.JSON,
      defaultValue: {
        performanceBonus: 0,
        overtimeAllowance: 0,
        arrears: 0,
        incentive: 0,
        specialBonus: 0
      }
    },
    variableDeductions: {
      type: DataTypes.JSON,
      defaultValue: {
        loanEmi: 0,
        advances: 0,
        canteenCharges: 0,
        otherDeductions: 0,
        lateFine: 0
      }
    },
    // Leave adjustments
    leaveAdjustments: {
      type: DataTypes.JSON,
      defaultValue: {
        leaveEncashment: 0,
        leaveWithoutPay: 0
      }
    },
    // Calculated totals
    grossSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    totalDeductions: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    netSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    // Payment information
    paymentMode: {
      type: DataTypes.ENUM('bank_transfer', 'cheque', 'cash', 'upi'),
      defaultValue: 'bank_transfer'
    },
    disbursementDate: {
      type: DataTypes.DATEONLY
    },
    // Status
    status: {
      type: DataTypes.ENUM('draft', 'calculated', 'approved', 'paid', 'cancelled'),
      defaultValue: 'draft'
    },
    // Approval workflow
    approvedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approvedAt: {
      type: DataTypes.DATE
    },
    approvalComments: {
      type: DataTypes.TEXT
    },
    // Audit fields
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updatedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    // Additional metadata
    calculationNotes: {
      type: DataTypes.TEXT
    },
    templateUsed: {
      type: DataTypes.STRING,
      defaultValue: 'default'
    }
  }, {
    tableName: 'payroll_data',
    timestamps: true,
    indexes: [
      {
        fields: ['employeeId']
      },
      {
        fields: ['payPeriod']
      },
      {
        fields: ['status']
      },
      {
        unique: true,
        fields: ['employeeId', 'payPeriod']
      }
    ]
  });

  // Define associations
  PayrollData.associate = (models) => {
    PayrollData.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      as: 'employee'
    });
    PayrollData.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    PayrollData.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
    PayrollData.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });
    PayrollData.hasOne(models.Payslip, {
      foreignKey: 'payrollDataId',
      as: 'payslip'
    });
  };

  return PayrollData;
};