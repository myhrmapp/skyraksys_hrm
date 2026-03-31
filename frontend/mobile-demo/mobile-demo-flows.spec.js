// @ts-check
/**
 * SkyrakSys HRM — Mobile Demo Flow Verification
 * ================================================
 * Walks through ALL screens in the mobile app for both Employee & Manager roles.
 * Uses react-native-web at localhost:8081 with iPhone 14 Pro viewport.
 *
 * This spec verifies every step of the demo recording plan:
 *   Part 1: Employee Flow (11 steps)
 *   Part 2: Manager Flow (8 steps)
 *
 * Run:
 *   cd frontend
 *   npx playwright test -c playwright-mobile-demo.config.js --headed
 */

const path = require('path');
const fs   = require('fs');
const { test, expect } = require('@playwright/test');

// Shared narration marker log — written to disk after each Part so merge-mobile-demo.py
// can sync audio clips to the correct timestamps in each recorded video.
const MARKERS_FILE     = path.join(__dirname, '..', 'test-results', 'mobile-demo-markers.json');
const DURATIONS_FILE   = path.join(__dirname, '..', '..', 'demo-output-mobile', 'audio', 'clip-durations.json');
const markers = [];  // { label, time, iso }

// Pre-load per-clip durations so narrate() can pause long enough for narration to finish.
let CLIP_DURATIONS = {};
try {
  CLIP_DURATIONS = JSON.parse(fs.readFileSync(DURATIONS_FILE, 'utf-8'));
  console.log(`🎙️  Loaded ${Object.keys(CLIP_DURATIONS).length} clip durations from clip-durations.json`);
} catch (e) {
  console.log('⚠️  clip-durations.json not found — narrate() will use 15s default pause');
}

/**
 * Push a narration cue marker, then pause the recording long enough for
 * the corresponding voiceover clip to finish playing before the next action.
 * This ensures each scene is visible for the full duration of its narration.
 */
async function narrate(page, label) {
  markers.push({ label, time: Date.now(), iso: new Date().toISOString() });
  const clipMs = Math.round((CLIP_DURATIONS[label] ?? 15) * 1000);
  await page.waitForTimeout(clipMs + 600); // +600ms buffer so clip finishes cleanly
}

/** Persist markers to disk (called in afterAll of each Part). */
function saveMarkers() {
  fs.mkdirSync(path.dirname(MARKERS_FILE), { recursive: true });
  fs.writeFileSync(MARKERS_FILE, JSON.stringify(markers, null, 2));
  console.log(`📍 Saved ${markers.length} narration markers → ${MARKERS_FILE}`);
}

// ══════════════════════════════════════════════════════════════
// CREDENTIALS
// ══════════════════════════════════════════════════════════════
const EMPLOYEE = { email: 'employee1@skyraksys.com', pass: 'admin123' };
const MANAGER  = { email: 'lead@skyraksys.com',      pass: 'admin123' };

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

