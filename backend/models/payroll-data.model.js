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

  const VaultCrypto = require('../utils/vaultCrypto');

  PayrollData.beforeSave(async (payrollData, options) => {
    try {
      const config = await sequelize.models.PayrollVaultConfig.findOne();
      if (config && config.isEnabled) {
        const payload = {
          grossSalary: payrollData.getDataValue('grossSalary'),
          netSalary: payrollData.getDataValue('netSalary'),
          variableEarnings: payrollData.getDataValue('variableEarnings'),
          variableDeductions: payrollData.getDataValue('variableDeductions'),
          leaveAdjustments: payrollData.getDataValue('leaveAdjustments')
        };
        const encrypted = VaultCrypto.encryptPayload(payload);
        payrollData.setDataValue('encryptedFinancials', JSON.stringify(encrypted));
        
        payrollData.setDataValue('grossSalary', null);
        payrollData.setDataValue('netSalary', null);
        payrollData.setDataValue('variableEarnings', null);
        payrollData.setDataValue('variableDeductions', null);
        payrollData.setDataValue('leaveAdjustments', null);
      }
    } catch (e) {
      console.error('Error encrypting payrollData before save:', e);
    }
  });

  const decryptPayrollData = async (payrollData) => {
    const encryptedDataStr = payrollData.getDataValue('encryptedFinancials');
    if (payrollData && encryptedDataStr) {
      try {
        const enc = JSON.parse(encryptedDataStr);
        const payload = VaultCrypto.decryptPayload(enc.encryptedData, enc.iv, enc.authTag);
        payrollData.setDataValue('grossSalary', payload.grossSalary);
        payrollData.setDataValue('netSalary', payload.netSalary);
        payrollData.setDataValue('variableEarnings', payload.variableEarnings);
        payrollData.setDataValue('variableDeductions', payload.variableDeductions);
        payrollData.setDataValue('leaveAdjustments', payload.leaveAdjustments);
      } catch (e) {
        console.error('Failed to decrypt payrollData:', e);
      }
    }
  };

  PayrollData.afterFind(async (result, options) => {
    if (!result) return;
    if (Array.isArray(result)) {
      for (const p of result) {
        await decryptPayrollData(p);
      }
    } else {
      await decryptPayrollData(result);
    }
  });

  return PayrollData;
};