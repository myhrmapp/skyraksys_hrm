'use strict';

/**
 * Migration: Create holidays table (GAP Item 12.5)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('holidays', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('public', 'restricted', 'company'),
        allowNull: false,
        defaultValue: 'public'
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      isRecurring: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('holidays', ['year'], { name: 'holidays_year' });
    await queryInterface.addIndex('holidays', ['date'], { name: 'holidays_date' });
    await queryInterface.addIndex('holidays', ['date', 'name'], {
      unique: true,
      name: 'holidays_date_name_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('holidays');
  }
};
