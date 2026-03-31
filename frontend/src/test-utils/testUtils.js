import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';

// ── Test mode detection ────────────────────────────────────────────
const isIntegrationMode = process.env.REACT_APP_TEST_MODE === 'integration';

// ── Real providers for integration mode ────────────────────────────
// These are lazy-imported only in integration mode so UI mode still
// uses the mocked versions from setupTests.js.
let LoadingProvider, NotificationProvider, AuthProvider;
if (isIntegrationMode) {
  try { ({ LoadingProvider } = require('../contexts/LoadingContext')); } catch (e) { /* noop */ }
  try { ({ NotificationProvider } = require('../contexts/NotificationContext')); } catch (e) { /* noop */ }
  try { ({ AuthProvider } = require('../contexts/AuthContext')); } catch (e) { /* noop */ }
}

/**
 * The mocked useAuth() in setupTests.js reads from global.__TEST_AUTH_VALUE__
 * which renderWithProviders sets before each render.
 */
const AuthContext = React.createContext({});

// This function is used by tests when they need to access the raw context
const useTestAuth = () => React.useContext(AuthContext);

/**
 * Default auth value for tests (no user, not authenticated).
 * Tests can override any field via the `authValue` option.
 */
const defaultAuth = {
  user: null,
  loading: false,
  isAuthenticated: false,
  login: jest.fn().mockResolvedValue({ success: true }),
  register: jest.fn().mockResolvedValue({ success: true }),
  logout: jest.fn().mockResolvedValue(),
  updateProfile: jest.fn().mockResolvedValue({ success: true }),
  changePassword: jest.fn().mockResolvedValue({ success: true }),
  hasRole: jest.fn(() => false),
  hasAnyRole: jest.fn(() => false),
  isAdmin: false,
  isHR: false,
  isManager: false,
  isEmployee: false,
  canManageEmployees: false,
  canApproveLeaves: false,
  canViewPayroll: false,
  canManageSettings: false,
};

/**
 * Build a complete auth context value from a user object.
 * This sets all the computed booleans correctly.
 */
const buildAuthValue = (overrides = {}) => {
  const merged = { ...defaultAuth, ...overrides };
  const user = merged.user;
  const role = user?.role;

  return {
    ...merged,
    isAuthenticated: !!user,
    isAdmin: role === 'admin',
    isHR: role === 'hr',
    isManager: role === 'manager',
    isEmployee: role === 'employee',
    canManageEmployees: ['admin', 'hr'].includes(role),
    canApproveLeaves: ['admin', 'hr', 'manager'].includes(role),
    canViewPayroll: ['admin', 'hr'].includes(role),
    canManageSettings: role === 'admin',
    hasRole: jest.fn((r) => r === role),
    hasAnyRole: jest.fn((roles) => roles.includes(role)),
  };
};

/**
 * Custom render function that wraps components with all necessary providers
 * including AuthContext, React Query, Snackbar and Router.
 *
 * In UI mode — uses the mock AuthContext (via global.__TEST_AUTH_VALUE__).
 * In Integration mode — uses real providers; the real AuthContext reads from
 * the JWT cookie set by integrationAuth.loginAs().
 */
