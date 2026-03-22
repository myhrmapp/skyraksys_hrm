/**
 * Add missing employee workflow tests to Excel.
 *
 * Gaps addressed:
 *   - Create with ALL fields (DOB, gender, maritalStatus, photo, statutory, banking, salary)
 *   - View profile and verify specific field values
 *   - Edit each section and verify save persists
 *   - List vs Card view toggle + verify
 *   - Employee self-view with data verification
 *   - Prerequisite column for selective execution
 */

const path = require('path');
const XLSX = require('xlsx');

const WORKBOOK_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');

const wb = XLSX.readFile(WORKBOOK_PATH);
const ws = wb.Sheets['Employee'];
const existing = XLSX.utils.sheet_to_json(ws, { defval: '' });

// Check what columns exist — add 'prerequisite' column
const headers = Object.keys(existing[0]);
if (!headers.includes('prerequisite')) {
  console.log('Adding "prerequisite" column to Employee sheet.');
  // Add empty prerequisite to all existing rows
  for (const row of existing) {
    row.prerequisite = '';
  }
}

// Add extra data columns needed for new tests
const extraCols = ['bankName', 'bankAccount', 'bankIfsc', 'bankBranch',
  'panNumber', 'aadharNumber', 'dateOfBirth', 'gender', 'maritalStatus'];
for (const col of extraCols) {
  if (!headers.includes(col)) {
    for (const row of existing) {
      row[col] = '';
    }
  }
}

// Next testId
const maxId = Math.max(...existing.map(r => parseInt(String(r.testId).replace('EMP-', '')) || 0));
let nextId = maxId + 1;
function id() { return `EMP-${String(nextId++).padStart(3, '0')}`; }

// ── New test rows ──

