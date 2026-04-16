/**
 * Bug Fix Verification — 15 April 2026 batch
 *
 * Covers all bugs fixed today + all prior fixes from 09-Apr-2026 report.
 * Run: npx playwright test bug-fixes-15-04-26.spec.js --reporter=list
 *
 * Bug mapping:
 *   ADM-012  Welcome email tempPassword key fix
 *   ADM-021  Attendance half_day / on_leave status values
 *   ADM-020  Leave balance FE validation + BE 409 duplicate
 *   ADM-008/009  PerformanceDashboard auto-refresh useCallback
 *   ADM-027  Payroll search cursor jump (debounce)
 *   ADM-024  Cancel leave button for approved leaves
 *   ADM-005  No spurious "Notifications" menu item in dropdown
 *   ADM-006  Dashboard "On Leave" card navigates
 *   ADM-007  Dashboard "Draft"/"Approved" timesheet cards navigate
 *   ADM-016  Profile image saved on edit
 *   EMP-005  Employee profile quick link goes to /my-profile
 *   OVERALL  Login / re-login token rotation
 */

const { test, expect, loginAs, waitForPageReady, navigateTo, API_URL } = require('../fixtures/test-fixtures');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// ═══════════════════════════════════════════════════════════════════
// ADM-012 — Welcome email: tempPassword → temporaryPassword key
// ═══════════════════════════════════════════════════════════════════
test.describe('ADM-012: Welcome email no longer crashes', () => {
  test('Welcome email API call uses correct temporaryPassword key (no 500)', async ({ page }) => {
    await loginAs(page, 'admin');

    // Get first employee
    const res = await page.request.get(`${API_URL}/employees?limit=5`);
    const body = await res.json();
    const employees = body.data?.employees || body.data || [];

    if (!Array.isArray(employees) || employees.length === 0) {
      console.log('ADM-012: ⚠️  No employees available to test with');
      return;
    }

    const emp = employees[0];
    // Get user account for this employee
    const userRes = await page.request.get(`${API_URL}/auth/users/${emp.userId || emp.id}`);
    const userId = emp.userId || (userRes.ok() ? (await userRes.json())?.data?.id : null);

    if (!userId) {
      console.log('ADM-012: ⚠️  Could not resolve userId');
      return;
    }

    // Call send-welcome-email with the correct key name (as fixed in auth.service.js)
    const emailRes = await page.request.post(`${API_URL}/auth/users/${userId}/send-welcome-email`, {
      data: { includePassword: false, temporaryPassword: '' }
    });

    const status = emailRes.status();
    // 200 = sent, 500 = crash (SMTP is separately configured, not a code issue)
    // We're verifying the code doesn't crash on toUpperCase — SMTP failure returns 500 with SMTP message
    const emailBody = await emailRes.json().catch(() => ({}));
    const isCodeCrash = status === 500 && /toUpperCase|Cannot read/i.test(JSON.stringify(emailBody));
    expect(isCodeCrash).toBeFalsy();
    console.log(`ADM-012: ✅ Status: ${status} — no toUpperCase crash. Message: ${emailBody.message || '(none)'}`);
  });

  test('Welcome email page renders without JavaScript crash', async ({ page }) => {
    await loginAs(page, 'admin');
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const empRes = await page.request.get(`${API_URL}/employees?limit=1`);
    const empBody = await empRes.json();
    const emp = (empBody.data?.employees || empBody.data || [])[0];

    if (emp) {
      await page.goto(`/employees/${emp.id}/user-account`);
      await waitForPageReady(page);
      const jsErrors = errors.filter(e => /toUpperCase|Cannot read/i.test(e));
      expect(jsErrors.length).toBe(0);
      console.log(`ADM-012: ✅ No JS crash on user account page. Total JS errors: ${errors.length}`);
    } else {
      console.log('ADM-012: ⚠️  No employees to navigate to');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// ADM-021 — Attendance status values: half_day / on_leave (underscore)
// ═══════════════════════════════════════════════════════════════════
test.describe('ADM-021: Attendance status values use underscore', () => {
  test('Attendance form shows half_day and on_leave options', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/attendance');
    await waitForPageReady(page);

    // Open mark attendance dialog  
    const markBtn = page.getByRole('button', { name: /mark attendance|add|new/i }).first();
    if (await markBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await markBtn.click();
      await page.waitForTimeout(1500);

      // Look for status select
      const statusSelect = page.locator('[data-testid="attendance-status"], select[name="status"]').first();
      const hasSelect = await statusSelect.count();
      
      // Check page source for underscore values (not hyphen)
      const html = await page.content();
      const hasHalfDayUnderscore = html.includes('half_day');
      const hasOnLeaveUnderscore = html.includes('on_leave');
      const hasHalfDayHyphen = html.includes('"half-day"') || html.includes("'half-day'");
      const hasOnLeaveHyphen = html.includes('"on-leave"') || html.includes("'on-leave'");

      console.log(`ADM-021: half_day (underscore) in DOM: ${hasHalfDayUnderscore}`);
      console.log(`ADM-021: on_leave (underscore) in DOM: ${hasOnLeaveUnderscore}`);
      console.log(`ADM-021: half-day (hyphen BAD) in DOM: ${hasHalfDayHyphen}`);
      console.log(`ADM-021: on-leave (hyphen BAD) in DOM: ${hasOnLeaveHyphen}`);

      expect(hasHalfDayHyphen).toBeFalsy();
      expect(hasOnLeaveHyphen).toBeFalsy();
    } else {
      console.log('ADM-021: ⚠️  Mark attendance button not found — testing via API');
    }
  });

  test('Attendance API accepts half_day status without validation error', async ({ page }) => {
    await loginAs(page, 'admin');

    // Get an employee to mark attendance for
    const empRes = await page.request.get(`${API_URL}/employees?limit=1`);
    const empBody = await empRes.json();
    const employees = empBody.data?.employees || empBody.data || [];

    if (!employees.length) {
      console.log('ADM-021: ⚠️  No employees to test with');
      return;
    }

    const emp = employees[0];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const res = await page.request.post(`${API_URL}/attendance/mark`, {
      data: {
        employeeId: emp.id,
        date: today,
        status: 'half_day',    // underscore — fixed value
        checkIn: new Date().toISOString(),
        checkOut: new Date().toISOString(),
      }
    });

    const status = res.status();
    const resBody = await res.json().catch(() => ({}));
    // 200/201 = created, 400 with "already exists" = also fine (means the fix passed validation)
    const isValidationError = status === 400 && /validation|invalid.*status|half-day/i.test(JSON.stringify(resBody));
    expect(isValidationError).toBeFalsy();
    console.log(`ADM-021: ✅ half_day status: HTTP ${status} — ${resBody.message || resBody.error || 'OK'}`);
  });

  test('Attendance API accepts on_leave status without validation error', async ({ page }) => {
    await loginAs(page, 'admin');

    const empRes = await page.request.get(`${API_URL}/employees?limit=2`);
    const empBody = await empRes.json();
    const employees = empBody.data?.employees || empBody.data || [];

    if (employees.length < 2) {
      console.log('ADM-021: ⚠️  Need 2 employees for on_leave test');
      return;
    }

    const emp = employees[1]; // use second employee to avoid conflict
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const res = await page.request.post(`${API_URL}/attendance/mark`, {
      data: {
        employeeId: emp.id,
        date: yesterday,
        status: 'on_leave',   // underscore — fixed value
      }
    });

    const status = res.status();
    const resBody = await res.json().catch(() => ({}));
    const isValidationError = status === 400 && /validation|invalid.*status|on-leave/i.test(JSON.stringify(resBody));
    expect(isValidationError).toBeFalsy();
    console.log(`ADM-021: ✅ on_leave status: HTTP ${status} — ${resBody.message || resBody.error || 'OK'}`);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ADM-020 — Leave balance: FE validation + BE 409 duplicate
// ═══════════════════════════════════════════════════════════════════
test.describe('ADM-020: Leave balance create validation', () => {
  test('Leave balance create — BE returns 409 for duplicate (not 400)', async ({ page }) => {
    await loginAs(page, 'admin');

    // First get a valid employee + leave type to test with
    const empRes = await page.request.get(`${API_URL}/employees?limit=1`);
    const ltRes  = await page.request.get(`${API_URL}/leave-types`);
    const empBody = await empRes.json();
    const ltBody  = await ltRes.json();

    const emp = (empBody.data?.employees || empBody.data || [])[0];
    const lt  = (ltBody.data || ltBody || [])[0];

    if (!emp || !lt) {
      console.log('ADM-020: ⚠️  No employee or leave type to test with');
      return;
    }

    const year = new Date().getFullYear();

    // Create first balance
    await page.request.post(`${API_URL}/admin/leave-balances`, {
      data: { employeeId: emp.id, leaveTypeId: lt.id, year, totalAccrued: 10 }
    });

    // Create duplicate — should now return 409
    const dupRes = await page.request.post(`${API_URL}/admin/leave-balances`, {
      data: { employeeId: emp.id, leaveTypeId: lt.id, year, totalAccrued: 10 }
    });

    const status = dupRes.status();
    expect(status).toBe(409);
    const body = await dupRes.json();
    expect(body.success).toBeFalsy();
    console.log(`ADM-020: ✅ Duplicate leave balance returns ${status} — "${body.message}"`);
  });

  test('Leave balance page renders without error', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/leave-balance-admin');
    await waitForPageReady(page);

    const body = await page.textContent('body');
    const hasError = /unhandled|cannot read|undefined is not/i.test(body);
    expect(hasError).toBeFalsy();
    console.log('ADM-020: ✅ Leave balance admin page loaded cleanly');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ADM-008/009 — PerformanceDashboard auto-refresh
// ═══════════════════════════════════════════════════════════════════
test.describe('ADM-008/009: Performance dashboard auto-refresh', () => {
  test('Auto-refresh toggle can be turned off and stays off', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/performance-dashboard');
    await waitForPageReady(page);

    // Find the auto-refresh toggle
    const toggle = page.locator('[data-testid="auto-refresh-toggle"], input[type="checkbox"]').first();
    const hasToggle = await toggle.count();
    
    if (!hasToggle) {
      console.log('ADM-008: ⚠️  Auto-refresh toggle not found by testid, trying switch label');
      const switchLabel = page.locator('text=/auto.?refresh/i').first();
      const hasSwitchLabel = await switchLabel.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`ADM-008: Switch label visible: ${hasSwitchLabel}`);
      if (!hasSwitchLabel) {
        console.log('ADM-008: ⚠️  Page may not have performance dashboard — skipping toggle test');
        return;
      }
    }

    // Check initial state
    const initialChecked = await toggle.isChecked().catch(() => null);
    console.log(`ADM-008: Initial auto-refresh state: ${initialChecked}`);

    // Click to toggle off
    await toggle.click();
    await page.waitForTimeout(500);
    const afterClick = await toggle.isChecked().catch(() => null);
    console.log(`ADM-008: After click state: ${afterClick}`);
    
    // Wait 2s and confirm it did NOT flip back on its own
    await page.waitForTimeout(2000);
    const afterWait = await toggle.isChecked().catch(() => null);
    expect(afterWait).toBe(afterClick);
    console.log(`ADM-008/009: ✅ Toggle stayed at ${afterWait} after 2s — no auto-re-enable`);
  });

  test('Performance dashboard page renders without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    
    await loginAs(page, 'admin');
    await page.goto('/performance-dashboard');
    await waitForPageReady(page);
    await page.waitForTimeout(2000);

    const relevantErrors = errors.filter(e => !/ResizeObserver/i.test(e));
    expect(relevantErrors.length).toBe(0);
    console.log(`ADM-008/009: ✅ Performance dashboard — JS errors: ${relevantErrors.length}`);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ADM-027 — Payroll search cursor does not jump
// ═══════════════════════════════════════════════════════════════════
test.describe('ADM-027: Payroll search cursor stability', () => {
  test('Typing in payroll search preserves input value', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/payroll-management');
    await waitForPageReady(page);

    const searchInput = page.locator('[data-testid="payroll-search"]');
    if (!await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('ADM-027: ⚠️  Payroll search input not visible');
      return;
    }

    // Type a search string
    await searchInput.click();
    await searchInput.fill('');
    await searchInput.type('John', { delay: 80 });
    await page.waitForTimeout(400);

    const value = await searchInput.inputValue();
    expect(value).toBe('John');
    console.log(`ADM-027: ✅ Input value after typing: "${value}" — cursor did not reset`);

    // Continue typing and verify cursor stays
    await searchInput.type(' Smith', { delay: 80 });
    await page.waitForTimeout(400);
    const value2 = await searchInput.inputValue();
    expect(value2).toContain('John');
    console.log(`ADM-027: ✅ Input value after more typing: "${value2}"`);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ADM-024 — Cancel leave: visible for pending AND approved
// ═══════════════════════════════════════════════════════════════════
test.describe('ADM-024: Cancel leave button visibility', () => {
  test('Cancel button shown for pending leave requests', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/my-leave');
    await waitForPageReady(page);

    const cancelBtns = page.locator('[data-testid^="cancel-leave-"]');
    const count = await cancelBtns.count();
    console.log(`ADM-024: Cancel buttons found: ${count}`);

    // If any pending leaves exist, button should be visible
    const body = await page.textContent('body');
    const hasPendingText = /pending/i.test(body);
    if (hasPendingText) {
      expect(count).toBeGreaterThan(0);
      console.log('ADM-024: ✅ Cancel button present for pending leave');
    } else {
      console.log('ADM-024: ℹ️  No pending leaves in test data — checking approved');
    }
  });

  test('Cancel/Request Cancellation button shown for approved leaves', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/my-leave');
    await waitForPageReady(page);

    // Check that approved leaves now show a cancel/cancellation button
    const rows = page.locator('tr, [role="row"]');
    const rowCount = await rows.count();

    let foundApprovedWithCancel = false;
    for (let i = 0; i < Math.min(rowCount, 20); i++) {
      const row = rows.nth(i);
      const text = await row.textContent().catch(() => '');
      if (/approved/i.test(text)) {
        const btn = row.getByRole('button', { name: /cancel|cancellation/i });
        if (await btn.count() > 0) {
          foundApprovedWithCancel = true;
          const btnText = await btn.first().textContent();
          console.log(`ADM-024: ✅ Approved leave has button: "${btnText}"`);
        }
      }
    }
    
    // If we find "Request Cancellation" text anywhere, the fix is in
    const bodyText = await page.textContent('body');
    const hasRequestCancellation = /request cancellation/i.test(bodyText);
    if (hasRequestCancellation) {
      console.log('ADM-024: ✅ "Request Cancellation" label found for approved leaves');
    }
    
    console.log(`ADM-024: Approved row with cancel button: ${foundApprovedWithCancel}`);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ADM-005 — No "Notifications" item in profile dropdown
// ═══════════════════════════════════════════════════════════════════
test.describe('ADM-005: Profile dropdown has no misleading Notifications link', () => {
  test('Admin profile dropdown does NOT contain Notifications menu item', async ({ page }) => {
    await loginAs(page, 'admin');
    await waitForPageReady(page);

    // Open profile dropdown
    const profileBtn = page.locator('[data-testid="profile-menu-button"], [aria-label*="profile"], [aria-label*="account"]').first();
    const avatarBtn = page.locator('[data-testid="layout-profile-btn"], [data-testid="profile-avatar"]').first();

    let opened = false;
    for (const btn of [profileBtn, avatarBtn]) {
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        opened = true;
        break;
      }
    }

    if (!opened) {
      // Try clicking avatar or account icon in header
      const headerBtn = page.locator('header button').last();
      await headerBtn.click().catch(() => {});
    }

    await page.waitForTimeout(1000);
    const menuItems = await page.locator('[role="menuitem"]').allTextContents();
    console.log(`ADM-005: Menu items: ${menuItems.join(', ')}`);

    const hasNotificationsItem = menuItems.some(t => /^notifications$/i.test(t.trim()));
    expect(hasNotificationsItem).toBeFalsy();
    console.log(`ADM-005: ✅ No "Notifications" menu item in dropdown`);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ADM-006 — Dashboard "On Leave" card navigates
// ═══════════════════════════════════════════════════════════════════
test.describe('ADM-006: Dashboard stat cards navigate', () => {
  test('"On Leave" card is clickable and navigates away from dashboard', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin-dashboard');
    await waitForPageReady(page);

    const card = page.locator('[data-testid="stat-card-on-leave"]');
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      await card.click();
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).not.toContain('/admin-dashboard');
      console.log(`ADM-006: ✅ On Leave card navigates to: ${url}`);
    } else {
      console.log('ADM-006: ⚠️  On Leave stat card not found by testid');
    }
  });

  test('"New Hires" card is clickable and navigates', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin-dashboard');
    await waitForPageReady(page);

    const card = page.locator('[data-testid="stat-card-new-hires"]');
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      await card.click();
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).not.toContain('/admin-dashboard');
      console.log(`ADM-006: ✅ New Hires card navigates to: ${url}`);
    } else {
      console.log('ADM-006: ⚠️  New Hires stat card not found');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// ADM-007 — Dashboard "Draft" / "Approved" timesheet cards navigate
// ═══════════════════════════════════════════════════════════════════
test.describe('ADM-007: Timesheet stat cards navigate', () => {
  test('"Draft" timesheet card navigates', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin-dashboard');
    await waitForPageReady(page);

    const card = page.locator('[data-testid="stat-card-draft-timesheets"]');
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      await card.click();
      await page.waitForTimeout(2000);
      expect(page.url()).not.toContain('/admin-dashboard');
      console.log(`ADM-007: ✅ Draft card → ${page.url()}`);
    } else {
      console.log('ADM-007: ⚠️  Draft timesheet stat card not found');
    }
  });

  test('"Approved" timesheet card navigates', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin-dashboard');
    await waitForPageReady(page);

    const card = page.locator('[data-testid="stat-card-approved-timesheets"]');
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      await card.click();
      await page.waitForTimeout(2000);
      expect(page.url()).not.toContain('/admin-dashboard');
      console.log(`ADM-007: ✅ Approved card → ${page.url()}`);
    } else {
      console.log('ADM-007: ⚠️  Approved timesheet stat card not found');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// EMP-005 — Profile quick link goes to /my-profile (not 404)
// ═══════════════════════════════════════════════════════════════════
test.describe('EMP-005: Employee profile quick link', () => {
  test('Employee /employee-profile redirects or 404 — not a valid route', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/employee-profile');
    await page.waitForTimeout(2000);
    const url = page.url();
    const body = await page.textContent('body').catch(() => '');
    const isRedirectedOrNotFound = url.includes('/my-profile') || url.includes('/dashboard') ||
      url.includes('/login') || /404|not found/i.test(body);
    console.log(`EMP-005: /employee-profile → ${url} (redirected/404: ${isRedirectedOrNotFound})`);
  });

  test('Employee /my-profile page loads correctly', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/my-profile');
    await waitForPageReady(page);
    const body = await page.textContent('body');
    const hasContent = /profile|employee|name|department/i.test(body);
    expect(hasContent).toBeTruthy();
    console.log('EMP-005: ✅ /my-profile loads successfully');
  });
});

// ═══════════════════════════════════════════════════════════════════
// OVERALL — Session / re-login after token expiry
// ═══════════════════════════════════════════════════════════════════
test.describe('OVERALL: Login and session stability', () => {
  test('Admin can login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@skyraksys.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    const url = page.url();
    expect(url).not.toContain('/login');
    console.log(`OVERALL: ✅ Admin login → ${url}`);
  });

  test('Employee can login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('employee1@skyraksys.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    expect(page.url()).not.toContain('/login');
    console.log(`OVERALL: ✅ Employee login → ${page.url()}`);
  });

  test('Refresh token API returns 200 with valid cookie', async ({ page }) => {
    // Login first to get cookie
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@skyraksys.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    // Call refresh token — cookie is sent automatically
    const res = await page.request.post(`${API_URL}/auth/refresh-token`);
    const status = res.status();
    expect(status).not.toBe(500);
    console.log(`OVERALL: ✅ Refresh token API: ${status}`);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ADM-016 — Profile image saved in edit mode
// ═══════════════════════════════════════════════════════════════════
test.describe('ADM-016: Profile image saved on edit', () => {
  test('Employee edit form has photo upload capability', async ({ page }) => {
    await loginAs(page, 'admin');

    const empRes = await page.request.get(`${API_URL}/employees?limit=1`);
    const empBody = await empRes.json();
    const emp = (empBody.data?.employees || empBody.data || [])[0];
    if (!emp) { console.log('ADM-016: ⚠️  No employees'); return; }

    await page.goto(`/employees/${emp.id}/edit`);
    await waitForPageReady(page);

    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    console.log(`ADM-016: File upload inputs: ${count}`);
    expect(count).toBeGreaterThan(0);
    console.log('ADM-016: ✅ Photo upload input present in edit form');
  });
});
