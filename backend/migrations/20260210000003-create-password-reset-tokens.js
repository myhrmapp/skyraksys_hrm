'use strict';

/**
 * Migration: Create password_reset_tokens table (GAP Item 11.16)
 * 
 * Replaces in-memory token tracking with persistent storage.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('password_reset_tokens', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tokenId: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      usedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Indexes
    await queryInterface.addIndex('password_reset_tokens', ['tokenId'], {
      unique: true,
      name: 'prt_token_id_unique'
    });
    await queryInterface.addIndex('password_reset_tokens', ['email', 'createdAt'], {
      name: 'prt_email_created_at'
    });
    await queryInterface.addIndex('password_reset_tokens', ['expiresAt'], {
      name: 'prt_expires_at'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('password_reset_tokens');
  }
};
