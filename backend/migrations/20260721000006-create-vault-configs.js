'use strict';

/**
 * Migration: Create vault configs table + add encryptedFinancials to payslips/invoices.
 * 
 * FIXED: Previously the payroll_vault_configs table creation was accidentally commented out.
 * This version correctly creates the table and syncs the down() method with up().
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create Vault Configs Table
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('payroll_vault_configs')) {
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
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        hrEncryptedDek:  { type: Sequelize.TEXT, allowNull: true },
        adminEncryptedDek: { type: Sequelize.TEXT, allowNull: true },
        hrIv:            { type: Sequelize.STRING(50), allowNull: true },
        adminIv:         { type: Sequelize.STRING(50), allowNull: true },
        hrAuthTag:       { type: Sequelize.STRING(50), allowNull: true },
        adminAuthTag:    { type: Sequelize.STRING(50), allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE }
      });
      console.log('  ✓ payroll_vault_configs table created');
    } else {
      console.log('  ⏭  payroll_vault_configs already exists — skipping');
    }

    // 2. Payslip column changes (nullable for encrypted vault mode)
    const payslipCols = await queryInterface.describeTable('payslips');
    if (payslipCols.grossEarnings) {
      await queryInterface.changeColumn('payslips', 'grossEarnings', { type: Sequelize.DECIMAL(10, 2), allowNull: true });
      await queryInterface.changeColumn('payslips', 'netPay',        { type: Sequelize.DECIMAL(10, 2), allowNull: true });
      await queryInterface.changeColumn('payslips', 'earnings',      { type: Sequelize.JSON, allowNull: true });
      await queryInterface.changeColumn('payslips', 'deductions',    { type: Sequelize.JSON, allowNull: true });
      console.log('  ✓ payslips columns updated to nullable');
    }

    // 3. Invoice encryptedFinancials + nullable financial columns
    const invoiceCols = await queryInterface.describeTable('invoices');
    if (!invoiceCols.encryptedFinancials) {
      await queryInterface.addColumn('invoices', 'encryptedFinancials', { type: Sequelize.TEXT, allowNull: true });
      console.log('  ✓ invoices.encryptedFinancials added');
    }
    await queryInterface.changeColumn('invoices', 'subtotal',    { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await queryInterface.changeColumn('invoices', 'taxPercent',  { type: Sequelize.DECIMAL(5, 2),  allowNull: true });
    await queryInterface.changeColumn('invoices', 'taxAmount',   { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await queryInterface.changeColumn('invoices', 'totalAmount', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await queryInterface.changeColumn('invoices', 'lineItems',   { type: Sequelize.JSON, allowNull: true });
    console.log('  ✓ invoices financial columns updated to nullable');
  },

  down: async (queryInterface, Sequelize) => {
    // Only reverse what up() actually does
    await queryInterface.removeColumn('invoices', 'encryptedFinancials').catch(() => {});
    await queryInterface.dropTable('payroll_vault_configs').catch(() => {});
  }
};
