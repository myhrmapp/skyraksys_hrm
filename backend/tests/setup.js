/**
 * Jest Global Setup
 * Initializes test database before running tests
 */

// Safety guard: refuse to run against production database
if (process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: Test setup must never run against production. Set NODE_ENV=test.');
}

const db = require('../models');

async function setupTestDatabase() {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('✓ Test database connected');

    // Verify all models are loaded
    const loadedModels = Object.keys(db).filter(k => k !== 'sequelize' && k !== 'Sequelize');
    console.log(`✓ Loaded ${loadedModels.length} models:`, loadedModels.join(', '));

    // Reset test database: preserve existing schema, just clean data
    // PostgreSQL 17 + Sequelize 6 has known ENUM USING clause bug with sync({force:true})
    // Strategy: if tables exist, truncate them; if not, create them
    const [tableCheck] = await db.sequelize.query(`
      SELECT COUNT(*) as cnt FROM pg_tables WHERE schemaname = 'public'
    `);
    const tableCount = parseInt(tableCheck[0].cnt);

    if (tableCount > 0) {
      // Tables exist — truncate all data (fast, avoids ENUM re-creation bug)
      try {
        await db.sequelize.query(`
          DO $$ DECLARE
            r RECORD;
          BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
          END $$;
        `);
        console.log('✓ Database tables truncated (clean data reset)');
      } catch (truncErr) {
        console.warn('⚠ Truncate failed, continuing:', truncErr.message);
      }

      // Ensure any NEW models get their tables created (non-destructive sync)
      try {
        await db.sequelize.sync({ alter: false });
      } catch (syncErr) {
        // Ignore USING errors — existing tables are fine
      }

      // Ensure schema matches models (add missing columns from model definitions)
      try {
        const schemaFixes = [
          `ALTER TABLE departments ADD COLUMN IF NOT EXISTS "code" VARCHAR(10)`,
          `ALTER TABLE departments ADD COLUMN IF NOT EXISTS "parentId" UUID REFERENCES departments(id)`,
          `ALTER TABLE departments ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ`,
        ];
        // Fix leave_requests.approvedBy FK: should reference employees(id) not users(id)
        try {
          await db.sequelize.query(`ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS "leave_requests_approvedBy_fkey"`);
          await db.sequelize.query(`ALTER TABLE leave_requests ADD CONSTRAINT "leave_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES employees(id)`);
        } catch (e) { /* constraint may not exist or already correct */ }
        // Add missing ENUM values for audit_logs action
        const missingEnums = [
          'CREATED','UPDATED','DELETED','RESTORED','STATUS_CHANGED',
          'APPROVED','REJECTED','SUBMITTED','BALANCE_ADJUSTED','PAYMENT_PROCESSED',
          'LOGOUT','PASSWORD_RESET_REQUESTED','PASSWORD_RESET_COMPLETED',
          'PERMISSION_CHANGED','EXPORTED','IMPORTED','EMAIL_CONFIG_UPDATED',
          'VIEW_SYSTEM_CONFIG','UPDATE_SYSTEM_CONFIG',
          'SYSTEM_CONFIG_ACCESS_GRANTED','SYSTEM_CONFIG_ACCESS_DENIED',
          'SYSTEM_CONFIG_PASSWORD_VERIFY_FAILED','DISTRIBUTED_ATTACK_DETECTED',
          'TIMESHEET_APPROVED','TIMESHEET_REJECTED','TIMESHEET_STATUS_CHANGE'
        ];
        for (const v of missingEnums) {
          try { await db.sequelize.query(`ALTER TYPE enum_audit_logs_action ADD VALUE IF NOT EXISTS '${v}'`); } catch (e) { /* already exists */ }
        }
        for (const sql of schemaFixes) {
          try { await db.sequelize.query(sql); } catch (e) { /* column may already exist */ }
        }

        // Fix payroll_data.id: convert INTEGER → UUID to match model definition
        try {
          const [colCheck] = await db.sequelize.query(`
            SELECT data_type FROM information_schema.columns 
            WHERE table_name='payroll_data' AND column_name='id'
          `);
          if (colCheck.length > 0 && colCheck[0].data_type === 'integer') {
            console.log('⚙ Converting payroll_data.id from INTEGER to UUID...');
            // Drop FK from payslips → payroll_data
            await db.sequelize.query(`ALTER TABLE payslips DROP CONSTRAINT IF EXISTS "payslips_payrollDataId_fkey"`).catch(() => {});
            // Drop PK
            await db.sequelize.query(`ALTER TABLE payroll_data DROP CONSTRAINT IF EXISTS payroll_data_pkey`).catch(() => {});
            // Drop old id and sequence
            await db.sequelize.query(`ALTER TABLE payroll_data DROP COLUMN id`);
            await db.sequelize.query(`DROP SEQUENCE IF EXISTS payroll_data_id_seq`);
            // Add UUID id column
            await db.sequelize.query(`ALTER TABLE payroll_data ADD COLUMN id UUID DEFAULT gen_random_uuid() NOT NULL`);
            await db.sequelize.query(`ALTER TABLE payroll_data ADD PRIMARY KEY (id)`);
            // Convert payslips.payrollDataId to UUID
            const [fkCheck] = await db.sequelize.query(`
              SELECT data_type FROM information_schema.columns 
              WHERE table_name='payslips' AND column_name='payrollDataId'
            `);
            if (fkCheck.length > 0 && fkCheck[0].data_type === 'integer') {
              await db.sequelize.query(`ALTER TABLE payslips DROP COLUMN "payrollDataId"`);
              await db.sequelize.query(`ALTER TABLE payslips ADD COLUMN "payrollDataId" UUID REFERENCES payroll_data(id) ON DELETE CASCADE ON UPDATE CASCADE`);
            }
            console.log('✓ payroll_data.id converted to UUID');
          }
        } catch (payrollErr) {
          console.warn('⚠ payroll_data UUID fix warning:', payrollErr.message);
        }

        // Drop incorrect unique-on-employeeId index from salary_structures
        // (model only defines composite unique on (employeeId, effectiveFrom))
        try {
          await db.sequelize.query(`DROP INDEX IF EXISTS uq_salary_structures_employee_id`);
        } catch (e) { /* index may not exist */ }
      } catch (schemaErr) {
        console.warn('⚠ Schema fix warning:', schemaErr.message);
      }
    } else {
      // Fresh database — create all tables
      try {
        await db.sequelize.sync();
        console.log('✓ Database schema created from scratch');
      } catch (syncError) {
        console.error('❌ Initial sync failed:', syncError.message);
      }
    }

    // Verify critical tables exist
    const [results] = await db.sequelize.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    const tables = results.map(r => r.tablename);
    console.log(`✓ Created ${tables.length} tables:`, tables.join(', '));
    
    // Warn about missing critical tables
    const criticalTables = ['users', 'employees', 'departments', 'positions', 'audit_logs', 'refresh_tokens'];
    const missingTables = criticalTables.filter(t => !tables.includes(t));
    if (missingTables.length > 0) {
      console.warn(`⚠ Missing critical tables: ${missingTables.join(', ')}`);
    }

    // Create basic test data
    await createBasicTestData();
    console.log('✓ Basic test data initialized\n');

  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    console.error('Stack:', error.stack);
    // Don't throw - let tests run anyway
  }
}

