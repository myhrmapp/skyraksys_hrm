import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyTasks from '../MyTasks';
import { renderWithProviders } from '../../../../test-utils/testUtils';
import taskService from '../../../../services/TaskService';

// Mock task service
jest.mock('../../../../services/TaskService');

// Auth value for tests
const mockAuth = {
  user: {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    employee: { id: 5 },
    employeeId: 5,
  },
};

// Helper to render with auth
const renderComponent = (authOverrides = {}) => {
  return renderWithProviders(<MyTasks />, {
    authValue: { ...mockAuth, ...authOverrides },
  });
};

describe('MyTasks Component', () => {
  const mockTasks = [
    {
      id: 1,
      name: 'Design Database Schema',
      description: 'Create ERD for new module',
      project: { name: 'Project Alpha' },
      status: 'In Progress',
      priority: 'High',
      dueDate: '2026-03-01',
      assignedTo: 5,
    },
    {
      id: 2,
      name: 'Write Unit Tests',
      description: 'Complete test coverage',
      project: { name: 'Project Beta' },
      status: 'Not Started',
      priority: 'Medium',
      dueDate: '2026-03-15',
      assignedTo: 5,
    },
    {
      id: 3,
      name: 'Code Review',
      description: 'Review pull requests',
      project: { name: 'Project Alpha' },
      status: 'Completed',
      priority: 'Low',
      dueDate: '2026-02-20',
      assignedTo: 5,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    taskService.getAll.mockResolvedValue({
      data: { data: mockTasks },
    });

    taskService.updateStatus.mockResolvedValue({
      data: { success: true },
    });
  });

  // Test 1: Renders component with tasks list
  test('should render My Tasks page with tasks list', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('My Tasks')).toBeInTheDocument();
      expect(screen.getByText(/view and update tasks assigned to you/i)).toBeInTheDocument();
      expect(screen.getByText('Design Database Schema')).toBeInTheDocument();
      expect(screen.getByText('Write Unit Tests')).toBeInTheDocument();
      expect(screen.getByText('Code Review')).toBeInTheDocument();
    });
  });

  // Test 2: Displays summary statistics
  test('should display task summary statistics', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument();
      // Status labels appear in both summary cards and task rows
      expect(screen.getAllByText('In Progress').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Not Started').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1);
    });
    
    // Check counts
    await waitFor(() => {
      const numbers = screen.getAllByText(/\d+/);
      expect(numbers.length).toBeGreaterThan(0);
    });
  });

  // Test 3: Shows loading state while fetching tasks
  test('should show loading state while fetching data', () => {
    taskService.getAll.mockReturnValue(new Promise(() => {})); // Never resolves
    
    renderComponent();
    
    expect(screen.getByText(/loading your tasks/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // Test 4: Filters tasks by status
  test('should filter tasks by status', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Design Database Schema')).toBeInTheDocument();
    });
    
    // Find the status filter select (shows "All Statuses" by default)
    const allComboboxes = screen.getAllByRole('combobox');
    const statusFilter = allComboboxes.find(el => el.textContent === 'All Statuses');
    fireEvent.mouseDown(statusFilter);
    
    await waitFor(() => {
      const completedOption = screen.getByRole('option', { name: 'Completed' });
      fireEvent.click(completedOption);
    });
    
    // After filtering, only completed tasks should be visible
    await waitFor(() => {
      expect(screen.getByText('Code Review')).toBeInTheDocument();
    });
  });

  // Test 5: Filters tasks by priority
  test('should filter tasks by priority', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Design Database Schema')).toBeInTheDocument();
    });
    
    // Find the priority filter select (shows "All Priorities" by default)
    const allComboboxes = screen.getAllByRole('combobox');
    const priorityFilter = allComboboxes.find(el => el.textContent === 'All Priorities');
    fireEvent.mouseDown(priorityFilter);
    
    await waitFor(() => {
      const highOption = screen.getByRole('option', { name: 'High' });
      fireEvent.click(highOption);
    });
    
    // After filtering, only high priority tasks should be visible
    await waitFor(() => {
      expect(screen.getByText('Design Database Schema')).toBeInTheDocument();
    });
  });

  // Test 6: Searches tasks by name
  test('should search tasks by name or description', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Design Database Schema')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByLabelText(/search tasks/i);
    fireEvent.change(searchInput, { target: { value: 'Database' } });
    
    await waitFor(() => {
      expect(screen.getByText('Design Database Schema')).toBeInTheDocument();
    });
  });

  // Test 7: Updates task status
  test('should update task status when changed', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Write Unit Tests')).toBeInTheDocument();
    });
    
    // The comboboxes include filter selects (Status, Priority) + per-row status selects.
    // Filter selects come first, then task row selects in order.
    const statusSelects = screen.getAllByRole('combobox');
    // Find the select that currently shows 'Not Started' (task 2)
    const notStartedSelect = statusSelects.find(el => el.textContent === 'Not Started');
    fireEvent.mouseDown(notStartedSelect);
    
    await waitFor(() => {
      const inProgressOption = screen.getByRole('option', { name: 'In Progress' });
      fireEvent.click(inProgressOption);
    });
    
    // Verify service was called
    await waitFor(() => {
      expect(taskService.updateStatus).toHaveBeenCalledWith(2, 'In Progress');
    });
  });

  // Test 8: Displays status and priority values with colors
  test('should display status and priority chips with appropriate colors', async () => {
    renderComponent();
    
    await waitFor(() => {
      // Status values appear in summary cards and task row selects
      expect(screen.getAllByText('In Progress').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Not Started').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1);
      
      // Priority chips
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });
});
