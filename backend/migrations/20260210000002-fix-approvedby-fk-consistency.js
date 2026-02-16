'use strict';

/**
 * Migration: Fix FK inconsistency — approvedBy should reference users (GAP Item 11.14)
 * 
 * leave_requests.approvedBy was → employees.id (incorrect)
 * timesheets.approvedBy was → employees.id (incorrect)
 * payroll_data.approvedBy → users.id (correct — no change needed)
 * 
 * All approvedBy columns should reference users.id since approvers are
 * authenticated users with roles, not necessarily employees.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop old FK constraints first, then recreate with correct references

    // --- leave_requests.approvedBy ---
    try {
      // Find and drop existing FK
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
      name: 'leave_requests_approvedBy_users_fk',
      references: { table: 'users', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // --- timesheets.approvedBy ---
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
      name: 'timesheets_approvedBy_users_fk',
      references: { table: 'users', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert: point FKs back to employees
    try {
      await queryInterface.removeConstraint('leave_requests', 'leave_requests_approvedBy_users_fk');
    } catch (e) { /* ignore */ }

    await queryInterface.addConstraint('leave_requests', {
      fields: ['approvedBy'],
      type: 'foreign key',
      name: 'leave_requests_approvedBy_employees_fk',
      references: { table: 'employees', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    try {
      await queryInterface.removeConstraint('timesheets', 'timesheets_approvedBy_users_fk');
    } catch (e) { /* ignore */ }

    await queryInterface.addConstraint('timesheets', {
      fields: ['approvedBy'],
      type: 'foreign key',
      name: 'timesheets_approvedBy_employees_fk',
      references: { table: 'employees', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }
};
