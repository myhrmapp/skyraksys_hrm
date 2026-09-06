const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
  department: {
    page: tid('dept-search'), // or whatever the page identifier is
    search: tid('dept-search'),
    addBtn: tid('dept-add-btn'),
    editBtn: tid('dept-edit-btn'),
    deleteBtn: tid('dept-delete-btn'),
    saveBtn: tid('dept-save-btn')
  },
  position: {
    page: tid('position-management-page'),
    addBtn: tid('position-add-btn'),
    editBtn: tid('position-edit-btn'),
    deleteBtn: tid('position-delete-btn'),
    saveBtn: tid('position-save-btn')
  },
  holiday: {
    page: tid('holiday-calendar-page'),
    addBtn: tid('holiday-add-btn'),
    deleteBtn: tid('holiday-delete-btn'),
    saveBtn: tid('holiday-save-btn')
  }
};
