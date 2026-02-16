import React from 'react';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';
import PositionManagement from '../PositionManagement';

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

const mockPositions = [
  { id: 1, title: 'Software Engineer', description: 'Develops software', departmentId: 1, department: { name: 'Engineering' }, level: 'Mid-Level', requirements: 'CS degree', responsibilities: 'Write code', minSalary: 40000, maxSalary: 80000, isActive: true },
  { id: 2, title: 'HR Manager', description: 'Manages HR', departmentId: 2, department: { name: 'HR' }, level: 'Manager', requirements: 'HR certification', responsibilities: 'Manage HR ops', minSalary: 60000, maxSalary: 100000, isActive: true },
  { id: 3, title: 'Junior Developer', description: 'Entry dev role', departmentId: 1, department: { name: 'Engineering' }, level: 'Junior', requirements: '', responsibilities: '', minSalary: 25000, maxSalary: 40000, isActive: false },
];

const mockDepartments = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'HR' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const setupHttp = (positions = mockPositions, departments = mockDepartments) => {
  mockHttp.get.mockImplementation((url) => {
    if (url === '/positions') return Promise.resolve({ data: { data: positions } });
    if (url === '/departments') return Promise.resolve({ data: { data: departments } });
    return Promise.resolve({ data: { data: [] } });
  });
  mockHttp.post.mockResolvedValue({ data: { data: { id: 99, name: 'New' } } });
  mockHttp.put.mockResolvedValue({ data: { data: {} } });
  mockHttp.delete.mockResolvedValue({ data: { data: {} } });
};

const renderAsAdmin = async (extraAuth = {}) => {
  setupHttp();
  const result = render(<PositionManagement />, {
    authValue: { user: createMockUser('admin'), ...extraAuth },
  });
  await waitFor(() => {
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
  });
  return result;
};

const renderAsHr = async () => {
  setupHttp();
  const result = render(<PositionManagement />, {
    authValue: { user: createMockUser('hr') },
  });
  await waitFor(() => {
    expect(mockHttp.get).toHaveBeenCalledWith('/positions');
  });
  return result;
};

// Helper: find the main dialog submit button (has SaveIcon, NOT the sub-dialog Create)
const getDialogSubmitButton = () => {
  const saveIcon = screen.getByTestId('SaveIcon');
  return saveIcon.closest('button');
};

// Helper: select an option from MUI Select using testId + fireEvent.mouseDown
const selectMuiOption = async (testId, optionText) => {
  const hiddenInput = screen.getByTestId(testId);
  const trigger = hiddenInput.parentElement.querySelector('[role="combobox"]')
    || hiddenInput.closest('.MuiInputBase-root')?.querySelector('[role="combobox"]');
  fireEvent.mouseDown(trigger);
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByText(optionText));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 1. Access control ─────────────────────────────────────────────────────

describe('Access control', () => {
  it('shows permission error for non-admin / non-hr user (employee)', () => {
    setupHttp();
    render(<PositionManagement />, {
      authValue: { user: createMockUser('employee') },
    });

    expect(
      screen.getByText(/you don't have permission/i),
    ).toBeInTheDocument();

    // Note: useEffect still fires API calls even for denied users (component quirk)
  });

  it('shows permission error for manager role', () => {
    setupHttp();
    render(<PositionManagement />, {
      authValue: { user: createMockUser('manager') },
    });

    expect(
      screen.getByText(/you don't have permission/i),
    ).toBeInTheDocument();
  });
});

// ── 2. Rendering ──────────────────────────────────────────────────────────

describe('Rendering', () => {
  it('renders the page title and subtitle for admin', async () => {
    await renderAsAdmin();

    expect(screen.getByText('Position Management')).toBeInTheDocument();
    expect(
      screen.getByText(/manage organizational positions/i),
    ).toBeInTheDocument();
  });

  it('renders the Add Position button', async () => {
    await renderAsAdmin();

    expect(
      screen.getByRole('button', { name: /add position/i }),
    ).toBeInTheDocument();
  });

  it('renders for HR role as well', async () => {
    await renderAsHr();

    expect(screen.getByText('Position Management')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add position/i }),
    ).toBeInTheDocument();
  });

  it('renders statistics cards with correct values', async () => {
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Total Positions')).toBeInTheDocument();
    });

    // Total Positions = 3
    expect(screen.getByText('3')).toBeInTheDocument();

    // Active Positions = 2 (Software Engineer + HR Manager)
    expect(screen.getByText('Active Positions')).toBeInTheDocument();
    // '2' appears in multiple stat cards (Active + Departments) — use getAllByText
    const twos = screen.getAllByText('2');
    expect(twos.length).toBeGreaterThanOrEqual(1);

    // Inactive Positions = 1 (Junior Developer)
    expect(screen.getByText('Inactive Positions')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    // Departments = 2
    expect(screen.getByText('Departments')).toBeInTheDocument();
  });
});