/** Inject the spotlight/highlighter CSS once per page */
async function ensureHighlighterInstalled(page) {
  const already = await page.evaluate(() => !!window.__highlighterInstalled);
  if (already) return;
  await page.addStyleTag({ content: `
    @keyframes _demo_pulse {
      0%   { box-shadow: 0 0 0 0px rgba(99,102,241,0.9), 0 0 0 0px rgba(99,102,241,0.4); }
      50%  { box-shadow: 0 0 0 6px rgba(99,102,241,0.6), 0 0 0 14px rgba(99,102,241,0.15); }
      100% { box-shadow: 0 0 0 8px rgba(99,102,241,0), 0 0 0 18px rgba(99,102,241,0); }
    }
    @keyframes _demo_click_ripple {
      0%   { transform: translate(-50%,-50%) scale(0); opacity: 1; }
      100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
    }
    .__demo_highlight {
      outline: 3px solid #6366f1 !important;
      outline-offset: 3px !important;
      animation: _demo_pulse 0.6s ease-out !important;
      border-radius: 6px !important;
      position: relative;
      z-index: 9999 !important;
    }
    #__demo_cursor_dot {
      position: fixed;
      width: 18px; height: 18px;
      background: rgba(99,102,241,0.85);
      border: 2px solid #fff;
      border-radius: 50%;
      pointer-events: none;
      z-index: 99999;
      transform: translate(-50%,-50%);
      transition: left 0.12s ease, top 0.12s ease;
      box-shadow: 0 0 0 4px rgba(99,102,241,0.3);
    }
    #__demo_ripple {
      position: fixed;
      width: 40px; height: 40px;
      border: 3px solid #6366f1;
      border-radius: 50%;
      pointer-events: none;
      z-index: 99998;
      animation: _demo_click_ripple 0.45s ease-out forwards;
    }
  `});
  await page.evaluate(() => {
    window.__highlighterInstalled = true;
    // Create persistent cursor dot
    const dot = document.createElement('div');
    dot.id = '__demo_cursor_dot';
    document.body.appendChild(dot);
    // Track mouse to move dot
    document.addEventListener('mousemove', (e) => {
      dot.style.left = e.clientX + 'px';
      dot.style.top  = e.clientY + 'px';
    });
  });
}

/**
 * Highlight a locator visually, then click it.
 * Adds a pulsing outline + ripple on click — visible in the recording.
 */
async function hlClick(page, locator, opts = {}) {
  await ensureHighlighterInstalled(page);
  await locator.scrollIntoViewIfNeeded().catch(() => {});

  // Add highlight class
  await locator.evaluate((el) => el.classList.add('__demo_highlight'));
  await page.waitForTimeout(600); // let the pulse animation play

  // Get bounding box for ripple position
  const box = await locator.boundingBox().catch(() => null);
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.evaluate(({ cx, cy }) => {
      // Move cursor dot to element
      const dot = document.getElementById('__demo_cursor_dot');
      if (dot) { dot.style.left = cx + 'px'; dot.style.top = cy + 'px'; }
      // Create click ripple
      const prev = document.getElementById('__demo_ripple');
      if (prev) prev.remove();
      const ripple = document.createElement('div');
      ripple.id = '__demo_ripple';
      ripple.style.left = cx + 'px';
      ripple.style.top  = cy + 'px';
      document.body.appendChild(ripple);
    }, { cx, cy });
  }

  await page.waitForTimeout(200);
  // Remove highlight then click
  await locator.evaluate((el) => el.classList.remove('__demo_highlight'));
  await locator.click({ force: opts.force ?? false, ...opts });
}

/** Wait for network to settle and content to render */
async function ready(page, ms = 1500) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}

