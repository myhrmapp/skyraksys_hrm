'use strict';

/**
 * Migration: Add missing dueDate column to tasks table
 * 
 * The Task model defines dueDate (DATE, allowNull: true) but the
 * consolidated schema migration never created this column, causing
 * "column Task.dueDate does not exist" on every GET /api/tasks query.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if column already exists (idempotent)
      const [columns] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'dueDate';
      `, { transaction });

      if (columns.length === 0) {
        console.log('Adding dueDate column to tasks table...');
        await queryInterface.addColumn('tasks', 'dueDate', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
        console.log('✓ dueDate column added');
      } else {
        console.log('ℹ dueDate column already exists');
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('tasks', 'dueDate');
  }
};
