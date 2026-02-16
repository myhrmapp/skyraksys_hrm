/**
 * DeleteEmployeeDialog.test.js
 *
 * Tests for the employee termination confirmation dialog.
 * Pure presentational component — no service calls or hooks.
 * Props: open, onClose, onConfirm, employee, loading
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render } from '../../../../../test-utils/testUtils';
import DeleteEmployeeDialog from '../DeleteEmployeeDialog';

describe('DeleteEmployeeDialog Component', () => {
  const mockEmployee = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    employeeId: 'EMP001',
    designation: 'Software Engineer',
    department: 'Engineering',
  };
  const onClose = jest.fn();
  const onConfirm = jest.fn();

  const defaultProps = {
    open: true,
    onClose,
    onConfirm,
    employee: mockEmployee,
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Rendering ──────────────────────────────────────────

  describe('Rendering', () => {
    it('should render the dialog title "Terminate Employee?"', () => {
      render(<DeleteEmployeeDialog {...defaultProps} />);
      expect(screen.getByText('Terminate Employee?')).toBeInTheDocument();
    });

    it('should display the employee name in the confirmation message', () => {
      render(<DeleteEmployeeDialog {...defaultProps} />);
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    it('should show the deactivation subtitle', () => {
      render(<DeleteEmployeeDialog {...defaultProps} />);
      expect(screen.getByText(/deactivate the employee account/i)).toBeInTheDocument();
    });

    it('should show soft delete note', () => {
      render(<DeleteEmployeeDialog {...defaultProps} />);
      expect(screen.getByText(/soft delete/i)).toBeInTheDocument();
    });

    it('should display "Terminated" status mention', () => {
      render(<DeleteEmployeeDialog {...defaultProps} />);
      expect(screen.getByText(/Terminated/)).toBeInTheDocument();
    });

    it('should render Cancel button', () => {
      render(<DeleteEmployeeDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render Terminate Employee button', () => {
      render(<DeleteEmployeeDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: /terminate employee/i })).toBeInTheDocument();
    });

    it('should not render when open is false', () => {
      render(<DeleteEmployeeDialog {...defaultProps} open={false} />);
      expect(screen.queryByText('Terminate Employee?')).not.toBeInTheDocument();
    });

    it('should handle null employee gracefully', () => {
      render(<DeleteEmployeeDialog {...defaultProps} employee={null} />);
      // Should still render dialog title
      expect(screen.getByText('Terminate Employee?')).toBeInTheDocument();
    });
  });

  // ─── User Interactions ──────────────────────────────────

  describe('User Interactions', () => {
    it('should call onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<DeleteEmployeeDialog {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when Terminate Employee is clicked', async () => {
      const user = userEvent.setup();
      render(<DeleteEmployeeDialog {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /terminate employee/i }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Loading State ──────────────────────────────────────

  describe('Loading State', () => {
    it('should show "Terminating..." text when loading', () => {
      render(<DeleteEmployeeDialog {...defaultProps} loading={true} />);
      expect(screen.getByText(/terminating/i)).toBeInTheDocument();
    });

    it('should disable Terminate button when loading', () => {
      render(<DeleteEmployeeDialog {...defaultProps} loading={true} />);
      const terminateBtn = screen.getByRole('button', { name: /terminat/i });
      expect(terminateBtn).toBeDisabled();
    });

    it('should still render Cancel button when loading', () => {
      render(<DeleteEmployeeDialog {...defaultProps} loading={true} />);
      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      expect(cancelBtn).toBeInTheDocument();
    });
  });
});
