import React from 'react';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';
import UserManagement from '../UserManagement';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../../services/auth.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/auth.service');
  }
  return {
    authService: {
      register: jest.fn(),
    },
  };
});
const { authService } = require('../../../../services/auth.service');

const mockSetLoading = jest.fn();
jest.mock('../../../../contexts/LoadingContext', () => ({
  useLoading: () => ({
    isLoading: jest.fn(() => false),
    setLoading: mockSetLoading,
  }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_EMAIL = 'newuser@company.com';
const VALID_PASSWORD = 'Str0ng!Pass';

const renderComponent = () =>
  render(<UserManagement />, {
    authValue: { user: createMockUser('admin') },
  });

const fillForm = async (user, overrides = {}) => {
  const {
    email = VALID_EMAIL,
    password = VALID_PASSWORD,
    confirmPassword = VALID_PASSWORD,
    role,
  } = overrides;

  if (email) {
    const emailInput = screen.getByLabelText(/email address/i);
    await user.clear(emailInput);
    await user.type(emailInput, email);
  }

  if (role) {
    // MUI Select doesn't associate label via for attribute
    const roleSelect = screen.getByRole('combobox');
    await user.click(roleSelect);
    const listbox = await screen.findByRole('listbox');
    const roleLabel =
      role === 'admin'
        ? 'Administrator'
        : role === 'hr'
        ? 'HR Manager'
        : role === 'manager'
        ? 'Manager'
        : 'Employee';
    const option = within(listbox).getByText(roleLabel);
    await user.click(option);
  }

  if (password) {
    // MUI TextField with InputAdornment renders label differently;
    // find the input directly by its name attribute
    const pwInput = document.querySelector('input[name="password"]');
    await user.clear(pwInput);
    await user.type(pwInput, password);
  }

  if (confirmPassword) {
    const cpInput = document.querySelector('input[name="confirmPassword"]');
    await user.clear(cpInput);
    await user.type(cpInput, confirmPassword);
  }
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ======================== 1. Rendering ========================

describe('UserManagement', () => {
  describe('Rendering', () => {
    it('renders the page title', () => {
      renderComponent();
      expect(screen.getByText('Add New User')).toBeInTheDocument();
    });

    it('renders the subtitle description', () => {
      renderComponent();
      expect(
        screen.getByText(/create a new user account for the hrm system/i)
      ).toBeInTheDocument();
    });

    it('renders the email input field', () => {
      renderComponent();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    it('renders the role select dropdown', () => {
      renderComponent();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders the password field', () => {
      renderComponent();
      expect(document.querySelector('input[name="password"]')).toBeInTheDocument();
    });

    it('renders the confirm password field', () => {
      renderComponent();
      expect(document.querySelector('input[name="confirmPassword"]')).toBeInTheDocument();
    });

    it('renders the Create User submit button', () => {
      renderComponent();
      expect(
        screen.getByRole('button', { name: /create user/i })
      ).toBeInTheDocument();
    });

    it('renders the Reset Form button', () => {
      renderComponent();
      expect(
        screen.getByRole('button', { name: /reset form/i })
      ).toBeInTheDocument();
    });

    it('renders the Back to Employees button', () => {
      renderComponent();
      expect(
        screen.getByRole('button', { name: /back to employees/i })
      ).toBeInTheDocument();
    });

    it('renders password requirements hint', () => {
      renderComponent();
      expect(
        screen.getByText(/password requirements/i)
      ).toBeInTheDocument();
    });
  });

  // ======================== 2. Form Validation ========================

  describe('Validation', () => {
    it('shows error when submitting with all fields empty', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent();

      await user.click(screen.getByRole('button', { name: /create user/i }));

      expect(screen.getByText('All fields are required')).toBeInTheDocument();
      expect(authService.register).not.toHaveBeenCalled();
    });

    it('shows error for invalid email format', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent();

      await fillForm(user, { email: 'not-an-email' });
      await user.click(screen.getByRole('button', { name: /create user/i }));

      expect(
        screen.getByText('Please enter a valid email address')
      ).toBeInTheDocument();
    });

    it('shows error when password is shorter than 8 characters', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent();

      await fillForm(user, { password: 'Ab1!', confirmPassword: 'Ab1!' });
      await user.click(screen.getByRole('button', { name: /create user/i }));

      expect(
        screen.getByText('Password must be at least 8 characters long')
      ).toBeInTheDocument();
    });

    it('shows error when password lacks complexity', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent();

      await fillForm(user, {
        password: 'alllowercase1',
        confirmPassword: 'alllowercase1',
      });
      await user.click(screen.getByRole('button', { name: /create user/i }));

      expect(
        screen.getByText(/password must contain at least one uppercase/i)
      ).toBeInTheDocument();
    });

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent();

      await fillForm(user, {
        password: VALID_PASSWORD,
        confirmPassword: 'Different1!',
      });
      await user.click(screen.getByRole('button', { name: /create user/i }));

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('clears error message when user types again', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent();

      // Trigger an error
      await user.click(screen.getByRole('button', { name: /create user/i }));
      expect(screen.getByText('All fields are required')).toBeInTheDocument();

      // Type in a field
      await user.type(screen.getByLabelText(/email address/i), 'a');

      expect(
        screen.queryByText('All fields are required')
      ).not.toBeInTheDocument();
    });
  });

  // ======================== 3. Show / Hide Password ========================

  describe('Password visibility toggles', () => {
    it('toggles password field visibility', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent();

      const passwordInput = document.querySelector('input[name="password"]');
      expect(passwordInput).toHaveAttribute('type', 'password');

      // The toggle buttons are icon buttons inside the input adornments.
      const visibilityBtns = Array.from(
        document.querySelectorAll('.MuiInputAdornment-positionEnd .MuiIconButton-root')
      );

      // Click first visibility toggle (password field)
      await user.click(visibilityBtns[0]);
      expect(passwordInput).toHaveAttribute('type', 'text');

      // Click again to hide
      await user.click(visibilityBtns[0]);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('toggles confirm password field visibility', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent();

      const confirmInput = document.querySelector('input[name="confirmPassword"]');
      expect(confirmInput).toHaveAttribute('type', 'password');

      const visibilityBtns = Array.from(
        document.querySelectorAll('.MuiInputAdornment-positionEnd .MuiIconButton-root')
      );

      // Click second visibility toggle (confirm password field)
      await user.click(visibilityBtns[1]);
      expect(confirmInput).toHaveAttribute('type', 'text');

      await user.click(visibilityBtns[1]);
      expect(confirmInput).toHaveAttribute('type', 'password');
    });
  });

  // ======================== 4. Role Selection ========================

  describe('Role selection', () => {
    it('defaults to Employee role', () => {
      renderComponent();
      // The MUI Select renders the selected value as text content
      expect(screen.getByText('Employee')).toBeInTheDocument();
    });

    it('allows selecting a different role', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent();

      // Open the select
      const roleSelect = screen.getByRole('combobox');
      await user.click(roleSelect);

      // Pick Manager from the dropdown listbox
      const listbox = await screen.findByRole('listbox');
      const managerOption = within(listbox).getByText('Manager');
      await user.click(managerOption);

      // The select should now display Manager
      expect(screen.getByRole('combobox')).toHaveTextContent('Manager');
    }, 15000);

    it('shows role descriptions in the dropdown', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent();

      const roleSelect = screen.getByRole('combobox');
      await user.click(roleSelect);

      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByText('Basic user access')).toBeInTheDocument();
      expect(
        within(listbox).getByText('Team management and approval permissions')
      ).toBeInTheDocument();
      expect(
        within(listbox).getByText('Human resources management')
      ).toBeInTheDocument();
      expect(within(listbox).getByText('Full system access')).toBeInTheDocument();
    }, 15000);
  });

  // ======================== 5. Submit ========================

  describe('Form submission', () => {
    it('calls authService.register with correct data on valid submit', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      authService.register.mockResolvedValueOnce({ success: true });
      renderComponent();

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(authService.register).toHaveBeenCalledWith({
          email: VALID_EMAIL,
          password: VALID_PASSWORD,
          role: 'employee',
        });
      });
    });

    it('shows success message after successful registration', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      authService.register.mockResolvedValueOnce({ success: true });
      renderComponent();

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(
          screen.getByText('User created successfully!')
        ).toBeInTheDocument();
      });
    });

    it('submits with non-default role when changed', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      authService.register.mockResolvedValueOnce({ success: true });
      renderComponent();

      await fillForm(user, { role: 'admin' });
      await user.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(authService.register).toHaveBeenCalledWith(
          expect.objectContaining({ role: 'admin' })
        );
      });
    }, 15000);
  });

  // ======================== 6. Reset Form ========================

  describe('Reset form', () => {
    it('clears all fields when Reset Form is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent();

      await fillForm(user);

      // Verify fields are filled
      expect(screen.getByLabelText(/email address/i)).toHaveValue(VALID_EMAIL);

      // Click reset
      await user.click(screen.getByRole('button', { name: /reset form/i }));

      expect(screen.getByLabelText(/email address/i)).toHaveValue('');
      expect(document.querySelector('input[name="password"]')).toHaveValue('');
      expect(document.querySelector('input[name="confirmPassword"]')).toHaveValue('');
    });

    it('clears error and success messages on reset', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent();

      // Trigger an error
      await user.click(screen.getByRole('button', { name: /create user/i }));
      expect(screen.getByText('All fields are required')).toBeInTheDocument();

      // Reset
      await user.click(screen.getByRole('button', { name: /reset form/i }));
      expect(
        screen.queryByText('All fields are required')
      ).not.toBeInTheDocument();
    });
  });

  // ======================== 7. Back Button ========================

  describe('Back to Employees button', () => {
    it('navigates to /employees when clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent();

      await user.click(
        screen.getByRole('button', { name: /back to employees/i })
      );

      expect(mockNavigate).toHaveBeenCalledWith('/employees');
    });
  });

  // ======================== 8. Error Handling ========================

  describe('Error handling', () => {
    it('displays API error message when register returns failure', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      authService.register.mockResolvedValueOnce({
        success: false,
        message: 'Email already in use',
      });
      renderComponent();

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(
          screen.getByText('Email already in use')
        ).toBeInTheDocument();
      });
    });

    it('displays default error message when register fails without message', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      authService.register.mockResolvedValueOnce({ success: false });
      renderComponent();

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(
          screen.getByText('Failed to create user')
        ).toBeInTheDocument();
      });
    });

    it('displays generic error when register throws an exception', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      authService.register.mockRejectedValueOnce(new Error('Network error'));
      renderComponent();

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(
          screen.getByText('An unexpected error occurred. Please try again.')
        ).toBeInTheDocument();
      });
    });
  });

  // ======================== 9. Navigation After Success ========================

  describe('Navigation after success', () => {
    it('navigates to /employees after a 2-second delay on success', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      authService.register.mockResolvedValueOnce({ success: true });
      renderComponent();

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /create user/i }));

      // Success message should appear
      await waitFor(() => {
        expect(
          screen.getByText('User created successfully!')
        ).toBeInTheDocument();
      });

      // Not navigated yet
      expect(mockNavigate).not.toHaveBeenCalledWith('/employees');

      // Advance timers by 2 seconds
      jest.advanceTimersByTime(2000);

      expect(mockNavigate).toHaveBeenCalledWith('/employees');
    });
  });
});