// ── 3. Data loading ───────────────────────────────────────────────────────

describe('Data loading', () => {
  it('calls GET /positions and GET /departments on mount', async () => {
    await renderAsAdmin();

    expect(mockHttp.get).toHaveBeenCalledWith('/positions');
    expect(mockHttp.get).toHaveBeenCalledWith('/departments');
  });
});

// ── 4. Position list ──────────────────────────────────────────────────────

describe('Position list', () => {
  it('displays position titles in the table', async () => {
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('HR Manager')).toBeInTheDocument();
      expect(screen.getByText('Junior Developer')).toBeInTheDocument();
    });
  });

  it('displays department names for each position', async () => {
    await renderAsAdmin();

    await waitFor(() => {
      const engineeringCells = screen.getAllByText('Engineering');
      expect(engineeringCells.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('HR')).toBeInTheDocument();
    });
  });

  it('displays Active / Inactive chips', async () => {
    await renderAsAdmin();

    await waitFor(() => {
      const activeChips = screen.getAllByText('Active');
      expect(activeChips.length).toBeGreaterThanOrEqual(2); // Software Engineer + HR Manager
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('displays level chips for each position', async () => {
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Mid-Level')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
      expect(screen.getByText('Junior')).toBeInTheDocument();
    });
  });
});

// ── 5. Search ─────────────────────────────────────────────────────────────

describe('Search', () => {
  it('filters positions by title', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search positions/i);
    await user.type(searchInput, 'HR Manager');

    await waitFor(() => {
      expect(screen.getByText('HR Manager')).toBeInTheDocument();
      expect(screen.queryByText('Software Engineer')).not.toBeInTheDocument();
      expect(screen.queryByText('Junior Developer')).not.toBeInTheDocument();
    });
  });

  it('filters positions by department name', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search positions/i);
    await user.type(searchInput, 'Engineering');

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Junior Developer')).toBeInTheDocument();
      expect(screen.queryByText('HR Manager')).not.toBeInTheDocument();
    });
  });

  it('filters positions by level', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search positions/i);
    await user.type(searchInput, 'Junior');

    await waitFor(() => {
      expect(screen.getByText('Junior Developer')).toBeInTheDocument();
      expect(screen.queryByText('Software Engineer')).not.toBeInTheDocument();
      expect(screen.queryByText('HR Manager')).not.toBeInTheDocument();
    });
  });

  it('shows "no positions found" when search has no matches', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search positions/i);
    await user.type(searchInput, 'zzzznonexistent');

    await waitFor(() => {
      expect(
        screen.getByText(/no positions found matching your search/i),
      ).toBeInTheDocument();
    });
  });
});

// ── 6. Create dialog ──────────────────────────────────────────────────────

