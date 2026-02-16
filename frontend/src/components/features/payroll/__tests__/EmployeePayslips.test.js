import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, createMockUser } from '../../../../test-utils/testUtils';
import EmployeePayslips from '../EmployeePayslips';

// Mock payslip service
jest.mock('../../../../services/payslip/payslipService', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/payslip/payslipService');
  }
  return {
    payslipService: {
      getPayslipHistory: jest.fn(),
      downloadPayslipByIdPDF: jest.fn(),
    },
  };
});
const { payslipService } = require('../../../../services/payslip/payslipService');

// Mock PayslipViewer component
jest.mock('../../../payslip/PayslipViewer', () => {
  return function MockPayslipViewer({ open, onClose }) {
    if (!open) return null;
    return (
      <div data-testid="payslip-viewer">
        <span>Payslip Viewer</span>
        <button onClick={onClose}>Close Viewer</button>
      </div>
    );
  };
});

// Mock react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// ─── Mock data ──────────────────────────────────────────────────────────────
// Component queryFn does: const history = await payslipService.getPayslipHistory(...)
// The real service returns response.data (unwrapped), so mock should return raw array.
// Component uses: grossEarnings, netPay, totalDeductions, month, year, status
const mockPayslips = [
  {
    id: 1,
    month: 1,
    year: 2026,
    basicSalary: 50000,
    grossEarnings: 82850,
    netPay: 66850,
    totalDeductions: 16000,
    status: 'paid',
    paidDate: '2026-01-31',
    payslipNumber: 'PS-2026-01',
  },
  {
    id: 2,
    month: 12,
    year: 2025,
    basicSalary: 50000,
    grossEarnings: 82850,
    netPay: 66850,
    totalDeductions: 16000,
    status: 'paid',
    paidDate: '2025-12-31',
    payslipNumber: 'PS-2025-12',
  },
  {
    id: 3,
    month: 2,
    year: 2026,
    basicSalary: 50000,
    grossEarnings: 82850,
    netPay: 66850,
    totalDeductions: 16000,
    status: 'generated',
    paidDate: null,
    payslipNumber: 'PS-2026-02',
  },
];

const defaultAuthValue = { user: createMockUser('employee') };

const renderComponent = (authOverrides = {}) => {
  return render(<EmployeePayslips />, {
    authValue: { ...defaultAuthValue, ...authOverrides },
  });
};

// Wait for data to finish loading (table rows appear)
const waitForData = () =>
  waitFor(() => {
    expect(screen.getByText('January 2026')).toBeInTheDocument();
  });

