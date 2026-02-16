/**
 * ModernPayrollManagement.test.js
 * Tests for the Payroll Management System (Admin/HR interface)
 *
 * The component uses `http` (axios) directly via React Query – NOT a payrollService.
 * Key data shapes:
 *   - payslips:  { success, data: [...], pagination: { totalRecords } }
 *   - employees: { success, data: [...] }
 *   - departments: { success, data: [...] }
 *   - templates: { success, data: [...] }
 * Payslip fields: id, payslipNumber, payPeriod, status (draft|finalized|paid|cancelled),
 *                 grossEarnings, totalDeductions, netPay, employee: { employeeId, firstName, lastName }
 */

import React from 'react';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockUser } from '../../../../test-utils/testUtils';
import ModernPayrollManagement from '../ModernPayrollManagement';

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

// Mock http-common (axios instance used directly by the component)
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
jest.mock('../../../../http-common', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../http-common');
  }
  return {
    __esModule: true,
    default: {
      get: (...args) => mockGet(...args),
      post: (...args) => mockPost(...args),
      put: (...args) => mockPut(...args),
      delete: (...args) => mockDelete(...args),
    },
  };
});

// Stub out child dialogs – they have their own tests
jest.mock('../EditPayslipDialog', () => {
  return function MockEditPayslipDialog({ open }) {
    return open ? <div data-testid="edit-payslip-dialog">EditPayslipDialog</div> : null;
  };
});

jest.mock('../../../common/ConfirmDialog', () => {
  return function MockConfirmDialog() {
    return <div data-testid="confirm-dialog" />;
  };
});

jest.mock('../../../../hooks/useConfirmDialog', () => ({
  __esModule: true,
  default: () => ({
    dialogProps: {},
    confirm: jest.fn(),
  }),
}));

/* ------------------------------------------------------------------ */
/*  Test data                                                          */
/* ------------------------------------------------------------------ */

const mockPayslips = [
  {
    id: 1,
    payslipNumber: 'PS-2025-001',
    payPeriod: 'January 2025',
    status: 'draft',
    grossEarnings: '50000',
    totalDeductions: '10000',
    netPay: '40000',
    employee: { employeeId: 'EMP001', firstName: 'John', lastName: 'Doe' },
    earnings: { basicSalary: 30000, hra: 15000, transport: 5000 },
    deductions: { pf: 6000, tax: 4000 },
  },
  {
    id: 2,
    payslipNumber: 'PS-2025-002',
    payPeriod: 'January 2025',
    status: 'finalized',
    grossEarnings: '60000',
    totalDeductions: '12000',
    netPay: '48000',
    employee: { employeeId: 'EMP002', firstName: 'Jane', lastName: 'Smith' },
    earnings: { basicSalary: 40000, hra: 15000, transport: 5000 },
    deductions: { pf: 7000, tax: 5000 },
  },
  {
    id: 3,
    payslipNumber: 'PS-2025-003',
    payPeriod: 'January 2025',
    status: 'paid',
    grossEarnings: '55000',
    totalDeductions: '11000',
    netPay: '44000',
    employee: { employeeId: 'EMP003', firstName: 'Alice', lastName: 'Johnson' },
    earnings: { basicSalary: 35000, hra: 15000, transport: 5000 },
    deductions: { pf: 6500, tax: 4500 },
  },
];

const mockEmployees = [
  { id: 1, employeeId: 'EMP001', firstName: 'John', lastName: 'Doe', status: 'Active' },
  { id: 2, employeeId: 'EMP002', firstName: 'Jane', lastName: 'Smith', status: 'Active' },
  { id: 3, employeeId: 'EMP003', firstName: 'Alice', lastName: 'Johnson', status: 'Active' },
];

const mockDepartments = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Finance' },
];

const mockTemplates = [
  { id: 1, name: 'Standard Template', isDefault: true },
  { id: 2, name: 'Custom Template', isDefault: false },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Configure mockGet to respond based on the URL path.
 * Defaults provide a fully loaded component. Override specific paths via `overrides`.
 */
const setupMockGet = (overrides = {}) => {
  mockGet.mockImplementation((url, _config) => {
    if (url.startsWith('/payslips')) {
      if (overrides['/payslips']) return overrides['/payslips']();
      return Promise.resolve({
        data: {
          success: true,
          data: mockPayslips,
          pagination: { totalRecords: mockPayslips.length },
        },
      });
    }
    if (url === '/employees') {
      if (overrides['/employees']) return overrides['/employees']();
      return Promise.resolve({
        data: { success: true, data: mockEmployees },
      });
    }
    if (url === '/departments') {
      if (overrides['/departments']) return overrides['/departments']();
      return Promise.resolve({
        data: { success: true, data: mockDepartments },
      });
    }
    if (url === '/payslip-templates/active') {
      if (overrides['/payslip-templates/active']) return overrides['/payslip-templates/active']();
      return Promise.resolve({
        data: { success: true, data: mockTemplates },
      });
    }
    // Fallback
    return Promise.resolve({ data: { success: true, data: [] } });
  });
};

const renderPayroll = (authOverrides = {}) => {
  const defaultUser = createMockUser('admin');
  return renderWithProviders(<ModernPayrollManagement />, {
    authValue: { user: defaultUser, ...authOverrides },
  });
};

/* ------------------------------------------------------------------ */
/*  Test suites                                                        */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  jest.clearAllMocks();
  setupMockGet();
});

