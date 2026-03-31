/**
 * Object Repository — Central selector map for all UI elements.
 * Uses data-testid attributes for stability. All selectors are functions
 * that return Playwright-compatible locator strings.
 *
 * Naming: module.element  (e.g., login.emailInput)
 */

const tid = (id) => `[data-testid="${id}"]`;

const selectors = {
  // ─── LOGIN ───────────────────────────────────────────
  login: {
    page:              tid('login-form'),
    errorAlert:        tid('login-error-alert'),
    emailInput:        tid('login-email-input'),
    passwordInput:     tid('login-password-input'),
    togglePassword:    tid('login-toggle-password'),
    submitButton:      tid('login-submit-button'),
    forgotPasswordLink:tid('login-forgot-password-link'),
  },

  forgotPassword: {
    emailInput:   tid('forgot-password-email'),
    submitButton: tid('forgot-password-submit-btn'),
    backLink:     tid('forgot-password-back-link'),
  },

  // ─── LAYOUT / NAVIGATION ────────────────────────────
  layout: {
    drawerToggle:       tid('layout-drawer-toggle'),
    roleChip:           tid('layout-role-chip'),
    notificationsButton:tid('layout-notifications-button'),
    profileMenuTrigger: tid('layout-profile-menu-trigger'),
    menuViewProfile:    tid('layout-menu-view-profile'),
    menuSettings:       tid('layout-menu-settings'),
    menuLogout:         tid('layout-menu-logout'),
    navItem: (path) =>  tid(`nav-${path}`),
  },

  // ─── CONFIRM DIALOG (shared) ────────────────────────
  confirmDialog: {
    confirmButton: tid('confirm-dialog-confirm-btn'),
    cancelButton:  tid('confirm-dialog-cancel-btn'),
  },

  // ─── ADMIN DASHBOARD ────────────────────────────────
  adminDashboard: {
    refreshButton:     tid('admin-dashboard-refresh-btn'),
    errorAlert:        tid('admin-dashboard-error-alert'),
    retryButton:       tid('admin-dashboard-retry-btn'),
    btnAddEmployee:    tid('admin-btn-add-employee'),
    btnLeaveRequests:  tid('admin-btn-leave-requests'),
    btnTimesheets:     tid('admin-btn-timesheets'),
    btnPayroll:        tid('admin-btn-payroll'),
    statTotalEmployees:tid('stat-card-total-employees'),
    statOnLeave:       tid('stat-card-on-leave'),
    statNewHires:      tid('stat-card-new-hires'),
    statPendingLeaves: tid('stat-card-pending-leaves'),
    statSubmittedTS:   tid('stat-card-submitted-timesheets'),
    statDraftTS:       tid('stat-card-draft-timesheets'),
    statApprovedTS:    tid('stat-card-approved-timesheets'),
    statPayroll:       tid('stat-card-payroll'),
  },

  // ─── EMPLOYEE DASHBOARD ─────────────────────────────
  employeeDashboard: {
    heading:            tid('employee-dashboard-heading'),
    errorAlert:         tid('employee-dashboard-error-alert'),
    statPending:        tid('stat-card-pending'),
    statThisMonth:      tid('stat-card-this-month'),
    statLeaveBalance:   tid('stat-card-leave-balance'),
    statUpcomingLeaves: tid('stat-card-upcoming-leaves'),
    actionTimesheet:    tid('quick-action-timesheet'),
    actionLeaveRequest: tid('quick-action-leave-request'),
    actionPayslips:     tid('quick-action-payslips'),
    actionProfile:      tid('quick-action-profile'),
  },

  // ─── MANAGER DASHBOARD ──────────────────────────────
  managerDashboard: {
    heading:           tid('manager-dashboard-heading'),
    btnApproveLeaves:  tid('manager-btn-approve-leaves'),
    btnApproveTS:      tid('manager-btn-approve-timesheets'),
    btnViewTeam:       tid('manager-btn-view-team'),
    tabsContainer:     tid('manager-tabs'),
    tabTeamMembers:    tid('manager-tab-team-members'),
    tabLeaveApprovals: tid('manager-tab-leave-approvals'),
    tabTSApprovals:    tid('manager-tab-timesheet-approvals'),
  },

  // ─── EMPLOYEE MODULE ────────────────────────────────
  employee: {
    // List
    listRetryBtn:    tid('employee-list-retry-btn'),
    listPagination:  tid('employee-list-pagination'),
    listSearch:      tid('employee-list-search'),
    listFilterStatus:tid('employee-list-filter-status'),
    listFilterDept:  tid('employee-list-filter-department'),
    listExportBtn:   tid('employee-list-export-btn'),
    listAddBtn:      tid('employee-list-add-btn'),
    table:           tid('employee-table'),

    // Profile
    profileHeader:   tid('employee-profile-header'),
    profileBackBtn:  tid('employee-profile-back-btn'),
    profileEditBtn:  tid('employee-profile-edit-btn'),
    profileSaveBtn:  tid('employee-profile-save-btn'),
    profileCancelBtn:tid('employee-profile-cancel-btn'),
    profileFooterSaveBtn:   tid('employee-profile-footer-save-btn'),
    profileFooterCancelBtn: tid('employee-profile-footer-cancel-btn'),
    myProfilePage:   tid('my-profile-page'),

    // Form tabs
    tabPersonal:     tid('tab-personal'),
    tabEmployment:   tid('tab-employment'),
    tabEmergency:    tid('tab-emergency'),
    tabStatutory:    tid('tab-statutory'),

    // Form actions
    formPrevBtn:     tid('employee-form-prev-btn'),
    formNextBtn:     tid('employee-form-next-btn'),
    formCancelBtn:   tid('employee-form-cancel-btn'),
    formSubmitBtn:   tid('employee-form-submit-btn'),
    unsavedStayBtn:  tid('unsaved-dialog-stay-btn'),
    unsavedLeaveBtn: tid('unsaved-dialog-leave-btn'),

    // Delete dialog
    deleteCancelBtn:  tid('delete-employee-cancel-btn'),
    deleteConfirmBtn: tid('delete-employee-confirm-btn'),

    // View toggle
    viewToggleList:   tid('employee-list-view-toggle-list'),
    viewToggleCards:  tid('employee-list-view-toggle-cards'),

    // Table row action buttons
    tableViewBtn:     tid('employee-table-view-btn'),
    tableEditBtn:     tid('employee-table-edit-btn'),
    tableCreateLoginBtn: tid('employee-table-create-login-btn'),
    tableManageLoginBtn: tid('employee-table-manage-login-btn'),

    // Card action buttons
    cardViewBtn:      tid('employee-card-view-btn'),
    cardEditBtn:      tid('employee-card-edit-btn'),
    cardDeleteBtn:    tid('employee-card-delete-btn'),
    cardCreateLoginBtn:  tid('employee-card-create-login-btn'),
    cardManageLoginBtn:  tid('employee-card-manage-login-btn'),

    // Create user account dialog
    createUserEmail:     tid('create-user-email'),
    createUserPassword:  tid('create-user-password'),
    createUserCancelBtn: tid('create-user-cancel-btn'),
    createUserSubmitBtn: tid('create-user-submit-btn'),

    // Personal Info fields
    fieldFirstName:   tid('field-firstName'),
    fieldLastName:    tid('field-lastName'),
    fieldEmployeeId:  tid('field-employeeId'),
    fieldEmail:       tid('field-email'),
    fieldPhone:       tid('field-phone'),
    fieldDateOfBirth: tid('field-dateOfBirth'),
    fieldGender:      tid('field-gender'),
    fieldMaritalStatus:tid('field-maritalStatus'),
    fieldNationality: tid('field-nationality'),
    fieldAddress:     tid('field-address'),
    fieldCity:        tid('field-city'),
    fieldState:       tid('field-state'),
    fieldPinCode:     tid('field-pinCode'),

    // Employment Info fields
    fieldHireDate:        tid('field-hireDate'),
    fieldDepartment:      tid('department-select'),
    fieldPosition:        tid('position-select'),
    fieldManager:         tid('manager-select'),
    fieldEmploymentType:  tid('field-employmentType'),
    fieldStatus:          tid('field-status'),
    fieldWorkLocation:    tid('field-workLocation'),
    fieldProbationPeriod: tid('field-probationPeriod'),
    fieldNoticePeriod:    tid('field-noticePeriod'),

    // Emergency Contact
    fieldEmergencyName:  tid('field-emergencyContactName'),
    fieldEmergencyPhone: tid('field-emergencyContactPhone'),

    // Statutory & Banking
    fieldPanNumber:      tid('field-panNumber'),
    fieldAadharNumber:   tid('field-aadharNumber'),
    fieldPfNumber:       tid('field-pfNumber'),
    fieldEsiNumber:      tid('field-esiNumber'),
    fieldUanNumber:      tid('field-uanNumber'),
    fieldBankName:       tid('field-bankName'),
    fieldBankAccount:    tid('field-bankAccountNumber'),
    fieldBankIfsc:       tid('field-bankIfscCode'),
    fieldBankBranch:     tid('field-bankBranch'),

    // List filters (additional)
    listFilterEmploymentType: tid('employee-list-filter-employment-type'),
    listFilterWorkLocation:   tid('employee-list-filter-work-location'),

    // Salary fields
    salaryCurrency:      tid('salary-currency-select'),
    salaryPayFrequency:  tid('salary-payfrequency-select'),

    // Photo upload
    photoUploadBtn:      tid('photo-upload-btn'),

    // Profile payslip button
    profilePayslipBtn:   tid('employee-profile-payslip-btn'),

    // User Account Management page buttons
    userAcctResetPasswordBtn: tid('user-acct-reset-password-btn'),
    userAcctLockBtn:          tid('user-acct-lock-btn'),
    userAcctWelcomeEmailBtn:  tid('user-acct-welcome-email-btn'),
    userAcctForceLogoutBtn:   tid('user-acct-force-logout-btn'),

    // Create user account dialog role dropdown
    createUserRole:      tid('create-user-role'),
  },

  // ─── LEAVE MODULE ───────────────────────────────────
  leave: {
    // Request form
    typeSelect:   tid('leave-type-select'),
    startDate:    tid('leave-start-date'),
    endDate:      tid('leave-end-date'),
    reasonInput:  tid('leave-reason-input'),
    cancelBtn:    tid('leave-cancel-btn'),
    submitBtn:    tid('leave-submit-btn'),

    // Management
    approveBtn:   tid('leave-approve-btn'),
    rejectBtn:    tid('leave-reject-btn'),

    // Balance
    balanceInitBtn:       tid('leave-balance-init-btn'),
    balanceEditBtn:       tid('leave-balance-edit-btn'),
    balanceDeleteBtn:     tid('leave-balance-delete-btn'),
    balanceCreateSubmit:  tid('leave-balance-create-submit-btn'),
    balanceBulkSubmit:    tid('leave-balance-bulk-submit-btn'),

    // Accrual
    accrualPreviewBtn:    tid('leave-accrual-preview-btn'),
    accrualRunBtn:        tid('leave-accrual-run-btn'),
    accrualCarryForward:  tid('leave-accrual-carry-forward-btn'),

    // Leave Type Management
    typeAddBtn:    tid('leave-type-add-btn'),
    typeEditBtn:   tid('leave-type-edit-btn'),
    typeDeleteBtn: tid('leave-type-delete-btn'),
    typeCancelBtn: tid('leave-type-cancel-btn'),
    typeSaveBtn:   tid('leave-type-save-btn'),
  },

  // ─── TIMESHEET MODULE ──────────────────────────────
  timesheet: {
    // Hub
    hub:                tid('timesheet-hub-page'),

    // Week Navigation
    prevWeek:           tid('timesheet-prev-week'),
    nextWeek:           tid('timesheet-next-week'),
    todayBtn:           tid('timesheet-today-button'),

    // Weekly Entry Grid
    entryTable:         tid('timesheet-entry-table'),
    addTask:            tid('timesheet-add-task'),
    saveDraft:          tid('timesheet-save-draft'),
    submitBtn:          tid('timesheet-submit'),

    // Approval Tab
    approvalSearch:     tid('ts-approval-search-input'),
    approvalStatusSelect: tid('ts-approval-status-select'),
    approvalProjectSelect: tid('ts-approval-project-select'),
    approvalStartDate:  tid('ts-approval-start-date'),
    approvalEndDate:    tid('ts-approval-end-date'),

    // History Tab
    historyFilterToggle: tid('ts-history-filter-toggle'),
    historyExport:      tid('ts-history-export'),
    historyStatusSelect: tid('ts-history-status-select'),
    historyStartDate:   tid('ts-history-start-date'),
    historyEndDate:     tid('ts-history-end-date'),
  },

  // ─── ATTENDANCE MODULE ──────────────────────────────
  attendance: {
    // My Attendance
    myPage:         tid('my-attendance-page'),
    statusChip:     tid('attendance-status-chip'),
    checkInBtn:     tid('attendance-checkin-btn'),
    checkOutBtn:    tid('attendance-checkout-btn'),
    monthSelect:    tid('attendance-month-select'),
    yearSelect:     tid('attendance-year-select'),

    // Attendance Management
    managementPage: tid('attendance-management-page'),
    markBtn:        tid('attendance-mark-btn'),
    dateFilter:     tid('attendance-date-filter'),
    dataGrid:       tid('attendance-data-grid'),
    markSaveBtn:    tid('attendance-mark-save-btn'),
  },

  // ─── PAYROLL MODULE ─────────────────────────────────
  payroll: {
    // Admin Payroll Management
    managementPage:    tid('payroll-management-page'),
    tabs:              tid('payroll-tabs'),
    generateBtn:       tid('payroll-generate-btn'),
    exportBtn:         tid('payroll-export-btn'),
    refreshBtn:        tid('payroll-refresh-btn'),
    search:            tid('payroll-search'),
    bulkFinalizeBtn:   tid('payroll-bulk-finalize-btn'),
    bulkPaidBtn:       tid('payroll-bulk-paid-btn'),
    bulkDeleteBtn:     tid('payroll-bulk-delete-btn'),
    validateGenerateBtn:tid('payroll-validate-generate-btn'),

    // Employee Payslips
    employeePage:      tid('employee-payslips-page'),
    backBtn:           tid('payslips-back-btn'),
    yearFilter:        tid('payslips-year-filter'),
    viewBtn:           tid('payslip-view-btn'),
    downloadBtn:       tid('payslip-download-btn'),

    // Edit Payslip Dialog
    editSaveBtn:       tid('edit-payslip-save-btn'),
    editReason:        tid('edit-payslip-reason'),

    // Payslip Template Configuration
    templatePage:      tid('payslip-template-config-page'),
    templateCreateBtn: tid('payslip-template-create-btn'),
  },

  // ─── TASKS MODULE ───────────────────────────────────
  tasks: {
    page:            tid('my-tasks-page'),
    search:          tid('tasks-search'),
    statusFilter:    tid('tasks-status-filter'),
    priorityFilter:  tid('tasks-priority-filter'),
  },

  // ─── PROJECTS & TASKS ADMIN ─────────────────────────
  projectTaskConfig: {
    page:            tid('project-task-config-page'),
    tabProjects:     tid('ptc-tab-projects'),
    tabTasks:        tid('ptc-tab-tasks'),
    search:          tid('ptc-search-input'),
    addProjectBtn:   tid('ptc-add-project-btn'),
    addTaskBtn:      tid('ptc-add-task-btn'),
    // Project form
    projectName:     tid('project-name-input'),
    projectDesc:     tid('project-description-input'),
    projectStartDate:tid('project-start-date'),
    projectEndDate:  tid('project-end-date'),
    projectStatus:   tid('project-status-select'),
    projectClient:   tid('project-client-name-input'),
    projectManager:  tid('project-manager-select'),
    projectCancel:   tid('project-cancel-button'),
    projectSave:     tid('project-save-button'),
  },

  // ─── LEAVE MANAGEMENT (Admin/HR/Manager) ────────────
  leaveManagement: {
    search:          tid('leave-mgmt-search-input'),
    statusSelect:    tid('leave-mgmt-status-select'),
    typeSelect:      tid('leave-mgmt-type-select'),
    filtersButton:   tid('leave-mgmt-filters-button'),
    requestsTable:   tid('leave-mgmt-requests-table'),
    newRequestBtn:   tid('leave-new-request-button'),
    requestsTableEmp:tid('employee-leave-requests-table'),
  },

  // ─── LEAVE BALANCE ──────────────────────────────────
  leaveBalance: {
    searchInput:     tid('leave-search-input'),
    yearSelect:      tid('leave-year-select'),
    employeeSelect:  tid('leave-employee-select'),
    typeFilterSelect:tid('leave-type-filter-select'),
    bulkSubmitBtn:   tid('leave-balance-bulk-submit-btn'),
    createEmployeeSelect: tid('create-leave-employee-select'),
    createTypeSelect:tid('create-leave-type-select'),
    createYearInput: tid('create-leave-year-input'),
    createAccruedInput: tid('create-leave-accrued-input'),
    createCarryForward: tid('create-leave-carryforward-input'),
    createSubmitBtn: tid('leave-balance-create-submit-btn'),
  },

  // ─── REVIEWS MODULE ─────────────────────────────────
  reviews: {
    page:            tid('reviews-page'),
    newBtn:          tid('reviews-new-btn'),
    search:          tid('reviews-search'),
    statusFilter:    tid('reviews-status-filter'),
    typeFilter:      tid('reviews-type-filter'),
    createSubmitBtn: tid('reviews-create-submit-btn'),
    editSaveBtn:     tid('reviews-edit-save-btn'),
    deleteConfirmBtn:tid('reviews-delete-confirm-btn'),
  },

  // ─── ORGANIZATION / ADMIN ──────────────────────────
  department: {
    page:       tid('department-management-page'),
    search:     tid('dept-search'),
    addBtn:     tid('dept-add-btn'),
    editBtn:    tid('dept-edit-btn'),
    deleteBtn:  tid('dept-delete-btn'),
    saveBtn:    tid('dept-save-btn'),
  },

  position: {
    page:       tid('position-management-page'),
    addBtn:     tid('position-add-btn'),
    editBtn:    tid('position-edit-btn'),
    deleteBtn:  tid('position-delete-btn'),
    saveBtn:    tid('position-save-btn'),
  },

  holiday: {
    page:       tid('holiday-calendar-page'),
    addBtn:     tid('holiday-add-btn'),
    yearSelect: tid('holiday-year-select'),
    deleteBtn:  tid('holiday-delete-btn'),
    saveBtn:    tid('holiday-save-btn'),
  },

  orgSettings: {
    page: tid('organization-settings-page'),
  },

  userManagement: {
    page:             tid('user-management-page'),
    tabCreate:        tid('usermgmt-tab-create'),
    tabManage:        tid('usermgmt-tab-manage'),
    emailInput:       tid('usermgmt-email-input'),
    firstNameInput:   tid('usermgmt-firstname-input'),
    lastNameInput:    tid('usermgmt-lastname-input'),
    roleSelect:       tid('usermgmt-role-select'),
    passwordInput:    tid('usermgmt-password-input'),
    confirmPassInput: tid('usermgmt-confirm-password-input'),
    submitBtn:        tid('usermgmt-submit-btn'),
    searchInput:      tid('usermgmt-search-input'),
    roleFilter:       tid('usermgmt-role-filter'),
    statusFilter:     tid('usermgmt-status-filter'),
  },
};

module.exports = selectors;
