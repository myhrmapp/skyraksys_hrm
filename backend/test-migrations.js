/**
 * Migration Test Script
 * Tests all 18 migrations on a fresh database
 */

const { Sequelize } = require('sequelize');
const Umzug = require('umzug');
const path = require('path');

async function testMigrations() {
  console.log('\n=== Migration Test Suite ===\n');
  
  // Connect to fresh test database
  const sequelize = new Sequelize({
    database: 'skyraksys_hrm_test_fresh',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  });

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');

    // Setup Umzug
    const umzug = new Umzug({
      migrations: {
        path: path.join(__dirname, 'migrations'),
        params: [sequelize.getQueryInterface(), Sequelize]
      },
      storage: 'sequelize',
      storageOptions: {
        sequelize: sequelize
      }
    });

    // Get pending migrations
    const pending = await umzug.pending();
    console.log(`Found ${pending.length} migrations to execute:\n`);
    pending.forEach((m, i) => console.log(`  ${i + 1}. ${m.file}`));

    // Execute migrations
    console.log('\n--- Executing Migrations ---\n');
    const executed = await umzug.up();
    
    console.log(`\n✓ Successfully executed ${executed.length} migrations\n`);

    // Verify schema
    console.log('--- Verifying Schema ---\n');
    
    // Check table count
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != 'SequelizeMeta'
      ORDER BY table_name;
    `);
    
    console.log(`✓ Created ${tables.length} tables:`);
    tables.forEach((t, i) => console.log(`  ${i + 1}. ${t.table_name}`));

    // Verify Fix #1: salary_structures constraints
    console.log('\n--- Checking Fix #1: salary_structures Unique Constraints ---\n');
    const [salaryConstraints] = await sequelize.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'salary_structures'
        AND (indexname = 'uq_salary_structures_employee_id' 
             OR indexname = 'uq_salary_structures_employee_effective')
      ORDER BY indexname;
    `);
    
    console.log('Unique indexes on salary_structures:');
    salaryConstraints.forEach(c => console.log(`  - ${c.indexname}`));
    
    const hasBadConstraint = salaryConstraints.some(c => c.indexname === 'uq_salary_structures_employee_id');
    const hasGoodConstraint = salaryConstraints.some(c => c.indexname === 'uq_salary_structures_employee_effective');
    
    if (hasBadConstraint) {
      console.log('  ✗ FAIL: Single-column unique still exists (blocks salary history)');
    } else {
      console.log('  ✓ PASS: Single-column unique removed');
    }
    
    if (hasGoodConstraint) {
      console.log('  ✓ PASS: Composite unique exists (allows salary history)');
    } else {
      console.log('  ✗ FAIL: Composite unique missing');
    }

    // Verify Fix #2: payslips.payrollDataId
    console.log('\n--- Checking Fix #2: payslips.payrollDataId Integrity ---\n');
    const [payrollDataIdCheck] = await sequelize.query(`
      SELECT 
        c.is_nullable,
        tc.constraint_name,
        rc.delete_rule
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu
        ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
      LEFT JOIN information_schema.table_constraints tc
        ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'FOREIGN KEY'
      LEFT JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE c.table_name = 'payslips'
        AND c.column_name = 'payrollDataId';
    `);
    
    const payrollCheck = payrollDataIdCheck[0];
    const isNullable = payrollCheck.is_nullable === 'YES';
    const deleteRule = payrollCheck.delete_rule;
    
    console.log(`payslips.payrollDataId:`);
    console.log(`  - Nullable: ${payrollCheck.is_nullable}`);
    console.log(`  - FK onDelete: ${deleteRule || 'N/A'}`);
    
    if (!isNullable) {
      console.log('  ✓ PASS: Column is NOT NULL (matches model)');
    } else {
      console.log('  ✗ FAIL: Column is nullable (model expects NOT NULL)');
    }
    
    if (deleteRule === 'RESTRICT') {
      console.log('  ✓ PASS: FK onDelete is RESTRICT (matches model)');
    } else {
      console.log(`  ✗ FAIL: FK onDelete is ${deleteRule} (model expects RESTRICT)`);
    }

    // Check all PKs are UUID
    console.log('\n--- Verifying All Primary Keys are UUID ---\n');
    const [pkTypes] = await sequelize.query(`
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type
      FROM information_schema.tables t
      JOIN information_schema.table_constraints tc
        ON t.table_name = tc.table_name AND tc.constraint_type = 'PRIMARY KEY'
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.columns c
        ON kcu.table_name = c.table_name AND kcu.column_name = c.column_name
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name != 'SequelizeMeta'
      ORDER BY t.table_name;
    `);
    
    const nonUuidPKs = pkTypes.filter(pk => pk.data_type !== 'uuid');
    
    if (nonUuidPKs.length === 0) {
      console.log(`✓ PASS: All ${pkTypes.length} tables have UUID primary keys`);
    } else {
      console.log(`✗ FAIL: ${nonUuidPKs.length} tables have non-UUID PKs:`);
      nonUuidPKs.forEach(pk => console.log(`  - ${pk.table_name}.${pk.column_name}: ${pk.data_type}`));
    }

    // Summary
    console.log('\n=== Test Summary ===\n');
    const allPassed = !hasBadConstraint && hasGoodConstraint && !isNullable && deleteRule === 'RESTRICT' && nonUuidPKs.length === 0;
    
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED - Schema is production-ready!\n');
    } else {
      console.log('⚠️  SOME TESTS FAILED - Review output above\n');
    }

    return allPassed;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  } finally {
    await sequelize.close();
  }
}

// Run tests
testMigrations()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