describe('Create position', () => {
  it('opens the Add dialog when clicking Add Position', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add position/i }));

    await waitFor(() => {
      expect(screen.getByText('Add New Position')).toBeInTheDocument();
    });
  });

  it('shows form fields inside the dialog', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add position/i }));

    await waitFor(() => {
      expect(screen.getByText('Add New Position')).toBeInTheDocument();
    });

    // Key form fields
    expect(screen.getByLabelText(/position title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/minimum salary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/maximum salary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/requirements/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/responsibilities/i)).toBeInTheDocument();

    // Create (submit) and Cancel buttons in dialog
    expect(getDialogSubmitButton()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls POST /positions on submit with form data', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add position/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Position')).toBeInTheDocument();
    });

    // Fill in title
    const titleInput = screen.getByLabelText(/position title/i);
    await user.type(titleInput, 'DevOps Engineer');

    // Fill in description
    const descInput = screen.getByLabelText(/description/i);
    await user.type(descInput, 'Handles infrastructure');

    // Select department via MUI Select dropdown interaction
    await selectMuiOption('position-department-select', 'Engineering');

    // Select level
    await selectMuiOption('position-level-select', 'Senior');

    // Fill salary
    const minSalary = screen.getByLabelText(/minimum salary/i);
    await user.type(minSalary, '50000');
    const maxSalary = screen.getByLabelText(/maximum salary/i);
    await user.type(maxSalary, '90000');

    // Click Create (dialog submit button with SaveIcon)
    await user.click(getDialogSubmitButton());

    await waitFor(() => {
      expect(mockHttp.post).toHaveBeenCalledWith('/positions', expect.objectContaining({
        title: 'DevOps Engineer',
        description: 'Handles infrastructure',
      }));
    });
  });

  it('closes the dialog after successful creation', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add position/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Position')).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/position title/i);
    await user.type(titleInput, 'New Role');

    // Select required fields via MUI Select dropdown
    await selectMuiOption('position-department-select', 'Engineering');
    await selectMuiOption('position-level-select', 'Entry Level');

    await user.click(getDialogSubmitButton());

    await waitFor(() => {
      expect(screen.queryByText('Add New Position')).not.toBeInTheDocument();
    });
  });
});

// ── 7. Edit dialog ────────────────────────────────────────────────────────

describe('Edit position', () => {
  it('opens the Edit dialog pre-populated with position data', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    // Click the first edit button (Software Engineer row)
    const editButtons = screen.getAllByTestId('EditIcon');
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Position')).toBeInTheDocument();
    });

    // Title field should be pre-populated
    const titleInput = screen.getByLabelText(/position title/i);
    expect(titleInput).toHaveValue('Software Engineer');

    // Description should be pre-populated
    const descInput = screen.getByLabelText(/description/i);
    expect(descInput).toHaveValue('Develops software');
  });

  it('calls PUT /positions/:id on update', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTestId('EditIcon');
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Position')).toBeInTheDocument();
    });

    // Change the title
    const titleInput = screen.getByLabelText(/position title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Senior Software Engineer');

    // Click Update
    await user.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => {
      expect(mockHttp.put).toHaveBeenCalledWith(
        '/positions/1',
        expect.objectContaining({ title: 'Senior Software Engineer' }),
      );
    });
  });
});

// ── 8. Delete ─────────────────────────────────────────────────────────────

describe('Delete position', () => {
  it('calls DELETE /positions/:id when delete is confirmed', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    // Click the first delete button
    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    await user.click(deleteButtons[0]);

    // The mock confirm auto-invokes onConfirm, so DELETE should fire
    await waitFor(() => {
      expect(mockHttp.delete).toHaveBeenCalledWith('/positions/1');
    });
  });

  it('reloads positions after successful deletion', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    // Clear call counts to isolate reload
    mockHttp.get.mockClear();

    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockHttp.get).toHaveBeenCalledWith('/positions');
    });
  });
});

// ── 9. Validation ─────────────────────────────────────────────────────────