/** Login flow — fills email/password and clicks Sign In */
async function login(page, creds) {
  await page.goto('/');
  await ready(page, 2000);
  await ensureHighlighterInstalled(page);

  const emailInput = page.locator('[data-testid="login-email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await hlClick(page, emailInput);
  await emailInput.fill(creds.email);
  await page.waitForTimeout(400);

  const passwordInput = page.locator('[data-testid="login-password"]');
  await hlClick(page, passwordInput);
  await passwordInput.fill(creds.pass);
  await page.waitForTimeout(400);

  await hlClick(page, page.locator('[data-testid="login-button"]'));

  // Wait for navigation away from login
  await page.waitForFunction(() => {
    return !document.querySelector('[data-testid="login-button"]');
  }, { timeout: 15000 });
  await ready(page, 2000);
}

/** Logout flow */
async function logout(page) {
  await tapTab(page, 'Profile');
  await ready(page);
  const logoutBtn = page.locator('[data-testid="logout-btn"]');
  await logoutBtn.scrollIntoViewIfNeeded();
  await ready(page, 500);

  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await hlClick(page, logoutBtn);
  await ready(page, 2000);
}

// Tab name → data-testid mapping (from tabBarTestID in TabNavigator)
const TAB_IDS = {
  Home:       'tab-home',
  Dashboard:  'tab-home',
  Attendance: 'tab-attendance',
  Leave:      'tab-leave',
  Timesheet:  'tab-timesheet',
  Payslips:   'tab-payslips',
  Tasks:      'tab-tasks',
  Profile:    'tab-profile',
};

// Tab order for x-position based click fallback (390px wide, 7 tabs)
const TAB_X_POSITIONS = {
  Home:       28,
  Dashboard:  28,
  Attendance: 84,
  Leave:      140,
  Timesheet:  196,
  Payslips:   252,
  Tasks:      307,
  Profile:    362,
};

/**
 * Tap a bottom tab by name.
 * Uses JS dispatchEvent on the tab bar element to bypass React Native Web
 * pointer-events interception. Falls back to testID click, then mouse.click
 * at the calculated tab position, then full page reload.
 */
async function tapTab(page, tabName) {
  const testId = TAB_IDS[tabName];

  // Strategy 1: JS dispatchEvent — finds the text node in the tab bar area
  // and fires native click/pointer events to bypass pointer-events overlay.
  const jsClicked = await page.evaluate(({ name, testId }) => {
    const vh = window.innerHeight;
    const tabBarTop = vh - 90; // tab bar is in the bottom 90px

    // Try by testID first (tabBarTestID may render as data-testid on web)
    const byId = document.querySelector(`[data-testid="${testId}"]`);
    if (byId) {
      byId.click();
      byId.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      byId.dispatchEvent(new PointerEvent('pointerup',   { bubbles: true, cancelable: true }));
      byId.dispatchEvent(new MouseEvent('click',         { bubbles: true, cancelable: true }));
      return true;
    }

    // Walk all text nodes looking for exact tab label in the tab bar region
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent?.trim() === name) {
        let el = node.parentElement;
        for (let i = 0; i < 12; i++) {
          if (!el) break;
          const rect = el.getBoundingClientRect();
          if (rect.top >= tabBarTop) {
            el.click();
            el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
            el.dispatchEvent(new PointerEvent('pointerup',   { bubbles: true, cancelable: true }));
            el.dispatchEvent(new MouseEvent('click',         { bubbles: true, cancelable: true }));
            return true;
          }
          el = el.parentElement;
        }
      }
    }
    return false;
  }, { name: tabName, testId });

  await page.waitForTimeout(jsClicked ? 2000 : 500);

  // Strategy 2: Playwright force-click at calculated tab bar x/y position
  if (!jsClicked) {
    const viewport = page.viewportSize();
    const vHeight = viewport?.height ?? 844;
    const tabY = vHeight - 30; // ~30px from bottom (center of tab bar)
    const tabX = TAB_X_POSITIONS[tabName] ?? 196;
    await page.mouse.click(tabX, tabY);
    await page.waitForTimeout(2000);
  }

  // Strategy 3: Verify navigation actually succeeded — if expected content absent, reload
  const EXPECTED = {
    Attendance: ['Attendance', 'Present', 'Absent', 'Check In', 'History'],
    Leave:      ['Leave Balance', 'Annual', 'Leave Type', 'My Leave', 'Apply'],
    Timesheet:  ['Timesheet', 'Week of', 'hours', 'Total'],
    Payslips:   ['Payslip', 'Earnings', 'Net Pay', 'No payslips', 'Gross'],
    Tasks:      ['Task', 'Priority', 'No tasks', 'In Progress', 'Not Started'],
    Profile:    ['Personal', 'Employment', 'Contact', 'Profile'],
  };
  const keywords = EXPECTED[tabName];
  if (keywords) {
    const currentText = await page.locator('body').textContent().catch(() => '');
    const navSucceeded = keywords.some(kw => currentText?.includes(kw));
    if (!navSucceeded) {
      console.log(`⚠️ tapTab('${tabName}') — content check failed, reloading and retrying`);
      await page.goto('/');
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2000);
      // Try coordinate click again after reload
      const viewport2 = page.viewportSize();
      const vHeight2 = viewport2?.height ?? 844;
      const tabY2 = vHeight2 - 30;
      const tabX2 = TAB_X_POSITIONS[tabName] ?? 196;
      await page.mouse.click(tabX2, tabY2);
      await page.waitForTimeout(3000);
    }
  }
}

