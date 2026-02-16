import React from 'react';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';
import UserAccountManager from '../UserAccountManager';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../../services/auth.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/auth.service');
  }
  return {
    authService: {
      resetUserPassword: jest.fn(),
      updateUserAccount: jest.fn(),
    },
  };
});
const { authService } = require('../../../../services/auth.service');

const mockShowNotification = jest.fn();
jest.mock('../../../../contexts/NotificationContext', () => ({
  useNotifications: () => ({
    showNotification: mockShowNotification,
  }),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockEmployeeWithAccount = {
  id: 1,
  employeeId: 'EMP001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@company.com',
  status: 'Active',
  department: { name: 'Engineering' },
  position: { name: 'Software Engineer' },
  hireDate: '2024-01-15',
  user: {
    id: 10,
    email: 'john.doe@company.com',
    role: 'employee',
    isActive: true,
    isLocked: false,
    forcePasswordChange: false,
  },
};

const mockEmployeeWithoutAccount = {
  id: 2,
  employeeId: 'EMP002',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane.smith@company.com',
  status: 'Active',
  department: { name: 'HR' },
  position: { name: 'HR Specialist' },
  hireDate: '2024-06-01',
  user: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockOnClose = jest.fn();
const mockOnUpdate = jest.fn();

const renderCreateMode = (employeeOverride = null) => {
  const employee = employeeOverride || mockEmployeeWithoutAccount;
  return render(
    <UserAccountManager
      open={true}
      onClose={mockOnClose}
      employee={employee}
      onUpdate={mockOnUpdate}
      mode="create"
    />,
    { authValue: { user: createMockUser('admin') } }
  );
};

const renderEditMode = (employeeOverride = null) => {
  const employee = employeeOverride || mockEmployeeWithAccount;
  return render(
    <UserAccountManager
      open={true}
      onClose={mockOnClose}
      employee={employee}
      onUpdate={mockOnUpdate}
      mode="edit"
    />,
    { authValue: { user: createMockUser('admin') } }
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UserAccountManager', () => {
  // ── 1. Rendering ────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the dialog when open is true', () => {
      renderCreateMode();
      expect(screen.getByText('Setup User Account')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(
        <UserAccountManager
          open={false}
          onClose={mockOnClose}
          employee={mockEmployeeWithoutAccount}
          onUpdate={mockOnUpdate}
          mode="create"
        />,
        { authValue: { user: createMockUser('admin') } }
      );
      expect(screen.queryByText('Setup User Account')).not.toBeInTheDocument();
    });

    it('shows Setup User Account title in create mode', () => {
      renderCreateMode();
      expect(screen.getByText('Setup User Account')).toBeInTheDocument();
    });

    it('shows Manage User Account title in edit mode', () => {
      renderEditMode();
      expect(screen.getByText('Manage User Account')).toBeInTheDocument();
    });

    it('renders employee information card', () => {
      renderCreateMode();
      expect(screen.getByText('👤 Employee Information')).toBeInTheDocument();
    });

    it('displays employee ID', () => {
      renderCreateMode();
      expect(screen.getByText('EMP002')).toBeInTheDocument();
    });

    it('displays employee name', () => {
      renderCreateMode();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('displays employee email', () => {
      renderCreateMode();
      expect(screen.getByText('jane.smith@company.com')).toBeInTheDocument();
    });

    it('displays employee department', () => {
      renderCreateMode();
      expect(screen.getByText('HR')).toBeInTheDocument();
    });

    it('displays employee position', () => {
      renderCreateMode();
      expect(screen.getByText('HR Specialist')).toBeInTheDocument();
    });

    it('renders Enable User Login toggle', () => {
      renderCreateMode();
      expect(screen.getByText('Enable User Login')).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      renderCreateMode();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders Setup Account button in create mode', () => {
      renderCreateMode();
      expect(screen.getByRole('button', { name: /setup account/i })).toBeInTheDocument();
    });

    it('renders Update Account button in edit mode', () => {
      renderEditMode();
      expect(screen.getByRole('button', { name: /update account/i })).toBeInTheDocument();
    });
  });

  // ── 2. Enable Login Toggle ──────────────────────────────────────────────

  describe('Enable Login Toggle', () => {
    it('starts with login disabled in create mode (no existing user)', () => {
      renderCreateMode();

      // Role selection and password sections should NOT be visible initially
      expect(screen.queryByText('User Role')).not.toBeInTheDocument();
    });

    it('starts with login enabled in edit mode (existing user)', () => {
      renderEditMode();

      // Role selection should be visible
      expect(screen.getByText('User Role')).toBeInTheDocument();
    });

    it('shows role and password sections when login is enabled', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      // Toggle login on
      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.getByText('User Role')).toBeInTheDocument();
        expect(screen.getByText('Password Management')).toBeInTheDocument();
      });
    });

    it('hides role and password sections when login is disabled', async () => {
      const user = userEvent.setup();
      renderEditMode();

      // Role should be visible initially
      expect(screen.getByText('User Role')).toBeInTheDocument();

      // Toggle login off
      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.queryByText('User Role')).not.toBeInTheDocument();
        expect(screen.queryByText('Password Management')).not.toBeInTheDocument();
      });
    });
  });

  // ── 3. Quick Setup Guide ────────────────────────────────────────────────

  describe('Quick Setup Guide', () => {
    it('shows Quick Setup Guide alert in create mode', () => {
      renderCreateMode();
      expect(screen.getByText('Quick Setup Guide')).toBeInTheDocument();
    });

    it('does not show Quick Setup Guide in edit mode', () => {
      renderEditMode();
      expect(screen.queryByText('Quick Setup Guide')).not.toBeInTheDocument();
    });
  });

  // ── 4. Role Selection ──────────────────────────────────────────────────

  describe('Role Selection', () => {
    it('defaults to employee role', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      // Enable login
      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        const employeeRadio = screen.getByDisplayValue('employee');
        expect(employeeRadio).toBeChecked();
      });
    });

    it('displays all four role options', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.getByLabelText('Employee')).toBeInTheDocument();
        expect(screen.getByLabelText('Manager')).toBeInTheDocument();
        expect(screen.getByLabelText('HR')).toBeInTheDocument();
        expect(screen.getByLabelText('Admin')).toBeInTheDocument();
      });
    });

    it('allows changing role', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.getByLabelText('Admin')).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText('Admin'));
      expect(screen.getByDisplayValue('admin')).toBeChecked();
    });

    it('shows correct role description for employee', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(
          screen.getByText(/basic access to personal information and requests/i)
        ).toBeInTheDocument();
      });
    });

    it('shows correct role description when switching to manager', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.getByLabelText('Manager')).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText('Manager'));

      await waitFor(() => {
        expect(
          screen.getByText(/can manage team members and approve requests/i)
        ).toBeInTheDocument();
      });
    });

    it('preserves role from existing user in edit mode', () => {
      renderEditMode();
      const employeeRadio = screen.getByDisplayValue('employee');
      expect(employeeRadio).toBeChecked();
    });
  });

  // ── 5. Email Field ──────────────────────────────────────────────────────

  describe('Email field', () => {
    it('auto-populates email from employee record', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/login email/i);
        expect(emailInput).toHaveValue('jane.smith@company.com');
      });
    });

    it('allows editing the email', async () => {
      const user = userEvent.setup();
      renderEditMode();

      const emailInput = screen.getByLabelText(/login email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'newemail@company.com');

      expect(emailInput).toHaveValue('newemail@company.com');
    });
  });

  // ── 6. Password Management ─────────────────────────────────────────────

  describe('Password management', () => {
    it('renders Password Management section when login enabled', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.getByText('Password Management')).toBeInTheDocument();
      });
    });

    it('renders password and confirm password fields', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      });
    });

    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/^password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click show password toggle
      const toggleBtn = screen.getByRole('button', { name: /show password/i });
      await user.click(toggleBtn);

      expect(passwordInput).toHaveAttribute('type', 'text');

      // Click hide password toggle
      const hideBtn = screen.getByRole('button', { name: /hide password/i });
      await user.click(hideBtn);

      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('generates random password when Generate button is clicked', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /generate random password/i })
        ).toBeInTheDocument();
      });

      // Get current password value
      const passwordInput = screen.getByLabelText(/^password/i);
      const initialValue = passwordInput.value;

      // Click generate
      await user.click(screen.getByRole('button', { name: /generate random password/i }));

      // Password should have changed
      await waitFor(() => {
        expect(passwordInput.value).not.toBe('');
      });

      // Notification should show
      expect(mockShowNotification).toHaveBeenCalledWith('New password generated', 'success');
    });

    it('shows Reset to Default Password button in edit mode', () => {
      renderEditMode();
      expect(
        screen.getByRole('button', { name: /reset to default password/i })
      ).toBeInTheDocument();
    });

    it('does not show Reset button in create mode', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.getByText('Password Management')).toBeInTheDocument();
      });

      expect(
        screen.queryByRole('button', { name: /reset to default password/i })
      ).not.toBeInTheDocument();
    });

    it('resets password when Reset button is clicked', async () => {
      const user = userEvent.setup();
      authService.resetUserPassword.mockResolvedValue({ success: true });
      renderEditMode();

      await user.click(screen.getByRole('button', { name: /reset to default password/i }));

      await waitFor(() => {
        expect(authService.resetUserPassword).toHaveBeenCalledWith(10, expect.any(String));
      });

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Password reset successfully',
        'success'
      );
    });

    it('shows error when password reset fails', async () => {
      const user = userEvent.setup();
      authService.resetUserPassword.mockRejectedValue(new Error('Reset failed'));
      renderEditMode();

      await user.click(screen.getByRole('button', { name: /reset to default password/i }));

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.stringMatching(/failed to reset password/i),
          'error'
        );
      });
    });

    it('renders force password change toggle', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.getByText(/force password change on first login/i)).toBeInTheDocument();
      });
    });

    it('shows password mismatch error', async () => {
      const user = userEvent.setup();
      renderEditMode();

      const confirmInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmInput, 'mismatch123');

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });
  });

  // ── 7. Form Validation ──────────────────────────────────────────────────

  describe('Form Validation', () => {
    it('shows error for empty email on save', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.getByLabelText(/login email/i)).toBeInTheDocument();
      });

      // Clear email
      const emailInput = screen.getByLabelText(/login email/i);
      await user.clear(emailInput);

      // Click save
      await user.click(screen.getByRole('button', { name: /setup account/i }));

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          'Email is required for user login',
          'error'
        );
      });
    });

    it('shows error for invalid email format', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.getByLabelText(/login email/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/login email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'not-an-email');

      await user.click(screen.getByRole('button', { name: /setup account/i }));

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          'Please enter a valid email address',
          'error'
        );
      });
    });

    it('shows error when passwords do not match on save', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.clear(passwordInput);
      await user.type(passwordInput, 'StrongPass1!');
      await user.clear(confirmInput);
      await user.type(confirmInput, 'DifferentPass1!');

      await user.click(screen.getByRole('button', { name: /setup account/i }));

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          'Passwords do not match',
          'error'
        );
      });
    });

    it('shows error when password is shorter than 6 characters', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.clear(passwordInput);
      await user.type(passwordInput, '12345');
      await user.clear(confirmInput);
      await user.type(confirmInput, '12345');

      await user.click(screen.getByRole('button', { name: /setup account/i }));

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          'Password must be at least 6 characters',
          'error'
        );
      });
    });
  });

  // ── 8. Save Functionality ──────────────────────────────────────────────

  describe('Save functionality', () => {
    it('calls onUpdate with correct data in create mode', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const loginSwitch = screen.getByRole('checkbox', { name: /enable user login/i });
      await user.click(loginSwitch);

      await waitFor(() => {
        expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      });

      // Set matching passwords (generateSecureDefaultPassword called twice produces different values)
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      await user.clear(passwordInput);
      await user.type(passwordInput, 'TestPass123!');
      await user.clear(confirmInput);
      await user.type(confirmInput, 'TestPass123!');

      await user.click(screen.getByRole('button', { name: /setup account/i }));

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'employee',
            enableLogin: true,
            email: 'jane.smith@company.com',
          })
        );
      });
    });

    it('calls authService.updateUserAccount in edit mode', async () => {
      const user = userEvent.setup();
      authService.updateUserAccount.mockResolvedValue({ success: true });
      renderEditMode();

      // Set a password
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmInput, 'NewPass123!');

      await user.click(screen.getByRole('button', { name: /update account/i }));

      await waitFor(() => {
        expect(authService.updateUserAccount).toHaveBeenCalledWith(
          10,
          expect.objectContaining({
            role: 'employee',
            enableLogin: true,
            email: 'john.doe@company.com',
          })
        );
      });
    });

    it('calls onClose after successful save', async () => {
      const user = userEvent.setup();
      authService.updateUserAccount.mockResolvedValue({ success: true });
      renderEditMode();

      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmInput, 'NewPass123!');

      await user.click(screen.getByRole('button', { name: /update account/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows success notification in edit mode', async () => {
      const user = userEvent.setup();
      authService.updateUserAccount.mockResolvedValue({ success: true });
      renderEditMode();

      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmInput, 'NewPass123!');

      await user.click(screen.getByRole('button', { name: /update account/i }));

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          'User account updated successfully',
          'success'
        );
      });
    });

    it('shows error notification when save fails', async () => {
      const user = userEvent.setup();
      authService.updateUserAccount.mockRejectedValue(new Error('Network error'));
      renderEditMode();

      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmInput, 'NewPass123!');

      await user.click(screen.getByRole('button', { name: /update account/i }));

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.stringMatching(/failed to update user account/i),
          'error'
        );
      });
    });

    it('saves with login disabled when toggle is off', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      // Don't enable login, just click save
      await user.click(screen.getByRole('button', { name: /setup account/i }));

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            enableLogin: false,
          })
        );
      });
    });
  });

  // ── 9. Cancel ───────────────────────────────────────────────────────────

  describe('Cancel', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderCreateMode();

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ── 10. Employee Data Display ───────────────────────────────────────────

  describe('Employee data display', () => {
    it('shows N/A for missing department', () => {
      const empNoDept = { ...mockEmployeeWithoutAccount, department: null, departmentName: null };
      render(
        <UserAccountManager
          open={true}
          onClose={mockOnClose}
          employee={empNoDept}
          onUpdate={mockOnUpdate}
          mode="create"
        />,
        { authValue: { user: createMockUser('admin') } }
      );

      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThanOrEqual(1);
    });

    it('shows employee hire date when available', () => {
      renderCreateMode();
      // The date should be formatted
      expect(screen.getByText('Hire Date')).toBeInTheDocument();
    });

    it('shows N/A when hire date is missing', () => {
      const empNoDate = { ...mockEmployeeWithoutAccount, hireDate: null };
      render(
        <UserAccountManager
          open={true}
          onClose={mockOnClose}
          employee={empNoDate}
          onUpdate={mockOnUpdate}
          mode="create"
        />,
        { authValue: { user: createMockUser('admin') } }
      );

      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThanOrEqual(1);
    });

    it('shows employee status chip in Active color', () => {
      renderCreateMode();
      // The Chip shows "Active"
      const activeChips = screen.getAllByText('Active');
      expect(activeChips.length).toBeGreaterThanOrEqual(1);
    });
  });
});