describe('Validation', () => {
  it('shows error when position title is empty on submit', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add position/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Position')).toBeInTheDocument();
    });

    // Click Create without entering a title
    await user.click(getDialogSubmitButton());

    await waitFor(() => {
      expect(screen.getByText(/position title is required/i)).toBeInTheDocument();
    });

    // POST should NOT have been called
    expect(mockHttp.post).not.toHaveBeenCalled();
  });

  it('shows error when department is not selected', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add position/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Position')).toBeInTheDocument();
    });

    // Only fill title, leave department empty
    const titleInput = screen.getByLabelText(/position title/i);
    await user.type(titleInput, 'Some Role');

    await user.click(getDialogSubmitButton());

    await waitFor(() => {
      expect(screen.getByText(/department is required/i)).toBeInTheDocument();
    });

    expect(mockHttp.post).not.toHaveBeenCalled();
  });

  it('shows error when level is not selected', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add position/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Position')).toBeInTheDocument();
    });

    // Fill title and department, leave level empty
    const titleInput = screen.getByLabelText(/position title/i);
    await user.type(titleInput, 'Some Role');
    await selectMuiOption('position-department-select', 'Engineering');

    await user.click(getDialogSubmitButton());

    await waitFor(() => {
      expect(screen.getByText(/level is required/i)).toBeInTheDocument();
    });

    expect(mockHttp.post).not.toHaveBeenCalled();
  }, 15000);

  it('shows salary validation error when min > max', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add position/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Position')).toBeInTheDocument();
    });

    // Fill required fields using proper MUI Select interaction
    const titleInput = screen.getByLabelText(/position title/i);
    await user.type(titleInput, 'Role X');
    await selectMuiOption('position-department-select', 'Engineering');
    await selectMuiOption('position-level-select', 'Senior');

    // Set min > max salary
    const minSalary = screen.getByLabelText(/minimum salary/i);
    await user.type(minSalary, '100000');
    const maxSalary = screen.getByLabelText(/maximum salary/i);
    await user.type(maxSalary, '50000');

    await user.click(getDialogSubmitButton());

    await waitFor(() => {
      expect(screen.getByText(/maximum salary must be greater than minimum salary/i)).toBeInTheDocument();
    });

    expect(mockHttp.post).not.toHaveBeenCalled();
  }, 15000);

  it('clears validation error when user starts typing in the title field', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add position/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Position')).toBeInTheDocument();
    });

    // Trigger validation error
    await user.click(getDialogSubmitButton());
    await waitFor(() => {
      expect(screen.getByText(/position title is required/i)).toBeInTheDocument();
    });

    // Start typing – error should clear
    const titleInput = screen.getByLabelText(/position title/i);
    await user.type(titleInput, 'A');

    await waitFor(() => {
      expect(screen.queryByText(/position title is required/i)).not.toBeInTheDocument();
    });
  });
});

// ── 10. Error handling ────────────────────────────────────────────────────

describe('Error handling', () => {
  it('shows error state when loading positions fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockHttp.get.mockImplementation((url) => {
      if (url === '/positions') return Promise.reject(new Error('Network error'));
      if (url === '/departments') return Promise.resolve({ data: { data: mockDepartments } });
      return Promise.resolve({ data: { data: [] } });
    });

    render(<PositionManagement />, {
      authValue: { user: createMockUser('admin') },
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    // Component should still render without crashing
    expect(screen.getByText('Position Management')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('handles create failure gracefully', async () => {
    const user = userEvent.setup();
    setupHttp();
    mockHttp.post.mockRejectedValue({
      response: { data: { message: 'Duplicate position title' } },
    });

    render(<PositionManagement />, {
      authValue: { user: createMockUser('admin') },
    });

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add position/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Position')).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/position title/i);
    await user.type(titleInput, 'Software Engineer');
    await selectMuiOption('position-department-select', 'Engineering');
    await selectMuiOption('position-level-select', 'Senior');

    await user.click(getDialogSubmitButton());

    await waitFor(() => {
      expect(mockHttp.post).toHaveBeenCalled();
    });
  }, 15000);

  it('handles delete failure gracefully', async () => {
    const user = userEvent.setup();
    setupHttp();
    mockHttp.delete.mockRejectedValue({
      response: { data: { message: 'Cannot delete position with employees' } },
    });

    render(<PositionManagement />, {
      authValue: { user: createMockUser('admin') },
    });

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockHttp.delete).toHaveBeenCalledWith('/positions/1');
    });
  });
});