// ────────────────── ACCESS CONTROL ──────────────────
describe('Access Control', () => {
  test('denies access for non-admin/non-HR users', () => {
    const empUser = createMockUser('employee');
    renderWithProviders(<ModernPayrollManagement />, {
      authValue: { user: empUser },
    });

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText('Payroll Management System')).not.toBeInTheDocument();
  });

  test('grants access for admin users', async () => {
    renderPayroll();

    expect(
      await screen.findByText('Payroll Management System')
    ).toBeInTheDocument();
  });

  test('grants access for HR users', async () => {
    const hrUser = createMockUser('hr');
    renderWithProviders(<ModernPayrollManagement />, {
      authValue: { user: hrUser },
    });

    expect(
      await screen.findByText('Payroll Management System')
    ).toBeInTheDocument();
  });
});

// ────────────────── PAGE LAYOUT ──────────────────
describe('Page Layout', () => {
  test('renders title and subtitle', async () => {
    renderPayroll();

    expect(await screen.findByText('Payroll Management System')).toBeInTheDocument();
    expect(
      screen.getByText(/comprehensive payslip generation, approval, and payment processing/i)
    ).toBeInTheDocument();
  });

  test('renders navigation tabs', async () => {
    renderPayroll();
    await screen.findByText('Payroll Management System');

    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /generate/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /process payments/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /reports/i })).toBeInTheDocument();
  });
});