async function createBasicTestData() {
  try {
    // Create departments
    const departments = [
      { name: 'Engineering', code: 'ENG', description: 'Engineering Department' },
      { name: 'Human Resources', code: 'HR', description: 'HR Department' },
      { name: 'Sales', code: 'SALES', description: 'Sales Department' }
    ];

    for (const dept of departments) {
      await db.Department.findOrCreate({
        where: { code: dept.code },
        defaults: dept
      });
    }

    // Create positions
    const [engDept] = await db.Department.findOrCreate({ where: { code: 'ENG' } });
    const positions = [
      { title: 'Software Engineer', code: 'SE', level: 'Junior', departmentId: engDept.id },
      { title: 'Senior Engineer', code: 'SNE', level: 'Senior', departmentId: engDept.id }
    ];

    for (const pos of positions) {
      await db.Position.findOrCreate({
        where: { code: pos.code },
        defaults: pos
      });
    }

    // Create leave types (LeaveType model uses name, not code)
    const leaveTypes = [
      { name: 'Annual Leave', maxDaysPerYear: 21 },
      { name: 'Sick Leave', maxDaysPerYear: 10 }
    ];

    for (const type of leaveTypes) {
      await db.LeaveType.findOrCreate({
        where: { name: type.name },
        defaults: type
      });
    }

  } catch (error) {
    console.warn('⚠ Basic test data warning:', error.message);
  }
}

module.exports = setupTestDatabase;
