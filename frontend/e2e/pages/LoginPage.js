/**
 * Login Page Object Model
 */
const selectors = require('../lib/object-repository');

class LoginPage {
  constructor(page) {
    this.page = page;
    this.s = selectors.login;
  }

  async goto() {
    await this.page.goto('/login');
  }

  async fillEmail(email) {
    await this.page.locator(`${this.s.emailInput} input`).fill(email);
  }

  async fillPassword(password) {
    await this.page.locator(`${this.s.passwordInput} input`).fill(password);
  }

  async submit() {
    await this.page.locator(this.s.submitButton).click();
  }

  async login(email, password) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async getErrorMessage() {
    const alert = this.page.locator(this.s.errorAlert);
    if (await alert.isVisible({ timeout: 3000 }).catch(() => false)) {
      return alert.textContent();
    }
    return null;
  }

  async isOnLoginPage() {
    return this.page.url().includes('/login');
  }

  async togglePasswordVisibility() {
    await this.page.locator(this.s.togglePassword).click();
  }

  async clickForgotPassword() {
    await this.page.locator(this.s.forgotPasswordLink).click();
  }
}

module.exports = LoginPage;
