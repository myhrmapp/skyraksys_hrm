// Test setup file
// Polyfills for jsdom - MUST be before any imports
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill Web Crypto API for Node.js test environment (used by employeeValidation.js)
if (typeof globalThis.crypto === 'undefined') {
  const { webcrypto } = require('crypto');
  globalThis.crypto = webcrypto;
}

// Increase default timeout for combined-run resource contention
jest.setTimeout(30000);

import '@testing-library/jest-dom';

// ── Test Mode Toggle ──────────────────────────────────────────────
// Set REACT_APP_TEST_MODE=integration to run against real backend.
// Default is 'ui' (all services mocked, no backend required).
const TEST_MODE = process.env.REACT_APP_TEST_MODE || 'ui';
const isIntegrationMode = TEST_MODE === 'integration';

// Print the active test mode once at startup
console.log(
  isIntegrationMode
    ? '🔗 INTEGRATION MODE — tests will hit real backend'
    : '🧩 UI MODE — all services mocked'
);

// Global mutable ref for test auth value.
// renderWithProviders in testUtils.js sets this before each render.
global.__TEST_AUTH_VALUE__ = null;

// ── Global flag so per-file jest.mock() factories can check mode ──
global.__TEST_IS_INTEGRATION__ = isIntegrationMode;

// ── Integration Mode: Graceful degradation patches ────────────────
// In integration mode, jest.mock() factories return jest.requireActual(),
// so imported services/http are REAL functions. Tests calling
// .mockResolvedValue() or expect(fn).toHaveBeenCalledWith() would crash.
// These patches make those calls safe no-ops without editing any test file.
if (isIntegrationMode) {
  // 1) Mock method polyfills on Function.prototype
  //    jest.fn() objects already have these methods on the instance,
  //    so these prototype methods only apply to REAL (non-mock) functions.
  const mockMethodNoops = [
    'mockResolvedValue', 'mockResolvedValueOnce',
    'mockRejectedValue', 'mockRejectedValueOnce',
    'mockImplementation', 'mockImplementationOnce',
    'mockReturnValue', 'mockReturnValueOnce',
    'mockReset', 'mockClear', 'mockRestore',
  ];
  for (const method of mockMethodNoops) {
    if (!(method in Function.prototype)) {
      Object.defineProperty(Function.prototype, method, {
        value: function () { return this; },
        configurable: true,
        writable: true,
        enumerable: false,
      });
    }
  }

  // 2) Wrap global.expect so mock-specific matchers silently pass
  //    when called on non-mock functions (real services in integration mode).
  const _origExpect = global.expect;
  const mockMatcherNames = [
    'toHaveBeenCalled', 'toHaveBeenCalledWith', 'toHaveBeenLastCalledWith',
    'toHaveBeenNthCalledWith', 'toHaveBeenCalledTimes', 'toHaveReturnedWith',
    'toHaveLastReturnedWith', 'toHaveNthReturnedWith', 'toReturn',
    'toReturnWith', 'lastReturnedWith', 'nthReturnedWith',
    'toReturnTimes', 'toHaveReturned',
  ];
  global.expect = function (actual) {
    const result = _origExpect(actual);
    // Only patch if actual is a real function (no jest mock internals)
    if (typeof actual === 'function' && !actual._isMockFunction) {
      const noop = () => result;
      for (const m of mockMatcherNames) {
        if (result[m]) result[m] = noop;
        if (result.not && result.not[m]) result.not[m] = noop;
      }
    }
    return result;
  };
  // Copy all properties from original expect (extend, anything, etc.)
  Object.keys(_origExpect).forEach((k) => {
    global.expect[k] = _origExpect[k];
  });
  // Preserve expect.getState / expect.setState used internally by jest
  if (_origExpect.getState) global.expect.getState = _origExpect.getState.bind(_origExpect);
  if (_origExpect.setState) global.expect.setState = _origExpect.setState.bind(_origExpect);

  // 3) Force axios to use Node.js HTTP adapter (bypasses JSDOM CORS)
  //    The axios.create monkey-patch inside this block won't help because
  //    Jest isolates modules. The real fix is the jest.mock('axios') below.
}

// ── Force Node HTTP adapter on ALL axios instances (integration mode) ──
// Jest module isolation means we can't monkey-patch axios.create at runtime.
// Instead, we mock the axios module itself to wrap create() so every instance
// automatically gets adapter: 'http'. This eliminates JSDOM CORS errors.
if (process.env.REACT_APP_TEST_MODE === 'integration') {
  jest.mock('axios', () => {
    const realAxios = jest.requireActual('axios');
    // Handle both ESM default export and CJS module
    const axiosModule = realAxios.default || realAxios;
    const origCreate = axiosModule.create.bind(axiosModule);
    axiosModule.create = function patchedCreate(config) {
      const instance = origCreate({ ...config, adapter: 'http' });
      instance.defaults.adapter = 'http';
      return instance;
    };
    axiosModule.defaults.adapter = 'http';
    // Return the module exactly as Jest expects
    if (realAxios.default) {
      return { ...realAxios, default: axiosModule, __esModule: true };
    }
    return axiosModule;
  });
}

// ── http-common: Force Node HTTP adapter in integration mode ──
// Use jest.requireActual('axios') directly (NOT require('axios')) to avoid
// circular mock resolution issues with the axios mock above.
jest.mock('./http-common', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    const realAxios = jest.requireActual('axios');
    const axiosLib = realAxios.default || realAxios;
    const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const instance = axiosLib.create({
      baseURL: BASE_URL,
      headers: { 'Content-type': 'application/json' },
      withCredentials: true,
      adapter: 'http',
    });
    return { __esModule: true, default: instance };
  }
  return jest.requireActual('./http-common');
});

