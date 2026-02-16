#!/usr/bin/env node

/**
 * Test Data Setup for E2E Testing
 * Creates all required test users for comprehensive role testing
 */

const axios = require('axios');
const { User, Employee } = require('../models');

class E2ETestDataSetup {
  constructor() {
    this.apiURL = 'http://localhost:8080/api';
    this.testUsers = [
      {
        email: 'admin@test.com',
        password: 'admin123',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        department: 'IT',
        position: 'System Administrator',
        employeeId: 'EMP001'
      },
      {
        email: 'hr.manager@test.com',
        password: 'Password123!',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'hr_manager',
        department: 'Human Resources',
        position: 'HR Manager',
        employeeId: 'EMP002'
      },
      {
        email: 'team.lead@test.com',
        password: 'Password123!',
        firstName: 'Michael',
        lastName: 'Chen',
        role: 'team_lead',
        department: 'Engineering',
        position: 'Team Lead',
        employeeId: 'EMP003'
      },
      {
        email: 'john.doe@test.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'employee',
        department: 'Engineering',
        position: 'Software Developer',
        employeeId: 'EMP004'
      },
      {
        email: 'jane.smith@test.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'employee',
        department: 'Marketing',
        position: 'Marketing Specialist',
        employeeId: 'EMP005'
      },
      {
        email: 'finance.manager@test.com',
        password: 'Password123!',
        firstName: 'Robert',
        lastName: 'Wilson',
        role: 'manager',
        department: 'Finance',
        position: 'Finance Manager',
        employeeId: 'EMP006'
      }
    ];
  }

  async setupTestUsers() {
    console.log('🔧 Setting up E2E test users...\n');
    
    let successCount = 0;
    let adminToken = null;
    
    try {
      // First, try to login as admin to get token
      try {
        const adminLogin = await axios.post(`${this.apiURL}/auth/login`, {
          email: 'admin@test.com',
          password: 'admin123'
        });
        adminToken = adminLogin.data.accessToken;
        console.log('✅ Admin authentication successful');
      } catch (error) {
        console.log('⚠️ Admin login failed, will create users without admin token');
      }
      
      for (const userData of this.testUsers) {
        try {
          console.log(`👤 Setting up user: ${userData.email} (${userData.role})`);
          
          // Check if user already exists
          let userExists = false;
          try {
            if (adminToken) {
              const checkUser = await axios.get(`${this.apiURL}/auth/users`, {
                headers: { Authorization: `Bearer ${adminToken}` },
                params: { email: userData.email }
              });
              userExists = checkUser.data.length > 0;
            }
          } catch (e) {
            // User doesn't exist or we can't check
          }
          
          if (!userExists) {
            // Create user through registration endpoint
            try {
              await axios.post(`${this.apiURL}/auth/register`, {
                email: userData.email,
                password: userData.password,
                firstName: userData.firstName,
                lastName: userData.lastName,
                role: userData.role
              });
              console.log(`   ✅ User ${userData.email} created via registration`);
            } catch (regError) {
              // If registration fails, try direct user creation
              if (adminToken) {
                await axios.post(`${this.apiURL}/users`, userData, {
                  headers: { Authorization: `Bearer ${adminToken}` }
                });
                console.log(`   ✅ User ${userData.email} created via admin API`);
              } else {
                throw regError;
              }
            }
            
            // Create corresponding employee record
            try {
              if (adminToken) {
                await axios.post(`${this.apiURL}/employees`, {
                  employeeId: userData.employeeId,
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                  email: userData.email,
                  department: userData.department,
                  position: userData.position,
                  status: 'active'
                }, {
                  headers: { Authorization: `Bearer ${adminToken}` }
                });
                console.log(`   ✅ Employee record created for ${userData.email}`);
              }
            } catch (empError) {
              console.log(`   ⚠️ Employee record creation failed for ${userData.email}: ${empError.message}`);
            }
            
          } else {
            console.log(`   ✅ User ${userData.email} already exists`);
          }
          
          // Test login to verify user is working
          try {
            await axios.post(`${this.apiURL}/auth/login`, {
              email: userData.email,
              password: userData.password
            });
            console.log(`   ✅ Login test successful for ${userData.email}`);
            successCount++;
          } catch (loginError) {
            console.log(`   ❌ Login test failed for ${userData.email}: ${loginError.message}`);
          }
          
        } catch (error) {
          console.log(`   ❌ Failed to setup ${userData.email}: ${error.message}`);
        }
        
        console.log(''); // Empty line for readability
      }
      
    } catch (error) {
      console.error('❌ Test data setup failed:', error.message);
    }
    
    console.log('='.repeat(50));
    console.log(`📊 Test User Setup Results:`);
    console.log(`✅ Successfully setup: ${successCount}/${this.testUsers.length} users`);
    console.log(`📈 Success Rate: ${(successCount / this.testUsers.length * 100).toFixed(1)}%`);
    
    if (successCount === this.testUsers.length) {
      console.log('🎉 All test users ready for E2E testing!');
      return true;
    } else {
      console.log('⚠️ Some test users may not be fully setup');
      return successCount >= Math.ceil(this.testUsers.length / 2); // At least half should work
    }
  }

  async listTestUsers() {
    console.log('\n👥 Available Test Users for E2E Testing:\n');
    
    this.testUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.role.toUpperCase()}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔑 Password: ${user.password}`);
      console.log(`   👤 Name: ${user.firstName} ${user.lastName}`);
      console.log(`   🏢 Department: ${user.department}`);
      console.log(`   💼 Position: ${user.position}`);
      console.log('');
    });
    
    console.log('🎯 These users will be tested for:');
    console.log('   • Authentication (login/logout)');
    console.log('   • Role-based access control');
    console.log('   • Module permissions');
    console.log('   • Workflow combinations');
    console.log('   • Cross-role interactions');
  }
}

async function main() {
  const setup = new E2ETestDataSetup();
  
  console.log('🎯 E2E Test Data Setup Starting...\n');
  
  // List the users that will be created
  await setup.listTestUsers();
  
  // Setup the test users
  const success = await setup.setupTestUsers();
  
  if (success) {
    console.log('\n🚀 Ready to run comprehensive E2E tests!');
    console.log('Execute: node tests/comprehensive-e2e-test.js');
  } else {
    console.log('\n⚠️ Test data setup incomplete. Some E2E tests may fail.');
  }
  
  return success;
}

if (require.main === module) {
  main().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = E2ETestDataSetup;
