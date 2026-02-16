'use strict';

/**
 * Migration: Add soft delete (deletedAt) to 4 tables
 * DB-9: leave_types, projects, tasks, salary_structures lack paranoid support
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = ['leave_types', 'projects', 'tasks', 'salary_structures'];

    for (const table of tables) {
      // Check if deletedAt already exists
      const [cols] = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = '${table}' AND column_name = 'deletedAt'`
      );
      if (cols.length > 0) {
        console.log(`⏭️  ${table}.deletedAt already exists — skipping`);
        continue;
      }

      await queryInterface.addColumn(table, 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      });

      // Add index on deletedAt for soft-delete query performance
      await queryInterface.addIndex(table, ['deletedAt'], {
        name: `idx_${table}_deleted_at`
      });

      console.log(`✅  Added deletedAt to ${table}`);
    }
  },

  async down(queryInterface) {
    const tables = ['leave_types', 'projects', 'tasks', 'salary_structures'];
    for (const table of tables) {
      await queryInterface.removeIndex(table, `idx_${table}_deleted_at`);
      await queryInterface.removeColumn(table, 'deletedAt');
    }
  }
};
