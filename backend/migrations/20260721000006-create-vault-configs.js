'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /*
    // 1. Create Vault Configs Table
    await queryInterface.createTable('payroll_vault_configs', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      isEnabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      designatedHrUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' }
      },
      hrEncryptedDek: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      adminEncryptedDek: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      hrIv: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      adminIv: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      hrAuthTag: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      adminAuthTag: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 2. Add encryptedFinancials to PayrollData
    await queryInterface.addColumn('payroll_data', 'encryptedFinancials', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.changeColumn('payroll_data', 'grossSalary', { type: Sequelize.DECIMAL(10, 2), allowNull: true });
    await queryInterface.changeColumn('payroll_data', 'netSalary', { type: Sequelize.DECIMAL(10, 2), allowNull: true });
    await queryInterface.changeColumn('payroll_data', 'variableEarnings', { type: Sequelize.JSON, allowNull: true });
    await queryInterface.changeColumn('payroll_data', 'variableDeductions', { type: Sequelize.JSON, allowNull: true });
    await queryInterface.changeColumn('payroll_data', 'leaveAdjustments', { type: Sequelize.JSON, allowNull: true });
    */

    /*
    // 3. Add encryptedFinancials to Payslips
    await queryInterface.addColumn('payslips', 'encryptedFinancials', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    */

    await queryInterface.changeColumn('payslips', 'grossEarnings', { type: Sequelize.DECIMAL(10, 2), allowNull: true });
    await queryInterface.changeColumn('payslips', 'netPay', { type: Sequelize.DECIMAL(10, 2), allowNull: true });
    await queryInterface.changeColumn('payslips', 'earnings', { type: Sequelize.JSON, allowNull: true });
    await queryInterface.changeColumn('payslips', 'deductions', { type: Sequelize.JSON, allowNull: true });

    // 4. Add encryptedFinancials to Invoices
    await queryInterface.addColumn('invoices', 'encryptedFinancials', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.changeColumn('invoices', 'subtotal', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await queryInterface.changeColumn('invoices', 'taxPercent', { type: Sequelize.DECIMAL(5, 2), allowNull: true });
    await queryInterface.changeColumn('invoices', 'taxAmount', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await queryInterface.changeColumn('invoices', 'totalAmount', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await queryInterface.changeColumn('invoices', 'lineItems', { type: Sequelize.JSON, allowNull: true });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop Vault Configs
    await queryInterface.dropTable('payroll_vault_configs');

    // Remove columns
    await queryInterface.removeColumn('payroll_data', 'encryptedFinancials');
    await queryInterface.removeColumn('payslips', 'encryptedFinancials');
    await queryInterface.removeColumn('invoices', 'encryptedFinancials');
  }
};
