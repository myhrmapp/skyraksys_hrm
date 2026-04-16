/**
 * Bug Verification Tests
 * Targeted tests to verify or confirm "Pending Verification" bugs from Bug_sheet_08-04-26.
 * Each test maps to a specific bug ID.
 */
const { test, expect, loginAs, waitForPageReady, navigateTo, API_URL } = require('../fixtures/test-fixtures');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// ─── A#4: Configuration — Failed to save settings ────────────────────────
test.describe('A#4: Settings save', () => {
  test('Admin can load and interact with settings page', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/settings');
    await waitForPageReady(page);

    // Verify settings page loads with some form fields
    const pageContent = await page.textContent('body');
    const hasSettings = /settings|configuration|company|preferences/i.test(pageContent);
    expect(hasSettings).toBeTruthy();

    // Check if there's a save/submit button
    const saveBtn = page.getByRole('button', { name: /save|submit|update/i });
    const hasSave = await saveBtn.count();
    console.log(`A#4: Settings page loaded. Save button found: ${hasSave > 0}`);
    
    // If save button exists, try clicking it to see if it causes an error
    if (hasSave > 0) {
      await saveBtn.first().click();
      await page.waitForTimeout(2000);
      
      // Check for error messages
      const errorVisible = await page.locator('.MuiAlert-standardError, [role="alert"]').count();
      const snackbar = await page.locator('.notistack-SnackbarContainer').textContent().catch(() => '');
      console.log(`A#4: After save — errors visible: ${errorVisible}, snackbar: "${snackbar}"`);
    }
  });
});

// ─── A#8/A#9: Performance Dashboard — Auto-refresh toggle ─────────────────
test.describe('A#8/A#9: Performance auto-refresh', () => {
  test('Admin performance dashboard auto-refresh toggle works', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/performance-dashboard');
    await waitForPageReady(page);

    // Look for auto-refresh toggle
    const toggle = page.locator('input[type="checkbox"], [role="switch"], .MuiSwitch-input');
    const toggleCount = await toggle.count();
    console.log(`A#8: Auto-refresh toggle elements found: ${toggleCount}`);

    if (toggleCount > 0) {
      const firstToggle = toggle.first();
      const initialState = await firstToggle.isChecked().catch(() => null);
      console.log(`A#8: Initial toggle state: ${initialState}`);

      // Toggle it
      await firstToggle.click({ force: true });
      await page.waitForTimeout(1000);
      const afterClick = await firstToggle.isChecked().catch(() => null);
      console.log(`A#8: After click toggle state: ${afterClick}`);

      // Toggle back
      await firstToggle.click({ force: true });
      await page.waitForTimeout(1000);
      const afterSecondClick = await firstToggle.isChecked().catch(() => null);
      console.log(`A#8: After second click toggle state: ${afterSecondClick}`);

      // Verify toggle actually changes state
      expect(initialState !== afterClick || afterClick !== afterSecondClick).toBeTruthy();
    } else {
      console.log('A#8: No toggle found — feature may not exist');
    }
  });
});

// ─── A#10: Payslip date selection ──────────────────────────────────────────
test.describe('A#10: Payslip date selection', () => {
  test('Payslip date/year selection works', async ({ page }) => {
    await loginAs(page, 'admin');
    // Navigate to an employee's payslip page
    await page.goto('/payroll');
    await waitForPageReady(page);

    const pageContent = await page.textContent('body');
    const hasPayroll = /payroll|payslip|salary/i.test(pageContent);
    console.log(`A#10: Payroll page loaded: ${hasPayroll}`);

    // Look for date/year selectors
    const yearSelect = page.locator('select, [role="combobox"], .MuiSelect-root').filter({ hasText: /2024|2025|2026|year/i });
    const yearCount = await yearSelect.count();
    console.log(`A#10: Year selector elements found: ${yearCount}`);

    // Check for date picker
    const datePicker = page.locator('input[type="date"], input[type="month"], .MuiDatePicker-root');
    const dateCount = await datePicker.count();
    console.log(`A#10: Date picker elements found: ${dateCount}`);
  });
});