const newTests = [

  // ── CREATE WITH ALL FIELDS (full coverage) ──
  {
    testId: id(), description: 'Admin: Create employee with ALL fields and photo',
    testType: 'Workflow', testCategory: 'Create Employee', action: 'createAllFields', enabled: 'TRUE', role: 'admin',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Click Add\n4. Fill ALL Personal Info (name, email, phone, DOB, gender, marital, nationality, address)\n5. Upload photo\n6. Next → Fill ALL Employment Info (hireDate, dept, type, location, probation, notice)\n7. Next → Fill Emergency Contact\n8. Next → Fill ALL Statutory/Banking (PAN, Aadhar, UAN, PF, ESI, bank details)\n9. Submit\n10. Verify success',
    firstName: 'AllFieldsCreate', lastName: 'E2ETest', phone: '9876543299',
    nationality: 'Indian', address: '789 Full Test Lane', city: 'Mumbai', state: 'Maharashtra', pinCode: '400001',
    dateOfBirth: '1992-06-15', gender: 'Male', maritalStatus: 'Single',
    hireDate: '2025-01-15', employmentType: 'Full-time', workLocation: 'Main Office',
    emergencyName: 'Full Emergency', emergencyPhone: '9000000055',
    panNumber: 'ABCDE1234F', aadharNumber: '123412341234',
    bankName: 'HDFC Bank', bankAccount: '50100012345678', bankIfsc: 'HDFC0001234', bankBranch: 'Mumbai Central',
    prerequisite: '',
  },

  // ── VIEW PROFILE VERIFY ALL FIELDS (after API create) ──
  {
    testId: id(), description: 'Admin: View profile verify all personal fields',
    testType: 'Workflow', testCategory: 'View Profile', action: 'viewProfileAllPersonalFields', enabled: 'TRUE', role: 'admin',
    detailedSteps: '1. Create employee via API with known data\n2. Navigate to employee profile\n3. Verify all personal fields: name, email, phone, nationality, city, state\n4. Cleanup',
    prerequisite: '',
  },
  {
    testId: id(), description: 'Admin: View profile verify employment fields',
    testType: 'Workflow', testCategory: 'View Profile', action: 'viewProfileEmploymentFields', enabled: 'TRUE', role: 'admin',
    detailedSteps: '1. Create employee via API\n2. Navigate to profile\n3. Verify employment info: hire date, department, employment type visible',
    prerequisite: '',
  },
  {
    testId: id(), description: 'Admin: View profile verify emergency contact fields',
    testType: 'Workflow', testCategory: 'View Profile', action: 'viewProfileEmergencyFields', enabled: 'TRUE', role: 'admin',
    detailedSteps: '1. Create employee via API\n2. Navigate to profile\n3. Verify emergency contact name and phone displayed',
    prerequisite: '',
  },
  {
    testId: id(), description: 'Admin: View profile verify statutory/banking fields',
    testType: 'Workflow', testCategory: 'View Profile', action: 'viewProfileStatutoryFields', enabled: 'TRUE', role: 'admin',
    detailedSteps: '1. Create employee via API with banking data\n2. Navigate to profile\n3. Verify PAN, Aadhar, bank name visible',
    prerequisite: '',
  },

  // ── EDIT EACH SECTION AND VERIFY SAVE ──
  {
    testId: id(), description: 'Admin: Edit personal info and verify save',
    testType: 'Workflow', testCategory: 'Edit Employee', action: 'editPersonalAndVerify', enabled: 'TRUE', role: 'admin',
    detailedSteps: '1. Create employee via API\n2. Navigate to profile\n3. Click Edit\n4. Change firstName and phone\n5. Save\n6. Verify updated values on profile',
    newFirstName: 'UpdatedFirst',
    prerequisite: '',
  },
  {
    testId: id(), description: 'Admin: Edit employment info and verify save',
    testType: 'Workflow', testCategory: 'Edit Employee', action: 'editEmploymentAndVerify', enabled: 'TRUE', role: 'admin',
    detailedSteps: '1. Create employee via API\n2. Navigate to profile in edit mode\n3. Change work location\n4. Save\n5. Verify profile reflects new data',
    prerequisite: '',
  },
  {
    testId: id(), description: 'Admin: Edit emergency contact and verify save',
    testType: 'Workflow', testCategory: 'Edit Employee', action: 'editEmergencyAndVerify', enabled: 'TRUE', role: 'admin',
    detailedSteps: '1. Create employee via API\n2. Navigate to profile in edit mode\n3. Change emergency name and phone\n4. Save\n5. Verify updated emergency data',
    emergencyName: 'NewEmergencyPerson', emergencyPhone: '9111222333',
    prerequisite: '',
  },
  {
    testId: id(), description: 'Admin: Edit statutory info and verify save',
    testType: 'Workflow', testCategory: 'Edit Employee', action: 'editStatutoryAndVerify', enabled: 'TRUE', role: 'admin',
    detailedSteps: '1. Create employee via API\n2. Navigate to profile in edit mode\n3. Update bank details\n4. Save\n5. Verify bank details updated on profile',
    bankName: 'Updated ICICI Bank', bankAccount: '99887766554433',
    prerequisite: '',
  },

  // ── LIST VIEW VS CARD VIEW ──
  {
    testId: id(), description: 'Admin: Toggle to card view and verify cards displayed',
    testType: 'UI', testCategory: 'List & Navigation', action: 'verifyCardView', enabled: 'TRUE', role: 'admin',
    detailedSteps: '1. Navigate to /employees\n2. Switch to card view\n3. Verify employee cards are visible\n4. Verify at least 1 card has name and actions',
    prerequisite: '',
  },
  {
    testId: id(), description: 'Admin: Toggle between list and card view preserves data',
    testType: 'UI', testCategory: 'List & Navigation', action: 'toggleListCardView', enabled: 'TRUE', role: 'admin',
    detailedSteps: '1. Navigate to /employees in table view\n2. Note the row count\n3. Switch to card view\n4. Switch back to table view\n5. Verify row count is same',
    prerequisite: '',
  },

  // ── EMPLOYEE SELF-VIEW WITH VERIFICATION ──
  {
    testId: id(), description: 'Employee: My Profile shows own name and email',
    testType: 'Workflow', testCategory: 'My Profile', action: 'myProfileVerifyData', enabled: 'TRUE', role: 'employee',
    detailedSteps: '1. Login as employee\n2. Navigate to My Profile\n3. Verify profile page visible\n4. Verify page contains employee name or email',
    prerequisite: '',
  },
  {
    testId: id(), description: 'Employee: My Profile has no edit button',
    testType: 'UI', testCategory: 'My Profile', action: 'myProfileNoEditButton', enabled: 'TRUE', role: 'employee',
    detailedSteps: '1. Login as employee\n2. Navigate to My Profile\n3. Verify edit button is NOT visible',
    prerequisite: '',
  },
  {
    testId: id(), description: 'Employee: My Profile shows employment info section',
    testType: 'Workflow', testCategory: 'My Profile', action: 'myProfileEmploymentSection', enabled: 'TRUE', role: 'employee',
    detailedSteps: '1. Login as employee\n2. Navigate to My Profile\n3. Verify employment info section is visible (department, position, hire date)',
    prerequisite: '',
  },

  // ── HR EDIT AND VERIFY ──
  {
    testId: id(), description: 'HR: Edit personal info and verify save',
    testType: 'Workflow', testCategory: 'Edit Employee', action: 'editPersonalAndVerify', enabled: 'TRUE', role: 'hr',
    detailedSteps: '1. Login as HR\n2. Create employee via API\n3. Navigate to profile\n4. Edit firstName\n5. Save\n6. Verify updated',
    newFirstName: 'HRUpdated',
    prerequisite: '',
  },

  // ── DELETE AND VERIFY STATUS ──
  {
    testId: id(), description: 'Admin: Delete employee and verify removed from active list',
    testType: 'Workflow', testCategory: 'Delete Employee', action: 'deleteAndVerifyStatus', enabled: 'TRUE', role: 'admin',
    detailedSteps: '1. Create employee via API\n2. Delete from card view\n3. Navigate back to list\n4. Search for deleted employee\n5. Verify not found in Active filter',
    prerequisite: '',
  },
];

// Set prerequisite for the "createAllFields" test on the HR createFull test (EMP-015 depends on nothing new)
// The viewProfile tests that need API employee will get dependencies resolved in the spec

// Merge new + existing
const allRows = [...existing, ...newTests];

// Ensure all rows have all columns
const allHeaders = new Set();
for (const row of allRows) {
  for (const key of Object.keys(row)) allHeaders.add(key);
}
for (const row of allRows) {
  for (const h of allHeaders) {
    if (!(h in row)) row[h] = '';
  }
}

// Write back
const newWs = XLSX.utils.json_to_sheet(allRows);
wb.Sheets['Employee'] = newWs;
XLSX.writeFile(wb, WORKBOOK_PATH);

console.log(`✓ Added ${newTests.length} new employee workflow tests (EMP-${String(maxId + 1).padStart(3, '0')} to EMP-${String(nextId - 1).padStart(3, '0')})`);
console.log(`✓ Total Employee tests: ${allRows.length}`);
console.log(`✓ Prerequisite column added to sheet`);
console.log('\nNew tests added:');
newTests.forEach(t => console.log(`  ${t.testId} | ${t.action} | ${t.role} | ${t.description}`));
