'use strict';

/**
 * Migration: Fix approvedBy FK to reference employees(id)
 * 
 * Both leave_requests.approvedBy and timesheets.approvedBy store employee IDs
 * (see LeaveBusinessService line 150, TimesheetBusinessService line 303):
 *   const approverId = currentUser.employee?.id || currentUser.id;
 * 
 * The previous migration (20260210000002) incorrectly pointed these FKs to users(id).
 * This migration corrects them to reference employees(id), matching the model
 * definitions and service code behavior.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // --- leave_requests.approvedBy → employees(id) ---
    try {
      const [leaveFKs] = await queryInterface.sequelize.query(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'leave_requests'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name LIKE '%approvedBy%'
      `);
      for (const fk of leaveFKs) {
        await queryInterface.removeConstraint('leave_requests', fk.constraint_name);
      }
    } catch (e) {
      // FK may not exist
    }

    await queryInterface.addConstraint('leave_requests', {
      fields: ['approvedBy'],
      type: 'foreign key',
      name: 'leave_requests_approvedBy_fkey',
      references: { table: 'employees', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // --- timesheets.approvedBy → employees(id) ---
    try {
      const [tsFKs] = await queryInterface.sequelize.query(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'timesheets'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name LIKE '%approvedBy%'
      `);
      for (const fk of tsFKs) {
        await queryInterface.removeConstraint('timesheets', fk.constraint_name);
      }
    } catch (e) {
      // FK may not exist
    }

    await queryInterface.addConstraint('timesheets', {
      fields: ['approvedBy'],
      type: 'foreign key',
      name: 'timesheets_approvedBy_fkey',
      references: { table: 'employees', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert: point FKs back to users(id)
    try {
      await queryInterface.removeConstraint('leave_requests', 'leave_requests_approvedBy_fkey');
    } catch (e) { /* ignore */ }

    await queryInterface.addConstraint('leave_requests', {
      fields: ['approvedBy'],
      type: 'foreign key',
      name: 'leave_requests_approvedBy_users_fk',
      references: { table: 'users', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    try {
      await queryInterface.removeConstraint('timesheets', 'timesheets_approvedBy_fkey');
    } catch (e) { /* ignore */ }

    await queryInterface.addConstraint('timesheets', {
      fields: ['approvedBy'],
      type: 'foreign key',
      name: 'timesheets_approvedBy_users_fk',
      references: { table: 'users', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }
};
