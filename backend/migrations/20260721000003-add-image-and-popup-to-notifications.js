'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('notifications').catch(() => null);
    if (!tableInfo) {
      console.log('Notifications table does not exist, skipping imageUrl/isPopup migration.');
      return;
    }

    if (!tableInfo.imageUrl) {
      await queryInterface.addColumn('notifications', 'imageUrl', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!tableInfo.isPopup) {
      await queryInterface.addColumn('notifications', 'isPopup', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('notifications').catch(() => null);
    if (!tableInfo) {
      return;
    }

    if (tableInfo.imageUrl) {
      await queryInterface.removeColumn('notifications', 'imageUrl');
    }

    if (tableInfo.isPopup) {
      await queryInterface.removeColumn('notifications', 'isPopup');
    }
  }
};