export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    route = '/',
    authValue = null,
    queryClient = null,
    ...renderOptions
  } = {}
) {
  window.history.pushState({}, 'Test page', route);

  const auth = authValue ? buildAuthValue(authValue) : defaultAuth;
  global.__TEST_AUTH_VALUE__ = auth;
  const qc = queryClient || new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  let AllTheProviders;

  if (isIntegrationMode) {
    // Integration mode: wrap with real providers matching App.js nesting order:
    // LoadingProvider → NotificationProvider → SnackbarProvider → AuthProvider → Router
    AllTheProviders = ({ children }) => {
      let tree = children;
      // Innermost → outermost wrapping
      tree = <BrowserRouter>{tree}</BrowserRouter>;
      if (AuthProvider) tree = <AuthProvider>{tree}</AuthProvider>;
      tree = <SnackbarProvider maxSnack={3}>{tree}</SnackbarProvider>;
      if (NotificationProvider) tree = <NotificationProvider>{tree}</NotificationProvider>;
      if (LoadingProvider) tree = <LoadingProvider>{tree}</LoadingProvider>;
      tree = <QueryClientProvider client={qc}>{tree}</QueryClientProvider>;
      return tree;
    };
  } else {
    // UI mode: mock AuthContext via global ref.
    // Use createMemoryRouter + RouterProvider (data router) to support hooks like
    // useBlocker that require a data router context (not available in BrowserRouter).
    AllTheProviders = ({ children }) => {
      const router = createMemoryRouter(
        [
          {
            path: '*',
            element: (
              <QueryClientProvider client={qc}>
                <SnackbarProvider maxSnack={3}>
                  <AuthContext.Provider value={auth}>
                    {children}
                  </AuthContext.Provider>
                </SnackbarProvider>
              </QueryClientProvider>
            ),
          },
        ],
        { initialEntries: [route] },
      );
      return <RouterProvider router={router} />;
    };
  }

  return {
    ...render(ui, { wrapper: AllTheProviders, ...renderOptions }),
    // Expose helpers for test assertions
    auth,
    queryClient: qc,
  };
}

// Export the test AuthContext so tests can provide it directly if needed
export { AuthContext as TestAuthContext, useTestAuth, buildAuthValue };

/**
 * Returns the current auth value. Used by the mocked useAuth() in setupTests.js.
 */
export const getCurrentAuthValue = () => global.__TEST_AUTH_VALUE__ || defaultAuth;

/**
 * Create mock authenticated user
 */
export const createMockUser = (role = 'employee') => ({
  id: 1,
  email: `${role}@test.com`,
  role: role,
  firstName: 'Test',
  lastName: 'User',
  isActive: true,
  employeeId: 'EMP001',
  employee: {
    id: 100,
    employeeId: 'EMP001',
    firstName: 'Test',
    lastName: 'User',
  },
});

/**
 * Create mock employee data
 */
export const createMockEmployee = (overrides = {}) => ({
  id: 1,
  employeeId: 'EMP001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@test.com',
  phone: '1234567890',
  dateOfJoining: '2024-01-01',
  employmentStatus: 'Active',
  employmentType: 'Full-time',
  designation: 'Software Engineer',
  department: 'Engineering',
  basicSalary: 50000,
  ...overrides,
});

/**
 * Create mock leave request
 */
export const createMockLeaveRequest = (overrides = {}) => ({
  id: 1,
  employeeId: 1,
  leaveType: 'Annual Leave',
  startDate: '2026-02-01',
  endDate: '2026-02-05',
  days: 5,
  reason: 'Family vacation',
  status: 'Pending',
  appliedOn: '2026-01-15',
  ...overrides,
});

/**
 * Create mock timesheet entry
 */
export const createMockTimesheet = (overrides = {}) => ({
  id: 1,
  employeeId: 1,
  projectId: 1,
  taskId: 1,
  date: '2026-01-20',
  hours: 8,
  description: 'Development work',
  status: 'Pending',
  ...overrides,
});

/**
 * Create mock payslip
 */
export const createMockPayslip = (overrides = {}) => ({
  id: 1,
  employeeId: 1,
  month: 1,
  year: 2026,
  basicSalary: 50000,
  hra: 20000,
  grossSalary: 82850,
  netSalary: 66850,
  pf: 6000,
  professionalTax: 200,
  incomeTax: 5000,
  totalDeductions: 16000,
  status: 'Generated',
  ...overrides,
});

/**
 * Mock API response
 */
export const mockApiResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  headers: new Headers(),
});

/**
 * Mock API error response
 */
export const mockApiError = (message = 'API Error', status = 500) => ({
  ok: false,
  status,
  json: async () => ({ message, error: message }),
  headers: new Headers(),
});

/**
 * Wait for async updates
 */
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { renderWithProviders as render };
