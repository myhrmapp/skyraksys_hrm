'use strict';

/**
 * Migration: Add remaining recommended indexes
 *
 * Closes the gaps identified in the DB architecture audit (2026-03-27).
 * Each index targets a query pattern that is hit in hot code paths:
 *
 *   payroll_data(status, payPeriodStart)       — payroll approval workflows
 *   leave_requests(employeeId, status, startDate) — leave calendar queries
 *   audit_logs(entityType, action, createdAt)  — cross-entity action reporting
 *   refresh_tokens(isRevoked, expiresAt)       — token cleanup / validation
 *   password_reset_tokens(userId, expiresAt)   — rate-limit / expiry checks
 *
 * All indexes use idempotency guards — safe to run on existing databases.
 */
module.exports = {
  async up(queryInterface) {
    const addIdx = async (name, table, fields, options = {}) => {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT indexname FROM pg_indexes WHERE indexname = '${name}'`
      );
      if (existing.length > 0) {
        console.log(`⏭️  ${name} already exists — skipping`);
        return;
      }
      try {
        await queryInterface.addIndex(table, fields, { name, ...options });
        console.log(`✅  Created ${name} on ${table}(${fields.join(', ')})`);
      } catch (err) {
        console.error(`❌  Failed to create ${name}: ${err.message}`);
      }
    };

    // payroll_data — approval workflow filter pattern
    await addIdx(
      'idx_payroll_data_status_pay_period_start',
      'payroll_data',
      ['status', 'payPeriodStart']
    );

    // leave_requests — leave calendar / approval dashboard
    await addIdx(
      'idx_leave_requests_emp_status_start',
      'leave_requests',
      ['employeeId', 'status', 'startDate']
    );

    // audit_logs — cross-entity reporting (entityType + action + time window)
    await addIdx(
      'idx_audit_logs_entity_type_action_created',
      'audit_logs',
      ['entityType', 'action', 'createdAt']
    );

    // refresh_tokens — cleanup cron + per-request revocation check
    await addIdx(
      'idx_refresh_tokens_is_revoked_expires_at',
      'refresh_tokens',
      ['isRevoked', 'expiresAt']
    );

    // password_reset_tokens — multi-token-per-user rate limiting
    await addIdx(
      'idx_password_reset_tokens_user_expires',
      'password_reset_tokens',
      ['userId', 'expiresAt']
    );

    console.log('✅  Recommended indexes migration complete');
  },

  async down(queryInterface) {
    const removals = [
      { table: 'payroll_data',           name: 'idx_payroll_data_status_pay_period_start' },
      { table: 'leave_requests',         name: 'idx_leave_requests_emp_status_start' },
      { table: 'audit_logs',             name: 'idx_audit_logs_entity_type_action_created' },
      { table: 'refresh_tokens',         name: 'idx_refresh_tokens_is_revoked_expires_at' },
      { table: 'password_reset_tokens',  name: 'idx_password_reset_tokens_user_expires' }
    ];

    for (const { table, name } of removals) {
      await queryInterface.removeIndex(table, name).catch(() => {});
    }
    console.log('✅  Recommended indexes removed');
  }
};
