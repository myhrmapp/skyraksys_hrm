const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
  login: {
    page:              tid('login-form'),
    errorAlert:        tid('login-error-alert'),
    emailInput:        tid('login-email-input'),
    passwordInput:     tid('login-password-input'),
    togglePassword:    tid('login-toggle-password'),
    submitButton:      tid('login-submit-button'),
    forgotPasswordLink:tid('login-forgot-password-link'),
  }
};
