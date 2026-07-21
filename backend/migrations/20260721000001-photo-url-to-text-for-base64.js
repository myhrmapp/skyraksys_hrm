'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Change photoUrl column from VARCHAR to TEXT to store base64 data URIs
    await queryInterface.changeColumn('employees', 'photoUrl', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert to VARCHAR (note: any existing base64 data will be truncated)
    await queryInterface.changeColumn('employees', 'photoUrl', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
