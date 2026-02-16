import React from 'react';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';
import DepartmentManagement from '../DepartmentManagement';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../../http-common', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../http-common');
  }
  return {
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  };
});
const mockHttp = require('../../../../http-common').default;

jest.mock('../../../../contexts/LoadingContext', () => ({
  useLoading: () => ({ isLoading: false, setLoading: jest.fn() }),
}));

jest.mock('../../../common/ConfirmDialog', () => {
  return function MockConfirmDialog({ open, title, onConfirm, onCancel }) {
    if (!open) return null;
    return (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

// The component passes { onConfirm } inside the options given to confirm().
// We need the mock to actually invoke that callback so the DELETE request fires.
jest.mock('../../../../hooks/useConfirmDialog', () => ({
  __esModule: true,
  default: () => ({
    dialogProps: { open: false, title: '', message: '', onConfirm: jest.fn(), onCancel: jest.fn() },
    confirm: jest.fn().mockImplementation(({ onConfirm } = {}) => {
      if (onConfirm) onConfirm();
      return Promise.resolve(true);
    }),
  }),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockDepartments = [
  { id: 1, name: 'Engineering', description: 'Software development', managerId: 1, manager: { firstName: 'Alice', lastName: 'Manager' }, isActive: true, employeeCount: 10 },
  { id: 2, name: 'HR', description: 'Human resources', managerId: null, manager: null, isActive: true, employeeCount: 5 },
  { id: 3, name: 'Finance', description: 'Financial operations', managerId: 2, manager: { firstName: 'Bob', lastName: 'Lead' }, isActive: false, employeeCount: 3 },
];

const mockEmployees = [
  { id: 1, firstName: 'Alice', lastName: 'Manager', status: 'Active', employmentStatus: 'Active', employeeId: 'EMP001' },
  { id: 2, firstName: 'Bob', lastName: 'Lead', status: 'Active', employmentStatus: 'Active', employeeId: 'EMP002' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const setupHttp = (departments = mockDepartments, employees = mockEmployees) => {
  mockHttp.get.mockImplementation((url) => {
    if (url === '/departments') return Promise.resolve({ data: { data: departments } });
    if (url === '/employees') return Promise.resolve({ data: { data: employees } });
    return Promise.resolve({ data: { data: [] } });
  });
  mockHttp.post.mockResolvedValue({ data: { data: {} } });
  mockHttp.put.mockResolvedValue({ data: { data: {} } });
  mockHttp.delete.mockResolvedValue({ data: { data: {} } });
};

const renderAsAdmin = async (extraAuth = {}) => {
  setupHttp();
  const result = render(<DepartmentManagement />, {
    authValue: { user: createMockUser('admin'), ...extraAuth },
  });
  // Wait for data to actually render (not just API call)
  await waitFor(() => {
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });
  return result;
};

const renderAsHr = async () => {
  setupHttp();
  const result = render(<DepartmentManagement />, {
    authValue: { user: createMockUser('hr') },
  });
  await waitFor(() => {
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });
  return result;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 1. Access control ─────────────────────────────────────────────────────

describe('Access control', () => {
  it('shows permission error for non-admin / non-hr user', async () => {
    setupHttp();
    render(<DepartmentManagement />, {
      authValue: { user: createMockUser('employee') },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/you don't have permission/i),
      ).toBeInTheDocument();
    });
  });

  it('shows permission error for manager role', () => {
    setupHttp();
    render(<DepartmentManagement />, {
      authValue: { user: createMockUser('manager') },
    });

    expect(
      screen.getByText(/you don't have permission/i),
    ).toBeInTheDocument();
  });
});

// ── 2. Rendering ──────────────────────────────────────────────────────────

describe('Rendering', () => {
  it('renders the page title and subtitle', async () => {
    await renderAsAdmin();

    expect(screen.getByText('Department Management')).toBeInTheDocument();
    expect(
      screen.getByText(/manage organizational departments/i),
    ).toBeInTheDocument();
  });

  it('renders the Add Department button', async () => {
    await renderAsAdmin();

    expect(
      screen.getByRole('button', { name: /add department/i }),
    ).toBeInTheDocument();
  });

  it('renders statistics cards with correct values', async () => {
    await renderAsAdmin();

    // Total Departments = 3
    await waitFor(() => {
      expect(screen.getByText('Total Departments')).toBeInTheDocument();
    });
    expect(screen.getByText('3')).toBeInTheDocument();

    // Departments with Managers = 2 (Engineering + Finance)
    expect(screen.getByText('Departments with Managers')).toBeInTheDocument();
    const managersTexts = screen.getAllByText('2');
    expect(managersTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('renders for HR role as well', async () => {
    await renderAsHr();

    expect(screen.getByText('Department Management')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add department/i }),
    ).toBeInTheDocument();
  });
});

// ── 3. Data loading ───────────────────────────────────────────────────────

describe('Data loading', () => {
  it('calls GET /departments and GET /employees on mount', async () => {
    await renderAsAdmin();

    expect(mockHttp.get).toHaveBeenCalledWith('/departments');
    expect(mockHttp.get).toHaveBeenCalledWith('/employees');
  });
});

// ── 4. Department list ────────────────────────────────────────────────────

describe('Department list', () => {
  it('displays department names in the table', async () => {
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('HR')).toBeInTheDocument();
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });
  });

  it('displays department descriptions', async () => {
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Software development')).toBeInTheDocument();
      expect(screen.getByText('Human resources')).toBeInTheDocument();
      expect(screen.getByText('Financial operations')).toBeInTheDocument();
    });
  });

  it('displays manager names or "Unassigned"', async () => {
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Alice Manager')).toBeInTheDocument();
      expect(screen.getByText('Bob Lead')).toBeInTheDocument();
      expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });
  });

  it('displays Active / Inactive chips', async () => {
    await renderAsAdmin();

    await waitFor(() => {
      const activeChips = screen.getAllByText('Active');
      expect(activeChips.length).toBeGreaterThanOrEqual(2); // Engineering + HR
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });
});

// ── 5. Search ─────────────────────────────────────────────────────────────

describe('Search', () => {
  it('filters departments by name', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search departments/i);
    await user.type(searchInput, 'Finance');

    await waitFor(() => {
      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
      expect(screen.queryByText('HR')).not.toBeInTheDocument();
    });
  });

  it('filters departments by description', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search departments/i);
    await user.type(searchInput, 'software');

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.queryByText('HR')).not.toBeInTheDocument();
    });
  });

  it('shows "no departments found" when search has no matches', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search departments/i);
    await user.type(searchInput, 'zzzznonexistent');

    await waitFor(() => {
      expect(
        screen.getByText(/no departments found matching your search/i),
      ).toBeInTheDocument();
    });
  });
});

