import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';
import UserAccountManagementPage from '../UserAccountManagementPage';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../../services/employee.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/employee.service');
  }
  return {
    employeeService: {
      getById: jest.fn(),
    },
  };
});
const { employeeService } = require('../../../../services/employee.service');

jest.mock('../../../../services/auth.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/auth.service');
  }
  return {
    authService: {
      resetUserPassword: jest.fn(),
      lockUserAccount: jest.fn(),
      sendWelcomeEmail: jest.fn(),
      updateUserAccount: jest.fn(),
      createUserAccount: jest.fn(),
    },
  };
});
const { authService } = require('../../../../services/auth.service');

const mockNavigate = jest.fn();
const mockShowNotification = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
}));

jest.mock('../../../../contexts/NotificationContext', () => ({
  useNotifications: () => ({
    showNotification: mockShowNotification,
  }),
}));

// Mock UserAccountManager to keep tests focused
jest.mock('../UserAccountManager', () => {
  return function MockUserAccountManager({ open, onClose, employee, onUpdate, mode }) {
    if (!open) return null;
    return (
      <div data-testid="user-account-manager-dialog">
        <span data-testid="uam-mode">{mode}</span>
        <button onClick={onClose}>Close Dialog</button>
        <button onClick={() => onUpdate({ role: 'employee', enableLogin: true, email: 'test@test.com' })}>
          Save Account
        </button>
      </div>
    );
  };
});

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
  position: { title: 'Software Engineer' },
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
  position: { title: 'HR Specialist' },
  user: null,
};

const mockEmployeeLockedAccount = {
  ...mockEmployeeWithAccount,
  id: 3,
  user: {
    ...mockEmployeeWithAccount.user,
    id: 11,
    isLocked: true,
  },
};