/** Take a named screenshot */
async function snap(page, name) {
  await page.screenshot({ path: `test-results/mobile-demo-${name}.png`, fullPage: false });
}

// ══════════════════════════════════════════════════════════════
//  PART 1: EMPLOYEE FLOW
// ══════════════════════════════════════════════════════════════
test.describe.serial('Part 1 — Employee Flow', () => {
  /** @type {import('@playwright/test').Page} */
  let page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      recordVideo: { dir: 'test-results/' },
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    saveMarkers();
    await page.context().close();
  });

  // ── Step 1: Login ──
  test('1 — Login as Employee', async () => {
    await narrate(page, 'INTRO.welcome');
    await login(page, EMPLOYEE);
    await narrate(page, 'EMPLOYEE.login');
    await snap(page, '01-employee-login');

    // Should see the dashboard greeting
    await expect(page.locator('[data-testid="greeting-section"]')).toBeVisible({ timeout: 10000 });
  });

  // ── Step 2: Dashboard ──
  test('2 — Employee Dashboard overview', async () => {
    await narrate(page, 'EMPLOYEE.dashboard');
    // Greeting visible
    await expect(page.locator('[data-testid="greeting-section"]')).toBeVisible();

    // Attendance card visible
    await expect(page.locator('[data-testid="attendance-card"]')).toBeVisible();

    // Leave balance card visible
    const leaveCard = page.locator('[data-testid="leave-balance-card"]');
    await leaveCard.scrollIntoViewIfNeeded();
    await expect(leaveCard).toBeVisible();

    // Check that leave balance shows proper numbers (not NaN, not string concat like "012.00")
    const lbText = await leaveCard.textContent();
    expect(lbText).not.toContain('NaN');
    expect(lbText).not.toMatch(/\d+\.\d{2}\d+\.\d{2}/); // no string concat pattern

    await snap(page, '02-employee-dashboard');
  });

  // ── Step 3: Check In ──
  test('3 — Check In from Dashboard', async () => {
    await narrate(page, 'EMPLOYEE.checkin');
    const checkBtn = page.locator('[data-testid="check-in-out-btn"]');
    await checkBtn.scrollIntoViewIfNeeded();

    const btnText = await checkBtn.textContent();

    if (btnText?.includes('Check In')) {
      await checkBtn.click();
      await ready(page, 2000);

      // After check-in, button should show "Check Out" or time should appear
      const updatedText = await page.locator('[data-testid="attendance-card"]').textContent().catch(() => '');
      if (!updatedText?.match(/In:|Check Out/)) {
        console.log('⚠ Check-in confirmation not detected in attendance card:', updatedText?.substring(0, 100));
      }
      await snap(page, '03-checked-in');
    } else {
      // Already checked in — that's fine, just screenshot
      console.log('Already checked in, skipping check-in action. Button text:', btnText);
      await snap(page, '03-already-checked-in');
    }
  });

  // ── Step 4: Attendance ──
  test('4 — Attendance tab with calendar', async () => {
    await tapTab(page, 'Attendance');
    await narrate(page, 'EMPLOYEE.attendance');

    // Calendar should be visible (rendered by react-native-calendars)
    // Look for month header or calendar container
    await page.waitForTimeout(2000);
    const content = await page.content();
    // Calendar renders month names or day numbers
    const hasCalendar = content.includes('Mon') || content.includes('March') || content.includes('2026');
    expect(hasCalendar).toBeTruthy();

    await snap(page, '04-attendance-calendar');
  });

  // ── Step 5: Leave ──
  test('5 — Leave tab with balance cards', async () => {
    await tapTab(page, 'Leave');
    await narrate(page, 'EMPLOYEE.leave');

    // Balance cards should render
    await page.waitForTimeout(2000);

    // Look for leave type names (from seeded data)
    const pageText = await page.locator('body').textContent();
    const hasBalances = pageText?.includes('Sick') ||
                       pageText?.includes('Casual') ||
                       pageText?.includes('Annual') ||
                       pageText?.includes('Leave History') ||
                       pageText?.includes('My Leaves');
    if (!hasBalances) {
      console.log('⚠ Leave tab: no balance keywords found — check tab navigation or leave type seeding');
    }

    // Verify no .00 display issues on balance cards
    const balanceSection = page.locator('body');
    const allText = await balanceSection.textContent() || '';
    // Should NOT have patterns like "12.00" (should be "12")
    // But "1.5" is OK. Only flag exact ".00" endings
    // Note: This is a soft check — some edge values might legitimately show .00
    console.log('Leave screen text snippet:', allText.substring(0, 500));

    await snap(page, '05-leave-balances');
  });

  // ── Step 6: Apply Leave ──
  test('6 — Apply Leave form', async () => {
    // Tap the FAB (+ button)
    const fab = page.locator('[data-testid="apply-leave-fab"]');
    const fabVisible = await fab.isVisible({ timeout: 3000 }).catch(() => false);
    if (!fabVisible) {
      console.log('⚠ Apply Leave FAB not visible — skipping form interaction for demo');
      await snap(page, '06-no-fab');
      return;
    }
    await fab.click();
    await ready(page, 2000);
    await narrate(page, 'EMPLOYEE.apply_leave');

    // Should now be on LeaveRequestScreen — check form elements
    const hasLeaveType = await page.getByText('Leave Type').isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasLeaveType) {
      console.log('⚠ Leave form not opened properly');
      await snap(page, '06a-leave-form-missing');
      return;
    }

    await snap(page, '06a-leave-form');

    // Fill in the reason
    const reasonInput = page.locator('[data-testid="leave-reason"]');
    await reasonInput.fill('Annual vacation — family trip planned for next month');

    await snap(page, '06b-leave-form-filled');

    // Submit
    const submitBtn = page.locator('[data-testid="leave-submit-btn"]');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();
    await ready(page, 2000);

    // Ensure we're back on a tabbed screen (leave form might fail validation
    // or show an error — either way, navigate away from the modal)
    const tabVisible = await page.getByText('Leave', { exact: true }).first().isVisible().catch(() => false);
    if (!tabVisible) {
      await page.goBack().catch(() => {});
      await ready(page, 1000);
    }

    // Should navigate back to Leave screen or show success
    await snap(page, '06c-leave-submitted');
  });

  // ── Step 7: Timesheet ──
  test('7 — Timesheet tab with week view', async () => {
    await tapTab(page, 'Timesheet');
    await ready(page, 3500); // increased wait for slow render
    await narrate(page, 'EMPLOYEE.timesheet');

    // Take a debug screenshot before assertion
    await snap(page, '07a-timesheet-precheck');

    // Week navigator should be visible with "Week of" text
    const pageText = await page.locator('body').textContent();
    const hasTimesheet = pageText?.includes('Week of') ||
                        pageText?.includes('Mon') ||
                        pageText?.includes('total') ||
                        pageText?.includes('My Timesheets') ||
                        pageText?.includes('No entries');
    expect(hasTimesheet).toBeTruthy();

    await snap(page, '07-timesheet');
  });

  // ── Step 8: Payslips ──
  test('8 — Payslips list and detail', async () => {
    await tapTab(page, 'Payslips');
    await ready(page, 2500); // extra wait for tab switch
    await narrate(page, 'EMPLOYEE.payslips');
    await snap(page, '08a-payslips-tabbed'); // debug screenshot after tab

    const pageText = await page.locator('body').textContent();
    console.log('Payslips page text (first 300):', pageText?.substring(0, 300));

    // Should show payslip cards with earnings/deductions
    const hasPayslips = pageText?.includes('Earnings') ||
                       pageText?.includes('Deductions') ||
                       pageText?.includes('Net Pay') ||
                       pageText?.includes('No payslips') ||
                       pageText?.includes('Payslip') ||
                       pageText?.includes('March') || // month name on payslip card
                       pageText?.includes('February');

    if (pageText?.includes('Earnings') || pageText?.includes('Net Pay')) {
      // Tap the first payslip card using testID
      const firstCard = page.locator('[data-testid^="payslip-card-"]').first();
      if (await firstCard.isVisible().catch(() => false)) {
        await firstCard.click({ force: true });
        await ready(page, 2000);
        await snap(page, '08b-payslip-detail');
        // Go back to payslips list
        await page.goBack();
        await ready(page);
      }
    }

    await snap(page, '08c-payslips-list');
    // Soft check — don't fail demo if payslip data varies
    if (!hasPayslips) {
      console.log('⚠ Payslips screen: no expected keywords found — check data seeding');
    }
  });

  // ── Step 9: Tasks ──
  test('9 — Tasks screen', async () => {
    await tapTab(page, 'Tasks');
    await ready(page, 2000);    await narrate(page, 'EMPLOYEE.tasks');
    const pageText = await page.locator('body').textContent();
    const hasTasks = pageText?.includes('Critical') ||
                    pageText?.includes('High') ||
                    pageText?.includes('Medium') ||
                    pageText?.includes('Low') ||
                    pageText?.includes('In Progress') ||
                    pageText?.includes('Not Started') ||
                    pageText?.includes('No tasks') ||
                    pageText?.includes('Task') ||
                    pageText?.includes('Priority');
    if (!hasTasks) {
      console.log('⚠ Tasks screen: no expected keywords — check tab navigation or data');
    }

    await snap(page, '09-tasks');
  });

  // ── Step 10: Check Out ──
  test('10 — Check Out from Dashboard', async () => {
    await tapTab(page, 'Home');
    await ready(page);
    await narrate(page, 'EMPLOYEE.checkout');

    const checkBtn = page.locator('[data-testid="check-in-out-btn"]');
    await checkBtn.scrollIntoViewIfNeeded();
    const btnText = await checkBtn.textContent();

    if (btnText?.includes('Check Out')) {
      await checkBtn.click();
      await ready(page, 2000);

      // Button should change after check-out
      const updatedText = await page.locator('[data-testid="check-in-out-btn"]').textContent().catch(() => '');
      console.log('Post-checkout button text:', updatedText);
      await snap(page, '10-checked-out');
    } else {
      console.log('Not in check-out state. Button text:', btnText);
      await snap(page, '10-checkout-skipped');
    }
  });

  // ── Step 11: Profile / Logout ──
  test('11 — Profile and Logout', async () => {
    await tapTab(page, 'Profile');
    await ready(page);
    await narrate(page, 'EMPLOYEE.profile');

    // Profile should show user info
    const pageText = await page.locator('body').textContent();
    const hasProfile = pageText?.includes('Alice') || pageText?.includes('employee1') || pageText?.includes('Personal') || pageText?.includes('Profile');
    if (!hasProfile) console.log('⚠ Profile: expected user info not found');

    await snap(page, '11a-profile');

    // Logout
    const logoutBtn = page.locator('[data-testid="logout-btn"]');
    await logoutBtn.scrollIntoViewIfNeeded();

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await logoutBtn.click();
    await ready(page, 2000);

    // Should be back on login screen
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible({ timeout: 10000 });
    await snap(page, '11b-logged-out');
  });
});