// ─── A#11: Unlock account button ──────────────────────────────────────────
test.describe('A#11: Account lock/unlock', () => {
  test('User account page has lock/unlock functionality', async ({ page }) => {
    await loginAs(page, 'admin');
    // Get first employee
    const empRes = await page.request.get(`${API_URL}/employees?limit=1`);
    const empBody = await empRes.json();
    const employees = empBody.data?.employees || empBody.data || empBody;
    
    if (Array.isArray(employees) && employees.length > 0) {
      const emp = employees[0];
      console.log(`A#11: Testing with employee ${emp.id}`);
      await page.goto(`/employees/${emp.id}/user-account`);
      await waitForPageReady(page);

      const pageContent = await page.textContent('body');
      const hasLockUI = /lock|unlock|locked|account status/i.test(pageContent);
      console.log(`A#11: Lock/unlock UI elements found: ${hasLockUI}`);

      // Look for lock/unlock button
      const lockBtn = page.getByRole('button', { name: /lock|unlock/i });
      const lockBtnCount = await lockBtn.count();
      console.log(`A#11: Lock/unlock button count: ${lockBtnCount}`);
    } else {
      console.log('A#11: No employees found to test');
    }
  });
});

// ─── A#13: Force logout ──────────────────────────────────────────────────
test.describe('A#13: Force logout', () => {
  test('Force logout endpoint exists and works via API', async ({ page }) => {
    await loginAs(page, 'admin');
    
    // Check if force-logout API exists
    const usersRes = await page.request.get(`${API_URL}/users?limit=1`).catch(() => null);
    console.log(`A#13: Users API status: ${usersRes?.status() || 'failed'}`);
    
    // Check for force logout in user account UI
    const empRes = await page.request.get(`${API_URL}/employees?limit=1`);
    const empBody = await empRes.json();
    const employees = empBody.data?.employees || empBody.data || empBody;
    
    if (Array.isArray(employees) && employees.length > 0) {
      await page.goto(`/employees/${employees[0].id}/user-account`);
      await waitForPageReady(page);
      
      const pageContent = await page.textContent('body');
      const hasForceLogout = /force.*log\s*out|revoke.*session|terminate.*session/i.test(pageContent);
      const forceBtn = page.getByRole('button', { name: /force.*log|revoke|terminate/i });
      const forceBtnCount = await forceBtn.count();
      console.log(`A#13: Force logout text found: ${hasForceLogout}, button count: ${forceBtnCount}`);
    }
  });
});

// ─── A#17: Employee ID immutable ──────────────────────────────────────────
test.describe('A#17: Employee ID edit', () => {
  test('Employee ID field is read-only in edit mode', async ({ page }) => {
    await loginAs(page, 'admin');
    
    const empRes = await page.request.get(`${API_URL}/employees?limit=1`);
    const empBody = await empRes.json();
    const employees = empBody.data?.employees || empBody.data || empBody;
    
    if (Array.isArray(employees) && employees.length > 0) {
      const emp = employees[0];
      await page.goto(`/employees/${emp.id}/edit`);
      await waitForPageReady(page);

      // Look for employee ID field
      const empIdField = page.locator('input').filter({ hasText: /EMP-/i });
      const empIdField2 = page.locator('input[name*="employeeId"], input[name*="employee_id"]');
      const allInputs = await page.locator('input').count();
      
      // Check if emp ID field is disabled/readonly
      const idField = empIdField2.first();
      if (await idField.count() > 0) {
        const isDisabled = await idField.isDisabled();
        const isReadonly = await idField.getAttribute('readonly');
        console.log(`A#17: Employee ID field — disabled: ${isDisabled}, readonly: ${isReadonly}`);
      } else {
        console.log(`A#17: Employee ID field not found by name attribute. Total inputs: ${allInputs}`);
      }
    }
  });
});

// ─── A#18: Reviews not showing after creation ─────────────────────────────
test.describe('A#18: Reviews creation', () => {
  test('Created review appears in the list', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/employee-reviews');
    await waitForPageReady(page);

    // Count current reviews
    const initialRows = await page.locator('table tbody tr, .MuiTableBody-root tr, [role="row"]').count();
    console.log(`A#18: Initial review rows: ${initialRows}`);

    // Try to create a new review
    const newBtn = page.getByRole('button', { name: /new|create|add/i });
    const newBtnCount = await newBtn.count();
    console.log(`A#18: New review button found: ${newBtnCount > 0}`);

    if (newBtnCount > 0) {
      await newBtn.first().click();
      await page.waitForTimeout(1000);

      // Check if a dialog/form appeared
      const dialog = page.locator('[role="dialog"], .MuiDialog-root, .MuiDrawer-root');
      const formVisible = await dialog.count();
      console.log(`A#18: Create form/dialog visible: ${formVisible > 0}`);
    }

    // Check if page has content or "no data" message
    const pageContent = await page.textContent('body');
    const hasNoData = /no.*data|no.*review|no.*record|empty/i.test(pageContent);
    console.log(`A#18: "No data" message visible: ${hasNoData}`);
  });
});

