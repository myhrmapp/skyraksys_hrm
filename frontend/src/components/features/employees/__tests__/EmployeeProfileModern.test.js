/**
 * EmployeeProfileModern.test.js
 *
 * Tests for the Employee Profile view (admin and self modes).
 *
 * Architecture:
 *   - Component: EmployeeProfileModern (default export)
 *   - Data: useEmployeeProfile hook (fully mocked)
 *   - Metadata: useMetadataCache hook (mocked)
 *   - Child components: All stubbed to isolate rendering logic
 *   - Modes: 'admin' (default) — full edit; 'self' — read-only
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser, createMockEmployee } from '../../../../test-utils/testUtils';
import EmployeeProfileModern from '../EmployeeProfileModern';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
}));

// Default hook state factory
const createProfileHookDefaults = (overrides = {}) => ({
  employee: createMockEmployee(),
  loading: false,
  editing: false,
  setEditing: jest.fn(),
  saving: false,
  handleSave: jest.fn(),
  handleCancel: jest.fn(),
  handleChange: jest.fn(),
  handleSalaryChange: jest.fn(),
  departments: [{ id: 1, name: 'Engineering' }],
  positions: [{ id: 1, name: 'Developer' }],
  managers: [{ id: 1, firstName: 'Boss', lastName: 'Man' }],
  photoPreview: '',
  selectedPhoto: null,
  handlePhotoSelect: jest.fn(),
  handlePhotoRemove: jest.fn(),
  showSensitive: false,
  setShowSensitive: jest.fn(),
  showStatutory: false,
  setShowStatutory: jest.fn(),
  canEditSensitive: true,
  canEdit: true,
  formatDate: jest.fn((d) => d || ''),
  formatCurrency: jest.fn((v) => `$${v}`),
  navigate: mockNavigate,
  id: '1',
  ...overrides,
});

let mockProfileHook = createProfileHookDefaults();

jest.mock('../hooks/useEmployeeProfile', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../hooks/useEmployeeProfile');
  }
  return {
    __esModule: true,
    default: () => mockProfileHook,
    useEmployeeProfile: () => mockProfileHook,
  };
});

// Mock useMetadataCache
jest.mock('../../../../hooks/useMetadataCache', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../hooks/useMetadataCache');
  }
  return {
    useMetadataCache: () => ({
      departments: [],
      positions: [],
      managers: [],
    }),
  };
});

// Note: jest.mock paths for component imports must match exactly what the SOURCE component imports.
// EmployeeProfileModern.js imports '../../payslip/PayslipViewer' (relative to itself),
// which resolves to 'src/components/payslip/PayslipViewer'.
// jest.mock resolves paths from the test file OR as module names.

// Stub child components
jest.mock('../components/EmployeeProfileHeader', () => {
  return function MockProfileHeader({ editing, canEdit, mode, onBack }) {
    return (
      <div data-testid="profile-header">
        <span>{mode === 'self' ? 'My Profile' : 'Employee Profile'}</span>
        {canEdit && !editing && <button data-testid="edit-btn">Edit</button>}
        <button onClick={onBack}>Back</button>
      </div>
    );
  };
});

jest.mock('../components/EmployeeProfileCard', () => {
  return function MockProfileCard({ employee }) {
    return <div data-testid="profile-card">{employee?.firstName} {employee?.lastName}</div>;
  };
});

jest.mock('../components/PersonalInfoSection', () => {
  return function MockPersonal({ employee }) {
    return <div data-testid="personal-info">Personal: {employee?.email}</div>;
  };
});

jest.mock('../components/EmploymentInfoSection', () => {
  return function MockEmployment({ employee }) {
    return <div data-testid="employment-info">Employment: {employee?.department}</div>;
  };
});

jest.mock('../components/SalaryInfoSection', () => {
  return function MockSalary({ showSalary, canEditSensitive }) {
    return (
      <div data-testid="salary-info">
        {showSalary ? 'Salary Visible' : 'Salary Hidden'}
        {canEditSensitive && <span>Can Edit</span>}
      </div>
    );
  };
});

jest.mock('../components/StatutoryInfoSection', () => {
  return function MockStatutory({ showStatutory, canEditSensitive }) {
    return (
      <div data-testid="statutory-info">
        {showStatutory ? 'Statutory Visible' : 'Statutory Hidden'}
      </div>
    );
  };
});

jest.mock('../../../payslip/PayslipViewer', () => {
  return function MockPayslipViewer({ open }) {
    return open ? <div data-testid="payslip-viewer">Payslip Viewer Open</div> : null;
  };
});

describe('EmployeeProfileModern Component', () => {
  const adminUser = createMockUser('admin');

  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileHook = createProfileHookDefaults();
  });

  // ─── Loading State ──────────────────────────────────────

  describe('Loading State', () => {
    it('should show loading spinner when data is loading', () => {
      mockProfileHook = createProfileHookDefaults({ loading: true });
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should not render profile content while loading', () => {
      mockProfileHook = createProfileHookDefaults({ loading: true });
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.queryByTestId('profile-header')).not.toBeInTheDocument();
    });
  });

  // ─── Not Found ──────────────────────────────────────────

  describe('Employee Not Found', () => {
    it('should show error alert when employee is null', () => {
      mockProfileHook = createProfileHookDefaults({ employee: null });
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.getByText('Employee not found')).toBeInTheDocument();
    });
  });

  // ─── Admin Mode Rendering ──────────────────────────────

  describe('Admin Mode', () => {
    it('should render profile header', () => {
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.getByTestId('profile-header')).toBeInTheDocument();
    });

    it('should render profile card with employee name', () => {
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.getByTestId('profile-card')).toHaveTextContent('John Doe');
    });

    it('should render personal info section', () => {
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.getByTestId('personal-info')).toBeInTheDocument();
    });

    it('should render employment info section', () => {
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.getByTestId('employment-info')).toBeInTheDocument();
    });

    it('should render salary info section', () => {
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.getByTestId('salary-info')).toBeInTheDocument();
    });

    it('should render statutory info section', () => {
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.getByTestId('statutory-info')).toBeInTheDocument();
    });

    it('should show edit button when canEdit in admin mode', () => {
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.getByTestId('edit-btn')).toBeInTheDocument();
    });

    it('should show salary as hidden by default in admin mode', () => {
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.getByText('Salary Hidden')).toBeInTheDocument();
    });
  });

  // ─── Self Mode ──────────────────────────────────────────

  describe('Self Mode', () => {
    it('should render profile in self mode', () => {
      render(<EmployeeProfileModern mode="self" />, { authValue: { user: adminUser } });
      expect(screen.getByTestId('profile-header')).toBeInTheDocument();
      expect(screen.getByText('My Profile')).toBeInTheDocument();
    });

    it('should force canEdit to false in self mode (no edit button)', () => {
      render(<EmployeeProfileModern mode="self" />, { authValue: { user: adminUser } });
      // canEdit is passed as false in self mode
      expect(screen.queryByTestId('edit-btn')).not.toBeInTheDocument();
    });

    it('should always show salary in self mode', () => {
      render(<EmployeeProfileModern mode="self" />, { authValue: { user: adminUser } });
      expect(screen.getByText('Salary Visible')).toBeInTheDocument();
    });

    it('should always show statutory in self mode', () => {
      render(<EmployeeProfileModern mode="self" />, { authValue: { user: adminUser } });
      expect(screen.getByText('Statutory Visible')).toBeInTheDocument();
    });
  });

  // ─── Edit Mode (Floating Action Bar) ──────────────────

  describe('Edit Mode', () => {
    it('should show floating action bar when editing', () => {
      mockProfileHook = createProfileHookDefaults({ editing: true });
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.getByText('Edit Mode Active')).toBeInTheDocument();
    });

    it('should show Cancel button in edit mode', () => {
      mockProfileHook = createProfileHookDefaults({ editing: true });
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      // The floating bar Cancel (not the header)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should show Save Changes button in edit mode', () => {
      mockProfileHook = createProfileHookDefaults({ editing: true });
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should call handleCancel when Cancel is clicked', async () => {
      const user = userEvent.setup();
      mockProfileHook = createProfileHookDefaults({ editing: true });
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockProfileHook.handleCancel).toHaveBeenCalled();
    });

    it('should call handleSave when Save Changes is clicked', async () => {
      const user = userEvent.setup();
      mockProfileHook = createProfileHookDefaults({ editing: true });
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      expect(mockProfileHook.handleSave).toHaveBeenCalled();
    });

    it('should disable buttons when saving', () => {
      mockProfileHook = createProfileHookDefaults({ editing: true, saving: true });
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
    });

    it('should not show floating action bar when not editing', () => {
      render(<EmployeeProfileModern mode="admin" />, { authValue: { user: adminUser } });
      expect(screen.queryByText('Edit Mode Active')).not.toBeInTheDocument();
    });
  });
});
