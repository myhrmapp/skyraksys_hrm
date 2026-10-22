import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render } from '../../../../test-utils/testUtils';
import InvoiceManagementPage from '../InvoiceManagementPage';
import { invoiceService } from '../../../../services/invoice.service';
import http from '../../../../http-common';

// Mock invoiceService
jest.mock('../../../../services/invoice.service', () => ({
  invoiceService: {
    getInvoices: jest.fn(),
    getTemplates: jest.fn(),
    createInvoice: jest.fn(),
    updateInvoice: jest.fn(),
    deleteInvoice: jest.fn(),
    updateStatus: jest.fn(),
    rotateSecretPhrase: jest.fn()
  }
}));

// Mock http-common
jest.mock('../../../../http-common', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    defaults: { baseURL: '/api' }
  }
}));

// Mock ConfirmDialog & useConfirmDialog
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
  confirm: jest.fn().mockImplementation(({ onConfirm } = {}) => {
    if (onConfirm) onConfirm();
    return Promise.resolve(true);
  })
}));

const mockInvoices = [
  {
    id: 10,
    invoiceNumber: 'INV-2026-001',
    clientCompany: 'Acme Global',
    billingMonth: 10,
    billingYear: 2026,
    totalAmount: 150000,
    status: 'draft',
    isSensitiveDataHidden: false,
    lineItems: [
      {
        id: 1,
        employeeName: 'Alice Johnson',
        hoursSupported: 160,
        hourlyRate: 800,
        description: 'Frontend React Development'
      }
    ]
  },
  {
    id: 11,
    invoiceNumber: 'INV-2026-002',
    clientCompany: 'Globex Corp',
    billingMonth: 10,
    billingYear: 2026,
    totalAmount: 90000,
    status: 'sent',
    isSensitiveDataHidden: false,
    lineItems: []
  }
];

const mockTemplates = [
  {
    id: 1,
    name: 'Standard Software Service',
    currency: 'INR',
    isDefault: true,
    isActive: true
  }
];

describe('InvoiceManagementPage Component', () => {
  let user;

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup();

    invoiceService.getInvoices.mockResolvedValue({
      data: {
        success: true,
        data: {
          invoices: mockInvoices,
          encryption: { sensitiveDataHidden: false }
        }
      }
    });

    invoiceService.getTemplates.mockResolvedValue({
      data: {
        success: true,
        data: mockTemplates
      }
    });

    http.get.mockResolvedValue({
      data: {
        success: true,
        data: [{ id: 1, firstName: 'Alice', lastName: 'Johnson' }]
      }
    });
  });

  test('renders page with secret phrase input, tabs, and invoice table', async () => {
    render(<InvoiceManagementPage />);

    expect(await screen.findByTestId('invoice-secret-phrase-input')).toBeInTheDocument();
    expect(screen.getByTestId('invoice-unlock-btn')).toBeInTheDocument();
    expect(screen.getByTestId('invoice-help-btn')).toBeInTheDocument();
    expect(screen.getByTestId('invoice-change-phrase-open-btn')).toBeInTheDocument();
    expect(screen.getByTestId('invoice-tab-invoices')).toBeInTheDocument();
    expect(screen.getByTestId('invoice-tab-templates')).toBeInTheDocument();

    // Verify invoice table and rows
    expect(await screen.findByTestId('invoice-table')).toBeInTheDocument();
    expect(screen.getByTestId('invoice-row-10')).toBeInTheDocument();
    expect(screen.getByTestId('invoice-row-11')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Acme Global')).toBeInTheDocument();
  });

  test('TC-050: toggles secret phrase visibility between password and text', async () => {
    render(<InvoiceManagementPage />);

    const phraseInput = await screen.findByTestId('invoice-secret-phrase-input');
    expect(phraseInput).toHaveAttribute('type', 'password');

    // Click visibility toggle
    const toggleBtn = screen.getByTestId('invoice-toggle-phrase-visibility');
    await user.click(toggleBtn);

    expect(phraseInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await user.click(toggleBtn);
    expect(phraseInput).toHaveAttribute('type', 'password');
  });

  test('TC-050: opens and closes Data Vault & Security Guide dialog', async () => {
    render(<InvoiceManagementPage />);

    const helpBtn = await screen.findByTestId('invoice-help-btn');
    await user.click(helpBtn);

    // Help dialog should be displayed with AES-256 explanation
    expect(await screen.findByTestId('invoice-help-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Invoice Data Vault & Security Guide/i)).toBeInTheDocument();
    expect(screen.getByText(/AES-256 GCM encryption/i)).toBeInTheDocument();

    // Close help dialog
    const closeBtn = screen.getByTestId('invoice-help-close-btn');
    await user.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('invoice-help-dialog')).not.toBeInTheDocument();
    });
  });

  test('unlocks data by passing secret phrase to invoice service', async () => {
    render(<InvoiceManagementPage />);

    const phraseInput = await screen.findByTestId('invoice-secret-phrase-input');
    await user.type(phraseInput, 'HrSecret2026!');

    const unlockBtn = screen.getByTestId('invoice-unlock-btn');
    await user.click(unlockBtn);

    await waitFor(() => {
      expect(invoiceService.getInvoices).toHaveBeenCalledWith(
        expect.any(Object),
        'HrSecret2026!'
      );
    });
  });

  test('updates invoice status via status select dropdown', async () => {
    invoiceService.updateStatus.mockResolvedValueOnce({
      data: { success: true }
    });

    render(<InvoiceManagementPage />);
    expect(await screen.findByTestId('invoice-row-10')).toBeInTheDocument();

    const statusSelect = screen.getByTestId('invoice-status-select-10');
    fireEvent.change(statusSelect, { target: { value: 'paid' } });

    await waitFor(() => {
      expect(invoiceService.updateStatus).toHaveBeenCalledWith(10, 'paid');
    });
  });

  test('downloads PDF when clicking PDF button', async () => {
    const originalOpen = window.open;
    window.open = jest.fn();

    render(<InvoiceManagementPage />);
    expect(await screen.findByTestId('invoice-pdf-btn-10')).toBeInTheDocument();

    await user.click(screen.getByTestId('invoice-pdf-btn-10'));

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('/invoices/10/pdf'),
      '_blank'
    );

    window.open = originalOpen;
  });
});
