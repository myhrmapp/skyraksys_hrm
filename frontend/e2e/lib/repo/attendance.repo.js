const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
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
  }
};
