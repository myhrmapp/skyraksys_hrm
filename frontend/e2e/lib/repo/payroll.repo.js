const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
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
  }
};