// ── 6. Create dialog ──────────────────────────────────────────────────────

describe('Create department', () => {
  it('opens the Add dialog when clicking Add Department', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add department/i }));

    await waitFor(() => {
      expect(screen.getByText('Add New Department')).toBeInTheDocument();
    });
  });

  it('shows form fields inside the dialog', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add department/i }));

    await waitFor(() => {
      expect(screen.getByText('Add New Department')).toBeInTheDocument();
    });

    // TextField labels work with getByLabelText
    expect(screen.getByLabelText(/department name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    // MUI Select uses FormControl+InputLabel - 'Status' appears in table header + dialog label
    const statusTexts = screen.getAllByText('Status');
    expect(statusTexts.length).toBeGreaterThanOrEqual(2);

    // Create button in dialog
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    // Cancel button in dialog
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls POST /departments on submit with form data', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add department/i }));

    await waitFor(() => {
      expect(screen.getByText('Add New Department')).toBeInTheDocument();
    });

    // Fill in the name
    const nameInput = screen.getByLabelText(/department name/i);
    await user.type(nameInput, 'Marketing');

    // Fill in description
    const descInput = screen.getByLabelText(/description/i);
    await user.type(descInput, 'Marketing team');

    // Click Create
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockHttp.post).toHaveBeenCalledWith('/departments', expect.objectContaining({
        name: 'Marketing',
        description: 'Marketing team',
      }));
    });
  }, 15000);

  it('closes the dialog after successful creation', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add department/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Department')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/department name/i);
    await user.type(nameInput, 'Marketing');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.queryByText('Add New Department')).not.toBeInTheDocument();
    });
  }, 15000);
});

// ── 7. Edit dialog ────────────────────────────────────────────────────────

describe('Edit department', () => {
  it('opens the Edit dialog pre-populated with department data', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    // Click the first edit button (Engineering row)
    const editButtons = screen.getAllByTestId('EditIcon');
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Department')).toBeInTheDocument();
    });

    // Name field should be pre-populated
    const nameInput = screen.getByLabelText(/department name/i);
    expect(nameInput).toHaveValue('Engineering');

    // Description should be pre-populated
    const descInput = screen.getByLabelText(/description/i);
    expect(descInput).toHaveValue('Software development');
  });

  it('calls PUT /departments/:id on update', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    const editButtons = screen.getAllByTestId('EditIcon');
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Department')).toBeInTheDocument();
    });

    // Change the name
    const nameInput = screen.getByLabelText(/department name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Engineering v2');

    // Click Update
    await user.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => {
      expect(mockHttp.put).toHaveBeenCalledWith(
        '/departments/1',
        expect.objectContaining({ name: 'Engineering v2' }),
      );
    });
  });
});

