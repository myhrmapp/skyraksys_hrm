'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const tableName of ['payroll_data', 'payslips', 'salary_structures']) {
      const columns = await queryInterface.describeTable(tableName);
      if (!columns.encryptedFinancials) {
        await queryInterface.addColumn(tableName, 'encryptedFinancials', {
          type: Sequelize.TEXT,
          allowNull: true
        });
      }
    }
  },

  down: async (queryInterface) => {
    for (const tableName of ['payroll_data', 'payslips', 'salary_structures']) {
      const columns = await queryInterface.describeTable(tableName);
      if (columns.encryptedFinancials) {
        await queryInterface.removeColumn(tableName, 'encryptedFinancials');
      }
    }
  }
};