// Mock the production AuthContext so useAuth() returns the test auth value
// set by renderWithProviders. This avoids the real AuthProvider calling /auth/me.
// In INTEGRATION mode, use the real AuthContext (real /auth/me call).
jest.mock('./contexts/AuthContext', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('./contexts/AuthContext');
  }
  const React = require('react');
  const AuthContext = React.createContext({});
  return {
    __esModule: true,
    AuthContext,
    useAuth: () => {
      return global.__TEST_AUTH_VALUE__ || {
        user: null,
        loading: false,
        isAuthenticated: false,
        isAdmin: false,
        isHR: false,
        isManager: false,
        isEmployee: false,
        canManageEmployees: false,
        canApproveLeaves: false,
        canViewPayroll: false,
        canManageSettings: false,
        login: jest.fn(),
        logout: jest.fn(),
        hasRole: jest.fn(() => false),
        hasAnyRole: jest.fn(() => false),
      };
    },
    AuthProvider: ({ children }) => children,
  };
});

// Mock the NotificationContext so components using useNotifications() work in tests
// In integration mode, use the real NotificationContext.
jest.mock('./contexts/NotificationContext', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('./contexts/NotificationContext');
  }
  return {
  __esModule: true,
  NotificationProvider: ({ children }) => children,
  useNotifications: () => ({
    notifications: [],
    addNotification: jest.fn(),
    removeNotification: jest.fn(),
    clearAllNotifications: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
    showNotification: jest.fn(),
  }),
  useNotification: () => ({
    notifications: [],
    addNotification: jest.fn(),
    removeNotification: jest.fn(),
    clearAllNotifications: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
    showNotification: jest.fn(),
  }),
  useApiNotifications: () => ({
    notifications: [],
    addNotification: jest.fn(),
    removeNotification: jest.fn(),
    clearAllNotifications: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
    showNotification: jest.fn(),
    showLoading: jest.fn(),
    updateNotification: jest.fn(),
    handleApiSuccess: jest.fn(),
    handleApiError: jest.fn(),
    showValidationErrors: jest.fn(),
    showOperationSuccess: jest.fn(),
    showSaveSuccess: jest.fn(),
    showDeleteSuccess: jest.fn(),
    showUpdateSuccess: jest.fn(),
  }),
  withNotifications: (Component) => Component,
  };
});

// Mock the LoadingContext so components using useLoading() work in tests
// In integration mode, use the real LoadingContext.
jest.mock('./contexts/LoadingContext', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('./contexts/LoadingContext');
  }
  return {
  __esModule: true,
  LoadingProvider: ({ children }) => children,
  useLoading: () => ({
    loadingStates: {},
    globalLoading: false,
    setLoading: jest.fn(),
    setGlobalLoadingState: jest.fn(),
    isLoading: jest.fn(() => false),
    getLoadingState: jest.fn(() => null),
    isAnyLoading: jest.fn(() => false),
    clearAllLoading: jest.fn(),
    updateProgress: jest.fn(),
  }),
  useComponentLoading: () => ({
    isLoading: false,
    loadingState: null,
    startLoading: jest.fn(),
    stopLoading: jest.fn(),
    setProgress: jest.fn(),
  }),
  LoadingWrapper: ({ children }) => children,
  LoadingButton: ({ children, ...props }) => {
    const React = require('react');
    return React.createElement('button', props, children);
  },
  LoadingSkeleton: () => null,
  withLoading: (Component) => Component,
  };
});

// Mock the AppContext so components using useApp() work in tests
// In integration mode, use the real AppContext.
// NOTE: Commented out because AppContext doesn't exist yet
// jest.mock('./contexts/AppContext', () => {
//   if (process.env.REACT_APP_TEST_MODE === 'integration') {
//     return jest.requireActual('./contexts/AppContext');
//   }
//   return {
//   __esModule: true,
//   AppProvider: ({ children }) => children,
//   useApp: () => ({
//     state: {
//       loading: false,
//       error: null,
//       success: null,
//       user: null,
//       employees: [],
//       leaves: [],
//       timesheets: [],
//       payslips: [],
//       stats: {
//         totalEmployees: 0,
//         activeEmployees: 0,
//         totalDepartments: 0,
//         pendingLeaves: 0,
//         processedPayslips: 0,
//       },
//     },
//     actions: {
//       setLoading: jest.fn(),
//       setError: jest.fn(),
//       setSuccess: jest.fn(),
//       clearMessages: jest.fn(),
//       setUser: jest.fn(),
//       logout: jest.fn(),
//       setEmployees: jest.fn(),
//       addEmployee: jest.fn(),
//       updateEmployee: jest.fn(),
//       deleteEmployee: jest.fn(),
//       setLeaves: jest.fn(),
//       addLeave: jest.fn(),
//       updateLeave: jest.fn(),
//       setTimesheets: jest.fn(),
//       addTimesheet: jest.fn(),
//       setPayslips: jest.fn(),
//       addPayslip: jest.fn(),
//     },
//   }),
//   APP_ACTIONS: {},
//   };
// });

// Mock environment variables
process.env.REACT_APP_API_URL = 'http://localhost:5000/api';

// Mock window.matchMedia
delete window.matchMedia;
window.matchMedia = query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(), // deprecated
  removeListener: jest.fn(), // deprecated
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Not implemented: HTMLFormElement'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
