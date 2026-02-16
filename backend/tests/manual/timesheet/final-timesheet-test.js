const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';
let token = null;

async function finalTimesheetTest() {
  console.log('🎯 FINAL TIMESHEET VALIDATION TEST\n');
  
  // Login
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    });
    token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
  } catch (error) {
    console.log('❌ Login failed');
    return;
  }
  
  // Get employee data
  const empResponse = await axios.get(`${BASE_URL}/employees`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const employee = empResponse.data.data[0];
  console.log(`📋 Testing with: ${employee.firstName} ${employee.lastName}`);
  
  // Test 1: Create timesheet without taskId (should work)
  console.log('\n🧪 Test 1: Create timesheet WITHOUT taskId');
  try {
    const response1 = await axios.post(`${BASE_URL}/timesheets`, {
      employeeId: employee.id,
      projectId: 'a12dbe1d-70a9-45fb-919c-591832006df5', // Using known project ID
      workDate: '2025-07-30',
      hoursWorked: 8,
      description: 'Final test - no task ID'
    }, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    console.log('✅ SUCCESS - Timesheet without taskId:', response1.data.message);
  } catch (error) {
    console.log('❌ FAILED - Without taskId:', error.response?.data?.message || error.message);
  }
  
  // Test 2: Create timesheet with taskId (should work)
  console.log('\n🧪 Test 2: Create timesheet WITH taskId');
  try {
    const response2 = await axios.post(`${BASE_URL}/timesheets`, {
      employeeId: employee.id,
      projectId: 'a12dbe1d-70a9-45fb-919c-591832006df5',
      taskId: 'c31226f0-421a-4aa6-8364-6755cdc63957', // Using known task ID
      workDate: '2025-07-29',
      hoursWorked: 6,
      description: 'Final test - with task ID'
    }, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    console.log('✅ SUCCESS - Timesheet with taskId:', response2.data.message);
  } catch (error) {
    console.log('❌ FAILED - With taskId:', error.response?.data?.message || error.message);
  }
  
  // Test 3: Try duplicate (should fail appropriately)
  console.log('\n🧪 Test 3: Try to create duplicate (should fail)');
  try {
    await axios.post(`${BASE_URL}/timesheets`, {
      employeeId: employee.id,
      projectId: 'a12dbe1d-70a9-45fb-919c-591832006df5',
      workDate: '2025-07-30', // Same date as test 1
      hoursWorked: 4,
      description: 'This should fail as duplicate'
    }, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    console.log('❌ UNEXPECTED SUCCESS - Duplicate should have failed');
  } catch (error) {
    console.log('✅ EXPECTED FAILURE - Duplicate correctly blocked:', error.response?.data?.message);
  }
  
  // Test 4: Get all timesheets
  console.log('\n🧪 Test 4: Retrieve timesheets');
  try {
    const response4 = await axios.get(`${BASE_URL}/timesheets?limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`✅ SUCCESS - Retrieved ${response4.data.data.length} timesheets`);
    console.log(`📊 Total records: ${response4.data.pagination.totalRecords}`);
  } catch (error) {
    console.log('❌ FAILED - Get timesheets:', error.response?.data?.message || error.message);
  }
  
  console.log('\n🎉 TIMESHEET VALIDATION TESTS COMPLETED!');
}

finalTimesheetTest().catch(console.error);
