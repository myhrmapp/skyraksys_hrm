const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
  leave: {
    // Request form
    typeSelect:   tid('leave-type-select'),
    startDate:    tid('leave-start-date'),
    endDate:      tid('leave-end-date'),
    reasonInput:  tid('leave-reason-input'),
    cancelBtn:    tid('leave-cancel-btn'),
    requestsTable: tid('employee-leave-requests-table'),
    newRequestBtn: tid('leave-new-request-button'),
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
  }
};