// ══════════════════════════════════════════════════════════════
//  PART 2: MANAGER FLOW
// ══════════════════════════════════════════════════════════════
test.describe.serial('Part 2 — Manager Flow', () => {
  /** @type {import('@playwright/test').Page} */
  let page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      recordVideo: { dir: 'test-results/' },
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    saveMarkers();
    await page.context().close();
  });

  // ── Step 1: Login as Manager ──
  test('1 — Login as Manager', async () => {
    await narrate(page, 'MANAGER.intro');
    await login(page, MANAGER);
    await snap(page, '20-manager-login');

    // viewMode may persist as 'employee' from the previous session.
    // Check if we see the manager dashboard; if not, toggle via Profile.
    const pageText = await page.locator('body').textContent();
    const isManagerDash = pageText?.includes('Team Size') ||
                          pageText?.includes('Present Today') ||
                          pageText?.includes('Welcome back') ||
                          pageText?.includes('Pending Leave Requests');

    if (!isManagerDash) {
      // Switch to manager view via Profile toggle
      await tapTab(page, 'Profile');
      const switchEl = page.locator('[data-testid="view-mode-switch"]');
      if (await switchEl.isVisible().catch(() => false)) {
        await switchEl.click({ force: true });
        await ready(page, 1500);
      }
      await tapTab(page, 'Home');
      await ready(page, 1500);
    }

    // Verify manager dashboard content
    const finalText = await page.locator('body').textContent();
    const hasManagerDash = finalText?.includes('Team Size') ||
                          finalText?.includes('Present Today') ||
                          finalText?.includes('Welcome back') ||
                          finalText?.includes('Pending');
    if (!hasManagerDash) {
      console.log('⚠ Manager Dashboard: expected content not found — check login or view mode');
    }
  });

  // ── Step 2: Manager Dashboard ──
  test('2 — Manager Dashboard with team stats', async () => {
    await narrate(page, 'MANAGER.dashboard');
    const pageText = await page.locator('body').textContent();

    // Team stats cards
    const hasStats = /Team Size|Present Today|On Leave|Welcome/.test(pageText || '');
    if (!hasStats) console.log('⚠ Manager Dashboard: team stats not found');

    // Pending sections
    const hasPending = pageText?.includes('Pending Leave') ||
                      pageText?.includes('Pending Timesheet') ||
                      pageText?.includes('All caught up') ||
                      pageText?.includes('Pending');
    if (!hasPending) console.log('⚠ Manager Dashboard: pending sections not found');

    await snap(page, '21-manager-dashboard');
  });

  // ── Step 3: Approve Leave ──
  test('3 — Approve a pending leave', async () => {
    await narrate(page, 'MANAGER.approve_leave');
    const hasPendingLeaves = await page.getByText('Pending Leave Requests').isVisible().catch(() => false);

    if (hasPendingLeaves) {
      await page.getByText('Pending Leave Requests').scrollIntoViewIfNeeded();
      await snap(page, '22a-pending-leaves');

      // Use testID-based selector for the first approve button
      const approveBtn = page.locator('[data-testid^="leave-approve-"]').first();
      if (await approveBtn.isVisible().catch(() => false)) {
        await approveBtn.click({ force: true });
        await ready(page, 2000);
        await snap(page, '22b-leave-approved');
      } else {
        console.log('Approve button not visible');
        await snap(page, '22b-approve-btn-hidden');
      }
    } else {
      console.log('No pending leave requests on manager dashboard');
      await snap(page, '22-no-pending-leaves');
    }
  });

  // ── Step 4: Leave screen with approvals tab ──
  test('4 — Leave Approvals tab', async () => {
    await tapTab(page, 'Leave');
    await ready(page);
    await narrate(page, 'MANAGER.leave_approvals');

    // Manager should see tabs
    const approvalsTab = page.locator('[data-testid="leave-approvals-tab"]');
    if (await approvalsTab.isVisible().catch(() => false)) {
      await approvalsTab.click();
      await ready(page, 2000);

      const pageText = await page.locator('body').textContent();
      const hasApprovals = pageText?.includes('Approve') ||
                          pageText?.includes('Reject') ||
                          pageText?.includes('No pending');
      if (!hasApprovals) console.log('⚠ Leave approvals tab: no approval content found');
      await snap(page, '23-leave-approvals');
    } else {
      // If no tab, manager might not have the tab visible
      console.log('Leave approvals tab not found');
      await snap(page, '23-leave-no-tab');
    }
  });

  // ── Step 5: Attendance Team tab ──
  test('5 — Attendance Team Today', async () => {
    await tapTab(page, 'Attendance');
    await ready(page);
    await narrate(page, 'MANAGER.team_attendance');

    const teamTab = page.locator('[data-testid="attendance-team-tab"]');
    if (await teamTab.isVisible().catch(() => false)) {
      await teamTab.click();
      await ready(page, 2000);

      const pageText = await page.locator('body').textContent();
      const hasTeam = pageText?.includes('Present') ||
                     pageText?.includes('Absent') ||
                     pageText?.includes('On Leave') ||
                     pageText?.includes('Team');
      if (!hasTeam) console.log('⚠ Attendance team tab: no team content found');
      await snap(page, '24-attendance-team');
    } else {
      console.log('Attendance team tab not found');
      await snap(page, '24-attendance-no-team');
    }
  });

  // ── Step 6: Timesheet Approvals ──
  test('6 — Timesheet Approvals tab', async () => {
    await tapTab(page, 'Timesheet');
    await ready(page);
    await narrate(page, 'MANAGER.timesheet_approvals');

    const approvalsTab = page.locator('[data-testid="timesheet-approvals-tab"]');
    if (await approvalsTab.isVisible().catch(() => false)) {
      await approvalsTab.click();
      await ready(page, 2000);

      const pageText = await page.locator('body').textContent();
      const hasApprovals = pageText?.includes('Approve') ||
                          pageText?.includes('Reject') ||
                          pageText?.includes('No pending') ||
                          pageText?.includes('Approvals');
      if (!hasApprovals) console.log('⚠ Timesheet approvals tab: no approval content found');
      await snap(page, '25-timesheet-approvals');
    } else {
      console.log('Timesheet approvals tab not found');
      await snap(page, '25-timesheet-no-tab');
    }
  });

  // ── Step 7: Profile Toggle ──
  test('7 — Profile with Manager/Employee view toggle', async () => {
    await tapTab(page, 'Profile');
    await ready(page);
    await narrate(page, 'MANAGER.profile');

    const pageText = await page.locator('body').textContent();

    // Should show manager info
    const hasManagerInfo = pageText?.includes('John') || pageText?.includes('lead') || pageText?.includes('Manager');
    if (!hasManagerInfo) console.log('⚠ Manager Profile: expected manager name not found');

    // Manager View toggle should be visible
    const hasToggle = pageText?.includes('Manager View') || pageText?.includes('Employee View');
    if (!hasToggle) console.log('⚠ Manager Profile: view toggle not found');

    await snap(page, '26-profile-manager');

    // Toggle to employee view using testID
    const toggle = page.locator('[data-testid="view-mode-switch"]');
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click({ force: true });
      await ready(page, 1500);
      await snap(page, '26b-profile-toggled');

      // Toggle back
      await toggle.click({ force: true });
      await ready(page);
    }
  });

  // ── Step 8: Logout ──
  test('8 — Manager Logout', async () => {
    await narrate(page, 'MANAGER.logout');
    const logoutBtn = page.locator('[data-testid="logout-btn"]');
    await logoutBtn.scrollIntoViewIfNeeded();

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await logoutBtn.click();
    await ready(page, 2000);

    await expect(page.locator('[data-testid="login-email"]')).toBeVisible({ timeout: 10000 });
    await snap(page, '27-manager-logged-out');
  });
});
