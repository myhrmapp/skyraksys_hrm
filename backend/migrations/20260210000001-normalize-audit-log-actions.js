'use strict';

/**
 * Migration: Normalize AuditLog action values (GAP Item 11.11)
 * 
 * The action column is STRING(50) at the database level, so no ALTER ENUM needed.
 * This migration normalizes existing lowercase values to UPPER_CASE.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Map of lowercase → UPPER_CASE action values
    const mappings = [
      ['created', 'CREATED'],
      ['updated', 'UPDATED'],
      ['deleted', 'DELETED'],
      ['restored', 'RESTORED'],
      ['status_changed', 'STATUS_CHANGED'],
      ['approved', 'APPROVED'],
      ['rejected', 'REJECTED'],
      ['submitted', 'SUBMITTED'],
      ['balance_adjusted', 'BALANCE_ADJUSTED'],
      ['payment_processed', 'PAYMENT_PROCESSED'],
      ['password_reset', 'PASSWORD_CHANGED'], // legacy 'password_reset' → 'PASSWORD_CHANGED'
      ['login_success', 'LOGIN_SUCCESS'],
      ['login_failed', 'LOGIN_FAILED'],
      ['permission_changed', 'PERMISSION_CHANGED'],
      ['exported', 'EXPORTED'],
      ['imported', 'IMPORTED'],
    ];

    for (const [oldVal, newVal] of mappings) {
      await queryInterface.sequelize.query(
        `UPDATE audit_logs SET action = :newVal WHERE action = :oldVal`,
        { replacements: { oldVal, newVal } }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Reverse: UPPER_CASE → lowercase (for rollback)
    const mappings = [
      ['CREATED', 'created'],
      ['UPDATED', 'updated'],
      ['DELETED', 'deleted'],
      ['RESTORED', 'restored'],
      ['STATUS_CHANGED', 'status_changed'],
      ['APPROVED', 'approved'],
      ['REJECTED', 'rejected'],
      ['SUBMITTED', 'submitted'],
      ['BALANCE_ADJUSTED', 'balance_adjusted'],
      ['PAYMENT_PROCESSED', 'payment_processed'],
      ['PASSWORD_CHANGED', 'password_reset'],
      ['LOGIN_SUCCESS', 'login_success'],
      ['LOGIN_FAILED', 'login_failed'],
      ['PERMISSION_CHANGED', 'permission_changed'],
      ['EXPORTED', 'exported'],
      ['IMPORTED', 'imported'],
    ];

    for (const [oldVal, newVal] of mappings) {
      await queryInterface.sequelize.query(
        `UPDATE audit_logs SET action = :newVal WHERE action = :oldVal`,
        { replacements: { oldVal, newVal } }
      );
    }
  }
};
