const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
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
  }
};
