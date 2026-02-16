/**
 * UserAccountTab.test.js
 *
 * Comprehensive tests for UserAccountTab component.
 * Tests conditional rendering (enableLogin switch), role select (4 options),
 * forcePasswordChange checkbox, password/confirmPassword fields,
 * and email Alert display.
 */
import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render } from '../../../../../test-utils/testUtils';
import UserAccountTab from '../UserAccountTab';

const createFormData = (overrides = {}) => ({
  email: 'test@skyraksys.com',
  id: null,
  userAccount: {
    enableLogin: false,
    role: 'employee',
    password: '',
    confirmPassword: '',
    forcePasswordChange: true,
    ...(overrides.userAccount || {}),
  },
  ...overrides,
});

const createProps = (overrides = {}) => ({
  formData: createFormData(overrides.formData),
  errors: overrides.errors || {},
  touchedFields: overrides.touchedFields || {},
  onChange: overrides.onChange || jest.fn(),
  onBlur: overrides.onBlur || jest.fn(),
});

const renderTab = (overrides = {}) => {
  const props = createProps(overrides);
  return { ...render(<UserAccountTab {...props} />), props };
};

describe('UserAccountTab', () => {
  // ─── Section Headings ──────────────────────────────────

  describe('Section Headings', () => {
    it('should render User Account Settings heading', () => {
      renderTab();
      expect(screen.getByText('User Account Settings')).toBeInTheDocument();
    });

    it('should render configuration description', () => {
      renderTab();
      expect(screen.getByText(/configure system access and permissions/i)).toBeInTheDocument();
    });
  });

  // ─── Enable Login Switch ──────────────────────────────

  describe('Enable Login Switch', () => {
    it('should render Enable User Login switch', () => {
      renderTab();
      expect(screen.getByText('Enable User Login')).toBeInTheDocument();
    });

    it('should show description about logging in', () => {
      renderTab();
      expect(screen.getByText(/allow this employee to log in/i)).toBeInTheDocument();
    });

    it('should be unchecked by default', () => {
      renderTab();
      const switchInput = screen.getByRole('checkbox', { name: /enable user login/i });
      expect(switchInput).not.toBeChecked();
    });

    it('should call onChange when toggled on', async () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      const switchInput = screen.getByRole('checkbox', { name: /enable user login/i });
      await userEvent.setup().click(switchInput);
      expect(onChange).toHaveBeenCalledWith('userAccount.enableLogin', true);
    });
  });

  // ─── Conditional Rendering - Hidden when login disabled ─

  describe('Conditional Rendering - Login Disabled', () => {
    it('should NOT show role select when login disabled', () => {
      renderTab();
      expect(screen.queryByLabelText(/system role/i)).not.toBeInTheDocument();
    });

    it('should NOT show password field when login disabled', () => {
      renderTab();
      expect(screen.queryByLabelText(/^password/i)).not.toBeInTheDocument();
    });

    it('should NOT show confirm password field when login disabled', () => {
      renderTab();
      expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument();
    });

    it('should NOT show force password change checkbox when login disabled', () => {
      renderTab();
      expect(screen.queryByText(/require password change/i)).not.toBeInTheDocument();
    });

    it('should NOT show email Alert when login disabled', () => {
      renderTab();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // ─── Conditional Rendering - Shown when login enabled ──

  describe('Conditional Rendering - Login Enabled', () => {
    const enabledOverrides = { formData: { userAccount: { enableLogin: true } } };

    it('should show role select when login enabled', () => {
      renderTab(enabledOverrides);
      expect(document.getElementById('role')).toBeInTheDocument();
    });

    it('should show password field when login enabled', () => {
      renderTab(enabledOverrides);
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    });

    it('should show confirm password field when login enabled', () => {
      renderTab(enabledOverrides);
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('should show force password change checkbox when login enabled', () => {
      renderTab(enabledOverrides);
      expect(screen.getByText(/require password change on first login/i)).toBeInTheDocument();
    });

    it('should show email Alert with employee email', () => {
      renderTab(enabledOverrides);
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('test@skyraksys.com');
    });

    it('should show "not provided" when email is empty', () => {
      renderTab({
        formData: { email: '', userAccount: { enableLogin: true } },
      });
      expect(screen.getByRole('alert')).toHaveTextContent('not provided');
    });
  });

  // ─── Role Select ──────────────────────────────────────

  describe('Role Select', () => {
    const enabledOverrides = { formData: { userAccount: { enableLogin: true, role: 'employee' } } };

    it('should have Employee, Manager, HR, Admin options', async () => {
      renderTab(enabledOverrides);
      fireEvent.mouseDown(document.getElementById('role'));
      const listbox = await screen.findByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      const texts = options.map(o => o.textContent);
      expect(texts).toContain('Employee (Standard Access)');
      expect(texts).toContain('Manager (Team Access)');
      expect(texts).toContain('HR (Human Resources)');
      expect(texts).toContain('System Admin (Full System Access)');
      expect(options).toHaveLength(4);
    });

    it('should default to employee', () => {
      renderTab(enabledOverrides);
      expect(screen.getByText('Employee (Standard Access)')).toBeInTheDocument();
    });

    it('should call onChange when role changed', async () => {
      const onChange = jest.fn();
      renderTab({ ...enabledOverrides, onChange });
      fireEvent.mouseDown(document.getElementById('role'));
      const listbox = await screen.findByRole('listbox');
      fireEvent.click(within(listbox).getByText('Manager (Team Access)'));
      expect(onChange).toHaveBeenCalledWith('userAccount.role', 'manager');
    });

    it('should show error when error exists', () => {
      renderTab({
        ...enabledOverrides,
        errors: { 'userAccount.role': 'Please select a valid user role' },
      });
      expect(screen.getByText('Please select a valid user role')).toBeInTheDocument();
    });
  });

  // ─── Force Password Change ────────────────────────────

  describe('Force Password Change Checkbox', () => {
    it('should be checked by default', () => {
      renderTab({ formData: { userAccount: { enableLogin: true, forcePasswordChange: true } } });
      const checkbox = screen.getByRole('checkbox', { name: /require password change/i });
      expect(checkbox).toBeChecked();
    });

    it('should call onChange when toggled', async () => {
      const onChange = jest.fn();
      renderTab({
        formData: { userAccount: { enableLogin: true, forcePasswordChange: true } },
        onChange,
      });
      const checkbox = screen.getByRole('checkbox', { name: /require password change/i });
      await userEvent.setup().click(checkbox);
      expect(onChange).toHaveBeenCalledWith('userAccount.forcePasswordChange', false);
    });
  });

  // ─── Password Fields ─────────────────────────────────

  describe('Password Field', () => {
    const enabledOverrides = { formData: { userAccount: { enableLogin: true } } };

    it('should render password field with type password', () => {
      renderTab(enabledOverrides);
      const pwField = screen.getByLabelText(/^password/i);
      expect(pwField).toHaveAttribute('type', 'password');
    });

    it('should show helper text about minimum length', () => {
      renderTab(enabledOverrides);
      expect(screen.getByText('Minimum 6 characters')).toBeInTheDocument();
    });

    it('should call onChange when typed', () => {
      const onChange = jest.fn();
      renderTab({ ...enabledOverrides, onChange });
      fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Test@123' } });
      expect(onChange).toHaveBeenCalledWith('userAccount.password', 'Test@123');
    });

    it('should show error when error exists', () => {
      renderTab({
        ...enabledOverrides,
        errors: { 'userAccount.password': 'Password must be at least 6 characters' },
      });
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });

    it('should be required for new users (no id)', () => {
      renderTab({ formData: { id: null, userAccount: { enableLogin: true } } });
      const pwField = screen.getByLabelText(/^password/i);
      expect(pwField).toBeRequired();
    });

    it('should not be required for existing users (has id)', () => {
      renderTab({ formData: { id: 'existing-id', userAccount: { enableLogin: true } } });
      const pwField = screen.getByLabelText(/^password/i);
      expect(pwField).not.toBeRequired();
    });
  });

  describe('Confirm Password Field', () => {
    const enabledOverrides = { formData: { userAccount: { enableLogin: true } } };

    it('should render confirm password field', () => {
      renderTab(enabledOverrides);
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('should be type password', () => {
      renderTab(enabledOverrides);
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('type', 'password');
    });

    it('should call onChange when typed', () => {
      const onChange = jest.fn();
      renderTab({ ...enabledOverrides, onChange });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Test@123' } });
      expect(onChange).toHaveBeenCalledWith('userAccount.confirmPassword', 'Test@123');
    });

    it('should show mismatch error', () => {
      renderTab({
        ...enabledOverrides,
        errors: { 'userAccount.confirmPassword': 'Passwords do not match' },
      });
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  // ─── Happy Path ───────────────────────────────────────

  describe('Happy Path - Login enabled with all fields', () => {
    it('should render complete user account setup', () => {
      renderTab({
        formData: {
          email: 'rahul@skyraksys.com',
          id: null,
          userAccount: {
            enableLogin: true,
            role: 'manager',
            password: 'SecureP@ss1',
            confirmPassword: 'SecureP@ss1',
            forcePasswordChange: true,
          },
        },
      });

      // Switch should be on
      expect(screen.getByRole('checkbox', { name: /enable user login/i })).toBeChecked();
      // Alert should show email
      expect(screen.getByRole('alert')).toHaveTextContent('rahul@skyraksys.com');
      // Role should show Manager
      expect(screen.getByText('Manager (Team Access)')).toBeInTheDocument();
      // Force password change should be checked
      expect(screen.getByRole('checkbox', { name: /require password change/i })).toBeChecked();
      // Password fields should exist
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });
  });
});
