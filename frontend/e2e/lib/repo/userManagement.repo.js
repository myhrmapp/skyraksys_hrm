const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
  userManagement: {
    page:             tid('user-management-page'),
    tabCreate:        tid('usermgmt-tab-create'),
    tabManage:        tid('usermgmt-tab-manage'),
    emailInput:       tid('usermgmt-email-input'),
    firstNameInput:   tid('usermgmt-firstname-input'),
    lastNameInput:    tid('usermgmt-lastname-input'),
    roleSelect:       tid('usermgmt-role-select'),
    passwordInput:    tid('usermgmt-password-input'),
    confirmPassInput: tid('usermgmt-confirm-password-input'),
    submitBtn:        tid('usermgmt-submit-btn'),
    searchInput:      tid('usermgmt-search-input'),
    roleFilter:       tid('usermgmt-role-filter'),
    statusFilter:     tid('usermgmt-status-filter'),
  }
};
