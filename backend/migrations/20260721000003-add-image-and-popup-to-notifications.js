'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('notifications', 'imageUrl', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.addColumn('notifications', 'isPopup', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('notifications', 'imageUrl');
    await queryInterface.removeColumn('notifications', 'isPopup');
  }
};
