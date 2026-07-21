'use strict';

/**
 * Migration: add-project-managerid-and-salary-payfrequency
 *
 * Fixes two model/DB gaps identified in architecture review (2026-07-19):
 *
 * 1. projects.manager_id  — The Project Sequelize model declares a belongsTo
 *    association with foreignKey 'managerId', but the column was never added
 *    to the table in any previous migration. Without it, eager-loading the
 *    'manager' association throws "column projects.managerId does not exist".
 *
 * 2. salary_structures.pay_frequency  — The SalaryStructureTab UI collects
 *    payFrequency (weekly/biweekly/monthly/annually) but the column does not
 *    exist in salary_structures, causing the value to be silently dropped on
 *    every employee save.
 *
 * Both columns are added as nullable so existing rows are unaffected.
 * The migration is fully reversible.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. projects.manager_id ──────────────────────────────────────────────
    const projectCols = await queryInterface.describeTable('projects');
    if (!projectCols.managerId) {
      await queryInterface.addColumn('projects', 'managerId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Project manager (employee FK)'
      });

      await queryInterface.addIndex('projects', ['managerId'], {
        name: 'idx_projects_manager_id'
      });
    }

    // ── 2. salary_structures.pay_frequency ────────────────────────────────
    const salaryCols = await queryInterface.describeTable('salary_structures');
    if (!salaryCols.payFrequency) {
      await queryInterface.addColumn('salary_structures', 'payFrequency', {
        type: Sequelize.ENUM('weekly', 'biweekly', 'monthly', 'annually'),
        allowNull: true,
        defaultValue: 'monthly',
        comment: 'Pay cycle frequency collected from the SalaryStructureTab UI'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // ── Remove salary_structures.pay_frequency ──────────────────────────────
    const salaryCols = await queryInterface.describeTable('salary_structures');
    if (salaryCols.payFrequency) {
      await queryInterface.removeColumn('salary_structures', 'payFrequency');
    }

    // ── Remove projects.manager_id ──────────────────────────────────────────
    const projectCols = await queryInterface.describeTable('projects');
    if (projectCols.managerId) {
      try {
        await queryInterface.removeIndex('projects', 'idx_projects_manager_id');
      } catch (_) { /* ignore if index already gone */ }
      await queryInterface.removeColumn('projects', 'managerId');
    }
  }
};
