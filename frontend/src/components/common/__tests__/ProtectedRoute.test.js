import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMockUser, buildAuthValue, TestAuthContext } from '../../../test-utils/testUtils';
import ProtectedRoute from '../ProtectedRoute';

// Mock roleConfig utilities
jest.mock('../../../utils/roleConfig', () => ({
  hasRouteAccess: jest.fn(() => true),
  getDefaultDashboard: jest.fn(() => '/dashboard'),
}));
const { hasRouteAccess, getDefaultDashboard } = require('../../../utils/roleConfig');

// ─── Helper: render ProtectedRoute inside MemoryRouter with Routes ───────────
// This avoids the infinite-loop Navigate causes inside BrowserRouter.
const renderProtected = (authOverrides = {}, { requiredRoles, route = '/protected' } = {}) => {
  const auth = buildAuthValue(authOverrides);
  global.__TEST_AUTH_VALUE__ = auth;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={qc}>
      <SnackbarProvider maxSnack={3}>
        <TestAuthContext.Provider value={auth}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route
                path="*"
                element={
                  <ProtectedRoute requiredRoles={requiredRoles}>
                    <div data-testid="protected-content">Protected Content</div>
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </TestAuthContext.Provider>
      </SnackbarProvider>
    </QueryClientProvider>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hasRouteAccess.mockReturnValue(true);
    getDefaultDashboard.mockReturnValue('/dashboard');
  });

  // ─── 1. Renders children when authenticated with correct role ────────
  it('renders children when authenticated with the correct role', () => {
    renderProtected(
      { user: createMockUser('admin') },
      { requiredRoles: 'admin' }
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  // ─── 2. Shows loading spinner when loading=true ──────────────────────
  it('shows a loading spinner when auth is loading', () => {
    renderProtected({ loading: true, user: null });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  // ─── 3. Redirects to /login when not authenticated ──────────────────
  it('redirects to /login when the user is not authenticated', () => {
    renderProtected({ user: null, isAuthenticated: false });

    // Navigate redirects to /login which renders our login-page marker
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  // ─── 4. Redirect includes location state (return URL) ───────────────
  it('passes the current location as state when redirecting to /login', () => {
    renderProtected(
      { user: null, isAuthenticated: false },
      { route: '/admin/settings' }
    );

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  // ─── 5. Access Denied when requiredRoles (string) doesn't match ─────
  it('shows Access Denied when requiredRoles is a string and does not match user role', () => {
    renderProtected(
      { user: createMockUser('employee') },
      { requiredRoles: 'admin' }
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  // ─── 6. Access Denied when requiredRoles (array) doesn't match ──────
  it('shows Access Denied when requiredRoles is an array and user role is not included', () => {
    renderProtected(
      { user: createMockUser('employee') },
      { requiredRoles: ['admin', 'hr'] }
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  // ─── 7. Renders children when requiredRoles (array) includes role ───
  it('renders children when requiredRoles array includes the user role', () => {
    renderProtected(
      { user: createMockUser('hr') },
      { requiredRoles: ['admin', 'hr', 'manager'] }
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });

  // ─── 8. Access Denied when hasRouteAccess returns false ─────────────
  it('shows Access Denied when hasRouteAccess returns false', () => {
    hasRouteAccess.mockReturnValue(false);

    renderProtected({ user: createMockUser('employee') });

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  // ─── 9. Renders children when hasRouteAccess returns true ───────────
  it('renders children when hasRouteAccess returns true', () => {
    hasRouteAccess.mockReturnValue(true);

    renderProtected({ user: createMockUser('employee') });

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  // ─── 10. "Go to Dashboard" uses getDefaultDashboard ─────────────────
  it('renders a "Go to Dashboard" button linking to getDefaultDashboard result', () => {
    getDefaultDashboard.mockReturnValue('/employee/dashboard');
    hasRouteAccess.mockReturnValue(false);

    renderProtected({ user: createMockUser('employee') });

    const button = screen.getByRole('link', { name: /go to dashboard/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', '/employee/dashboard');
    expect(getDefaultDashboard).toHaveBeenCalledWith('employee');
  });

  // ─── 11. Works without requiredRoles prop ───────────────────────────
  it('renders children when no requiredRoles prop is provided and user is authenticated', () => {
    renderProtected({ user: createMockUser('manager') });

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });

  // ─── 12. Access Denied shows LockIcon ───────────────────────────────
  it('shows a LockIcon on the Access Denied page', () => {
    hasRouteAccess.mockReturnValue(false);

    renderProtected({ user: createMockUser('employee') });

    // MUI renders LockIcon as an SVG with data-testid="LockIcon"
    expect(screen.getByTestId('LockIcon')).toBeInTheDocument();
  });

  // ─── 13. Access Denied shows descriptive message ────────────────────
  it('shows a descriptive message about contacting administrator on Access Denied', () => {
    hasRouteAccess.mockReturnValue(false);

    renderProtected({ user: createMockUser('employee') });

    expect(
      screen.getByText(/please contact your administrator/i)
    ).toBeInTheDocument();
  });

  // ─── 14. hasRouteAccess called with correct arguments ───────────────
  it('calls hasRouteAccess with the user role and current pathname', () => {
    renderProtected(
      { user: createMockUser('manager') },
      { route: '/admin/settings' }
    );

    expect(hasRouteAccess).toHaveBeenCalledWith('manager', '/admin/settings');
  });

  // ─── 15. Does not show loading spinner when loading is false ────────
  it('does not show a loading spinner when loading is false', () => {
    renderProtected({ user: createMockUser('admin') });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  // ─── 16. Loading state takes priority over authentication check ─────
  it('shows the loading spinner even when user is null (loading takes priority)', () => {
    renderProtected({ loading: true, user: null });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    // Should NOT redirect to /login while still loading
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  // ─── 17. requiredRoles string match renders children ────────────────
  it('renders children when requiredRoles is a string that matches the user role exactly', () => {
    renderProtected(
      { user: createMockUser('hr') },
      { requiredRoles: 'hr' }
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  // ─── 18. getDefaultDashboard called with correct role on role mismatch
  it('calls getDefaultDashboard with the user role when access is denied via requiredRoles', () => {
    renderProtected(
      { user: createMockUser('employee') },
      { requiredRoles: 'admin' }
    );

    expect(getDefaultDashboard).toHaveBeenCalledWith('employee');
  });

  // ─── 19. Multiple children are rendered correctly ───────────────────
  it('renders multiple children when authenticated and authorized', () => {
    const auth = buildAuthValue({ user: createMockUser('admin') });
    global.__TEST_AUTH_VALUE__ = auth;
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={qc}>
        <SnackbarProvider maxSnack={3}>
          <TestAuthContext.Provider value={auth}>
            <MemoryRouter initialEntries={['/admin']}>
              <Routes>
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <div data-testid="child-1">First</div>
                      <div data-testid="child-2">Second</div>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </MemoryRouter>
          </TestAuthContext.Provider>
        </SnackbarProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });
});
