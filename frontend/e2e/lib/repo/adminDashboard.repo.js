const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
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
  }
};
