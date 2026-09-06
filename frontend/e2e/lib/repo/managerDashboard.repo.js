const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
  managerDashboard: {
    heading:           tid('manager-dashboard-heading'),
    btnApproveLeaves:  tid('manager-btn-approve-leaves'),
    btnApproveTS:      tid('manager-btn-approve-timesheets'),
    btnViewTeam:       tid('manager-btn-view-team'),
    tabsContainer:     tid('manager-tabs'),
    tabTeamMembers:    tid('manager-tab-team-members'),
    tabLeaveApprovals: tid('manager-tab-leave-approvals'),
    tabTSApprovals:    tid('manager-tab-timesheet-approvals'),
  }
};
