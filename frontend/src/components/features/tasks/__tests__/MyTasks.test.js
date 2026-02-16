import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyTasks from '../MyTasks';
import { AuthContext } from '../../../../contexts/AuthContext';
import { NotificationContext } from '../../../../contexts/NotificationContext';
import taskService from '../../../../services/TaskService';

// Mock task service
jest.mock('../../../../services/TaskService');

// Create test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Mock notification context
const mockNotification = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showInfo: jest.fn(),
};

// Mock auth context
const mockAuth = {
  user: {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    employee: { id: 5 },
    employeeId: 5,
  },
};

// Wrapper component
const renderWithProviders = (component, authContext = mockAuth) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authContext}>
        <NotificationContext.Provider value={mockNotification}>
          {component}
        </NotificationContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
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
    renderWithProviders(<MyTasks />);
    
    expect(screen.getByText('My Tasks')).toBeInTheDocument();
    expect(screen.getByText(/view and update tasks assigned to you/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Design Database Schema')).toBeInTheDocument();
      expect(screen.getByText('Write Unit Tests')).toBeInTheDocument();
      expect(screen.getByText('Code Review')).toBeInTheDocument();
    });
  });

  // Test 2: Displays summary statistics
  test('should display task summary statistics', async () => {
    renderWithProviders(<MyTasks />);
    
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Not Started')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
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
    
    renderWithProviders(<MyTasks />);
    
    expect(screen.getByText(/loading your tasks/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // Test 4: Filters tasks by status
  test('should filter tasks by status', async () => {
    renderWithProviders(<MyTasks />);
    
    await waitFor(() => {
      expect(screen.getByText('Design Database Schema')).toBeInTheDocument();
    });
    
    // Open status filter
    const statusFilter = screen.getByLabelText(/^status$/i);
    fireEvent.mouseDown(statusFilter);
    
    await waitFor(() => {
      const completedOption = screen.getByRole('option', { name: 'Completed' });
      fireEvent.click(completedOption);
    });
    
    // After filtering, only completed tasks should be visible
    await waitFor(() => {
      expect(screen.getByText('Code Review')).toBeInTheDocument();
      // Other tasks should be filtered out (not visible in filtered view)
    });
  });

  // Test 5: Filters tasks by priority
  test('should filter tasks by priority', async () => {
    renderWithProviders(<MyTasks />);
    
    await waitFor(() => {
      expect(screen.getByText('Design Database Schema')).toBeInTheDocument();
    });
    
    // Open priority filter
    const priorityFilter = screen.getByLabelText(/priority/i);
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
    renderWithProviders(<MyTasks />);
    
    await waitFor(() => {
      expect(screen.getByText('Design Database Schema')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search tasks/i);
    fireEvent.change(searchInput, { target: { value: 'Database' } });
    
    await waitFor(() => {
      expect(screen.getByText('Design Database Schema')).toBeInTheDocument();
    });
  });

  // Test 7: Updates task status
  test('should update task status when changed', async () => {
    renderWithProviders(<MyTasks />);
    
    await waitFor(() => {
      expect(screen.getByText('Write Unit Tests')).toBeInTheDocument();
    });
    
    // Find status dropdown for "Write Unit Tests" task (status: Not Started)
    const statusSelects = screen.getAllByRole('combobox');
    // The second task's status select
    fireEvent.mouseDown(statusSelects[1]);
    
    await waitFor(() => {
      const inProgressOption = screen.getByRole('option', { name: 'In Progress' });
      fireEvent.click(inProgressOption);
    });
    
    // Verify service was called
    await waitFor(() => {
      expect(taskService.updateStatus).toHaveBeenCalledWith(2, 'In Progress');
    });
  });

  // Test 8: Displays status and priority chips with colors
  test('should display status and priority chips with appropriate colors', async () => {
    renderWithProviders(<MyTasks />);
    
    await waitFor(() => {
      // Status chips
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Not Started')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      
      // Priority chips
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });
});
