/**
 * EmployeeForm.test.js
 *
 * Tests for TabBasedEmployeeForm — the add/edit employee form.
 *
 * Architecture:
 *   - Component: TabBasedEmployeeForm (default export from EmployeeForm.js)
 *   - Logic: useEmployeeForm hook (fully mocked)
 *   - Child components: EmployeeFormHeader, EmployeeFormActions, EmployeeFormTabs,
 *                       TabPanel, PersonalInformationTab, EmploymentInformationTab,
 *                       SalaryStructureTab, ContactEmergencyTab, StatutoryBankingTab,
 *                       UserAccountTab (all stubbed to simplify)
 *   - Auth gate: Shows login redirect when not authenticated
 *   - Unsaved changes dialog with "Stay on Page" / "Leave Without Saving"
 */

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';
import TabBasedEmployeeForm from '../EmployeeForm';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
}));

// Default hook return value factory
const createHookDefaults = (overrides = {}) => ({
  activeTab: 0,
  formData: {},
  errors: {},
  touchedFields: {},
  isLoading: false,
  submitError: null,
  submitSuccess: null,
  departments: [{ id: 1, name: 'Engineering' }],
  positions: [{ id: 1, name: 'Developer' }],
  managers: [{ id: 1, firstName: 'Boss', lastName: 'Man' }],
  loadingRefData: false,
  selectedPhoto: null,
  photoPreview: '',
  showUnsavedDialog: false,
  lastSaved: null,
  autoSaving: false,
  currentUser: createMockUser('admin'),
  isAuthenticated: true,
  isEditMode: false,
  isCurrentTabValid: true,
  getTabValidationStatus: jest.fn(() => ({ isValid: true, hasErrors: false })),
  setActiveTab: jest.fn(),
  handleFieldChange: jest.fn(),
  handleFieldBlur: jest.fn(),
  handleTabChange: jest.fn(),
  handleSubmit: jest.fn(),
  handleBackToEmployees: jest.fn(),
  handlePhotoSelect: jest.fn(),
  handlePhotoRemove: jest.fn(),
  handleSaveAsDraft: jest.fn(),
  handleCancelNavigation: jest.fn(),
  handleConfirmNavigation: jest.fn(),
  ...overrides,
});

let mockHookReturn = createHookDefaults();

// Mock the useEmployeeForm hook
jest.mock('../hooks/useEmployeeForm', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../hooks/useEmployeeForm');
  }
  return {
    useEmployeeForm: () => mockHookReturn,
  };
});

// Stub child components to isolate tests
jest.mock('../components/EmployeeFormHeader', () => {
  return function MockHeader({ isEditMode, onBack }) {
    return (
      <div data-testid="employee-form-header">
        {isEditMode ? 'Edit Employee' : 'Add New Employee'}
        <button onClick={onBack}>Back</button>
      </div>
    );
  };
});

jest.mock('../components/EmployeeFormActions', () => {
  return function MockActions({ onBack, onSaveDraft, onSubmit, isLoading, isEditMode }) {
    return (
      <div data-testid="employee-form-actions">
        <button onClick={onBack}>Back to Employees</button>
        <button onClick={onSaveDraft} disabled={isLoading}>Save as Draft</button>
        <button onClick={onSubmit} disabled={isLoading}>
          {isLoading ? 'Submitting...' : isEditMode ? 'Update Employee' : 'Submit Employee'}
        </button>
      </div>
    );
  };
});

jest.mock('../components/EmployeeFormTabs', () => {
  return function MockTabs({ activeTab }) {
    return (
      <div data-testid="employee-form-tabs">
        <span>Tab {activeTab}</span>
      </div>
    );
  };
});

jest.mock('../components/TabPanel', () => {
  return function MockTabPanel({ children, value, index }) {
    return value === index ? <div data-testid={`tab-panel-${index}`}>{children}</div> : null;
  };
});

jest.mock('../tabs/PersonalInformationTab', () => () => <div data-testid="personal-tab">Personal Information</div>);
jest.mock('../tabs/EmploymentInformationTab', () => () => <div data-testid="employment-tab">Employment Information</div>);
jest.mock('../tabs/SalaryStructureTab', () => () => <div data-testid="salary-tab">Salary Structure</div>);
jest.mock('../tabs/ContactEmergencyTab', () => () => <div data-testid="contact-tab">Contact Emergency</div>);
jest.mock('../tabs/StatutoryBankingTab', () => () => <div data-testid="statutory-tab">Statutory Banking</div>);
jest.mock('../tabs/UserAccountTab', () => () => <div data-testid="user-account-tab">User Account</div>);