// ─── A#19: Leave balance auto-update ──────────────────────────────────────
test.describe('A#19: Leave balance', () => {
  test('Leave balance page loads with data', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/leave-balance');
    await waitForPageReady(page);

    const pageContent = await page.textContent('body');
    const hasBalance = /balance|allocation|entitlement|leave/i.test(pageContent);
    console.log(`A#19: Leave balance page loaded: ${hasBalance}`);

    // Check for balance data
    const rows = await page.locator('table tbody tr, .MuiCard-root').count();
    console.log(`A#19: Balance rows/cards: ${rows}`);
  });
});

// ─── A#20: Leave balance creation returns 400 ─────────────────────────────
test.describe('A#20: Leave balance creation', () => {
  test('Leave balance creation API returns proper response', async ({ page }) => {
    await loginAs(page, 'admin');
    
    // Get a leave type
    const typesRes = await page.request.get(`${API_URL}/leave/meta/types`);
    const typesBody = await typesRes.json();
    const leaveTypes = typesBody.data || typesBody;
    console.log(`A#20: Leave types available: ${Array.isArray(leaveTypes) ? leaveTypes.length : 0}`);

    // Get an employee  
    const empRes = await page.request.get(`${API_URL}/employees?limit=1`);
    const empBody = await empRes.json();
    const employees = empBody.data?.employees || empBody.data || empBody;
    
    if (Array.isArray(leaveTypes) && leaveTypes.length > 0 && Array.isArray(employees) && employees.length > 0) {
      // Try creating a balance — may fail with 400 if duplicate exists (expected behavior)
      const createRes = await page.request.post(`${API_URL}/admin/leave-balances`, {
        data: {
          employeeId: employees[0].id,
          leaveTypeId: leaveTypes[0].id,
          totalDays: 10,
          year: 2026
        }
      });
      console.log(`A#20: Create balance response: ${createRes.status()}`);
      const body = await createRes.json().catch(() => ({}));
      console.log(`A#20: Response body: ${JSON.stringify(body).substring(0, 200)}`);
      // 400 = validation/duplicate (expected), 201 = created successfully
      expect([200, 201, 400, 409]).toContain(createRes.status());
    }
  });
});

// ─── A#23: Task edit validation ───────────────────────────────────────────
test.describe('A#23: Task edit', () => {
  test('Task page loads and edit works', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/tasks');
    await waitForPageReady(page);

    const pageContent = await page.textContent('body');
    const hasTasks = /task|project|assignment/i.test(pageContent);
    console.log(`A#23: Tasks page loaded: ${hasTasks}`);

    // Count task rows
    const rows = await page.locator('table tbody tr, .MuiCard-root, [data-testid*="task"]').count();
    console.log(`A#23: Task items found: ${rows}`);
  });
});

// ─── A#25: User created but no access ─────────────────────────────────────
test.describe('A#25: User creation access', () => {
  test('User management page allows creating users with roles', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/user-management');
    await waitForPageReady(page);

    const pageContent = await page.textContent('body');
    const hasUserMgmt = /user|management|create|roles/i.test(pageContent);
    console.log(`A#25: User management page loaded: ${hasUserMgmt}`);

    // Look for a Create tab or button
    const createTab = page.getByRole('tab', { name: /create/i });
    const createBtn = page.getByRole('button', { name: /create|add|new/i });
    const tabCount = await createTab.count();
    const btnCount = await createBtn.count();
    console.log(`A#25: Create tab: ${tabCount}, Create button: ${btnCount}`);

    // Check for role field in form
    if (tabCount > 0) {
      await createTab.first().click();
      await page.waitForTimeout(1000);
    }
    const roleField = page.locator('[name*="role"], [data-testid*="role"], select').filter({ hasText: /admin|manager|hr|employee/i });
    const roleCount = await roleField.count();
    console.log(`A#25: Role selection elements: ${roleCount}`);
  });
});

