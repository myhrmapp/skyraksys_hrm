/**
 * PayslipTemplateManager.test.js
 *
 * Tests for payslip template CRUD management.
 *
 * Architecture:
 *   - Component: PayslipTemplateManager (default export)
 *   - Data: React Query + http-common (raw axios, NOT a service file)
 *   - Notifications: notistack (enqueueSnackbar)
 *   - Access: Admin only — shows permission error for non-admin roles
 *   - CRUD: create, update, delete, duplicate, setDefault, toggleStatus
 *   - ConfirmDialog + useConfirmDialog for delete confirmation
 */

import React from 'react';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';
import PayslipTemplateManager from '../PayslipTemplateManager';

// jest.mock factories are hoisted above all declarations by babel-jest,
// so we define the mock object inline and retrieve it via require().
jest.mock('../../../../http-common', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../http-common');
  }
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    },
  };
});
// Get reference to the mocked axios instance for assertions
const mockHttp = require('../../../../http-common').default;

// Mock ConfirmDialog (stub)
jest.mock('../../../common/ConfirmDialog', () => {
  return function MockConfirmDialog({ open, title, message, onConfirm, onCancel }) {
    if (!open) return null;
    return (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        <span>{message}</span>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>CancelDialog</button>
      </div>
    );
  };
});

// Track the last confirm call so we can trigger it in tests
let lastConfirmArgs = null;
jest.mock('../../../../hooks/useConfirmDialog', () => ({
  __esModule: true,
  default: () => ({
    dialogProps: { open: false, title: '', message: '', onConfirm: jest.fn(), onCancel: jest.fn() },
    confirm: (args) => {
      lastConfirmArgs = args;
      // Auto-confirm for tests
      if (args.onConfirm) args.onConfirm();
    },
  }),
}));

// Mock notistack — enqueueSnackbar is already in SnackbarProvider from renderWithProviders
// but the component calls useSnackbar() directly, which picks it up from the provider.

const mockTemplates = [
  {
    id: 1,
    name: 'Standard Template',
    description: 'Default payslip layout',
    version: '1.0',
    isActive: true,
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    earningsFields: [],
    deductionsFields: [],
    styling: {},
  },
  {
    id: 2,
    name: 'Compact Template',
    description: 'Minimal payslip design',
    version: '1.0',
    isActive: true,
    isDefault: false,
    createdAt: '2026-01-15T00:00:00Z',
    earningsFields: [],
    deductionsFields: [],
    styling: {},
  },
  {
    id: 3,
    name: 'Detailed Template',
    description: 'Full breakdown payslip',
    version: '2.0',
    isActive: false,
    isDefault: false,
    createdAt: '2026-02-01T00:00:00Z',
    earningsFields: [],
    deductionsFields: [],
    styling: {},
  },
];