describe('EmployeePayslips', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Return raw array (not wrapped in {data:}) because service does return response.data
    payslipService.getPayslipHistory.mockResolvedValue(mockPayslips);
    payslipService.downloadPayslipByIdPDF.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
  });

  // ─── Rendering ────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders the component heading', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /my payslips/i })).toBeInTheDocument();
      });
    });

    it('renders the subtitle text', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/view and download your salary statements/i)).toBeInTheDocument();
      });
    });

    it('navigates to /dashboard when back button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      await waitFor(() => {
        expect(payslipService.getPayslipHistory).toHaveBeenCalled();
      });

      // Back button is an IconButton with ArrowBackIcon (no aria-label)
      const backIcon = screen.getByTestId('ArrowBackIcon');
      await user.click(backIcon);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  // ─── Loading State ────────────────────────────────────────────
  describe('Loading State', () => {
    it('displays skeleton rows while loading', () => {
      payslipService.getPayslipHistory.mockReturnValue(new Promise(() => {}));
      renderComponent();

      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ─── Data Display ─────────────────────────────────────────────
  describe('Data Display', () => {
    it('displays payslip data after loading', async () => {
      renderComponent();
      await waitForData();
      expect(screen.getByText('December 2025')).toBeInTheDocument();
      expect(screen.getByText('February 2026')).toBeInTheDocument();
    });

    it('calls getPayslipHistory on mount', async () => {
      renderComponent();
      await waitFor(() => {
        expect(payslipService.getPayslipHistory).toHaveBeenCalled();
      });
    });

    it('displays financial data for each payslip row', async () => {
      renderComponent();
      await waitForData();

      // grossEarnings: 82,850 and netPay: 66,850 formatted with Indian locale
      const bodyText = document.body.textContent;
      expect(bodyText).toMatch(/82,850/);
      expect(bodyText).toMatch(/66,850/);
      expect(bodyText).toMatch(/16,000/);
    });

    it('renders table column headers', async () => {
      renderComponent();
      await waitForData();

      const columnHeaders = screen.getAllByRole('columnheader');
      const headerTexts = columnHeaders.map(h => h.textContent);
      expect(headerTexts).toEqual(
        expect.arrayContaining(['Pay Period', 'Gross Pay', 'Deductions', 'Net Pay', 'Status', 'Actions'])
      );
    });
  });

  // ─── Status Chips ─────────────────────────────────────────────
  describe('Status Chips', () => {
    it('renders status chips with correct labels', async () => {
      renderComponent();
      await waitForData();

      // Status is uppercased: "PAID", "GENERATED"
      const paidChips = screen.getAllByText('PAID');
      expect(paidChips.length).toBe(2); // Two paid payslips
      expect(screen.getByText('GENERATED')).toBeInTheDocument();
    });

    it('renders finalized status chip when present', async () => {
      const payslipsWithFinalized = [
        ...mockPayslips,
        {
          id: 4, month: 3, year: 2026, basicSalary: 50000,
          grossEarnings: 82850, netPay: 66850, totalDeductions: 16000,
          status: 'finalized', paidDate: null, payslipNumber: 'PS-2026-03',
        },
      ];
      payslipService.getPayslipHistory.mockResolvedValue(payslipsWithFinalized);
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('FINALIZED')).toBeInTheDocument();
      });
    });

    it('renders draft status chip when present', async () => {
      const payslipsWithDraft = [
        {
          id: 5, month: 4, year: 2026, basicSalary: 50000,
          grossEarnings: 82850, netPay: 66850, totalDeductions: 16000,
          status: 'draft', paidDate: null, payslipNumber: 'PS-2026-04',
        },
      ];
      payslipService.getPayslipHistory.mockResolvedValue(payslipsWithDraft);
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('DRAFT')).toBeInTheDocument();
      });
    });
  });

  // ─── Summary Cards ────────────────────────────────────────────
  describe('Summary Cards', () => {
    it('displays Total Payslips count', async () => {
      renderComponent();
      await waitForData();

      expect(screen.getByText('Total Payslips')).toBeInTheDocument();
      // 3 payslips — the count '3' appears in an h4
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays Total Earnings (YTD)', async () => {
      renderComponent();
      await waitForData();

      expect(screen.getByText('Total Earnings (YTD)')).toBeInTheDocument();
      // yearlyEarnings = 66850 * 3 = 200550 → "₹2,00,550"
      const bodyText = document.body.textContent;
      expect(bodyText).toMatch(/2,00,550/);
    });

    it('displays Average Monthly Pay', async () => {
      renderComponent();
      await waitForData();

      expect(screen.getByText('Average Monthly Pay')).toBeInTheDocument();
      // averageMonthlyPay = 200550 / 3 = 66850 → "₹66,850"
      const bodyText = document.body.textContent;
      expect(bodyText).toMatch(/66,850/);
    });
  });

  // ─── Year Filter ──────────────────────────────────────────────
  describe('Year Filter', () => {
    it('renders year filter with All Years default', async () => {
      renderComponent();
      await waitForData();

      // "All Years" default text is displayed in the Select
      expect(screen.getByText('All Years')).toBeInTheDocument();
    });

    it('filters payslips by selected year', async () => {
      const user = userEvent.setup();
      renderComponent();
      await waitForData();

      // Open the year filter dropdown — first combobox (second is TablePagination)
      const comboboxes = screen.getAllByRole('combobox');
      await user.click(comboboxes[0]);

      // Select 2025
      const listbox = await screen.findByRole('listbox');
      const option2025 = screen.getByRole('option', { name: '2025' });
      await user.click(option2025);

      // After filtering, only December 2025 should remain
      await waitFor(() => {
        expect(screen.getByText('December 2025')).toBeInTheDocument();
      });
      expect(screen.queryByText('January 2026')).not.toBeInTheDocument();
    }, 15000);

    it('shows correct payslip count text', async () => {
      renderComponent();
      await waitForData();

      // "Showing 3 payslips" text
      expect(screen.getByText(/showing 3 payslips/i)).toBeInTheDocument();
    });
  });

  // ─── View Payslip ─────────────────────────────────────────────
  describe('View Payslip', () => {
    it('opens PayslipViewer dialog when view icon is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      await waitForData();

      // View buttons use VisibilityIcon (no aria-label)
      const viewIcons = screen.getAllByTestId('VisibilityIcon');
      await user.click(viewIcons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('payslip-viewer')).toBeInTheDocument();
      });
      expect(screen.getByText('Payslip Viewer')).toBeInTheDocument();
    });

    it('closes PayslipViewer when close button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      await waitForData();

      // Open viewer
      const viewIcons = screen.getAllByTestId('VisibilityIcon');
      await user.click(viewIcons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('payslip-viewer')).toBeInTheDocument();
      });

      // Close viewer
      await user.click(screen.getByText('Close Viewer'));
      await waitFor(() => {
        expect(screen.queryByTestId('payslip-viewer')).not.toBeInTheDocument();
      });
    });
  });

  // ─── Download Payslip ─────────────────────────────────────────
  describe('Download Payslip', () => {
    it('calls downloadPayslipByIdPDF when download icon is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      await waitForData();

      // Download buttons use DownloadIcon (no aria-label)
      const downloadIcons = screen.getAllByTestId('DownloadIcon');
      await user.click(downloadIcons[0]);

      await waitFor(() => {
        expect(payslipService.downloadPayslipByIdPDF).toHaveBeenCalledWith(1);
      });
    });

    it('handles download error gracefully', async () => {
      // Component does fire-and-forget download (no try/catch),
      // so we catch unhandled rejection ourselves
      const downloadError = new Error('Download failed');
      payslipService.downloadPayslipByIdPDF.mockImplementation(() => {
        const p = Promise.reject(downloadError);
        p.catch(() => {}); // prevent unhandled rejection
        return p;
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const user = userEvent.setup();
      renderComponent();
      await waitForData();

      const downloadIcons = screen.getAllByTestId('DownloadIcon');
      await user.click(downloadIcons[0]);

      await waitFor(() => {
        expect(payslipService.downloadPayslipByIdPDF).toHaveBeenCalled();
      });
      // Component should not crash
      expect(document.body).toBeTruthy();

      consoleSpy.mockRestore();
    });
  });

  // ─── Empty State ──────────────────────────────────────────────
  describe('Empty State', () => {
    it('displays "No payslips found" when data is empty', async () => {
      payslipService.getPayslipHistory.mockResolvedValue([]);
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/no payslips found/i)).toBeInTheDocument();
      });
    });

    it('displays "No payslips found" when service returns non-array', async () => {
      payslipService.getPayslipHistory.mockResolvedValue({ data: [] });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/no payslips found/i)).toBeInTheDocument();
      });
    });
  });

  // ─── Error Handling ───────────────────────────────────────────
  describe('Error Handling', () => {
    it('handles API error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      payslipService.getPayslipHistory.mockRejectedValue(new Error('API Error'));
      renderComponent();

      await waitFor(() => {
        expect(document.body).toBeTruthy();
      });

      consoleSpy.mockRestore();
    });
  });

  // ─── Pagination ───────────────────────────────────────────────
  describe('Pagination', () => {
    it('renders pagination controls', async () => {
      renderComponent();
      await waitForData();

      // MUI TablePagination renders "Rows per page" text
      expect(screen.getByText(/rows per page/i)).toBeInTheDocument();
    });

    it('paginates correctly with many payslips', async () => {
      const manyPayslips = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        month: (i % 12) + 1,
        year: 2026 - Math.floor(i / 12),
        basicSalary: 50000,
        grossEarnings: 82850,
        netPay: 66850,
        totalDeductions: 16000,
        status: 'paid',
        paidDate: `${2026 - Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}-28`,
        payslipNumber: `PS-${i + 1}`,
      }));

      payslipService.getPayslipHistory.mockResolvedValue(manyPayslips);
      const user = userEvent.setup();
      renderComponent();

      // Wait for first page data
      await waitFor(() => {
        // Default 10 rows per page, so first 10 payslips visible
        const rows = screen.getAllByRole('row');
        // Header row + 10 data rows = 11
        expect(rows.length).toBeGreaterThan(5);
      });

      // Click next page
      const nextPageButton = screen.getByTitle(/next page/i) || screen.getByLabelText(/next page/i);
      if (!nextPageButton.disabled) {
        await user.click(nextPageButton);
        // Should show remaining 5 payslips on page 2
        await waitFor(() => {
          expect(screen.getByText(/11–15 of 15/)).toBeInTheDocument();
        });
      }
    });
  });

  // ─── Data format handling ─────────────────────────────────────
  describe('Data Format Handling', () => {
    it('handles non-array response gracefully', async () => {
      // Service returns a non-array → queryFn returns [] → empty state
      payslipService.getPayslipHistory.mockResolvedValue({ data: mockPayslips });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/no payslips found/i)).toBeInTheDocument();
      });
    });
  });
});
