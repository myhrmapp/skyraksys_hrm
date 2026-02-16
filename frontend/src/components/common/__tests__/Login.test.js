import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../test-utils/testUtils';
import Login from '../Login';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render login form', () => {
      render(<Login />);

      expect(screen.getByRole('heading', { name: /skyraksys/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i, { selector: 'input' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render SkyrakSys HRM branding', () => {
      render(<Login />);

      expect(screen.getByRole('heading', { name: /SKYRAKSYS/i })).toBeInTheDocument();
      expect(screen.getByText(/Human Resource Management/i)).toBeInTheDocument();
    });

    it('should have password field masked by default', () => {
      render(<Login />);

      const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should show show/hide password toggle', () => {
      render(<Login />);

      const toggleButton = screen.getByRole('button', { name: /toggle password/i });
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty fields on submit', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show error for empty password', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument();
      });
    });

    it('should show error for password less than 6 characters', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '12345');
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('should not show errors when inputs are valid', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Login Functionality', () => {
    it('should login successfully with valid credentials', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockResolvedValue({ success: true });

      const { auth } = render(<Login />, {
        authValue: { login: mockLogin },
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(signInButton);

      await waitFor(() => {
        expect(auth.login).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should show error message for invalid credentials', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockRejectedValue({
        response: { data: { message: 'Invalid credentials' } },
      });

      render(<Login />, {
        authValue: { login: mockLogin },
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('should show error for network failure', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockRejectedValue(new Error('Network error'));

      render(<Login />, {
        authValue: { login: mockLogin },
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      });
    });

    it('should disable login button while submitting', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 2000))
      );

      render(<Login />, {
        authValue: { login: mockLogin },
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
      });
    });

    it('should show loading indicator while submitting', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 2000))
      );

      render(<Login />, {
        authValue: { login: mockLogin },
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility when clicking eye icon', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
      const toggleButton = screen.getByRole('button', { name: /toggle password/i });

      expect(passwordInput).toHaveAttribute('type', 'password');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Forgot Password Link', () => {
    it('should render forgot password link', () => {
      render(<Login />);

      const forgotLink = screen.getByText(/forgot password/i);
      expect(forgotLink).toBeInTheDocument();
    });

    it('should have correct forgot password link href', () => {
      render(<Login />);

      const forgotLink = screen.getByText(/forgot password/i);
      expect(forgotLink).toHaveAttribute('href', '/forgot-password');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels', () => {
      render(<Login />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i, { selector: 'input' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle password/i })).toBeInTheDocument();
    });

    it('should allow form submission with Enter key', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockResolvedValue({ success: true });

      render(<Login />, {
        authValue: { login: mockLogin },
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123{Enter}');

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });

  describe('Account Lockout', () => {
    it('should show lockout message after multiple failed attempts', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockRejectedValue({
        response: {
          status: 429,
          data: { message: 'Account locked due to multiple failed login attempts' },
        },
      });

      render(<Login />, {
        authValue: { login: mockLogin },
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/account locked/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Dismissal', () => {
    it('should clear error when user types into email field', async () => {
      const user = userEvent.setup();
      render(<Login />);

      // Trigger an error first
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => {
        expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument();
      });

      // Type in email field – error should clear
      await user.type(screen.getByLabelText(/email/i), 'a');
      await waitFor(() => {
        expect(screen.queryByText(/please fill in all fields/i)).not.toBeInTheDocument();
      });
    });

    it('should clear error when user types into password field', async () => {
      const user = userEvent.setup();
      render(<Login />);

      await user.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => {
        expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/password/i, { selector: 'input' }), 'x');
      await waitFor(() => {
        expect(screen.queryByText(/please fill in all fields/i)).not.toBeInTheDocument();
      });
    });

    it('should dismiss error alert when clicking close button', async () => {
      const user = userEvent.setup();
      render(<Login />);

      await user.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Click the close icon on the Alert
      const alert = screen.getByRole('alert');
      const closeBtn = within(alert).getByRole('button');
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Fields Disabled During Loading', () => {
    it('should disable email graphic password and toggle button while submitting', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 2000))
      );

      render(<Login />, { authValue: { login: mockLogin } });

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i, { selector: 'input' }), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeDisabled();
        expect(screen.getByLabelText(/password/i, { selector: 'input' })).toBeDisabled();
        expect(screen.getByRole('button', { name: /toggle password/i })).toBeDisabled();
      });
    });
  });

  describe('Boundary Validation', () => {
    it('should accept password with exactly 6 characters', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockResolvedValue({ success: true });

      render(<Login />, { authValue: { login: mockLogin } });

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i, { selector: 'input' }), '123456');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', '123456');
      });
    });
  });
});
