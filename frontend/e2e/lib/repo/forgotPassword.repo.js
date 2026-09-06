const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
  forgotPassword: {
    emailInput:   tid('forgot-password-email'),
    submitButton: tid('forgot-password-submit-btn'),
    backLink:     tid('forgot-password-back-link'),
  }
};
