/**
 * Guide Reporter — Playwright Custom Reporter
 *
 * After each business-workflow test finishes, collects metadata (testId,
 * description, video path, screenshots, duration, pass/fail) and writes
 * a guide-manifest.json that the in-app help system consumes.
 *
 * Automatically copies recorded videos from Playwright's temp dir into
 * public/guides/videos/<testId>.webm for serving by the React dev server.
 */
const fs = require('fs');
const path = require('path');

const GUIDE_DIR = path.join(__dirname, '..', '..', 'public', 'guides');
const VIDEO_DIR = path.join(GUIDE_DIR, 'videos');
const SCREENSHOT_DIR = path.join(GUIDE_DIR, 'screenshots');
const MANIFEST_PATH = path.join(GUIDE_DIR, 'guide-manifest.json');

// Module → human-readable category mapping
const MODULE_MAP = {
  onboarding: { module: 'Employee Management', icon: 'PersonAdd', color: '#1976d2' },
  onboardingFull: { module: 'Employee Management', icon: 'PersonAdd', color: '#1976d2' },
  onboardingCreateLogin: { module: 'Employee Management', icon: 'PersonAdd', color: '#1976d2' },
  leaveRequestSubmit: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02' },
  leaveManagerApprove: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02' },
  leaveVerifyApproved: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02' },
  leaveRequestReject: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02' },
  leaveBalanceCheck: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02' },
  leaveCancelPending: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02' },
  leaveAdminManagement: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02' },
  leaveTypesCRUD: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02' },
  leaveLifecycle: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02' },
  attendanceCheckInOut: { module: 'Attendance', icon: 'AccessTime', color: '#2e7d32' },
  attendanceDaily: { module: 'Attendance', icon: 'AccessTime', color: '#2e7d32' },
  attendanceAdminMark: { module: 'Attendance', icon: 'AccessTime', color: '#2e7d32' },
  attendanceMonthNav: { module: 'Attendance', icon: 'AccessTime', color: '#2e7d32' },
  attendanceAdminFilter: { module: 'Attendance', icon: 'AccessTime', color: '#2e7d32' },
  timesheetWeeklyEntry: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0' },
  timesheetSubmit: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0' },
  timesheetReadOnlyAfterSubmit: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0' },
  timesheetManagerApprove: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0' },
  timesheetManagerReject: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0' },
  timesheetResubmitAfterReject: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0' },
  timesheetBulkApprove: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0' },
  timesheetHistoryExport: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0' },
  timesheetMultiProject: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0' },
  timesheetValidation: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0' },
  timesheetEmptySubmitBlocked: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0' },
  payrollPageAndTabs: { module: 'Payroll', icon: 'Payment', color: '#d32f2f' },
  payrollGenerate: { module: 'Payroll', icon: 'Payment', color: '#d32f2f' },
  payrollFinalize: { module: 'Payroll', icon: 'Payment', color: '#d32f2f' },
  payrollMarkPaid: { module: 'Payroll', icon: 'Payment', color: '#d32f2f' },
  payrollEmployeeView: { module: 'Payroll', icon: 'Payment', color: '#d32f2f' },
  payrollEmployeeDownload: { module: 'Payroll', icon: 'Payment', color: '#d32f2f' },
  payrollSearchAndExport: { module: 'Payroll', icon: 'Payment', color: '#d32f2f' },
  payrollTemplateConfig: { module: 'Payroll', icon: 'Payment', color: '#d32f2f' },
  payrollHRAccess: { module: 'Payroll', icon: 'Payment', color: '#d32f2f' },
  payrollEmployeeRBAC: { module: 'Payroll', icon: 'Payment', color: '#d32f2f' },
  payrollCycle: { module: 'Payroll', icon: 'Payment', color: '#d32f2f' },
  taskViewAndFilter: { module: 'Tasks & Projects', icon: 'Assignment', color: '#0288d1' },
  taskStatusChange: { module: 'Tasks & Projects', icon: 'Assignment', color: '#0288d1' },
  taskProgression: { module: 'Tasks & Projects', icon: 'Assignment', color: '#0288d1' },
  projectCreateAndVerify: { module: 'Tasks & Projects', icon: 'Assignment', color: '#0288d1' },
  taskCreateUnderProject: { module: 'Tasks & Projects', icon: 'Assignment', color: '#0288d1' },
  projectEditAndDelete: { module: 'Tasks & Projects', icon: 'Assignment', color: '#0288d1' },
  taskProjectRBAC: { module: 'Tasks & Projects', icon: 'Assignment', color: '#0288d1' },
  reviewCreate: { module: 'Reviews', icon: 'RateReview', color: '#f57c00' },
  reviewWorkflow: { module: 'Reviews', icon: 'RateReview', color: '#f57c00' },
  reviewSelfAssessment: { module: 'Reviews', icon: 'RateReview', color: '#f57c00' },
  reviewApprove: { module: 'Reviews', icon: 'RateReview', color: '#f57c00' },
  reviewSearchFilter: { module: 'Reviews', icon: 'RateReview', color: '#f57c00' },
  reviewEditDelete: { module: 'Reviews', icon: 'RateReview', color: '#f57c00' },
  orgDeptCRUD: { module: 'Organization', icon: 'Business', color: '#00838f' },
  orgPositionCRUD: { module: 'Organization', icon: 'Business', color: '#00838f' },
  orgHolidayCRUD: { module: 'Organization', icon: 'Business', color: '#00838f' },
  orgDeptSearch: { module: 'Organization', icon: 'Business', color: '#00838f' },
  orgDeptEmptyValidation: { module: 'Organization', icon: 'Business', color: '#00838f' },
  orgRBAC: { module: 'Organization', icon: 'Business', color: '#00838f' },
  userCreateFull: { module: 'User Management', icon: 'ManageAccounts', color: '#5e35b1' },
  userSearchAndFilter: { module: 'User Management', icon: 'ManageAccounts', color: '#5e35b1' },
  userValidation: { module: 'User Management', icon: 'ManageAccounts', color: '#5e35b1' },
  userRBAC: { module: 'User Management', icon: 'ManageAccounts', color: '#5e35b1' },
  employeeCreateEditDelete: { module: 'Employee Management', icon: 'People', color: '#1976d2' },
  employeeSearchFilter: { module: 'Employee Management', icon: 'People', color: '#1976d2' },
  employeeExport: { module: 'Employee Management', icon: 'People', color: '#1976d2' },
  employeeFormValidation: { module: 'Employee Management', icon: 'People', color: '#1976d2' },
  employeeViewAllTabs: { module: 'Employee Management', icon: 'People', color: '#1976d2' },
  employeeManagerTeamView: { module: 'Employee Management', icon: 'People', color: '#1976d2' },
  employeeSalaryStructure: { module: 'Employee Management', icon: 'People', color: '#1976d2' },
  leaveOverlapCheck: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02' },
  leaveZeroBalanceCheck: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02' },
  leaveAccrual: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02' },
  leaveDeductionCheck: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02' },
  attendanceMissedCheckOut: { module: 'Attendance', icon: 'AccessTime', color: '#2e7d32' },
  timesheetMultiProject: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0' },
  timesheetValidation: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0' },
  timesheetOvertime: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0' },
  payrollAmountsVerify: { module: 'Payroll', icon: 'Payment', color: '#d32f2f' },
  payrollRegenerate: { module: 'Payroll', icon: 'Payment', color: '#d32f2f' },
  reviewFullCycle: { module: 'Reviews', icon: 'RateReview', color: '#f57c00' },
  orgDeptDeleteWithEmployees: { module: 'Organization', icon: 'Business', color: '#00838f' },
  userRoleChange: { module: 'User Management', icon: 'ManageAccounts', color: '#5e35b1' },
  userDeactivate: { module: 'User Management', icon: 'ManageAccounts', color: '#5e35b1' },
  rbacEmployeeDenied: { module: 'Access Control', icon: 'Security', color: '#616161' },
  rbacManagerDenied: { module: 'Access Control', icon: 'Security', color: '#616161' },
  rbacManagerAllowed: { module: 'Access Control', icon: 'Security', color: '#616161' },
  rbacHRAllowed: { module: 'Access Control', icon: 'Security', color: '#616161' },
  rbacAdminFull: { module: 'Access Control', icon: 'Security', color: '#616161' },
  accessControl: { module: 'Access Control', icon: 'Security', color: '#616161' },
  sidebarNavAdmin: { module: 'Navigation', icon: 'Menu', color: '#455a64' },
  sidebarNavEmployee: { module: 'Navigation', icon: 'Menu', color: '#455a64' },
  profileMenu: { module: 'Navigation', icon: 'Menu', color: '#455a64' },
  nav404: { module: 'Navigation', icon: 'Menu', color: '#455a64' },
  reportAdminView: { module: 'Reports', icon: 'Assessment', color: '#00695c' },
  reportExport: { module: 'Reports', icon: 'Assessment', color: '#00695c' },
  settingsHub: { module: 'Settings', icon: 'Settings', color: '#37474f' },
  restoreManagementTabs: { module: 'Settings', icon: 'Settings', color: '#37474f' },
  crossModulePaycheck: { module: 'Cross-Module', icon: 'Link', color: '#6d4c41' },
  crossModuleLeaveAttendance: { module: 'Cross-Module', icon: 'Link', color: '#6d4c41' },
  crossModuleTimesheetPayroll: { module: 'Cross-Module', icon: 'Link', color: '#6d4c41' },
  crossModuleDashboard: { module: 'Cross-Module', icon: 'Link', color: '#6d4c41' },
  onboardingAssignDepartment: { module: 'Employee Management', icon: 'PersonAdd', color: '#1976d2' },
  onboardingVerifyDashboard: { module: 'Employee Management', icon: 'PersonAdd', color: '#1976d2' },
  leaveCancelPending: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02' },
  taskAssignAndView: { module: 'Tasks & Projects', icon: 'Assignment', color: '#0288d1' },
};

