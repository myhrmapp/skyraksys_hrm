const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
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
  }
};
