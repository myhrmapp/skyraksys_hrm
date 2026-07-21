module.exports = (sequelize, DataTypes) => {
  const SalaryStructure = sequelize.define('SalaryStructure', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    basicSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    hra: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    allowances: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Total allowances amount'
    },
    pfContribution: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    tds: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    professionalTax: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    esi: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    otherDeductions: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'INR'
    },
    payFrequency: {
      type: DataTypes.ENUM('weekly', 'biweekly', 'monthly', 'annually'),
      defaultValue: 'monthly'
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'salary_structures',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['employeeId'],
        name: 'idx_salary_structures_employee'
      },
      {
        unique: true,
        fields: ['employeeId', 'effectiveFrom'],
        name: 'uq_salary_structures_employee_effective'
      }
    ]
  });

  SalaryStructure.associate = function(models) {
    SalaryStructure.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      as: 'employee'
    });
  };

  const VaultCrypto = require('../utils/vaultCrypto');

  SalaryStructure.beforeSave(async (structure, options) => {
    try {
      const config = await sequelize.models.PayrollVaultConfig.findOne();
      if (config && config.isEnabled) {
        const payload = {
          basicSalary: structure.getDataValue('basicSalary'),
          hra: structure.getDataValue('hra'),
          allowances: structure.getDataValue('allowances'),
          pfContribution: structure.getDataValue('pfContribution'),
          tds: structure.getDataValue('tds'),
          professionalTax: structure.getDataValue('professionalTax'),
          esi: structure.getDataValue('esi'),
          otherDeductions: structure.getDataValue('otherDeductions')
        };
        const encrypted = VaultCrypto.encryptPayload(payload);
        structure.setDataValue('encryptedFinancials', JSON.stringify(encrypted));
        
        structure.setDataValue('basicSalary', null);
        structure.setDataValue('hra', null);
        structure.setDataValue('allowances', null);
        structure.setDataValue('pfContribution', null);
        structure.setDataValue('tds', null);
        structure.setDataValue('professionalTax', null);
        structure.setDataValue('esi', null);
        structure.setDataValue('otherDeductions', null);
      }
    } catch (e) {
      console.error('Error encrypting SalaryStructure before save:', e);
    }
  });

  const decryptStructure = async (structure) => {
    const encryptedDataStr = structure.getDataValue('encryptedFinancials');
    if (structure && encryptedDataStr) {
      try {
        const enc = JSON.parse(encryptedDataStr);
        const payload = VaultCrypto.decryptPayload(enc.encryptedData, enc.iv, enc.authTag);
        structure.setDataValue('basicSalary', payload.basicSalary);
        structure.setDataValue('hra', payload.hra);
        structure.setDataValue('allowances', payload.allowances);
        structure.setDataValue('pfContribution', payload.pfContribution);
        structure.setDataValue('tds', payload.tds);
        structure.setDataValue('professionalTax', payload.professionalTax);
        structure.setDataValue('esi', payload.esi);
        structure.setDataValue('otherDeductions', payload.otherDeductions);
      } catch (e) {
        console.error('Failed to decrypt SalaryStructure:', e);
      }
    }
  };

  SalaryStructure.afterFind(async (result, options) => {
    if (!result) return;
    if (Array.isArray(result)) {
      for (const p of result) {
        await decryptStructure(p);
      }
    } else {
      await decryptStructure(result);
    }
  });

  return SalaryStructure;
};