// ────────────────── OVERVIEW TAB ──────────────────
describe('Overview Tab', () => {
  test('displays stat cards after data loads', async () => {
    renderPayroll();

    // Wait for payslips to load – the "Total Payslips" label appears in stat card
    await waitFor(() => {
      expect(screen.getByText('Total Payslips')).toBeInTheDocument();
    });

    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Finalized')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Total Payout Amount')).toBeInTheDocument();
  });

  test('renders quick action buttons', async () => {
    renderPayroll();
    await screen.findByText('Payroll Management System');

    expect(screen.getByRole('button', { name: /generate payslips/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export excel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  test('renders payslips table with data', async () => {
    renderPayroll();

    // Wait for payslip data to load — employee names appear in table rows
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  });

  test('renders table column headers', async () => {
    renderPayroll();
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Table column headers
    expect(screen.getByRole('columnheader', { name: /employee/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /pay period/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /gross earnings/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /deductions/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /net pay/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
  });

  test('shows status chips with correct labels', async () => {
    renderPayroll();
    await screen.findByText('EMP001');

    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('finalized')).toBeInTheDocument();
    expect(screen.getByText('paid')).toBeInTheDocument();
  });

  test('shows "No payslips found" when data is empty', async () => {
    setupMockGet({
      '/payslips': () =>
        Promise.resolve({
          data: { success: true, data: [], pagination: { totalRecords: 0 } },
        }),
    });

    renderPayroll();
    expect(await screen.findByText('No payslips found')).toBeInTheDocument();
  });
});

// ────────────────── TABS NAVIGATION ──────────────────
describe('Tab Navigation', () => {
  test('navigates to Generate tab', async () => {
    const user = userEvent.setup();
    renderPayroll();
    await screen.findByText('Payroll Management System');

    await user.click(screen.getByRole('tab', { name: /generate/i }));

    expect(await screen.findByText('Generate Payslips')).toBeInTheDocument();
    expect(screen.getByText('Select Employees')).toBeInTheDocument();
  });

  test('navigates to Reports tab', async () => {
    const user = userEvent.setup();
    renderPayroll();
    await screen.findByText('Payroll Management System');

    await user.click(screen.getByRole('tab', { name: /reports/i }));

    expect(await screen.findByText('Reports & Analytics')).toBeInTheDocument();
  });

  test('navigates to Process Payments tab showing finalized payslips', async () => {
    const user = userEvent.setup();
    renderPayroll();
    await screen.findByText('Payroll Management System');

    await user.click(screen.getByRole('tab', { name: /process payments/i }));

    // The process payments tab shows a table with title
    await waitFor(() => {
      expect(
        screen.getByText('Finalized Payslips - Ready for Payment Processing')
      ).toBeInTheDocument();
    });
  });
});

// ────────────────── GENERATE TAB ──────────────────
describe('Generate Tab', () => {
  test('displays employee list for selection', async () => {
    const user = userEvent.setup();
    renderPayroll();
    await screen.findByText('Payroll Management System');

    await user.click(screen.getByRole('tab', { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByText(/EMP001 - John Doe/)).toBeInTheDocument();
    });
    expect(screen.getByText(/EMP002 - Jane Smith/)).toBeInTheDocument();
    expect(screen.getByText(/EMP003 - Alice Johnson/)).toBeInTheDocument();
  });

  test('validate & generate button is disabled when no employees selected', async () => {
    const user = userEvent.setup();
    renderPayroll();
    await screen.findByText('Payroll Management System');

    await user.click(screen.getByRole('tab', { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByText(/EMP001 - John Doe/)).toBeInTheDocument();
    });

    const generateBtn = screen.getByRole('button', { name: /validate & generate/i });
    expect(generateBtn).toBeDisabled();
  });
});

// ────────────────── DATA FETCHING ──────────────────
describe('Data Fetching', () => {
  test('fetches payslips, employees, departments, and templates on mount', async () => {
    renderPayroll();
    await screen.findByText('EMP001');

    expect(mockGet).toHaveBeenCalledWith('/payslips', expect.objectContaining({ params: expect.any(Object) }));
    expect(mockGet).toHaveBeenCalledWith('/employees', expect.objectContaining({ params: expect.any(Object) }));
    expect(mockGet).toHaveBeenCalledWith('/departments');
    expect(mockGet).toHaveBeenCalledWith('/payslip-templates/active');
  });
});

// ────────────────── FILTERS ──────────────────
describe('Filters', () => {
  test('renders filter dropdowns (Month, Year, Status, Department)', async () => {
    renderPayroll();
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Filter controls — labels may appear in both filter and table header, so use getAllByText
    const monthLabels = screen.getAllByText('Month');
    expect(monthLabels.length).toBeGreaterThanOrEqual(1);

    const yearLabels = screen.getAllByText('Year');
    expect(yearLabels.length).toBeGreaterThanOrEqual(1);

    const statusLabels = screen.getAllByText('Status');
    expect(statusLabels.length).toBeGreaterThanOrEqual(1);

    const deptLabels = screen.getAllByText('Department');
    expect(deptLabels.length).toBeGreaterThanOrEqual(1);
  });

  test('renders search field', async () => {
    renderPayroll();
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(
      screen.getByPlaceholderText('Search employee name or ID...')
    ).toBeInTheDocument();
  });
});

// ────────────────── ERROR HANDLING ──────────────────
describe('Error Handling', () => {
  test('handles payslips fetch error gracefully', async () => {
    setupMockGet({
      '/payslips': () => Promise.reject(new Error('Network Error')),
    });

    renderPayroll();

    // Component should still render (React Query handles errors via onError callback)
    await waitFor(() => {
      expect(screen.getByText('Payroll Management System')).toBeInTheDocument();
    });
  });
});

// ────────────────── REPORTS TAB ──────────────────
describe('Reports Tab', () => {
  test('shows report cards and info alert', async () => {
    const user = userEvent.setup();
    renderPayroll();
    await screen.findByText('Payroll Management System');

    await user.click(screen.getByRole('tab', { name: /reports/i }));

    expect(await screen.findByText('Reports & Analytics')).toBeInTheDocument();
    expect(screen.getByText('Department Summary')).toBeInTheDocument();
    expect(screen.getByText('Month-over-Month Variance')).toBeInTheDocument();
    expect(screen.getByText('Statutory Deductions')).toBeInTheDocument();
    expect(
      screen.getByText(/comprehensive reporting features coming soon/i)
    ).toBeInTheDocument();
  });
});

// ────────────────── FINALIZE PAYSLIP ──────────────────
describe('Finalize Payslip', () => {
  test('clicking Finalize on a draft payslip calls PUT /payslips/:id/finalize', async () => {
    mockPut.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();
    renderPayroll();

    // Wait for the table to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // The first payslip (draft status) should have a Finalize button
    const finalizeButtons = screen.getAllByRole('button', { name: /finalize/i });
    expect(finalizeButtons.length).toBeGreaterThanOrEqual(1);

    await user.click(finalizeButtons[0]);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/payslips/1/finalize');
    });
  });

  test('finalize button only shown for draft payslips', async () => {
    // Only provide a finalized payslip
    setupMockGet({
      '/payslips': () =>
        Promise.resolve({
          data: {
            success: true,
            data: [mockPayslips[1]], // finalized only
            pagination: { totalRecords: 1 },
          },
        }),
    });

    renderPayroll();
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // No finalize button should be present
    expect(screen.queryByRole('button', { name: /^finalize$/i })).not.toBeInTheDocument();
  });
});

// ────────────────── MARK AS PAID ──────────────────
describe('Mark as Paid', () => {
  test('clicking Mark as Paid on a finalized payslip calls PUT /payslips/:id/mark-paid', async () => {
    mockPut.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();
    renderPayroll();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const markPaidButtons = screen.getAllByRole('button', { name: /mark as paid/i });
    expect(markPaidButtons.length).toBeGreaterThanOrEqual(1);

    await user.click(markPaidButtons[0]);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/payslips/2/mark-paid');
    });
  });

  test('mark as paid button only shown for finalized payslips', async () => {
    // Only draft payslips
    setupMockGet({
      '/payslips': () =>
        Promise.resolve({
          data: {
            success: true,
            data: [mockPayslips[0]], // draft
            pagination: { totalRecords: 1 },
          },
        }),
    });

    renderPayroll();
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /mark as paid/i })).not.toBeInTheDocument();
  });
});

