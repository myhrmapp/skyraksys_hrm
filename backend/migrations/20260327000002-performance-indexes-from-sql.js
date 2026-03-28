'use strict';

/**
 * Migration: Bring performance indexes into Sequelize migration framework
 *
 * Source: database/migrations/add_performance_indexes.sql (raw SQL — was never
 *         applied by sequelize-cli, so may be missing in production).
 *
 * Changes from the original SQL file:
 *   - Dropped all references to 'payrolls' table (does not exist; table is payroll_data)
 *   - Dropped timesheets(workDate) — column does not exist (timesheet is week-based)
 *   - Dropped timesheets(workDate, employeeId) composite — same reason
 *   - Corrected timesheets partial indexes to use weekStartDate where applicable
 *   - All indexes use IF NOT EXISTS semantics (idempotency guard via pg_indexes)
 *   - Indexes already created by earlier migrations are skipped automatically
 *
 * Safe to run on existing databases — guards prevent double-creation.
 */
module.exports = {
  async up(queryInterface) {
    // Helper: add index only if it doesn't already exist
    const addIdx = async (name, sql) => {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT indexname FROM pg_indexes WHERE indexname = '${name}'`
      );
      if (existing.length > 0) {
        console.log(`⏭️  ${name} already exists — skipping`);
        return;
      }
      try {
        await queryInterface.sequelize.query(sql);
        console.log(`✅  Created ${name}`);
      } catch (err) {
        console.error(`❌  Failed to create ${name}: ${err.message}`);
      }
    };

    // Helper: upgrade a non-partial index to a partial index (WHERE deletedAt IS NULL)
    // Drops the old full-table index and creates a new partial one
    const upgradeToPartial = async (name, createSql) => {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT indexname, indexdef FROM pg_indexes WHERE indexname = '${name}'`
      );
      if (existing.length > 0) {
        const def = existing[0].indexdef || '';
        if (def.includes('WHERE')) {
          console.log(`⏭️  ${name} is already a partial index — skipping`);
          return;
        }
        // Drop old non-partial version, then recreate with WHERE clause
        await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "${name}"`);
        console.log(`🔄  Dropped non-partial ${name} for upgrade`);
      }
      try {
        await queryInterface.sequelize.query(createSql);
        console.log(`✅  Created partial index ${name}`);
      } catch (err) {
        console.error(`❌  Failed to create ${name}: ${err.message}`);
      }
    };

    // ── employees ────────────────────────────────────────────────────────
    // These share names with base migration but need partial-index upgrade
    await upgradeToPartial('idx_employees_status',
      `CREATE INDEX idx_employees_status ON employees(status) WHERE "deletedAt" IS NULL`);

    // These use different names from base migration — pure addIdx
    await addIdx('idx_employees_department_id',
      `CREATE INDEX idx_employees_department_id ON employees("departmentId") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_employees_position_id',
      `CREATE INDEX idx_employees_position_id ON employees("positionId") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_employees_manager_id',
      `CREATE INDEX idx_employees_manager_id ON employees("managerId") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_employees_email',
      `CREATE INDEX idx_employees_email ON employees(email) WHERE "deletedAt" IS NULL`);
    await addIdx('idx_employees_employee_id',
      `CREATE INDEX idx_employees_employee_id ON employees("employeeId") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_employees_user_id',
      `CREATE INDEX idx_employees_user_id ON employees("userId") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_employees_hire_date',
      `CREATE INDEX idx_employees_hire_date ON employees("hireDate") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_employees_employment_type',
      `CREATE INDEX idx_employees_employment_type ON employees("employmentType") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_employees_dept_pos',
      `CREATE INDEX idx_employees_dept_pos ON employees("departmentId", "positionId") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_employees_created_at',
      `CREATE INDEX idx_employees_created_at ON employees("createdAt") WHERE "deletedAt" IS NULL`);

    // ── timesheets ────────────────────────────────────────────────────────
    // NOTE: timesheets.workDate does NOT exist — timesheet is week-based.
    //       Using weekStartDate for date-range queries instead.
    await addIdx('idx_timesheets_employee_id',
      `CREATE INDEX idx_timesheets_employee_id ON timesheets("employeeId") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_timesheets_project_id',
      `CREATE INDEX idx_timesheets_project_id ON timesheets("projectId") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_timesheets_task_id',
      `CREATE INDEX idx_timesheets_task_id ON timesheets("taskId") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_timesheets_week_start_date',
      `CREATE INDEX idx_timesheets_week_start_date ON timesheets("weekStartDate") WHERE "deletedAt" IS NULL`);
    await upgradeToPartial('idx_timesheets_status',
      `CREATE INDEX idx_timesheets_status ON timesheets(status) WHERE "deletedAt" IS NULL`);
    await addIdx('idx_timesheets_approved_by',
      `CREATE INDEX idx_timesheets_approved_by ON timesheets("approvedBy") WHERE "deletedAt" IS NULL`);
    await upgradeToPartial('idx_timesheets_emp_week',
      `CREATE INDEX idx_timesheets_emp_week ON timesheets("employeeId", "weekStartDate") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_timesheets_created_at',
      `CREATE INDEX idx_timesheets_created_at ON timesheets("createdAt") WHERE "deletedAt" IS NULL`);

    // ── leave_requests ────────────────────────────────────────────────────
    await addIdx('idx_leave_requests_employee_id',
      `CREATE INDEX idx_leave_requests_employee_id ON leave_requests("employeeId") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_leave_requests_leave_type_id',
      `CREATE INDEX idx_leave_requests_leave_type_id ON leave_requests("leaveTypeId") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_leave_requests_start_date',
      `CREATE INDEX idx_leave_requests_start_date ON leave_requests("startDate") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_leave_requests_end_date',
      `CREATE INDEX idx_leave_requests_end_date ON leave_requests("endDate") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_leave_requests_status',
      `CREATE INDEX idx_leave_requests_status ON leave_requests(status) WHERE "deletedAt" IS NULL`);
    await addIdx('idx_leave_requests_date_range',
      `CREATE INDEX idx_leave_requests_date_range ON leave_requests("startDate", "endDate") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_leave_requests_created_at',
      `CREATE INDEX idx_leave_requests_created_at ON leave_requests("createdAt") WHERE "deletedAt" IS NULL`);

    // ── users ─────────────────────────────────────────────────────────────
    await upgradeToPartial('idx_users_email',
      `CREATE INDEX idx_users_email ON users(email) WHERE "deletedAt" IS NULL`);
    await upgradeToPartial('idx_users_role',
      `CREATE INDEX idx_users_role ON users(role) WHERE "deletedAt" IS NULL`);
    await addIdx('idx_users_is_active',
      `CREATE INDEX idx_users_is_active ON users("isActive") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_users_last_login',
      `CREATE INDEX idx_users_last_login ON users("lastLoginAt") WHERE "deletedAt" IS NULL`);

    // ── departments ───────────────────────────────────────────────────────
    await addIdx('idx_departments_is_active',
      `CREATE INDEX idx_departments_is_active ON departments("isActive")`);
    await addIdx('idx_departments_name',
      `CREATE INDEX idx_departments_name ON departments(name)`);

    // ── positions ─────────────────────────────────────────────────────────
    await addIdx('idx_positions_is_active',
      `CREATE INDEX idx_positions_is_active ON positions("isActive")`);
    await addIdx('idx_positions_title',
      `CREATE INDEX idx_positions_title ON positions(title)`);
    await addIdx('idx_positions_department_id',
      `CREATE INDEX idx_positions_department_id ON positions("departmentId")`);

    // ── projects ──────────────────────────────────────────────────────────
    await addIdx('idx_projects_is_active',
      `CREATE INDEX idx_projects_is_active ON projects("isActive") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_projects_status',
      `CREATE INDEX idx_projects_status ON projects(status) WHERE "deletedAt" IS NULL`);
    await addIdx('idx_projects_manager_id',
      `CREATE INDEX idx_projects_manager_id ON projects("managerId") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_projects_start_date',
      `CREATE INDEX idx_projects_start_date ON projects("startDate") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_projects_end_date',
      `CREATE INDEX idx_projects_end_date ON projects("endDate") WHERE "deletedAt" IS NULL`);

    // ── tasks ─────────────────────────────────────────────────────────────
    await addIdx('idx_tasks_is_active',
      `CREATE INDEX idx_tasks_is_active ON tasks("isActive") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_tasks_project_id',
      `CREATE INDEX idx_tasks_project_id ON tasks("projectId") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_tasks_assigned_to',
      `CREATE INDEX idx_tasks_assigned_to ON tasks("assignedTo") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_tasks_status',
      `CREATE INDEX idx_tasks_status ON tasks(status) WHERE "deletedAt" IS NULL`);
    await addIdx('idx_tasks_priority',
      `CREATE INDEX idx_tasks_priority ON tasks(priority) WHERE "deletedAt" IS NULL`);

    // ── leave_types ───────────────────────────────────────────────────────
    await addIdx('idx_leave_types_is_active',
      `CREATE INDEX idx_leave_types_is_active ON leave_types("isActive") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_leave_types_name',
      `CREATE INDEX idx_leave_types_name ON leave_types(name) WHERE "deletedAt" IS NULL`);

    // ── leave_balances ────────────────────────────────────────────────────
    await addIdx('idx_leave_balances_employee_id',
      `CREATE INDEX idx_leave_balances_employee_id ON leave_balances("employeeId")`);
    await addIdx('idx_leave_balances_leave_type_id',
      `CREATE INDEX idx_leave_balances_leave_type_id ON leave_balances("leaveTypeId")`);
    await addIdx('idx_leave_balances_year',
      `CREATE INDEX idx_leave_balances_year ON leave_balances(year)`);

    // ── salary_structures ─────────────────────────────────────────────────
    await addIdx('idx_salary_structures_employee_id',
      `CREATE INDEX idx_salary_structures_employee_id ON salary_structures("employeeId") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_salary_structures_is_active',
      `CREATE INDEX idx_salary_structures_is_active ON salary_structures("isActive") WHERE "deletedAt" IS NULL`);
    await addIdx('idx_salary_structures_effective_from',
      `CREATE INDEX idx_salary_structures_effective_from ON salary_structures("effectiveFrom") WHERE "deletedAt" IS NULL`);

    console.log('✅  Performance indexes migration complete');
  },

  async down(queryInterface) {
    const indexes = [
      'idx_employees_department_id', 'idx_employees_position_id', 'idx_employees_manager_id',
      'idx_employees_status', 'idx_employees_email', 'idx_employees_employee_id',
      'idx_employees_user_id', 'idx_employees_hire_date', 'idx_employees_employment_type',
      'idx_employees_dept_pos', 'idx_employees_created_at',
      'idx_timesheets_employee_id', 'idx_timesheets_project_id', 'idx_timesheets_task_id',
      'idx_timesheets_week_start_date', 'idx_timesheets_status', 'idx_timesheets_approved_by',
      'idx_timesheets_emp_week', 'idx_timesheets_created_at',
      'idx_leave_requests_employee_id', 'idx_leave_requests_leave_type_id',
      'idx_leave_requests_start_date', 'idx_leave_requests_end_date',
      'idx_leave_requests_status', 'idx_leave_requests_date_range', 'idx_leave_requests_created_at',
      'idx_users_email', 'idx_users_role', 'idx_users_is_active', 'idx_users_last_login',
      'idx_departments_is_active', 'idx_departments_name',
      'idx_positions_is_active', 'idx_positions_title', 'idx_positions_department_id',
      'idx_projects_is_active', 'idx_projects_status', 'idx_projects_manager_id',
      'idx_projects_start_date', 'idx_projects_end_date',
      'idx_tasks_is_active', 'idx_tasks_project_id', 'idx_tasks_assigned_to',
      'idx_tasks_status', 'idx_tasks_priority',
      'idx_leave_types_is_active', 'idx_leave_types_name',
      'idx_leave_balances_employee_id', 'idx_leave_balances_leave_type_id', 'idx_leave_balances_year',
      'idx_salary_structures_employee_id', 'idx_salary_structures_is_active',
      'idx_salary_structures_effective_from'
    ];

    for (const name of indexes) {
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "${name}"`
      ).catch(() => {});
    }
    console.log('✅  Performance indexes removed');
  }
};
