'use strict';

/**
 * Migration: Add CHECK constraint on audit_logs.action
 *
 * Problem: The consolidated schema created audit_logs.action as VARCHAR(50),
 * but the AuditLog model declares it as DataTypes.ENUM(...). Without a DB-level
 * constraint, any string ≤50 chars can be inserted, bypassing the allowed-values
 * list when the DB is accessed directly (admin panel, raw SQL, etc.).
 *
 * Fix: Add a CHECK constraint listing all valid action values so the DB enforces
 * the same set that the model ENUM declares. No data migration needed — all
 * existing rows were normalised to UPPER_CASE by migration 20260210000001.
 */
module.exports = {
  async up(queryInterface) {
    const constraintName = 'chk_audit_logs_action_values';

    // Idempotency guard
    const [existing] = await queryInterface.sequelize.query(
      `SELECT constraint_name FROM information_schema.table_constraints
       WHERE constraint_name = '${constraintName}' AND table_schema = 'public'`
    );
    if (existing.length > 0) {
      console.log(`⏭️  ${constraintName} already exists — skipping`);
      return;
    }

    const validActions = [
      // CRUD
      'CREATED', 'UPDATED', 'DELETED', 'RESTORED',
      // Status workflows
      'STATUS_CHANGED', 'APPROVED', 'REJECTED', 'SUBMITTED',
      // Leave / payroll
      'BALANCE_ADJUSTED', 'PAYMENT_PROCESSED',
      // Auth — login / logout
      'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT',
      'ACCOUNT_LOCKED_TEMP', 'ACCOUNT_LOCKED_MANUAL',
      // Auth — tokens
      'TOKEN_REFRESHED', 'TOKEN_REFRESH_FAILED',
      // Auth — passwords
      'PASSWORD_CHANGED', 'PASSWORD_RESET_BY_ADMIN',
      'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED',
      // Permissions
      'PERMISSION_CHANGED',
      // Data operations
      'EXPORTED', 'IMPORTED',
      // System config
      'EMAIL_CONFIG_UPDATED', 'VIEW_SYSTEM_CONFIG', 'UPDATE_SYSTEM_CONFIG',
      'SYSTEM_CONFIG_ACCESS_GRANTED', 'SYSTEM_CONFIG_ACCESS_DENIED',
      'SYSTEM_CONFIG_PASSWORD_VERIFY_FAILED',
      // Security
      'DISTRIBUTED_ATTACK_DETECTED',
      // Timesheet
      'TIMESHEET_APPROVED', 'TIMESHEET_REJECTED', 'TIMESHEET_STATUS_CHANGE'
    ];

    // Safety: Check for rows that would violate the constraint before adding it
    const valueList = validActions.map(v => `'${v}'`).join(', ');
    const [violating] = await queryInterface.sequelize.query(
      `SELECT DISTINCT action, COUNT(*) as cnt FROM audit_logs
       WHERE action NOT IN (${valueList})
       GROUP BY action`
    );
    if (violating.length > 0) {
      console.error('🚫  Cannot add CHECK constraint — the following action values are not in the allowed list:');
      violating.forEach(r => console.error(`     action="${r.action}" (${r.cnt} rows)`));
      console.error('   Fix these rows first, then re-run this migration.');
      throw new Error(
        `audit_logs contains ${violating.length} invalid action value(s): ` +
        violating.map(r => r.action).join(', ') +
        '. Clean data before applying this constraint.'
      );
    }

    await queryInterface.sequelize.query(
      `ALTER TABLE audit_logs ADD CONSTRAINT ${constraintName}
       CHECK (action IN (${valueList}))`
    );
    console.log(`✅  Added ${constraintName} on audit_logs.action (${validActions.length} valid values)`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS chk_audit_logs_action_values`
    );
    console.log('✅  Dropped chk_audit_logs_action_values');
  }
};