// ────────────────── EXPORT EXCEL ──────────────────
describe('Export Excel', () => {
  test('clicking Export Excel triggers export handler', async () => {
    // Full manual mock: handle export route BEFORE the startsWith('/payslips') catch-all
    mockGet.mockImplementation((url, config) => {
      if (url === '/payslips/reports/export') {
        return Promise.resolve({ data: new Blob(['test-data']) });
      }
      if (url.startsWith('/payslips')) {
        return Promise.resolve({
          data: { success: true, data: mockPayslips, pagination: { totalRecords: mockPayslips.length } },
        });
      }
      if (url === '/employees') {
        return Promise.resolve({ data: { success: true, data: mockEmployees } });
      }
      if (url === '/departments') {
        return Promise.resolve({ data: { success: true, data: mockDepartments } });
      }
      if (url === '/payslip-templates/active') {
        return Promise.resolve({ data: { success: true, data: mockTemplates } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    // Mock createObjectURL and revokeObjectURL for download
    window.URL.createObjectURL = jest.fn(() => 'blob:test-url');
    window.URL.revokeObjectURL = jest.fn();

    const user = userEvent.setup();
    renderPayroll();
    await screen.findByText('Quick Actions');

    const exportBtn = screen.getByRole('button', { name: /export excel/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    }, { timeout: 5000 });
  });
});

// ────────────────── EMPLOYEE SELECTION IN GENERATE TAB ──────────────────
describe('Employee Selection in Generate Tab', () => {
  test('selecting employees enables the generate button', async () => {
    const user = userEvent.setup();
    renderPayroll();
    await screen.findByText('Payroll Management System');

    await user.click(screen.getByRole('tab', { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByText(/EMP001 - John Doe/)).toBeInTheDocument();
    });

    // Click the checkbox for first employee
    const checkboxes = screen.getAllByRole('checkbox');
    // Find the checkbox next to EMP001
    await user.click(checkboxes[0]);

    await waitFor(() => {
      const generateBtn = screen.getByRole('button', { name: /validate & generate/i });
      expect(generateBtn).not.toBeDisabled();
    });
  });
});

// ────────────────── VIEW PAYSLIP ──────────────────
describe('View Payslip', () => {
  test('clicking View Details opens payslip view dialog', async () => {
    const user = userEvent.setup();
    renderPayroll();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /view details/i });
    expect(viewButtons.length).toBeGreaterThanOrEqual(1);

    await user.click(viewButtons[0]);

    // The view dialog should appear (rendered by the component)
    await waitFor(() => {
      expect(screen.getByText(/payslip details/i)).toBeInTheDocument();
    });
  });
});

// ────────────────── CHECKBOX SELECT ALL ──────────────────
describe('Checkbox Select All', () => {
  test('selecting all checkboxes shows bulk actions toolbar', async () => {
    const user = userEvent.setup();
    renderPayroll();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find the select-all checkbox (first checkbox in the table header)
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(selectAllCheckbox);

    await waitFor(() => {
      expect(screen.getByText(/3 payslip\(s\) selected/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /bulk finalize/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulk mark paid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulk delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument();
  });

  test('Clear Selection clears all selected payslips', async () => {
    const user = userEvent.setup();
    renderPayroll();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(selectAllCheckbox);

    await waitFor(() => {
      expect(screen.getByText(/payslip\(s\) selected/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /clear selection/i }));

    await waitFor(() => {
      expect(screen.queryByText(/payslip\(s\) selected/)).not.toBeInTheDocument();
    });
  });
});