describe('TabBasedEmployeeForm Component', () => {
  const adminUser = createMockUser('admin');

  beforeEach(() => {
    jest.clearAllMocks();
    mockHookReturn = createHookDefaults();
  });

  // ─── Auth Gate ──────────────────────────────────────────

  describe('Authentication Gate', () => {
    it('should show login redirect when not authenticated', () => {
      mockHookReturn = createHookDefaults({ isAuthenticated: false });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByText(/you need to be logged in/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument();
    });

    it('should navigate to /login when Go to Login is clicked', async () => {
      const user = userEvent.setup();
      mockHookReturn = createHookDefaults({ isAuthenticated: false });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      await user.click(screen.getByRole('button', { name: /go to login/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should show "Add New Employee" title on auth gate for create mode', () => {
      mockHookReturn = createHookDefaults({ isAuthenticated: false, isEditMode: false });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByText('Add New Employee')).toBeInTheDocument();
    });

    it('should show "Edit Employee" title on auth gate for edit mode', () => {
      mockHookReturn = createHookDefaults({ isAuthenticated: false, isEditMode: true });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
    });
  });

  // ─── Loading State ──────────────────────────────────────

  describe('Loading State', () => {
    it('should show loading spinner when loadingRefData is true', () => {
      mockHookReturn = createHookDefaults({ loadingRefData: true });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByText('Loading form data...')).toBeInTheDocument();
    });

    it('should show preparation text during loading', () => {
      mockHookReturn = createHookDefaults({ loadingRefData: true });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByText(/prepare the employee creation form/i)).toBeInTheDocument();
    });
  });

  // ─── Form Rendering ────────────────────────────────────

  describe('Form Rendering', () => {
    it('should render the form header', () => {
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByTestId('employee-form-header')).toBeInTheDocument();
    });

    it('should render the form tabs', () => {
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByTestId('employee-form-tabs')).toBeInTheDocument();
    });

    it('should render the form action buttons', () => {
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByTestId('employee-form-actions')).toBeInTheDocument();
    });

    it('should render Personal Information tab when activeTab is 0', () => {
      mockHookReturn = createHookDefaults({ activeTab: 0 });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByTestId('personal-tab')).toBeInTheDocument();
    });

    it('should not render Personal tab when a different tab is active', () => {
      mockHookReturn = createHookDefaults({ activeTab: 2 });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.queryByTestId('personal-tab')).not.toBeInTheDocument();
      expect(screen.getByTestId('contact-tab')).toBeInTheDocument();
    });
  });

  // ─── Error / Success Messages ───────────────────────────

  describe('Error and Success Messages', () => {
    it('should show submit error alert', () => {
      mockHookReturn = createHookDefaults({ submitError: 'Employee ID already exists' });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByText('Employee ID already exists')).toBeInTheDocument();
    });

    it('should show success alert after submission', () => {
      mockHookReturn = createHookDefaults({ submitSuccess: 'Employee created successfully!' });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByText('Employee created successfully!')).toBeInTheDocument();
    });
  });

  // ─── Form Actions ──────────────────────────────────────

  describe('Form Actions', () => {
    it('should call handleSubmit when Submit Employee is clicked', async () => {
      const user = userEvent.setup();
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      await user.click(screen.getByRole('button', { name: /submit employee/i }));
      expect(mockHookReturn.handleSubmit).toHaveBeenCalled();
    });

    it('should call handleSaveAsDraft when Save as Draft is clicked', async () => {
      const user = userEvent.setup();
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      await user.click(screen.getByRole('button', { name: /save as draft/i }));
      expect(mockHookReturn.handleSaveAsDraft).toHaveBeenCalled();
    });

    it('should call handleBackToEmployees on Back button click', async () => {
      const user = userEvent.setup();
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      await user.click(screen.getByRole('button', { name: /back to employees/i }));
      expect(mockHookReturn.handleBackToEmployees).toHaveBeenCalled();
    });

    it('should show "Update Employee" for edit mode', () => {
      mockHookReturn = createHookDefaults({ isEditMode: true });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByRole('button', { name: /update employee/i })).toBeInTheDocument();
    });

    it('should show "Submitting..." when form is loading', () => {
      mockHookReturn = createHookDefaults({ isLoading: true });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByText(/submitting/i)).toBeInTheDocument();
    });
  });

  // ─── Unsaved Changes Dialog ────────────────────────────

  describe('Unsaved Changes Dialog', () => {
    it('should show unsaved dialog when showUnsavedDialog is true', () => {
      mockHookReturn = createHookDefaults({ showUnsavedDialog: true });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    it('should show "Stay on Page" button', () => {
      mockHookReturn = createHookDefaults({ showUnsavedDialog: true });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByRole('button', { name: /stay on page/i })).toBeInTheDocument();
    });

    it('should show "Leave Without Saving" button', () => {
      mockHookReturn = createHookDefaults({ showUnsavedDialog: true });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      expect(screen.getByRole('button', { name: /leave without saving/i })).toBeInTheDocument();
    });

    it('should call handleCancelNavigation on Stay on Page', async () => {
      const user = userEvent.setup();
      mockHookReturn = createHookDefaults({ showUnsavedDialog: true });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      await user.click(screen.getByRole('button', { name: /stay on page/i }));
      expect(mockHookReturn.handleCancelNavigation).toHaveBeenCalled();
    });

    it('should call handleConfirmNavigation on Leave Without Saving', async () => {
      const user = userEvent.setup();
      mockHookReturn = createHookDefaults({ showUnsavedDialog: true });
      render(<TabBasedEmployeeForm />, { authValue: { user: adminUser } });
      await user.click(screen.getByRole('button', { name: /leave without saving/i }));
      expect(mockHookReturn.handleConfirmNavigation).toHaveBeenCalled();
    });
  });
});
