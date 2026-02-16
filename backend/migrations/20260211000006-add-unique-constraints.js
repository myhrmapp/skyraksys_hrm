'use strict';

/**
 * Migration: Add missing unique constraints
 * DB-6: timesheets composite unique (employeeId, weekStartDate, projectId, taskId)
 * DB-7: employee_reviews composite unique (employeeId, reviewPeriod)
 * DB-8: system_configs composite unique (category, key, version)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const uniques = [
      {
        table: 'timesheets',
        fields: ['employeeId', 'weekStartDate', 'projectId', 'taskId'],
        name: 'uq_timesheets_employee_week_project_task',
        id: 'DB-6'
      },
      {
        table: 'employee_reviews',
        fields: ['employeeId', 'reviewPeriod'],
        name: 'uq_employee_reviews_employee_period',
        id: 'DB-7'
      },
      {
        table: 'system_configs',
        fields: ['category', 'key', 'version'],
        name: 'uq_system_configs_category_key_version',
        id: 'DB-8'
      }
    ];

    for (const uq of uniques) {
      // Check if unique constraint already exists
      const [existing] = await queryInterface.sequelize.query(
        `SELECT indexname FROM pg_indexes 
         WHERE tablename = '${uq.table}' AND indexname = '${uq.name}'`
      );
      if (existing.length > 0) {
        console.log(`⏭️  ${uq.name} already exists — skipping (${uq.id})`);
        continue;
      }

      // Check for duplicates before adding unique constraint
      // Check if table has deletedAt column first
      const [hasDeletedAt] = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = '${uq.table}' AND column_name = 'deletedAt'`
      );
      
      const whereClause = hasDeletedAt.length > 0 
        ? 'WHERE "deletedAt" IS NULL OR "deletedAt" IS NOT NULL'
        : '';
      
      const [duplicates] = await queryInterface.sequelize.query(
        `SELECT ${uq.fields.map(f => `"${f}"`).join(', ')}, COUNT(*) as cnt
         FROM "${uq.table}" 
         ${whereClause}
         GROUP BY ${uq.fields.map(f => `"${f}"`).join(', ')}
         HAVING COUNT(*) > 1`
      );

      if (duplicates.length > 0) {
        console.log(`⚠️  ${uq.table} has ${duplicates.length} duplicate group(s) — cannot add unique constraint (${uq.id})`);
        console.log('   Duplicates:', JSON.stringify(duplicates.slice(0, 3)));
        continue;
      }

      await queryInterface.addIndex(uq.table, uq.fields, {
        unique: true,
        name: uq.name
      });
      console.log(`✅  Added unique constraint ${uq.name} on ${uq.table}(${uq.fields.join(', ')}) — ${uq.id}`);
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('timesheets', 'uq_timesheets_employee_week_project_task');
    await queryInterface.removeIndex('employee_reviews', 'uq_employee_reviews_employee_period');
    await queryInterface.removeIndex('system_configs', 'uq_system_configs_category_key_version');
  }
};
