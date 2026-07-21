'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column exists to be safe
    const tableInfo = await queryInterface.describeTable('salary_structures');
    
    if (!tableInfo.encryptedFinancials) {
      await queryInterface.addColumn('salary_structures', 'encryptedFinancials', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    // Convert basicSalary, hra, allowances, pfContribution, tds, professionalTax, esi, otherDeductions
    // to allow null so the hook can nullify them when encrypted.
    const numericColumns = [
      'basicSalary', 'hra', 'allowances', 'pfContribution', 
      'tds', 'professionalTax', 'esi', 'otherDeductions'
    ];

    for (const col of numericColumns) {
      if (tableInfo[col]) {
        await queryInterface.changeColumn('salary_structures', col, {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true, // Now allows null when Vault is active
        });
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('salary_structures');
    
    if (tableInfo.encryptedFinancials) {
      await queryInterface.removeColumn('salary_structures', 'encryptedFinancials');
    }
    
    // We do NOT revert the allowNull: true on the numeric columns to prevent data loss 
    // if the vault was enabled and disabled. 
  }
};