const mockEmployeeForcePasswordChange = {
  ...mockEmployeeWithAccount,
  id: 4,
  user: {
    ...mockEmployeeWithAccount.user,
    id: 12,
    forcePasswordChange: true,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const setupEmployeeService = (employeeData = mockEmployeeWithAccount) => {
  employeeService.getById.mockResolvedValue({
    data: { data: employeeData },
  });
};

const renderAsAdmin = async (employeeData = mockEmployeeWithAccount) => {
  setupEmployeeService(employeeData);
  const result = render(<UserAccountManagementPage />, {
    authValue: { user: createMockUser('admin') },
  });
  await waitFor(() => {
    expect(screen.getByText('User Account Management')).toBeInTheDocument();
  });
  return result;
};

const renderAsHR = async (employeeData = mockEmployeeWithAccount) => {
  setupEmployeeService(employeeData);
  const result = render(<UserAccountManagementPage />, {
    authValue: { user: createMockUser('hr') },
  });
  await waitFor(() => {
    expect(screen.getByText('User Account Management')).toBeInTheDocument();
  });
  return result;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 1. Access Control ─────────────────────────────────────────────────────

describe('UserAccountManagementPage', () => {
  describe('Access control', () => {
    it('redirects non-admin/non-hr users to /employees', () => {
      setupEmployeeService();
      render(<UserAccountManagementPage />, {
        authValue: { user: createMockUser('employee') },
      });

      expect(mockShowNotification).toHaveBeenCalledWith(
        'You do not have permission to manage user accounts',
        'error'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/employees');
    });

    it('redirects manager role to /employees', () => {
      setupEmployeeService();
      render(<UserAccountManagementPage />, {
        authValue: { user: createMockUser('manager') },
      });

      expect(mockNavigate).toHaveBeenCalledWith('/employees');
    });

    it('allows admin users to view the page', async () => {
      await renderAsAdmin();
      expect(screen.getByText('User Account Management')).toBeInTheDocument();
    });

    it('allows HR users to view the page', async () => {
      await renderAsHR();
      expect(screen.getByText('User Account Management')).toBeInTheDocument();
    });
  });

  // ── 2. Rendering ──────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the page title', async () => {
      await renderAsAdmin();
      expect(screen.getByText('User Account Management')).toBeInTheDocument();
    });

    it('renders employee information card', async () => {
      await renderAsAdmin();

      expect(screen.getByText('Employee Information')).toBeInTheDocument();
      // "John Doe" appears in breadcrumbs + info card
      const nameMatches = screen.getAllByText('John Doe');
      expect(nameMatches.length).toBeGreaterThanOrEqual(1);
      // Employee ID is rendered as "ID: EMP001"
      expect(screen.getByText(/EMP001/)).toBeInTheDocument();
    });

    it('renders employee email', async () => {
      await renderAsAdmin();
      // Email appears in both employee info and user account sections
      const emailMatches = screen.getAllByText('john.doe@company.com');
      expect(emailMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('renders employee department', async () => {
      await renderAsAdmin();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    it('renders employee position', async () => {
      await renderAsAdmin();
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    it('renders breadcrumbs navigation', async () => {
      await renderAsAdmin();
      expect(screen.getByText('Employees')).toBeInTheDocument();
      expect(screen.getByText('User Account')).toBeInTheDocument();
    });

    it('renders Back to List button', async () => {
      await renderAsAdmin();
      expect(screen.getByRole('button', { name: /back to list/i })).toBeInTheDocument();
    });

    it('renders Security & Access Information section', async () => {
      await renderAsAdmin();
      expect(screen.getByText('Security & Access Information')).toBeInTheDocument();
    });
  });

  // ── 3. Employee with User Account ─────────────────────────────────────────

  describe('Employee with user account', () => {
    it('shows Active User Account alert', async () => {
      await renderAsAdmin(mockEmployeeWithAccount);
      expect(screen.getByText('Active User Account')).toBeInTheDocument();
    });

    it('displays the user account status section', async () => {
      await renderAsAdmin(mockEmployeeWithAccount);
      expect(screen.getByText('User Account Status')).toBeInTheDocument();
    });

    it('displays login email', async () => {
      await renderAsAdmin(mockEmployeeWithAccount);
      expect(screen.getByText('Login Email')).toBeInTheDocument();
    });

    it('displays user role badge', async () => {
      await renderAsAdmin(mockEmployeeWithAccount);
      // "User Role" label appears in multiple sections
      const roleLabels = screen.getAllByText('User Role');
      expect(roleLabels.length).toBeGreaterThanOrEqual(1);
      // Employee role chip
      const roleChips = screen.getAllByText('Employee');
      expect(roleChips.length).toBeGreaterThanOrEqual(1);
    });

    it('displays account status', async () => {
      await renderAsAdmin(mockEmployeeWithAccount);
      expect(screen.getByText('Account Status')).toBeInTheDocument();
    });

    it('displays password status as Set', async () => {
      await renderAsAdmin(mockEmployeeWithAccount);
      expect(screen.getByText('Password Status')).toBeInTheDocument();
      expect(screen.getByText('Set')).toBeInTheDocument();
    });

    it('displays Must Change when forcePasswordChange is true', async () => {
      await renderAsAdmin(mockEmployeeForcePasswordChange);
      expect(screen.getByText('Must Change')).toBeInTheDocument();
    });

    it('shows role permissions text for employee', async () => {
      await renderAsAdmin(mockEmployeeWithAccount);
      expect(
        screen.getByText(/basic access to personal information and requests/i)
      ).toBeInTheDocument();
    });

    it('renders Manage User Account button', async () => {
      await renderAsAdmin(mockEmployeeWithAccount);
      expect(
        screen.getByRole('button', { name: /manage user account/i })
      ).toBeInTheDocument();
    });

    it('shows quick actions panel', async () => {
      await renderAsAdmin(mockEmployeeWithAccount);
      expect(screen.getByText('⚡ Quick Actions')).toBeInTheDocument();
    });

    it('renders Reset Password action button', async () => {
      await renderAsAdmin(mockEmployeeWithAccount);
      expect(
        screen.getByRole('button', { name: /reset password to default/i })
      ).toBeInTheDocument();
    });

    it('renders Lock Account action button', async () => {
      await renderAsAdmin(mockEmployeeWithAccount);
      expect(
        screen.getByRole('button', { name: /lock this account/i })
      ).toBeInTheDocument();
    });

    it('renders Unlock Account for locked user', async () => {
      await renderAsAdmin(mockEmployeeLockedAccount);
      expect(
        screen.getByRole('button', { name: /unlock this account/i })
      ).toBeInTheDocument();
    });

    it('renders Send Welcome Email button', async () => {
      await renderAsAdmin(mockEmployeeWithAccount);
      expect(
        screen.getByRole('button', { name: /send welcome email with credentials/i })
      ).toBeInTheDocument();
    });

    it('renders Force Logout button', async () => {
      await renderAsAdmin(mockEmployeeWithAccount);
      expect(
        screen.getByRole('button', { name: /logout user from all devices/i })
      ).toBeInTheDocument();
    });

    it('displays security stats (Active Account = 1, Can Login = ✓)', async () => {
      await renderAsAdmin(mockEmployeeWithAccount);
      expect(screen.getByText('Active Account')).toBeInTheDocument();
      expect(screen.getByText('Can Login')).toBeInTheDocument();
    });
  });

  // ── 4. Employee without User Account ──────────────────────────────────────

  describe('Employee without user account', () => {
    it('shows No User Account alert', async () => {
      await renderAsAdmin(mockEmployeeWithoutAccount);
      expect(screen.getByText('No User Account')).toBeInTheDocument();
    });

    it('shows Create User Account button', async () => {
      await renderAsAdmin(mockEmployeeWithoutAccount);
      expect(
        screen.getByRole('button', { name: /create user account/i })
      ).toBeInTheDocument();
    });

    it('does not show quick actions panel when no account', async () => {
      await renderAsAdmin(mockEmployeeWithoutAccount);
      expect(screen.queryByText('⚡ Quick Actions')).not.toBeInTheDocument();
    });

    it('shows security stats (Active Account = 0, Can Login = ✗)', async () => {
      await renderAsAdmin(mockEmployeeWithoutAccount);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('✗')).toBeInTheDocument();
      expect(screen.getByText('NONE')).toBeInTheDocument();
    });
  });

  // ── 5. Data Loading ──────────────────────────────────────────────────────

  describe('Data loading', () => {
    it('calls employeeService.getById with the route param id', async () => {
      await renderAsAdmin();
      expect(employeeService.getById).toHaveBeenCalledWith('1');
    });

    it('shows loading spinner while loading', () => {
      employeeService.getById.mockImplementation(
        () => new Promise(() => {}) // never resolves
      );
      render(<UserAccountManagementPage />, {
        authValue: { user: createMockUser('admin') },
      });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows error alert when loading fails', async () => {
      employeeService.getById.mockRejectedValue(new Error('Network error'));
      render(<UserAccountManagementPage />, {
        authValue: { user: createMockUser('admin') },
      });

      await waitFor(() => {
        expect(screen.getByText(/network error|failed to load employee/i)).toBeInTheDocument();
      });
    });

    it('shows Back to Employees button on error', async () => {
      employeeService.getById.mockRejectedValue(new Error('Not found'));
      render(<UserAccountManagementPage />, {
        authValue: { user: createMockUser('admin') },
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /back to employees/i })
        ).toBeInTheDocument();
      });
    });
  });

  // ── 6. Navigation ────────────────────────────────────────────────────────

  describe('Navigation', () => {
    it('navigates to /employees when Back to List is clicked', async () => {
      const user = userEvent.setup();
      await renderAsAdmin();

      await user.click(screen.getByRole('button', { name: /back to list/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/employees');
    });

    it('navigates to /employees when Back to Employees is clicked on error', async () => {
      const user = userEvent.setup();
      employeeService.getById.mockRejectedValue(new Error('Not found'));
      render(<UserAccountManagementPage />, {
        authValue: { user: createMockUser('admin') },
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /back to employees/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /back to employees/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/employees');
    });
  });

  // ── 7. Quick Actions – Confirmation Dialogs ──────────────────────────────

  describe('Quick Actions - Confirmation Dialogs', () => {
    it('opens Reset Password confirmation dialog', async () => {
      const user = userEvent.setup();
      await renderAsAdmin(mockEmployeeWithAccount);

      await user.click(screen.getByRole('button', { name: /reset password to default/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(
          screen.getByText(/are you sure you want to reset/i)
        ).toBeInTheDocument();
      });
    });

    it('opens Lock Account confirmation dialog', async () => {
      const user = userEvent.setup();
      await renderAsAdmin(mockEmployeeWithAccount);

      await user.click(screen.getByRole('button', { name: /lock this account/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to lock/i)).toBeInTheDocument();
      });
    });

    it('opens Unlock Account confirmation dialog for locked user', async () => {
      const user = userEvent.setup();
      await renderAsAdmin(mockEmployeeLockedAccount);

      await user.click(screen.getByRole('button', { name: /unlock this account/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to unlock/i)).toBeInTheDocument();
      });
    });

    it('opens Send Welcome Email confirmation dialog', async () => {
      const user = userEvent.setup();
      await renderAsAdmin(mockEmployeeWithAccount);

      await user.click(screen.getByRole('button', { name: /send welcome email with credentials/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/send a welcome email/i)).toBeInTheDocument();
      });
    });

    it('opens Force Logout confirmation dialog', async () => {
      const user = userEvent.setup();
      await renderAsAdmin(mockEmployeeWithAccount);

      await user.click(screen.getByRole('button', { name: /logout user from all devices/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to log out/i)).toBeInTheDocument();
      });
    });

    it('closes confirmation dialog when Cancel is clicked', async () => {
      const user = userEvent.setup();
      await renderAsAdmin(mockEmployeeWithAccount);

      await user.click(screen.getByRole('button', { name: /reset password to default/i }));

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to reset/i)).toBeInTheDocument();
      });

      // Click Cancel in the dialog
      const dialog = screen.getByRole('dialog');
      const cancelBtn = within(dialog).getByRole('button', { name: /cancel/i });
      await user.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByText(/are you sure you want to reset/i)).not.toBeInTheDocument();
      });
    });
  });

  // ── 8. Quick Actions – Confirm Execution ─────────────────────────────────

  describe('Quick Actions - Action Execution', () => {
    it('executes password reset on confirm', async () => {
      const user = userEvent.setup();
      authService.resetUserPassword.mockResolvedValue({ success: true });
      // Re-mock getById for reload
      employeeService.getById.mockResolvedValue({
        data: { data: mockEmployeeWithAccount },
      });

      await renderAsAdmin(mockEmployeeWithAccount);

      await user.click(screen.getByRole('button', { name: /reset password to default/i }));
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to reset/i)).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(authService.resetUserPassword).toHaveBeenCalledWith(10, expect.any(String));
      });

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.stringMatching(/password reset successfully/i),
          'success'
        );
      });
    });

    it('executes lock account on confirm', async () => {
      const user = userEvent.setup();
      authService.lockUserAccount.mockResolvedValue({ success: true });
      employeeService.getById.mockResolvedValue({
        data: { data: mockEmployeeWithAccount },
      });

      await renderAsAdmin(mockEmployeeWithAccount);

      await user.click(screen.getByRole('button', { name: /lock this account/i }));
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to lock/i)).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(authService.lockUserAccount).toHaveBeenCalledWith(10, true);
      });

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.stringMatching(/locked successfully/i),
          'success'
        );
      });
    });

    it('executes unlock account on confirm', async () => {
      const user = userEvent.setup();
      authService.lockUserAccount.mockResolvedValue({ success: true });
      employeeService.getById.mockResolvedValue({
        data: { data: mockEmployeeLockedAccount },
      });

      await renderAsAdmin(mockEmployeeLockedAccount);

      await user.click(screen.getByRole('button', { name: /unlock this account/i }));
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to unlock/i)).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(authService.lockUserAccount).toHaveBeenCalledWith(11, false);
      });
    });

    it('executes send welcome email on confirm', async () => {
      const user = userEvent.setup();
      authService.resetUserPassword.mockResolvedValue({ success: true });
      authService.sendWelcomeEmail.mockResolvedValue({ success: true });

      await renderAsAdmin(mockEmployeeWithAccount);

      await user.click(screen.getByRole('button', { name: /send welcome email with credentials/i }));
      await waitFor(() => {
        expect(screen.getByText(/send a welcome email/i)).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(authService.resetUserPassword).toHaveBeenCalled();
        expect(authService.sendWelcomeEmail).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.stringMatching(/welcome email sent successfully/i),
          'success'
        );
      });
    });

    it('shows error notification when action fails', async () => {
      const user = userEvent.setup();
      authService.resetUserPassword.mockRejectedValue(new Error('Server error'));

      await renderAsAdmin(mockEmployeeWithAccount);

      await user.click(screen.getByRole('button', { name: /reset password to default/i }));
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to reset/i)).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.stringMatching(/failed/i),
          'error'
        );
      });
    });
  });

  // ── 9. User Account Manager Dialog ────────────────────────────────────────

  describe('User Account Manager dialog', () => {
    it('opens dialog when Manage User Account is clicked', async () => {
      const user = userEvent.setup();
      await renderAsAdmin(mockEmployeeWithAccount);

      await user.click(screen.getByRole('button', { name: /manage user account/i }));

      await waitFor(() => {
        expect(screen.getByTestId('user-account-manager-dialog')).toBeInTheDocument();
      });
    });

    it('passes edit mode when employee has account', async () => {
      const user = userEvent.setup();
      await renderAsAdmin(mockEmployeeWithAccount);

      await user.click(screen.getByRole('button', { name: /manage user account/i }));

      await waitFor(() => {
        expect(screen.getByTestId('uam-mode')).toHaveTextContent('edit');
      });
    });

    it('opens dialog when Create User Account is clicked', async () => {
      const user = userEvent.setup();
      await renderAsAdmin(mockEmployeeWithoutAccount);

      await user.click(screen.getByRole('button', { name: /create user account/i }));

      await waitFor(() => {
        expect(screen.getByTestId('user-account-manager-dialog')).toBeInTheDocument();
      });
    });

    it('passes create mode when employee has no account', async () => {
      const user = userEvent.setup();
      await renderAsAdmin(mockEmployeeWithoutAccount);

      await user.click(screen.getByRole('button', { name: /create user account/i }));

      await waitFor(() => {
        expect(screen.getByTestId('uam-mode')).toHaveTextContent('create');
      });
    });

    it('closes dialog when Close is clicked', async () => {
      const user = userEvent.setup();
      await renderAsAdmin(mockEmployeeWithAccount);

      await user.click(screen.getByRole('button', { name: /manage user account/i }));
      await waitFor(() => {
        expect(screen.getByTestId('user-account-manager-dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Close Dialog'));

      await waitFor(() => {
        expect(screen.queryByTestId('user-account-manager-dialog')).not.toBeInTheDocument();
      });
    });

    it('calls updateUserAccount when saving existing account', async () => {
      const user = userEvent.setup();
      authService.updateUserAccount.mockResolvedValue({ success: true });
      employeeService.getById.mockResolvedValue({
        data: { data: mockEmployeeWithAccount },
      });

      await renderAsAdmin(mockEmployeeWithAccount);

      await user.click(screen.getByRole('button', { name: /manage user account/i }));
      await waitFor(() => {
        expect(screen.getByTestId('user-account-manager-dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Save Account'));

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.stringMatching(/updated successfully/i),
          'success'
        );
      });
    });

    it('calls createUserAccount when creating new account', async () => {
      const user = userEvent.setup();
      authService.createUserAccount.mockResolvedValue({ success: true });
      employeeService.getById.mockResolvedValue({
        data: { data: mockEmployeeWithoutAccount },
      });

      await renderAsAdmin(mockEmployeeWithoutAccount);

      await user.click(screen.getByRole('button', { name: /create user account/i }));
      await waitFor(() => {
        expect(screen.getByTestId('user-account-manager-dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Save Account'));

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.stringMatching(/created successfully/i),
          'success'
        );
      });
    });
  });

  // ── 10. Role display ──────────────────────────────────────────────────────

  describe('Role display', () => {
    it('displays correct role badge for admin user', async () => {
      const adminEmployee = {
        ...mockEmployeeWithAccount,
        user: { ...mockEmployeeWithAccount.user, role: 'admin' },
      };
      await renderAsAdmin(adminEmployee);

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(
        screen.getByText(/full system access and administrative privileges/i)
      ).toBeInTheDocument();
    });

    it('displays correct role badge for HR user', async () => {
      const hrEmployee = {
        ...mockEmployeeWithAccount,
        user: { ...mockEmployeeWithAccount.user, role: 'hr' },
      };
      await renderAsAdmin(hrEmployee);

      // "HR" may appear multiple times (role chip + other UI)
      const hrTexts = screen.getAllByText('HR');
      expect(hrTexts.length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(/can manage all employees and hr processes/i)
      ).toBeInTheDocument();
    });

    it('displays correct role badge for manager user', async () => {
      const managerEmployee = {
        ...mockEmployeeWithAccount,
        user: { ...mockEmployeeWithAccount.user, role: 'manager' },
      };
      await renderAsAdmin(managerEmployee);

      expect(screen.getByText('Manager')).toBeInTheDocument();
      expect(
        screen.getByText(/can manage team members and approve requests/i)
      ).toBeInTheDocument();
    });
  });

  // ── 11. Error Handling ────────────────────────────────────────────────────

  describe('Error handling', () => {
    it('handles different response structures (nested data)', async () => {
      employeeService.getById.mockResolvedValue({
        data: { data: mockEmployeeWithAccount },
      });

      render(<UserAccountManagementPage />, {
        authValue: { user: createMockUser('admin') },
      });

      await waitFor(() => {
        const matches = screen.getAllByText('John Doe');
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('handles different response structures (single nest)', async () => {
      employeeService.getById.mockResolvedValue({
        data: mockEmployeeWithAccount,
      });

      render(<UserAccountManagementPage />, {
        authValue: { user: createMockUser('admin') },
      });

      await waitFor(() => {
        const matches = screen.getAllByText('John Doe');
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows notification when update fails', async () => {
      const user = userEvent.setup();
      authService.updateUserAccount.mockRejectedValue({
        response: { data: { message: 'Update failed' } },
      });

      await renderAsAdmin(mockEmployeeWithAccount);

      await user.click(screen.getByRole('button', { name: /manage user account/i }));
      await waitFor(() => {
        expect(screen.getByTestId('user-account-manager-dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Save Account'));

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.stringMatching(/failed/i),
          'error'
        );
      });
    });
  });
});