const FALLBACK = { module: 'General', icon: 'Help', color: '#757575' };

class GuideReporter {
  constructor() {
    this.entries = [];
    this.startTime = null;
    // Ensure output directories exist
    for (const dir of [GUIDE_DIR, VIDEO_DIR, SCREENSHOT_DIR]) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  onBegin(config, suite) {
    this.startTime = Date.now();
    console.log(`\n📖  Guide Recorder — recording ${suite.allTests().length} workflows\n`);
  }

  onTestEnd(test, result) {
    // Extract testId from title like "BW-050: Weekly timesheet entry"
    const titleMatch = test.title.match(/^(BW-\d+):\s*(.+)$/);
    if (!titleMatch) return;

    const testId = titleMatch[1];
    const description = titleMatch[2].trim();

    // Pick the action from the annotations or derive from testId
    const action = this._deriveAction(test, result);
    const meta = MODULE_MAP[action] || FALLBACK;

    // Copy video to public/guides/videos/
    let videoPath = null;
    for (const attachment of result.attachments) {
      if (attachment.name === 'video' && attachment.path) {
        const destName = `${testId}.webm`;
        const destPath = path.join(VIDEO_DIR, destName);
        try {
          fs.copyFileSync(attachment.path, destPath);
          videoPath = `guides/videos/${destName}`;
        } catch (e) {
          console.warn(`  ⚠ Could not copy video for ${testId}: ${e.message}`);
        }
      }
    }

    // Copy screenshot
    let screenshotPath = null;
    for (const attachment of result.attachments) {
      if (attachment.name === 'screenshot' && attachment.path) {
        const destName = `${testId}.png`;
        const destPath = path.join(SCREENSHOT_DIR, destName);
        try {
          fs.copyFileSync(attachment.path, destPath);
          screenshotPath = `guides/screenshots/${destName}`;
        } catch (e) { /* non-critical */ }
      }
    }

    this.entries.push({
      testId,
      title: description,
      module: meta.module,
      icon: meta.icon,
      color: meta.color,
      action,
      videoUrl: videoPath,
      screenshotUrl: screenshotPath,
      duration: result.duration,
      status: result.status,
      recordedAt: new Date().toISOString(),
    });
  }

  onEnd(result) {
    // Merge with existing manifest (so incremental runs don't lose prior recordings)
    // IMPORTANT: Preserve text-guide fields (steps, role, roleDisplay, tags, order,
    // module categorization) from the manifest generated by generate-guide-manifest.js
    let existing = [];
    let existingMeta = {};
    if (fs.existsSync(MANIFEST_PATH)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
        existing = parsed.guides || [];
        existingMeta = { appName: parsed.appName, version: parsed.version };
      } catch { /* start fresh */ }
    }

    // Build lookup of existing entries to preserve text-guide fields
    const existingMap = new Map();
    for (const e of existing) existingMap.set(e.testId, e);

    // Merge: overlay video/recording data onto existing text-guide entries
    const merged = new Map();
    for (const e of existing) merged.set(e.testId, { ...e });
    for (const e of this.entries) {
      const prev = merged.get(e.testId) || {};
      merged.set(e.testId, {
        ...prev,
        // Overlay recording-specific fields only
        videoUrl: e.videoUrl || prev.videoUrl,
        screenshotUrl: e.screenshotUrl || prev.screenshotUrl,
        duration: e.duration || prev.duration,
        status: e.status === 'passed' ? 'passed' : (prev.status || e.status),
        recordedAt: e.recordedAt || prev.recordedAt,
        // Keep existing text-guide fields if present
        testId: e.testId,
        title: prev.title || e.title,
        module: prev.module || e.module,
        icon: prev.icon || e.icon,
        color: prev.color || e.color,
        order: prev.order,
        action: prev.action || e.action,
        role: prev.role,
        roleDisplay: prev.roleDisplay,
        tags: prev.tags || [],
        steps: prev.steps || [],
      });
    }

    const allGuides = Array.from(merged.values()).sort((a, b) => a.testId.localeCompare(b.testId));

    // Group by module, respecting order from generate-guide-manifest
    const byModule = {};
    for (const g of allGuides) {
      if (!byModule[g.module]) {
        byModule[g.module] = { module: g.module, icon: g.icon, color: g.color, order: g.order || 99, guides: [] };
      }
      byModule[g.module].guides.push(g);
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      appName: existingMeta.appName || 'SkyrakSys HRM',
      version: existingMeta.version || '1.0.0',
      totalGuides: allGuides.length,
      totalWithVideo: allGuides.filter(g => g.videoUrl).length,
      modules: Object.values(byModule).sort((a, b) => (a.order || 99) - (b.order || 99)),
      guides: allGuides,
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`\n📖  Guide Recorder — finished in ${elapsed}s`);
    console.log(`    ${this.entries.length} workflows recorded`);
    console.log(`    ${this.entries.filter(e => e.videoUrl).length} videos saved`);
    console.log(`    Manifest → ${MANIFEST_PATH}\n`);
  }

  _deriveAction(test, result) {
    const match = test.title.match(/^BW-(\d+):\s*(.+)$/);
    if (!match) return 'unknown';
    const num = match[1];
    const prefix = num.substring(0, 2);

    // Primary: assign by BW-xxx ID range (most reliable)
    const PREFIX_MAP = {
      '01': 'onboarding', '02': 'leaveRequestSubmit', '03': 'leaveLifecycle',
      '04': 'attendanceCheckInOut', '05': 'timesheetWeeklyEntry', '06': 'timesheetOvertime',
      '07': 'payrollPageAndTabs', '08': 'payrollAmountsVerify',
      '09': 'taskViewAndFilter', '10': 'reviewCreate',
      '11': 'orgDeptCRUD', '12': 'userCreateFull',
      '13': 'crossModulePaycheck', '15': 'rbacEmployeeDenied',
      '17': 'sidebarNavAdmin', '18': 'reportAdminView', '19': 'employeeCreateEditDelete',
    };
    return PREFIX_MAP[prefix] || 'unknown';
  }
}

module.exports = GuideReporter;
