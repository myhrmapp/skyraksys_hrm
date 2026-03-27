'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add country column to employees table
    await queryInterface.addColumn('employees', 'country', {
      type: Sequelize.STRING,
      defaultValue: 'India',
      allowNull: true
    });

    // Add esi column to salary_structures table
    await queryInterface.addColumn('salary_structures', 'esi', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('employees', 'country');
    await queryInterface.removeColumn('salary_structures', 'esi');
  }
};
