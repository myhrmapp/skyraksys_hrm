const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
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
  }
};
