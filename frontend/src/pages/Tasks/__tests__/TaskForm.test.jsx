import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render } from '../../../test-utils/testUtils';
import TaskForm from '../TaskForm';
import TaskService from '../../../services/TaskService';
import ProjectService from '../../../services/ProjectService';
import { employeeService as EmployeeService } from '../../../services/employee.service';

jest.mock('../../../services/TaskService');
jest.mock('../../../services/ProjectService');
jest.mock('../../../services/employee.service', () => ({
  employeeService: {
    getAll: jest.fn()
  }
}));

const mockProjects = [
  { id: 101, name: 'Cloud Migration' },
  { id: 102, name: 'HR Portal 2.0' }
];

const mockEmployees = [
  { id: 1, firstName: 'Alice', lastName: 'Johnson' },
  { id: 2, firstName: 'Bob', lastName: 'Smith' }
];

describe('TaskForm Component', () => {
  let user;
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup();
    ProjectService.getAll.mockResolvedValue({
      data: { success: true, data: mockProjects }
    });
    EmployeeService.getAll.mockResolvedValue({
      data: mockEmployees
    });
  });

  test('renders all form fields with test-ids in create mode', async () => {
    render(<TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    expect(screen.getByTestId('task-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('task-description-input')).toBeInTheDocument();
    expect(screen.getByTestId('task-available-all-checkbox')).toBeInTheDocument();
    expect(screen.getByTestId('task-estimated-hours-input')).toBeInTheDocument();
    expect(screen.getByTestId('task-submit-btn')).toHaveTextContent('Create Task');
    expect(screen.getByTestId('task-cancel-btn')).toBeInTheDocument();
  });

  test('submits valid new task with payload', async () => {
    TaskService.create.mockResolvedValueOnce({
      data: { success: true, data: { id: 501 } }
    });

    render(<TaskForm onSave={mockOnSave} onCancel={mockOnCancel} projectId={101} />);

    await user.type(screen.getByTestId('task-name-input'), 'Implement Authentication Flow');
    await user.type(screen.getByTestId('task-description-input'), 'Setup JWT and Refresh Tokens');
    await user.type(screen.getByTestId('task-estimated-hours-input'), '8.5');

    await user.click(screen.getByTestId('task-submit-btn'));

    await waitFor(() => {
      expect(TaskService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Implement Authentication Flow',
          description: 'Setup JWT and Refresh Tokens',
          projectId: 101,
          estimatedHours: 8.5
        })
      );
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });

  test('TC-051: updates task with empty description and null estimated hours', async () => {
    const existingTask = {
      id: 55,
      name: 'Existing Bugfix',
      description: 'Old detailed description',
      projectId: 101,
      assignedTo: 1,
      status: 'In Progress',
      priority: 'High',
      estimatedHours: 12
    };

    TaskService.update.mockResolvedValueOnce({
      data: { success: true }
    });

    render(<TaskForm task={existingTask} onSave={mockOnSave} onCancel={mockOnCancel} />);

    expect(screen.getByTestId('task-submit-btn')).toHaveTextContent('Update Task');
    expect(screen.getByTestId('task-name-input')).toHaveValue('Existing Bugfix');
    expect(screen.getByTestId('task-description-input')).toHaveValue('Old detailed description');
    expect(screen.getByTestId('task-estimated-hours-input')).toHaveValue(12);

    // Clear description to empty string and clear estimated hours
    await user.clear(screen.getByTestId('task-description-input'));
    await user.clear(screen.getByTestId('task-estimated-hours-input'));

    await user.click(screen.getByTestId('task-submit-btn'));

    await waitFor(() => {
      expect(TaskService.update).toHaveBeenCalledWith(
        55,
        expect.objectContaining({
          name: 'Existing Bugfix',
          description: '',
          estimatedHours: null,
          projectId: 101
        })
      );
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });

  test('displays error message when task name is blank', async () => {
    render(<TaskForm onSave={mockOnSave} onCancel={mockOnCancel} projectId={101} />);

    // Attempt submit with empty name
    await user.click(screen.getByTestId('task-submit-btn'));

    expect(await screen.findByTestId('task-error-alert')).toHaveTextContent('Task name is required');
    expect(TaskService.create).not.toHaveBeenCalled();
  });

  test('displays error alert when API call fails', async () => {
    TaskService.create.mockRejectedValueOnce({
      response: { data: { message: 'Database transaction failed' } }
    });

    render(<TaskForm onSave={mockOnSave} onCancel={mockOnCancel} projectId={101} />);

    await user.type(screen.getByTestId('task-name-input'), 'Failing Task');
    await user.click(screen.getByTestId('task-submit-btn'));

    expect(await screen.findByTestId('task-error-alert')).toHaveTextContent('Database transaction failed');
  });

  test('calls onCancel when cancel button clicked', async () => {
    render(<TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    await user.click(screen.getByTestId('task-cancel-btn'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
