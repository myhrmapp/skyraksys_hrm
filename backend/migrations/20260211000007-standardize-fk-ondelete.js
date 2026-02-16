'use strict';

/**
 * Migration: Standardize FK onDelete policies
 * DB-12: Replace NO ACTION with appropriate SET NULL or RESTRICT
 * 
 * Policy:
 * - SET NULL: optional reference columns (nullable FKs like approvedBy, updatedBy)  
 * - RESTRICT: critical non-nullable FKs (employeeId in payroll_data, projectId/taskId in timesheets)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const changes = [
      {
        table: 'departments', column: 'parentId', refTable: 'departments', refColumn: 'id',
        oldConstraint: 'departments_parentId_fkey',
        newRule: 'SET NULL',
        reason: 'Optional self-referencing hierarchy'
      },
      {
        table: 'employee_reviews', column: 'hrApprovedBy', refTable: 'users', refColumn: 'id',
        oldConstraint: 'employee_reviews_hrApprovedBy_fkey',
        newRule: 'SET NULL',
        reason: 'Optional approver reference'
      },
      {
        table: 'payroll_data', column: 'employeeId', refTable: 'employees', refColumn: 'id',
        oldConstraint: 'payroll_data_employeeId_fkey',
        newRule: 'RESTRICT',
        reason: 'Critical — cannot orphan payroll records'
      },
      {
        table: 'payroll_data', column: 'createdBy', refTable: 'users', refColumn: 'id',
        oldConstraint: 'payroll_data_createdBy_fkey',
        newRule: 'RESTRICT',
        reason: 'NOT NULL column — cannot set null, so restrict deletion'
      },
      {
        table: 'payroll_data', column: 'updatedBy', refTable: 'users', refColumn: 'id',
        oldConstraint: 'payroll_data_updatedBy_fkey',
        newRule: 'SET NULL',
        reason: 'Optional updater reference'
      },
      {
        table: 'payroll_data', column: 'approvedBy', refTable: 'users', refColumn: 'id',
        oldConstraint: 'payroll_data_approvedBy_fkey',
        newRule: 'SET NULL',
        reason: 'Optional approver reference'
      },
      {
        table: 'timesheets', column: 'projectId', refTable: 'projects', refColumn: 'id',
        oldConstraint: 'timesheets_projectId_fkey',
        newRule: 'RESTRICT',
        reason: 'NOT NULL column — cannot delete project with timesheets'
      },
      {
        table: 'timesheets', column: 'taskId', refTable: 'tasks', refColumn: 'id',
        oldConstraint: 'timesheets_taskId_fkey',
        newRule: 'RESTRICT',
        reason: 'NOT NULL column — cannot delete task with timesheets'
      }
    ];

    for (const chg of changes) {
      try {
        // Drop old FK
        await queryInterface.sequelize.query(
          `ALTER TABLE "${chg.table}" DROP CONSTRAINT IF EXISTS "${chg.oldConstraint}"`
        );

        // Re-add with correct onDelete
        await queryInterface.sequelize.query(
          `ALTER TABLE "${chg.table}" ADD CONSTRAINT "${chg.oldConstraint}"
           FOREIGN KEY ("${chg.column}") REFERENCES "${chg.refTable}"("${chg.refColumn}")
           ON DELETE ${chg.newRule} ON UPDATE CASCADE`
        );

        console.log(`✅  ${chg.table}.${chg.column}: NO ACTION → ${chg.newRule} (${chg.reason})`);
      } catch (error) {
        console.error(`❌  ${chg.table}.${chg.column}: ${error.message}`);
      }
    }
  },

  async down(queryInterface) {
    // Revert all to NO ACTION
    console.log('⚠️  Down migration would revert all to NO ACTION — manual intervention required.');
  }
};
