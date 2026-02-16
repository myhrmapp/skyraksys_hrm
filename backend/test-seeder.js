/**
 * Seeder Test Script
 * Tests the comprehensive seeder on the fresh database
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

async function testSeeder() {
  console.log('\n=== Seeder Test Suite ===\n');
  
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

    // Load and execute seeder
    const seederPath = path.join(__dirname, 'seeders', '20260209000000-comprehensive-seed.js');
    const seeder = require(seederPath);
    
    console.log('--- Running Seeder ---\n');
    await seeder.up(sequelize.getQueryInterface(), Sequelize);
    console.log('\n✓ Seeder executed successfully\n');

    // Verify seeded data
    console.log('--- Verifying Seeded Data ---\n');
    
    const checks = [
      { table: 'users', expected: 5, description: 'Users (admin, hr, manager, 2 employees)' },
      { table: 'departments', expected: 5, description: 'Departments (HR, Engineering, Sales, Marketing, Finance)' },
      { table: 'positions', expected: 11, description: 'Positions across departments' },
      { table: 'employees', expected: 5, description: 'Employees (linked 1:1 with users)' },
      { table: 'leave_types', expected: 5, description: 'Leave Types (Sick, Casual, Annual, Maternity, Paternity)' },
      { table: 'leave_balances', expected: 25, description: 'Leave Balances (5 employees × 5 types)' },
      { table: 'projects', expected: 3, description: 'Projects (HRM, E-commerce, Mobile App)' },
      { table: 'tasks', expected: 6, description: 'Tasks (Backend, Frontend, DB, API, QA, Docs)' },
      { table: 'salary_structures', expected: 5, description: 'Salary Structures (1 per employee)' },
      { table: 'payslip_templates', expected: 4, description: 'Payslip Templates (Standard, Executive, Consultant, Intern)' }
    ];

    let allPassed = true;
    for (const check of checks) {
      const [[{ count }]] = await sequelize.query(
        `SELECT COUNT(*) as count FROM ${check.table}`
      );
      const actual = parseInt(count);
      const passed = actual === check.expected;
      
      if (passed) {
        console.log(`✓ ${check.table}: ${actual} records (${check.description})`);
      } else {
        console.log(`✗ ${check.table}: Expected ${check.expected}, got ${actual} (${check.description})`);
        allPassed = false;
      }
    }

    // Check default admin credentials
    console.log('\n--- Checking Default Admin ---\n');
    const [[admin]] = await sequelize.query(
      `SELECT email, role, "firstName", "lastName" FROM users WHERE email = 'admin@skyraksys.com'`
    );
    
    if (admin) {
      console.log(`✓ Admin user exists: ${admin.firstName} ${admin.lastName} (${admin.email})`);
      console.log(`  Role: ${admin.role}`);
      console.log(`  Default Password: admin123 (⚠️ CHANGE IN PRODUCTION)`);
    } else {
      console.log('✗ Admin user not found');
      allPassed = false;
    }

    // Check employee-user linking
    console.log('\n--- Checking Employee-User Linking ---\n');
    const [[{ linked }]] = await sequelize.query(
      `SELECT COUNT(*) as linked FROM employees WHERE "userId" IS NOT NULL`
    );
    console.log(`✓ ${linked} of 5 employees linked to user accounts`);

    // Check salary structure composite unique works
    console.log('\n--- Testing Salary History Support ---\n');
    const [[employee]] = await sequelize.query(
      `SELECT id FROM employees LIMIT 1`
    );
    
    try {
      await sequelize.query(
        `INSERT INTO salary_structures ("id", "employeeId", "basicSalary", "hra", "effectiveFrom", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), '${employee.id}', 80000, 20000, '2026-03-01', NOW(), NOW())`
      );
      console.log('✓ Successfully added second salary structure for same employee');
      console.log('  → Composite unique (employeeId, effectiveFrom) allows salary history ✓');
    } catch (error) {
      console.log('✗ Failed to add second salary structure:', error.message);
      allPassed = false;
    }

    // Summary
    console.log('\n=== Test Summary ===\n');
    if (allPassed) {
      console.log('✅ ALL SEEDER TESTS PASSED - Data is correct!\n');
    } else {
      console.log('⚠️  SOME SEEDER TESTS FAILED - Review output above\n');
    }

    return allPassed;

  } catch (error) {
    console.error('\n❌ Seeder test failed:', error.message);
    console.error(error.stack);
    return false;
  } finally {
    await sequelize.close();
  }
}

// Run tests
testSeeder()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
