'use strict';

/**
 * Migration: Add rejectedBy column and (employeeId, status) composite index to timesheets
 *
 * Issues fixed:
 *   C-01 — rejectedBy field was written by bulkRejectTimesheets but column did not exist
 *   L-07 — Missing composite index (employeeId, status) for common query patterns
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add rejectedBy column (mirrors approvedBy semantics)
    await queryInterface.addColumn('timesheets', 'rejectedBy', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'employees', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      after: 'approvedBy',
    });

    // 2. Add composite index (employeeId, status) for queries like
    //    "my submitted timesheets" or "pending approvals" which filter both columns
    await queryInterface.addIndex('timesheets', ['employeeId', 'status'], {
      name: 'idx_timesheets_employee_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('timesheets', 'idx_timesheets_employee_status');
    await queryInterface.removeColumn('timesheets', 'rejectedBy');
  },
};