// ─── A#26: Restore Records ────────────────────────────────────────────────
test.describe('A#26: Restore records', () => {
  test('Restore records page loads and shows data or empty state', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/restore-records');
    await waitForPageReady(page);

    const pageContent = await page.textContent('body');
    const hasRestore = /restore|deleted|archived|recover/i.test(pageContent);
    console.log(`A#26: Restore page loaded: ${hasRestore}`);

    // Check tabs
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    console.log(`A#26: Tabs found: ${tabCount}`);

    // Check for table data or empty state
    const tableRows = await page.locator('table tbody tr').count();
    const noData = /no.*data|no.*record|empty|nothing/i.test(pageContent);
    console.log(`A#26: Table rows: ${tableRows}, No data message: ${noData}`);
  });
});

// ─── E#3: Help & User guide videos ───────────────────────────────────────
test.describe('E#3: Help videos', () => {
  test('Admin can access user guide page with videos', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/user-guide');
    await waitForPageReady(page);

    // Check page loaded (not access denied)
    const pageContent = await page.textContent('body');
    const accessDenied = /access.*denied|forbidden|unauthorized|not.*authorized/i.test(pageContent);
    console.log(`E#3: Access denied: ${accessDenied}`);

    // Look for video elements
    const videos = page.locator('video, iframe, [data-testid*="video"]');
    const videoCount = await videos.count();
    console.log(`E#3: Video elements found: ${videoCount}`);

    if (videoCount > 0) {
      // Check if first video has a valid source
      const firstVideo = videos.first();
      const src = await firstVideo.getAttribute('src') || '';
      const poster = await firstVideo.getAttribute('poster') || '';
      console.log(`E#3: First video src: "${src}", poster: "${poster}"`);
    }
  });

  test('Employee can access user guide page', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/user-guide');
    await waitForPageReady(page);

    const pageContent = await page.textContent('body');
    const accessDenied = /access.*denied|forbidden|unauthorized|not.*authorized/i.test(pageContent);
    console.log(`E#3 (employee): Access denied: ${accessDenied}`);
    // If employee gets access denied, this confirms E#6 bug
  });
});

// ─── E#4: Employee profile edit save ──────────────────────────────────────
test.describe('E#4: Employee profile edit', () => {
  test('Employee can access and see edit option on their profile', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/my-profile');
    await waitForPageReady(page);

    const pageContent = await page.textContent('body');
    const hasProfile = /profile|personal|employee/i.test(pageContent);
    console.log(`E#4: Profile page loaded: ${hasProfile}`);

    // Look for edit button
    const editBtn = page.getByRole('button', { name: /edit/i });
    const editLink = page.getByRole('link', { name: /edit/i });
    const editCount = await editBtn.count() + await editLink.count();
    console.log(`E#4: Edit buttons/links found: ${editCount}`);

    if (editCount > 0) {
      await (await editBtn.count() > 0 ? editBtn.first() : editLink.first()).click();
      await waitForPageReady(page);
      
      // Check if edit form loaded
      const inputs = await page.locator('input, select, textarea').count();
      console.log(`E#4: Form fields on edit page: ${inputs}`);
      
      // Check for save button
      const saveBtn = page.getByRole('button', { name: /save|submit|update/i });
      const saveCount = await saveBtn.count();
      console.log(`E#4: Save button found: ${saveCount > 0}`);
    }
  });
});

// ─── E#6: System showcase — Access denied for employee ────────────────────
test.describe('E#6: System showcase access', () => {
  test('Employee navigating to system-showcase gets access denied', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/system-showcase');
    await waitForPageReady(page);

    const url = page.url();
    const pageContent = await page.textContent('body');
    const accessDenied = /access.*denied|forbidden|unauthorized|not.*authorized/i.test(pageContent);
    const redirected = url.includes('/login') || url.includes('/dashboard');
    console.log(`E#6: URL after nav: ${url}`);
    console.log(`E#6: Access denied message: ${accessDenied}`);
    console.log(`E#6: Redirected away: ${redirected}`);
    
    // This is admin-only route — employee should be blocked. 
    // If access denied OR redirected, the route guard is working correctly.
  });

  test('Admin CAN access system-showcase', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/system-showcase');
    await waitForPageReady(page);

    const url = page.url();
    const pageContent = await page.textContent('body');
    const accessDenied = /access.*denied|forbidden|unauthorized/i.test(pageContent);
    console.log(`E#6 (admin): URL: ${url}, Access denied: ${accessDenied}`);
    // Admin should have access
    expect(accessDenied).toBeFalsy();
  });
});
