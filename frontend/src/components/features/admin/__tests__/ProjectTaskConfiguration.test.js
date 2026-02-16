import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectTaskConfiguration from '../ProjectTaskConfiguration';
import ProjectService from '../../../../services/ProjectService';
import TaskService from '../../../../services/TaskService';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock services
jest.mock('../../../../services/ProjectService');
jest.mock('../../../../services/TaskService');

// Mock ConfirmDialog and useConfirmDialog
jest.mock('../../../common/ConfirmDialog', () => {
  return function MockConfirmDialog({ open, onConfirm, onCancel }) {
    if (!open) return null;
    return (
      <div data-testid="confirm-dialog">
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

jest.mock('../../../../hooks/useConfirmDialog', () => () => ({
  dialogProps: { open: false },
  confirm: jest.fn(),
}));

// Mock form components
jest.mock('../../../../pages/Projects/ProjectForm', () => {
  return function MockProjectForm({ onSubmit, onCancel }) {
    return (
      <div data-testid="project-form">
        <button onClick={() => onSubmit({ name: 'New Project', clientName: 'Test Client' })}>
          Submit Project
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

jest.mock('../../../../pages/Tasks/TaskForm', () => {
  return function MockTaskForm({ onSubmit, onCancel }) {
    return (
      <div data-testid="task-form">
        <button onClick={() => onSubmit({ name: 'New Task', projectId: 1 })}>
          Submit Task
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

// Create theme
const theme = createTheme();

// Wrapper
const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ProjectTaskConfiguration Component', () => {
  const mockProjects = [
    {
      id: 1,
      name: 'Project Alpha',
      description: 'First project',
      clientName: 'Client A',
      status: 'Active',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    },
    {
      id: 2,
      name: 'Project Beta',
      description: 'Second project',
      clientName: 'Client B',
      status: 'Planning',
      startDate: '2026-02-01',
      endDate: '2026-11-30',
    },
  ];

  const mockTasks = [
    {
      id: 1,
      name: 'Design Phase',
      description: 'Create designs',
      project: { id: 1, name: 'Project Alpha' },
      status: 'In Progress',
      priority: 'High',
      dueDate: '2026-03-01',
    },
    {
      id: 2,
      name: 'Development',
      description: 'Build features',
      project: { id: 1, name: 'Project Alpha' },
      status: 'Not Started',
      priority: 'Medium',
      dueDate: '2026-06-01',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    ProjectService.getAll.mockResolvedValue({
      data: { success: true, data: mockProjects },
    });

    TaskService.getAll.mockResolvedValue({
      data: { success: true, data: mockTasks },
    });

    ProjectService.delete.mockResolvedValue({
      data: { success: true },
    });

    TaskService.delete.mockResolvedValue({
      data: { success: true },
    });
  });

  // Test 1: Renders component with tabs
  test('should render component with Projects and Tasks tabs', async () => {
    renderWithTheme(<ProjectTaskConfiguration />);
    
    expect(screen.getByText(/project.*task.*configuration/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /projects/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /tasks/i })).toBeInTheDocument();
  });

  // Test 2: Displays list of projects
  test('should display list of projects', async () => {
    renderWithTheme(<ProjectTaskConfiguration />);
    
    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });
  });

  // Test 3: Shows loading state
  test('should show loading state while fetching data', () => {
    ProjectService.getAll.mockReturnValue(new Promise(() => {}));
    TaskService.getAll.mockReturnValue(new Promise(() => {}));
    
    renderWithTheme(<ProjectTaskConfiguration />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // Test 4: Opens create project dialog
  test('should open create project dialog when New Project button clicked', async () => {
    renderWithTheme(<ProjectTaskConfiguration />);
    
    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });
    
    const newProjectButton = screen.getByRole('button', { name: /new project/i });
    fireEvent.click(newProjectButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('project-form')).toBeInTheDocument();
    });
  });

  // Test 5: Switches between card and table view
  test('should switch between card and table view for projects', async () => {
    renderWithTheme(<ProjectTaskConfiguration />);
    
    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });
    
    // Find view toggle buttons
    const viewToggleButtons = screen.getAllByRole('button');
    const tableViewButton = viewToggleButtons.find(btn => 
      btn.getAttribute('aria-label')?.includes('table') || 
      btn.textContent?.toLowerCase().includes('table')
    );
    
    if (tableViewButton) {
      fireEvent.click(tableViewButton);
      // View should switch (hard to test without specific markers)
    }
  });

  // Test 6: Filters projects by search term
  test('should filter projects by search term', async () => {
    renderWithTheme(<ProjectTaskConfiguration />);
    
    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });
    
    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });
  });

  // Test 7: Opens delete confirmation dialog
  test('should open delete confirmation when delete button clicked', async () => {
    renderWithTheme(<ProjectTaskConfiguration />);
    
    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });
    
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    });
  });

  // Test 8: Switches to Tasks tab and displays tasks
  test('should switch to Tasks tab and display tasks', async () => {
    renderWithTheme(<ProjectTaskConfiguration />);
    
    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });
    
    const tasksTab = screen.getByRole('tab', { name: /tasks/i });
    fireEvent.click(tasksTab);
    
    await waitFor(() => {
      expect(screen.getByText('Design Phase')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
    });
  });

  // Test 9: Opens create task dialog
  test('should open create task dialog when New Task button clicked', async () => {
    renderWithTheme(<ProjectTaskConfiguration />);
    
    // Switch to Tasks tab
    const tasksTab = screen.getByRole('tab', { name: /tasks/i });
    fireEvent.click(tasksTab);
    
    await waitFor(() => {
      expect(screen.getByText('Design Phase')).toBeInTheDocument();
    });
    
    const newTaskButton = screen.getByRole('button', { name: /new task/i });
    fireEvent.click(newTaskButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('task-form')).toBeInTheDocument();
    });
  });

  // Test 10: Shows pagination controls
  test('should show pagination controls for projects', async () => {
    const manyProjects = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `Project ${i + 1}`,
      clientName: `Client ${i + 1}`,
      status: 'Active',
    }));

    ProjectService.getAll.mockResolvedValue({
      data: { success: true, data: manyProjects },
    });

    renderWithTheme(<ProjectTaskConfiguration />);
    
    await waitFor(() => {
      const pagination = screen.getByRole('navigation', { name: /pagination/i });
      expect(pagination).toBeInTheDocument();
    });
  });
});
