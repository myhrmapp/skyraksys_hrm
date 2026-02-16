const XLSX = require('xlsx');
const path = require('path');

/**
 * Load test data from Excel file
 * @param {string} sheetName - Name of the sheet to load
 * @returns {Array} Array of objects representing rows
 */
async function loadTestData(sheetName) {
  try {
    const filePath = path.join(__dirname, '../fixtures/test-data.xlsx');
    const workbook = XLSX.readFile(filePath);
    
    if (!workbook.SheetNames.includes(sheetName)) {
      throw new Error(`Sheet "${sheetName}" not found in test-data.xlsx`);
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ Loaded ${data.length} records from sheet "${sheetName}"`);
    return data;
  } catch (error) {
    console.error(`❌ Error loading test data from sheet "${sheetName}":`, error.message);
    throw error;
  }
}

/**
 * Load all test data sheets
 * @returns {Object} Object with sheet names as keys
 */
async function loadAllTestData() {
  const filePath = path.join(__dirname, '../fixtures/test-data.xlsx');
  const workbook = XLSX.readFile(filePath);
  const allData = {};
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    allData[sheetName] = XLSX.utils.sheet_to_json(worksheet);
  });
  
  console.log(`✅ Loaded all test data: ${Object.keys(allData).join(', ')}`);
  return allData;
}

/**
 * Create test data fixture from template
 * @param {string} template - Template name
 * @param {Object} overrides - Values to override
 * @returns {Object} Test data object
 */
function createFixture(template, overrides = {}) {
  const templates = {
    user: {
      firstName: 'Test',
      lastName: 'User',
      email: `test${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'employee',
      isActive: true
    },
    employee: {
      employeeId: `EMP${Date.now()}`,
      firstName: 'Test',
      lastName: 'Employee',
      email: `emp${Date.now()}@example.com`,
      phone: '9876543210',
      hireDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      employmentType: 'Full-time'
    },
    department: {
      name: `Test Dept ${Date.now()}`,
      code: `TD${Date.now().toString().slice(-4)}`,
      description: 'Test Department'
    },
    leaveRequest: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      reason: 'Test leave request',
      status: 'Pending'
    },
    timesheet: {
      weekStartDate: new Date().toISOString().split('T')[0],
      weekEndDate: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
      mondayHours: 8,
      tuesdayHours: 8,
      wednesdayHours: 8,
      thursdayHours: 8,
      fridayHours: 8,
      saturdayHours: 0,
      sundayHours: 0,
      totalHoursWorked: 40,
      status: 'Draft'
    }
  };
  
  if (!templates[template]) {
    throw new Error(`Template "${template}" not found`);
  }
  
  return { ...templates[template], ...overrides };
}

module.exports = {
  loadTestData,
  loadAllTestData,
  createFixture
};
