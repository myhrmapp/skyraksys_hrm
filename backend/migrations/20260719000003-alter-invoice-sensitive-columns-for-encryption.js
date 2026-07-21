'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('invoices', 'clientCompany', {
      type: Sequelize.TEXT,
      allowNull: false
    });

    await queryInterface.changeColumn('invoices', 'clientGstin', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.changeColumn('invoices', 'clientAddress', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('invoices', 'clientCompany', {
      type: Sequelize.STRING(200),
      allowNull: false
    });

    await queryInterface.changeColumn('invoices', 'clientGstin', {
      type: Sequelize.STRING(20),
      allowNull: true
    });

    await queryInterface.changeColumn('invoices', 'clientAddress', {
      type: Sequelize.STRING(500),
      allowNull: true
    });
  }
};