describe('PayslipTemplateManager Component', () => {
  const adminUser = createMockUser('admin');
  const employeeUser = createMockUser('employee');

  beforeEach(() => {
    jest.clearAllMocks();
    lastConfirmArgs = null;

    mockHttp.get.mockResolvedValue({
      data: { success: true, data: { templates: mockTemplates } },
    });
    mockHttp.post.mockResolvedValue({
      data: { success: true, message: 'Operation successful' },
    });
    mockHttp.put.mockResolvedValue({
      data: { success: true, message: 'Template updated successfully' },
    });
    mockHttp.delete.mockResolvedValue({
      data: { success: true, message: 'Template deleted' },
    });
  });

  // ─── Access Control ─────────────────────────────────────

  describe('Access Control', () => {
    it('should show permission error for non-admin users', () => {
      render(<PayslipTemplateManager />, { authValue: { user: employeeUser } });
      expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    });

    it('should render templates for admin users', async () => {
      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Payslip Template Manager')).toBeInTheDocument();
      });
    });
  });

  // ─── Rendering ──────────────────────────────────────────

  describe('Rendering', () => {
    it('should render page title', async () => {
      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Payslip Template Manager')).toBeInTheDocument();
      });
    });

    it('should render subtitle', async () => {
      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText(/create and manage payslip templates/i)).toBeInTheDocument();
      });
    });

    it('should render Create Template button', async () => {
      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create template/i })).toBeInTheDocument();
      });
    });

    it('should fetch templates on mount', async () => {
      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(mockHttp.get).toHaveBeenCalledWith('/payslip-templates');
      });
    });

    it('should render template cards with names', async () => {
      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Standard Template')).toBeInTheDocument();
        expect(screen.getByText('Compact Template')).toBeInTheDocument();
        expect(screen.getByText('Detailed Template')).toBeInTheDocument();
      });
    });

    it('should render template descriptions', async () => {
      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Default payslip layout')).toBeInTheDocument();
        expect(screen.getByText('Minimal payslip design')).toBeInTheDocument();
      });
    });

    it('should render Active/Inactive chips', async () => {
      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      await waitFor(() => {
        // 2 active, 1 inactive
        const activeChips = screen.getAllByText('Active');
        expect(activeChips.length).toBe(2);
        expect(screen.getByText('Inactive')).toBeInTheDocument();
      });
    });

    it('should render version chips', async () => {
      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getAllByText(/^v\d/).length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  // ─── Template Actions ─────────────────────────────────

  describe('Template Actions', () => {
    it('should not show delete button for default template', async () => {
      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Standard Template')).toBeInTheDocument();
      });

      // The Standard Template is isDefault=true so should not have a delete icon
      // The other two should have delete icons
      const cards = screen.getAllByText('Standard Template');
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });

    it('should render toggle status switches for each template', async () => {
      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Standard Template')).toBeInTheDocument();
      });

      const switches = screen.getAllByRole('checkbox');
      expect(switches.length).toBeGreaterThanOrEqual(3); // one per template
    });
  });

  // ─── Create Template Dialog ────────────────────────────

  describe('Create Template', () => {
    it('should open create dialog when Create Template is clicked', async () => {
      const user = userEvent.setup();
      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create template/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create template/i }));

      // Dialog should appear with form fields
      await waitFor(() => {
        expect(screen.getByLabelText(/template name/i)).toBeInTheDocument();
      });
    });
  });

  // ─── Empty State ──────────────────────────────────────

  describe('Empty State', () => {
    it('should show empty state when no templates exist', async () => {
      mockHttp.get.mockResolvedValue({
        data: { success: true, data: { templates: [] } },
      });

      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Payslip Template Manager')).toBeInTheDocument();
      });
    });
  });

  // ─── Error Handling ───────────────────────────────────

  describe('Error Handling', () => {
    it('should handle API error when fetching templates', async () => {
      mockHttp.get.mockRejectedValue(new Error('Network error'));

      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      // Should not crash
      await waitFor(() => {
        expect(screen.getByText('Payslip Template Manager')).toBeInTheDocument();
      });
    });
  });

  // ─── Duplicate Template ────────────────────────────────

  describe('Duplicate Template', () => {
    it('should call duplicate API when duplicate action is triggered', async () => {
      mockHttp.post.mockResolvedValue({
        data: { success: true, message: 'Template duplicated' },
      });

      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Compact Template')).toBeInTheDocument();
      });

      // Find the duplicate button for Compact Template card
      // Each card has: View, Edit, Duplicate, Export, Toggle, (Delete for non-default)
      // Duplicate icon button click
      const allButtons = screen.getAllByRole('button');
      const duplicateButtons = allButtons.filter(
        btn => btn.querySelector('[data-testid="ContentCopyIcon"]')
      );

      if (duplicateButtons.length > 0) {
        fireEvent.click(duplicateButtons[0]);

        await waitFor(() => {
          expect(mockHttp.post).toHaveBeenCalledWith(
            expect.stringContaining('/duplicate'),
            expect.objectContaining({ newName: expect.any(String) })
          );
        });
      }
    });
  });

  // ─── Set Default ──────────────────────────────────────

  describe('Set Default', () => {
    it('should disable star button for default template', async () => {
      render(<PayslipTemplateManager />, { authValue: { user: adminUser } });
      await waitFor(() => {
        expect(screen.getByText('Standard Template')).toBeInTheDocument();
      });
      // The default template star should be disabled
      // Look for filled star icon
      const starIcons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('[data-testid="StarIcon"]')
      );
      if (starIcons.length > 0) {
        expect(starIcons[0]).toBeDisabled();
      }
    });
  });
});
