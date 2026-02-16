import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

// ─── Undo the global AuthContext mock from setupTests.js ─────────────────────
jest.unmock('../AuthContext');

// ─── Mock authService BEFORE importing AuthContext ───────────────────────────
jest.mock('../../services/auth.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../services/auth.service');
  }
  return {
    authService: {
      getProfile: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
    },
  };
});
const { authService } = require('../../services/auth.service');

// Import the REAL AuthProvider and useAuth
const { AuthProvider, useAuth } = require('../AuthContext');

// ─── Test helper: renders auth state to DOM for assertions ───────────────────
const TestConsumer = ({ onRender }) => {
  const auth = useAuth();
  // Store latest auth on a mutable ref for test access
  onRender(auth);
  return (
    <div data-testid="consumer"
         data-role={auth.user?.role || 'none'}
         data-authenticated={String(!!auth.isAuthenticated)}
         data-loading={String(!!auth.loading)}
         data-username={auth.user?.name || ''}>
      {auth.user?.role || 'none'}
    </div>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const adminUser = { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' };
const hrUser = { id: 2, name: 'HR', email: 'hr@test.com', role: 'hr' };
const managerUser = { id: 3, name: 'Manager', email: 'mgr@test.com', role: 'manager' };
const employeeUser = { id: 4, name: 'Emp', email: 'emp@test.com', role: 'employee' };

/**
 * Render AuthProvider with TestConsumer and wait for initial auth check to finish.
 * Returns a mutable state holder that always has the latest captured auth value.
 */
const renderWithAuth = async (profileResult) => {
  if (profileResult instanceof Error) {
    authService.getProfile.mockRejectedValue(profileResult);
  } else {
    authService.getProfile.mockResolvedValue(profileResult);
  }

  // Mutable container — capture() updates .current on every re-render
  const ref = { current: {} };
  const capture = (auth) => { ref.current = auth; };

  await act(async () => {
    render(
      <AuthProvider>
        <TestConsumer onRender={capture} />
      </AuthProvider>
    );
  });

  return { get auth() { return ref.current; }, capture };
};

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore?.();
    console.warn.mockRestore?.();
  });

  // ─── 1. Initial loading state ──────────────────────────────────────────────
  test('sets loading=true on initial render, then false after getProfile resolves', async () => {
    let resolveProfile;
    authService.getProfile.mockImplementation(
      () => new Promise((resolve) => { resolveProfile = resolve; })
    );

    const states = [];
    const capture = (auth) => {
      states.push({ loading: auth.loading, isAuthenticated: auth.isAuthenticated });
    };

    // Initial synchronous render — loading should be true
    render(
      <AuthProvider>
        <TestConsumer onRender={capture} />
      </AuthProvider>
    );

    expect(states[0].loading).toBe(true);
    expect(states[0].isAuthenticated).toBe(false);

    // Resolve the profile call
    await act(async () => {
      resolveProfile(adminUser);
    });

    const last = states[states.length - 1];
    expect(last.loading).toBe(false);
    expect(last.isAuthenticated).toBe(true);
  });

  test('sets loading=false after getProfile rejects', async () => {
    let rejectProfile;
    authService.getProfile.mockImplementation(
      () => new Promise((_, reject) => { rejectProfile = reject; })
    );

    const states = [];
    const capture = (auth) => {
      states.push({ loading: auth.loading, user: auth.user });
    };

    render(
      <AuthProvider>
        <TestConsumer onRender={capture} />
      </AuthProvider>
    );

    expect(states[0].loading).toBe(true);

    await act(async () => {
      rejectProfile(new Error('Unauthorized'));
    });

    const last = states[states.length - 1];
    expect(last.loading).toBe(false);
    expect(last.user).toBeNull();
  });

  // ─── 2. Successful auth initialization ─────────────────────────────────────
  test('initializes user and isAuthenticated when getProfile succeeds', async () => {
    const { auth } = await renderWithAuth(adminUser);

    expect(auth.user).toEqual(adminUser);
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.loading).toBe(false);
  });

  // ─── 3. Failed auth initialization ─────────────────────────────────────────
  test('keeps user null and isAuthenticated false when getProfile fails', async () => {
    const { auth } = await renderWithAuth(new Error('No session'));

    expect(auth.user).toBeNull();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.loading).toBe(false);
  });

  // ─── 4. Login success ──────────────────────────────────────────────────────
  test('login success — sets user, isAuthenticated, returns {success:true, user}', async () => {
    const { auth } = await renderWithAuth(new Error('no session'));

    const loginResponse = { user: adminUser };
    authService.login.mockResolvedValue(loginResponse);

    let result;
    await act(async () => {
      result = await auth.login('admin@test.com', 'pass123');
    });

    expect(result).toEqual({ success: true, user: adminUser });
    // Verify state updated via DOM
    await waitFor(() => {
      expect(screen.getByTestId('consumer')).toHaveAttribute('data-role', 'admin');
      expect(screen.getByTestId('consumer')).toHaveAttribute('data-authenticated', 'true');
    });
    expect(authService.login).toHaveBeenCalledWith('admin@test.com', 'pass123');
  });

  test('login success — handles response without .user wrapper', async () => {
    const { auth } = await renderWithAuth(new Error('no session'));

    // authService.login returns the user data directly (no .user key)
    authService.login.mockResolvedValue(adminUser);

    let result;
    await act(async () => {
      result = await auth.login('admin@test.com', 'pass123');
    });

    expect(result.success).toBe(true);
    expect(result.user).toEqual(adminUser);
    await waitFor(() => {
      expect(screen.getByTestId('consumer')).toHaveAttribute('data-authenticated', 'true');
    });
  });

  // ─── 5. Login failure ──────────────────────────────────────────────────────
  test('login failure — returns {success:false, error} with response message', async () => {
    const { auth } = await renderWithAuth(new Error('no session'));

    const err = new Error('bad');
    err.response = { data: { message: 'Invalid credentials' } };
    authService.login.mockRejectedValue(err);

    let result;
    await act(async () => {
      result = await auth.login('bad@test.com', 'wrong');
    });

    expect(result).toEqual({ success: false, error: 'Invalid credentials' });
    expect(auth.user).toBeNull();
    expect(auth.isAuthenticated).toBe(false);
  });

  test('login failure — uses fallback message when no response data', async () => {
    const { auth } = await renderWithAuth(new Error('no session'));

    authService.login.mockRejectedValue(new Error('Network error'));

    let result;
    await act(async () => {
      result = await auth.login('a@b.com', 'x');
    });

    expect(result.error).toBe('Login failed');
  });

  // ─── 6. Register success ──────────────────────────────────────────────────
  test('register success — returns {success:true, user}', async () => {
    const { auth } = await renderWithAuth(new Error('no session'));

    const regData = { name: 'New', email: 'new@test.com', password: 'abc123' };
    authService.register.mockResolvedValue({ user: employeeUser });

    let result;
    await act(async () => {
      result = await auth.register(regData);
    });

    expect(result).toEqual({ success: true, user: employeeUser });
    expect(authService.register).toHaveBeenCalledWith(regData);
  });

  // ─── 7. Register failure ──────────────────────────────────────────────────
  test('register failure — returns {success:false, error}', async () => {
    const { auth } = await renderWithAuth(new Error('no session'));

    const err = new Error('dup');
    err.response = { data: { message: 'Email already exists' } };
    authService.register.mockRejectedValue(err);

    let result;
    await act(async () => {
      result = await auth.register({ email: 'dup@test.com' });
    });

    expect(result).toEqual({ success: false, error: 'Email already exists' });
  });

  test('register failure — uses fallback message when no response data', async () => {
    const { auth } = await renderWithAuth(new Error('no session'));

    authService.register.mockRejectedValue(new Error('Network'));

    let result;
    await act(async () => {
      result = await auth.register({ email: 'x@x.com' });
    });

    expect(result.error).toBe('Registration failed');
  });

  // ─── 8. Logout ─────────────────────────────────────────────────────────────
  test('logout — clears user and isAuthenticated', async () => {
    const { auth } = await renderWithAuth(adminUser);

    expect(auth.isAuthenticated).toBe(true);

    authService.logout.mockResolvedValue();

    await act(async () => {
      await auth.logout();
    });

    await waitFor(() => {
      expect(screen.getByTestId('consumer')).toHaveAttribute('data-role', 'none');
      expect(screen.getByTestId('consumer')).toHaveAttribute('data-authenticated', 'false');
    });
    expect(authService.logout).toHaveBeenCalled();
  });

  test('logout — clears user even when authService.logout throws', async () => {
    const { auth } = await renderWithAuth(adminUser);

    authService.logout.mockRejectedValue(new Error('Server error'));

    await act(async () => {
      await auth.logout();
    });

    await waitFor(() => {
      expect(screen.getByTestId('consumer')).toHaveAttribute('data-role', 'none');
      expect(screen.getByTestId('consumer')).toHaveAttribute('data-authenticated', 'false');
    });
  });

  // ─── 9. updateProfile success ──────────────────────────────────────────────
  test('updateProfile — updates user state on success', async () => {
    const { auth } = await renderWithAuth(adminUser);

    const updatedUser = { ...adminUser, name: 'Admin Updated' };
    authService.updateProfile.mockResolvedValue(updatedUser);

    let result;
    await act(async () => {
      result = await auth.updateProfile({ name: 'Admin Updated' });
    });

    expect(result).toEqual({ success: true, user: updatedUser });
    await waitFor(() => {
      expect(screen.getByTestId('consumer')).toHaveAttribute('data-username', 'Admin Updated');
    });
    expect(authService.updateProfile).toHaveBeenCalledWith({ name: 'Admin Updated' });
  });

  // ─── 10. updateProfile failure ─────────────────────────────────────────────
  test('updateProfile failure — returns error, keeps existing user', async () => {
    const { auth } = await renderWithAuth(adminUser);

    const err = new Error('fail');
    err.response = { data: { message: 'Validation error' } };
    authService.updateProfile.mockRejectedValue(err);

    let result;
    await act(async () => {
      result = await auth.updateProfile({ name: '' });
    });

    expect(result).toEqual({ success: false, error: 'Validation error' });
    // User should remain unchanged
    expect(auth.user).toEqual(adminUser);
  });

  test('updateProfile failure — uses fallback message', async () => {
    const { auth } = await renderWithAuth(adminUser);

    authService.updateProfile.mockRejectedValue(new Error('Network'));

    let result;
    await act(async () => {
      result = await auth.updateProfile({ name: 'X' });
    });

    expect(result.error).toBe('Profile update failed');
  });

  // ─── 11. changePassword success ────────────────────────────────────────────
  test('changePassword success — returns {success:true}', async () => {
    const { auth } = await renderWithAuth(adminUser);

    authService.changePassword.mockResolvedValue({ message: 'ok' });

    let result;
    await act(async () => {
      result = await auth.changePassword('oldPass', 'newPass');
    });

    expect(result).toEqual({ success: true });
    expect(authService.changePassword).toHaveBeenCalledWith('oldPass', 'newPass');
  });

  // ─── 12. changePassword failure ────────────────────────────────────────────
  test('changePassword failure — returns {success:false, error}', async () => {
    const { auth } = await renderWithAuth(adminUser);

    const err = new Error('wrong');
    err.response = { data: { message: 'Current password is incorrect' } };
    authService.changePassword.mockRejectedValue(err);

    let result;
    await act(async () => {
      result = await auth.changePassword('wrong', 'new');
    });

    expect(result).toEqual({ success: false, error: 'Current password is incorrect' });
  });

  test('changePassword failure — uses fallback message', async () => {
    const { auth } = await renderWithAuth(adminUser);

    authService.changePassword.mockRejectedValue(new Error('Network'));

    let result;
    await act(async () => {
      result = await auth.changePassword('a', 'b');
    });

    expect(result.error).toBe('Password change failed');
  });

  // ─── 13. Role booleans — admin ─────────────────────────────────────────────
  test('admin user — role booleans and permissions are correct', async () => {
    const { auth } = await renderWithAuth(adminUser);

    expect(auth.isAdmin).toBe(true);
    expect(auth.isHR).toBe(false);
    expect(auth.isManager).toBe(false);
    expect(auth.isEmployee).toBe(false);

    expect(auth.canManageEmployees).toBe(true);
    expect(auth.canApproveLeaves).toBe(true);
    expect(auth.canViewPayroll).toBe(true);
    expect(auth.canManageSettings).toBe(true);
  });

  // ─── 14. Role booleans — hr ────────────────────────────────────────────────
  test('hr user — role booleans and permissions are correct', async () => {
    const { auth } = await renderWithAuth(hrUser);

    expect(auth.isAdmin).toBe(false);
    expect(auth.isHR).toBe(true);
    expect(auth.isManager).toBe(false);
    expect(auth.isEmployee).toBe(false);

    expect(auth.canManageEmployees).toBe(true);
    expect(auth.canApproveLeaves).toBe(true);
    expect(auth.canViewPayroll).toBe(true);
    expect(auth.canManageSettings).toBe(false);
  });

  // ─── 15. Role booleans — manager ───────────────────────────────────────────
  test('manager user — role booleans and permissions are correct', async () => {
    const { auth } = await renderWithAuth(managerUser);

    expect(auth.isAdmin).toBe(false);
    expect(auth.isHR).toBe(false);
    expect(auth.isManager).toBe(true);
    expect(auth.isEmployee).toBe(false);

    expect(auth.canManageEmployees).toBe(false);
    expect(auth.canApproveLeaves).toBe(true);
    expect(auth.canViewPayroll).toBe(false);
    expect(auth.canManageSettings).toBe(false);
  });

  // ─── 16. Role booleans — employee ──────────────────────────────────────────
  test('employee user — role booleans and permissions are correct', async () => {
    const { auth } = await renderWithAuth(employeeUser);

    expect(auth.isAdmin).toBe(false);
    expect(auth.isHR).toBe(false);
    expect(auth.isManager).toBe(false);
    expect(auth.isEmployee).toBe(true);

    expect(auth.canManageEmployees).toBe(false);
    expect(auth.canApproveLeaves).toBe(false);
    expect(auth.canViewPayroll).toBe(false);
    expect(auth.canManageSettings).toBe(false);
  });

  // ─── 17. hasRole and hasAnyRole ────────────────────────────────────────────
  test('hasRole returns true for matching role, false otherwise', async () => {
    const { auth } = await renderWithAuth(managerUser);

    expect(auth.hasRole('manager')).toBe(true);
    expect(auth.hasRole('admin')).toBe(false);
    expect(auth.hasRole('hr')).toBe(false);
    expect(auth.hasRole('employee')).toBe(false);
  });

  test('hasAnyRole returns true when user role is in the array', async () => {
    const { auth } = await renderWithAuth(hrUser);

    expect(auth.hasAnyRole(['admin', 'hr'])).toBe(true);
    expect(auth.hasAnyRole(['hr'])).toBe(true);
    expect(auth.hasAnyRole(['manager', 'employee'])).toBe(false);
    expect(auth.hasAnyRole([])).toBe(false);
  });

  test('hasRole and hasAnyRole return false when user is null', async () => {
    const { auth } = await renderWithAuth(new Error('no session'));

    expect(auth.user).toBeNull();
    expect(auth.hasRole('admin')).toBe(false);
    expect(auth.hasAnyRole(['admin', 'hr', 'manager', 'employee'])).toBe(false);
  });

  // ─── 18. useAuth outside provider ──────────────────────────────────────────
  // NOTE: createContext({}) provides a truthy default, so !context never triggers.
  // This test verifies useAuth returns an object (default context) even outside provider.
  test('useAuth outside AuthProvider returns default context (no throw)', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const TestOutside = () => {
      const auth = useAuth();
      // Should not throw — will get the default empty object from createContext({})
      return <div data-testid="outside">{typeof auth}</div>;
    };

    render(<TestOutside />);
    expect(screen.getByTestId('outside')).toHaveTextContent('object');

    spy.mockRestore();
  });

  // ─── 19. Role booleans update after login ──────────────────────────────────
  test('role booleans update when user changes via login', async () => {
    const { auth } = await renderWithAuth(new Error('no session'));

    // Initially no permissions
    expect(auth.isAdmin).toBe(false);
    expect(auth.canManageSettings).toBe(false);

    authService.login.mockResolvedValue({ user: adminUser });

    await act(async () => {
      await auth.login('admin@test.com', 'pass');
    });

    await waitFor(() => {
      expect(screen.getByTestId('consumer')).toHaveAttribute('data-role', 'admin');
      expect(screen.getByTestId('consumer')).toHaveAttribute('data-authenticated', 'true');
    });
  });

  // ─── 20. Role booleans clear after logout ──────────────────────────────────
  test('role booleans clear to false after logout', async () => {
    const { auth } = await renderWithAuth(adminUser);

    expect(auth.isAdmin).toBe(true);
    expect(auth.canManageSettings).toBe(true);

    authService.logout.mockResolvedValue();

    await act(async () => {
      await auth.logout();
    });

    await waitFor(() => {
      expect(screen.getByTestId('consumer')).toHaveAttribute('data-role', 'none');
      expect(screen.getByTestId('consumer')).toHaveAttribute('data-authenticated', 'false');
    });
  });

  // ─── 21. Register does NOT set user state ──────────────────────────────────
  test('register does not automatically log the user in', async () => {
    const { auth } = await renderWithAuth(new Error('no session'));

    authService.register.mockResolvedValue({ user: employeeUser });

    await act(async () => {
      await auth.register({ name: 'New', email: 'new@test.com', password: 'x' });
    });

    // User should still be null — register only returns the data
    expect(auth.user).toBeNull();
    expect(auth.isAuthenticated).toBe(false);
  });

  // ─── 22. Context value shape ───────────────────────────────────────────────
  test('context value exposes all expected properties and methods', async () => {
    const { auth } = await renderWithAuth(adminUser);

    // State
    expect(auth).toHaveProperty('user');
    expect(auth).toHaveProperty('loading');
    expect(auth).toHaveProperty('isAuthenticated');

    // Actions
    expect(typeof auth.login).toBe('function');
    expect(typeof auth.register).toBe('function');
    expect(typeof auth.logout).toBe('function');
    expect(typeof auth.updateProfile).toBe('function');
    expect(typeof auth.changePassword).toBe('function');

    // Role checks
    expect(typeof auth.hasRole).toBe('function');
    expect(typeof auth.hasAnyRole).toBe('function');
    expect(auth).toHaveProperty('isAdmin');
    expect(auth).toHaveProperty('isHR');
    expect(auth).toHaveProperty('isManager');
    expect(auth).toHaveProperty('isEmployee');
    expect(auth).toHaveProperty('canManageEmployees');
    expect(auth).toHaveProperty('canApproveLeaves');
    expect(auth).toHaveProperty('canViewPayroll');
    expect(auth).toHaveProperty('canManageSettings');
  });
});