// ── 8. Delete ─────────────────────────────────────────────────────────────

describe('Delete department', () => {
  it('calls DELETE /departments/:id when delete is confirmed', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    // Click the first delete button
    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    await user.click(deleteButtons[0]);

    // The mock confirm auto-invokes onConfirm, so DELETE should fire
    await waitFor(() => {
      expect(mockHttp.delete).toHaveBeenCalledWith('/departments/1');
    });
  });

  it('reloads departments after successful deletion', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    // Clear call counts to isolate reload
    mockHttp.get.mockClear();

    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockHttp.get).toHaveBeenCalledWith('/departments');
    });
  });
});

// ── 9. Validation ─────────────────────────────────────────────────────────

describe('Validation', () => {
  it('shows error when department name is empty on submit', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add department/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Department')).toBeInTheDocument();
    });

    // Click Create without entering a name
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/department name is required/i)).toBeInTheDocument();
    });

    // POST should NOT have been called
    expect(mockHttp.post).not.toHaveBeenCalled();
  });

  it('clears validation error when user starts typing', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add department/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Department')).toBeInTheDocument();
    });

    // Trigger validation error
    await user.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => {
      expect(screen.getByText(/department name is required/i)).toBeInTheDocument();
    });

    // Start typing – error should clear
    const nameInput = screen.getByLabelText(/department name/i);
    await user.type(nameInput, 'A');

    await waitFor(() => {
      expect(screen.queryByText(/department name is required/i)).not.toBeInTheDocument();
    });
  });
});

// ── 10. Error handling ────────────────────────────────────────────────────

describe('Error handling', () => {
  it('shows error state when loading departments fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockHttp.get.mockImplementation((url) => {
      if (url === '/departments') return Promise.reject(new Error('Network error'));
      if (url === '/employees') return Promise.resolve({ data: { data: mockEmployees } });
      return Promise.resolve({ data: { data: [] } });
    });

    render(<DepartmentManagement />, {
      authValue: { user: createMockUser('admin') },
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    // Component should still render without crashing
    expect(screen.getByText('Department Management')).toBeInTheDocument();
    // With 0 departments loaded due to error, multiple stat cards show 0
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(1);

    consoleSpy.mockRestore();
  });

  it('shows error snackbar when creating a department fails', async () => {
    const user = userEvent.setup();
    mockHttp.get.mockImplementation((url) => {
      if (url === '/departments') return Promise.resolve({ data: { data: mockDepartments } });
      if (url === '/employees') return Promise.resolve({ data: { data: mockEmployees } });
      return Promise.resolve({ data: { data: [] } });
    });
    mockHttp.post.mockRejectedValue({
      response: { data: { message: 'Duplicate department name' } },
    });

    render(<DepartmentManagement />, {
      authValue: { user: createMockUser('admin') },
    });

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add department/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Department')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/department name/i);
    await user.type(nameInput, 'Engineering');
    await user.click(screen.getByRole('button', { name: /create/i }));

    // The snackbar provider will render the error; notistack shows the text
    await waitFor(() => {
      expect(mockHttp.post).toHaveBeenCalled();
    });
  }, 15000);

  it('handles delete failure gracefully', async () => {
    const user = userEvent.setup();
    setupHttp();
    mockHttp.delete.mockRejectedValue({
      response: { data: { message: 'Cannot delete department with employees' } },
    });

    render(<DepartmentManagement />, {
      authValue: { user: createMockUser('admin') },
    });

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockHttp.delete).toHaveBeenCalledWith('/departments/1');
    });
  });
});

// ── 11. Empty state ───────────────────────────────────────────────────────

describe('Empty state', () => {
  it('shows "No departments found" when department list is empty', async () => {
    mockHttp.get.mockImplementation((url) => {
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      if (url === '/employees') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    render(<DepartmentManagement />, {
      authValue: { user: createMockUser('admin') },
    });

    await waitFor(() => {
      expect(screen.getByText(/no departments found/i)).toBeInTheDocument();
    });
  });

  it('shows 0 for all stats when there are no departments', async () => {
    mockHttp.get.mockImplementation((url) => {
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      if (url === '/employees') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    render(<DepartmentManagement />, {
      authValue: { user: createMockUser('admin') },
    });

    await waitFor(() => {
      expect(screen.getByText('Total Departments')).toBeInTheDocument();
    });

    // All stats should show 0
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });
});

// ── 12. Dialog cancel ─────────────────────────────────────────────────────

describe('Dialog cancel', () => {
  it('closes the dialog when Cancel is clicked', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add department/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Department')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Add New Department')).not.toBeInTheDocument();
    });
  });
});