// ── 11. Empty state ───────────────────────────────────────────────────────

describe('Empty state', () => {
  it('shows "No positions found" when position list is empty', async () => {
    mockHttp.get.mockImplementation((url) => {
      if (url === '/positions') return Promise.resolve({ data: { data: [] } });
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    render(<PositionManagement />, {
      authValue: { user: createMockUser('admin') },
    });

    await waitFor(() => {
      expect(screen.getByText(/no positions found/i)).toBeInTheDocument();
    });
  });

  it('shows 0 for all stats when there are no positions or departments', async () => {
    mockHttp.get.mockImplementation((url) => {
      if (url === '/positions') return Promise.resolve({ data: { data: [] } });
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    render(<PositionManagement />, {
      authValue: { user: createMockUser('admin') },
    });

    await waitFor(() => {
      expect(screen.getByText('Total Positions')).toBeInTheDocument();
    });

    // All stats should show 0
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });
});

// ── 12. Dialog cancel ─────────────────────────────────────────────────────

describe('Dialog cancel', () => {
  it('closes the dialog when Cancel is clicked', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add position/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Position')).toBeInTheDocument();
    });

    // Close any open MUI Select dropdown first (pressing Escape)
    const openListbox = screen.queryByRole('listbox');
    if (openListbox) {
      fireEvent.keyDown(openListbox, { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    }

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Add New Position')).not.toBeInTheDocument();
    });
  }, 15000);
});

// ── 13. Quick Create Department sub-dialog ────────────────────────────────

describe('Quick Create Department', () => {
  it('opens the Create New Department sub-dialog from the position dialog', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    // Open Add Position dialog
    await user.click(screen.getByRole('button', { name: /add position/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Position')).toBeInTheDocument();
    });

    // Click the quick-create department icon button
    const addDeptButton = screen.getByTitle('Create New Department');
    await user.click(addDeptButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Department')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/department name/i)).toBeInTheDocument();
  });

  it('calls POST /departments when quick-creating a department', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add position/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Position')).toBeInTheDocument();
    });

    const addDeptButton = screen.getByTitle('Create New Department');
    await user.click(addDeptButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Department')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/department name/i);
    await user.type(nameInput, 'Marketing');

    // Click Create button in the department sub-dialog
    const createButtons = screen.getAllByRole('button', { name: /create/i });
    // The sub-dialog's Create button
    await user.click(createButtons[createButtons.length - 1]);

    await waitFor(() => {
      expect(mockHttp.post).toHaveBeenCalledWith('/departments', expect.objectContaining({
        name: 'Marketing',
        isActive: true,
      }));
    });
  });

  it('refreshes departments list after quick-creating a department', async () => {
    const user = userEvent.setup();
    await renderAsAdmin();

    await user.click(screen.getByRole('button', { name: /add position/i }));
    await waitFor(() => {
      expect(screen.getByText('Add New Position')).toBeInTheDocument();
    });

    // Clear get mock calls to isolate the re-fetch
    mockHttp.get.mockClear();

    const addDeptButton = screen.getByTitle('Create New Department');
    await user.click(addDeptButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Department')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/department name/i);
    await user.type(nameInput, 'Sales');

    const createButtons = screen.getAllByRole('button', { name: /create/i });
    await user.click(createButtons[createButtons.length - 1]);

    await waitFor(() => {
      expect(mockHttp.get).toHaveBeenCalledWith('/departments');
    });
  });
});
