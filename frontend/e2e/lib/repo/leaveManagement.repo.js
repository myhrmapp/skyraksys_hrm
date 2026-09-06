const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
  leaveManagement: {
    search:          tid('leave-mgmt-search-input'),
    statusSelect:    tid('leave-mgmt-status-select'),
    typeSelect:      tid('leave-mgmt-type-select'),
    filtersButton:   tid('leave-mgmt-filters-button'),
    requestsTable:   tid('leave-mgmt-requests-table'),
    newRequestBtn:   tid('leave-new-request-button'),
    requestsTableEmp:tid('employee-leave-requests-table'),
  }
};
