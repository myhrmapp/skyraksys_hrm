module.exports = (sequelize, DataTypes) => {
  const PayslipTemplate = sequelize.define('PayslipTemplate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    headerFields: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array of header field configurations'
    },
    earningsFields: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array of earnings field configurations'
    },
    deductionsFields: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array of deductions field configurations'
    },
    footerFields: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array of footer field configurations'
    },
    styling: {
      type: DataTypes.JSON,
      defaultValue: {
        fontFamily: 'Arial',
        fontSize: '12px',
        headerColor: '#1976d2',
        backgroundColor: '#ffffff'
      },
      comment: 'Template styling configuration'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'employees',
        key: 'id'
      }
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'employees',
        key: 'id'
      }
    }
  }, {
    tableName: 'payslip_templates',
    timestamps: true,
    indexes: [
      {
        fields: ['isDefault']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['name']
      }
    ],
    hooks: {
      // Ensure only one default template
      beforeSave: async (template, options) => {
        if (template.isDefault) {
          const { Op } = require('sequelize');
          await PayslipTemplate.update(
            { isDefault: false },
            { 
              where: { 
                isDefault: true,
                id: { [Op.ne]: template.id }
              },
              transaction: options.transaction
            }
          );
        }
      }
    }
  });

  PayslipTemplate.associate = (models) => {
    // Association with Employee for createdBy and updatedBy
    PayslipTemplate.belongsTo(models.Employee, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    
    PayslipTemplate.belongsTo(models.Employee, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });

    // Association with Payroll for template usage tracking
    // PayslipTemplate.hasMany(models.Payroll, {
    //   foreignKey: 'templateId',
    //   as: 'payrolls'
    // });
  };

  // Instance methods
  PayslipTemplate.prototype.setAsDefault = async function() {
    // Set all other templates as non-default
    await PayslipTemplate.update(
      { isDefault: false },
      { where: { isDefault: true } }
    );
    
    // Set this template as default
    this.isDefault = true;
    await this.save();
  };

  PayslipTemplate.prototype.getAllFields = function() {
    return [
      ...this.headerFields,
      ...this.earningsFields,
      ...this.deductionsFields,
      ...this.footerFields
    ];
  };

  // Class methods
  PayslipTemplate.getDefaultTemplate = async function() {
    return await PayslipTemplate.findOne({
      where: { 
        isDefault: true,
        isActive: true
      }
    });
  };

  PayslipTemplate.createDefaultTemplate = async function() {
    const defaultTemplate = {
      name: 'Standard Payslip Template',
      description: 'Default payslip template with standard Indian payroll fields',
      isDefault: true,
      isActive: true,
      headerFields: [
        { id: 'companyName', label: 'Company Name', type: 'text' },
        { id: 'payPeriod', label: 'Pay Period', type: 'text' },
        { id: 'employeeName', label: 'Employee Name', type: 'text' },
        { id: 'employeeId', label: 'Employee ID', type: 'text' },
        { id: 'department', label: 'Department', type: 'text' },
        { id: 'position', label: 'Position', type: 'text' }
      ],
      earningsFields: [
        { id: 'basicSalary', label: 'Basic Salary', type: 'currency' },
        { id: 'hra', label: 'House Rent Allowance', type: 'currency' },
        { id: 'allowances', label: 'Other Allowances', type: 'currency' },
        { id: 'overtimePay', label: 'Overtime Pay', type: 'currency' },
        { id: 'grossSalary', label: 'Gross Salary', type: 'currency', calculated: true }
      ],
      deductionsFields: [
        { id: 'pfContribution', label: 'PF Contribution', type: 'currency' },
        { id: 'tds', label: 'TDS', type: 'currency' },
        { id: 'professionalTax', label: 'Professional Tax', type: 'currency' },
        { id: 'otherDeductions', label: 'Other Deductions', type: 'currency' },
        { id: 'totalDeductions', label: 'Total Deductions', type: 'currency', calculated: true }
      ],
      footerFields: [
        { id: 'netSalary', label: 'Net Salary', type: 'currency', calculated: true },
        { id: 'workingDays', label: 'Working Days', type: 'number' },
        { id: 'actualWorkingDays', label: 'Actual Working Days', type: 'number' },
        { id: 'generatedDate', label: 'Generated Date', type: 'date' }
      ],
      styling: {
        fontFamily: 'Arial',
        fontSize: '12px',
        headerColor: '#1976d2',
        backgroundColor: '#ffffff'
      }
    };

    return await PayslipTemplate.create(defaultTemplate);
  };

  return PayslipTemplate;
};
