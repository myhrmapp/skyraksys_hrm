const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
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
  }
};
