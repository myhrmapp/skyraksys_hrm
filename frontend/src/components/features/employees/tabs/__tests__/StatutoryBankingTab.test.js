/**
 * StatutoryBankingTab.test.js
 *
 * Comprehensive tests for StatutoryBankingTab component.
 * Tests 10 fields with input masks:
 *   Statutory: aadhaarNumber (digits, 12 limit), panNumber (uppercase alphanum, 10 limit),
 *              uanNumber (uppercase alphanum), pfNumber (free text),
 *              esiNumber (uppercase alphanum, 17 limit)
 *   Banking:   bankName, bankAccountNumber, ifscCode (uppercase alphanum, 11 limit),
 *              accountHolderName, bankBranch
 * Each statutory field has a Tooltip help icon.
 */
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../../../../test-utils/testUtils';
import StatutoryBankingTab from '../StatutoryBankingTab';

const createFormData = (overrides = {}) => ({
  aadhaarNumber: '',
  panNumber: '',
  uanNumber: '',
  pfNumber: '',
  esiNumber: '',
  bankName: '',
  bankAccountNumber: '',
  ifscCode: '',
  accountHolderName: '',
  bankBranch: '',
  ...overrides,
});

const createProps = (overrides = {}) => ({
  formData: createFormData(overrides.formData),
  errors: overrides.errors || {},
  touchedFields: overrides.touchedFields || {},
  onChange: overrides.onChange || jest.fn(),
  onBlur: overrides.onBlur || jest.fn(),
});

const renderTab = (overrides = {}) => {
  const props = createProps(overrides);
  return { ...render(<StatutoryBankingTab {...props} />), props };
};

describe('StatutoryBankingTab', () => {
  // ─── Section Headings ──────────────────────────────────

  describe('Section Headings', () => {
    it('should render Statutory Details heading', () => {
      renderTab();
      expect(screen.getByText('Statutory Details')).toBeInTheDocument();
    });

    it('should render Banking Details heading', () => {
      renderTab();
      expect(screen.getByText('Banking Details')).toBeInTheDocument();
    });

    it('should show that statutory fields are optional', () => {
      renderTab();
      expect(screen.getByText(/all statutory fields are optional/i)).toBeInTheDocument();
    });
  });

  // ─── Aadhaar Number ───────────────────────────────────

  describe('Aadhaar Number Field', () => {
    it('should render Aadhaar Number field', () => {
      renderTab();
      expect(screen.getByLabelText(/aadhaar number/i)).toBeInTheDocument();
    });

    it('should show format helper text', () => {
      renderTab();
      expect(screen.getByText(/Format: 123456789012 \(12 digits\)/i)).toBeInTheDocument();
    });

    it('should apply digit-only mask', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/aadhaar number/i), { target: { value: '1234abcd5678' } });
      // Strips non-digits: '12345678' (under 12 limit)
      expect(onChange).toHaveBeenCalledWith('aadhaarNumber', '12345678');
    });

    it('should limit to 12 digits', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/aadhaar number/i), { target: { value: '1234567890123456' } });
      expect(onChange).toHaveBeenCalledWith('aadhaarNumber', '123456789012');
    });

    it('should show error when touched and invalid', () => {
      renderTab({
        errors: { aadhaarNumber: 'Aadhaar number must be exactly 12 digits' },
        touchedFields: { aadhaarNumber: true },
      });
      expect(screen.getByText('Aadhaar number must be exactly 12 digits')).toBeInTheDocument();
    });

    it('should have tooltip help icon', () => {
      renderTab();
      // Help icons render as buttons with HelpOutline icon
      const helpButtons = screen.getAllByRole('button');
      expect(helpButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── PAN Number ───────────────────────────────────────

  describe('PAN Number Field', () => {
    it('should render PAN Number field', () => {
      renderTab();
      expect(screen.getByLabelText(/pan number/i)).toBeInTheDocument();
    });

    it('should show format helper text', () => {
      renderTab();
      expect(screen.getByText(/Format: ABCDE1234F/i)).toBeInTheDocument();
    });

    it('should convert to uppercase and strip non-alphanum', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/pan number/i), { target: { value: 'abcde-1234f' } });
      // toUpperCase + replace non-alphanum + slice to 10: 'ABCDE1234F'
      expect(onChange).toHaveBeenCalledWith('panNumber', 'ABCDE1234F');
    });

    it('should limit to 10 characters', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/pan number/i), { target: { value: 'ABCDE1234FGH' } });
      expect(onChange).toHaveBeenCalledWith('panNumber', 'ABCDE1234F');
    });

    it('should show error when touched and invalid', () => {
      renderTab({
        errors: { panNumber: 'PAN number format is invalid (e.g., ABCDE1234F)' },
        touchedFields: { panNumber: true },
      });
      expect(screen.getByText(/PAN number format is invalid/)).toBeInTheDocument();
    });
  });

  // ─── UAN Number ───────────────────────────────────────

  describe('UAN Number Field', () => {
    it('should render UAN Number field', () => {
      renderTab();
      expect(screen.getByLabelText(/uan number/i)).toBeInTheDocument();
    });

    it('should convert to uppercase and strip non-alphanum', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/uan number/i), { target: { value: 'abc-123def456' } });
      // 'abc-123def456' → uppercase → 'ABC-123DEF456' → strip non-alphanum → 'ABC123DEF456'
      expect(onChange).toHaveBeenCalledWith('uanNumber', 'ABC123DEF456');
    });

    it('should show helper text about 12+ alphanumeric', () => {
      renderTab();
      expect(screen.getByText(/12\+ alphanumeric/i)).toBeInTheDocument();
    });

    it('should show error when touched and invalid', () => {
      renderTab({
        errors: { uanNumber: 'UAN number must be at least 12 alphanumeric characters' },
        touchedFields: { uanNumber: true },
      });
      expect(screen.getByText(/UAN number must be at least 12/)).toBeInTheDocument();
    });
  });

  // ─── PF Number ────────────────────────────────────────

  describe('PF Number Field', () => {
    it('should render PF Number field', () => {
      renderTab();
      expect(screen.getByLabelText(/pf number/i)).toBeInTheDocument();
    });

    it('should accept free text (no mask)', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/pf number/i), { target: { value: 'MH/BOM/12345/001' } });
      expect(onChange).toHaveBeenCalledWith('pfNumber', 'MH/BOM/12345/001');
    });

    it('should show helper text', () => {
      renderTab();
      expect(screen.getByText(/employee provident fund number/i)).toBeInTheDocument();
    });
  });

  // ─── ESI Number ───────────────────────────────────────

  describe('ESI Number Field', () => {
    it('should render ESI Number field', () => {
      renderTab();
      expect(screen.getByLabelText(/esi number/i, { selector: 'input' })).toBeInTheDocument();
    });

    it('should convert to uppercase and strip non-alphanum', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/esi number/i, { selector: 'input' }), { target: { value: 'esi-00000001234' } });
      // Strips non-digits: '12345678' (under 12 limit)
      expect(onChange).toHaveBeenCalledWith('esiNumber', 'ESI00000001234');
    });

    it('should limit to 17 characters', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/esi number/i, { selector: 'input' }), { target: { value: 'ESI000000012345678' } });
      // 18 chars → slice to 17
      expect(onChange).toHaveBeenCalledWith('esiNumber', 'ESI00000001234567');
    });

    it('should show placeholder', () => {
      renderTab();
      expect(screen.getByPlaceholderText('ESI00000001234')).toBeInTheDocument();
    });
  });

  // ─── Banking Fields ───────────────────────────────────

  describe('Bank Name Field', () => {
    it('should render Bank Name field', () => {
      renderTab();
      expect(screen.getByLabelText(/bank name/i)).toBeInTheDocument();
    });

    it('should accept free text', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/bank name/i), { target: { value: 'State Bank of India' } });
      expect(onChange).toHaveBeenCalledWith('bankName', 'State Bank of India');
    });

    it('should show placeholder', () => {
      renderTab();
      expect(screen.getByPlaceholderText('State Bank of India')).toBeInTheDocument();
    });
  });

  describe('Account Number Field', () => {
    it('should render Account Number field', () => {
      renderTab();
      expect(screen.getByLabelText(/account number/i, { selector: 'input' })).toBeInTheDocument();
    });

    it('should accept input', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/account number/i, { selector: 'input' }), { target: { value: '12345678901234' } });
      expect(onChange).toHaveBeenCalledWith('bankAccountNumber', '12345678901234');
    });

    it('should show helper text about length', () => {
      renderTab();
      expect(screen.getByText(/9-20 digits/i)).toBeInTheDocument();
    });

    it('should show error when touched and invalid', () => {
      renderTab({
        errors: { bankAccountNumber: 'Bank account number must be 9-20 characters' },
        touchedFields: { bankAccountNumber: true },
      });
      expect(screen.getByText('Bank account number must be 9-20 characters')).toBeInTheDocument();
    });
  });

  describe('IFSC Code Field', () => {
    it('should render IFSC Code field', () => {
      renderTab();
      expect(screen.getByLabelText(/ifsc code/i)).toBeInTheDocument();
    });

    it('should convert to uppercase and strip non-alphanum', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/ifsc code/i), { target: { value: 'sbin-0000123' } });
      // uppercase + strip non-alphanum → 'SBIN0000123' (11 chars)
      expect(onChange).toHaveBeenCalledWith('ifscCode', 'SBIN0000123');
    });

    it('should limit to 11 characters', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/ifsc code/i), { target: { value: 'SBIN00001234' } });
      expect(onChange).toHaveBeenCalledWith('ifscCode', 'SBIN0000123');
    });

    it('should show format helper text', () => {
      renderTab();
      expect(screen.getByText(/Format: SBIN0000123/i)).toBeInTheDocument();
    });

    it('should show placeholder', () => {
      renderTab();
      expect(screen.getByPlaceholderText('SBIN0000123')).toBeInTheDocument();
    });

    it('should show error when touched and invalid', () => {
      renderTab({
        errors: { ifscCode: 'IFSC code format is invalid (e.g., SBIN0000123)' },
        touchedFields: { ifscCode: true },
      });
      expect(screen.getByText(/IFSC code format is invalid/)).toBeInTheDocument();
    });
  });

  describe('Account Holder Name Field', () => {
    it('should render Account Holder Name field', () => {
      renderTab();
      expect(screen.getByLabelText(/account holder name/i)).toBeInTheDocument();
    });

    it('should show helper text', () => {
      renderTab();
      expect(screen.getByText(/name as per bank records/i)).toBeInTheDocument();
    });

    it('should accept input', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/account holder name/i), { target: { value: 'John Doe' } });
      expect(onChange).toHaveBeenCalledWith('accountHolderName', 'John Doe');
    });
  });

  describe('Bank Branch Field', () => {
    it('should render Bank Branch field', () => {
      renderTab();
      expect(screen.getByLabelText(/bank branch/i)).toBeInTheDocument();
    });

    it('should show helper text', () => {
      renderTab();
      expect(screen.getByText(/branch name and location/i)).toBeInTheDocument();
    });

    it('should accept input', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/bank branch/i), { target: { value: 'Main Branch, Mumbai' } });
      expect(onChange).toHaveBeenCalledWith('bankBranch', 'Main Branch, Mumbai');
    });
  });

  // ─── Help Icons ───────────────────────────────────────

  describe('Tooltip Help Icons', () => {
    it('should render help icons for statutory fields (Aadhaar, PAN, UAN, ESI, IFSC)', () => {
      renderTab();
      // 5 statutory/banking fields have help icons: Aadhaar, PAN, UAN, ESI, IFSC
      const helpButtons = screen.getAllByRole('button');
      expect(helpButtons.length).toBeGreaterThanOrEqual(5);
    });
  });

  // ─── Happy Path ───────────────────────────────────────

  describe('Happy Path - All fields populated', () => {
    it('should render all populated values correctly', () => {
      renderTab({
        formData: {
          aadhaarNumber: '123456789012',
          panNumber: 'ABCDE1234F',
          uanNumber: 'UAN123456789',
          pfNumber: 'MH/BOM/001',
          esiNumber: 'ESI00000001234',
          bankName: 'State Bank of India',
          bankAccountNumber: '12345678901234',
          ifscCode: 'SBIN0000123',
          accountHolderName: 'Rahul Sharma',
          bankBranch: 'Main Branch, Mumbai',
        },
      });

      expect(screen.getByDisplayValue('123456789012')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ABCDE1234F')).toBeInTheDocument();
      expect(screen.getByDisplayValue('UAN123456789')).toBeInTheDocument();
      expect(screen.getByDisplayValue('MH/BOM/001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ESI00000001234')).toBeInTheDocument();
      expect(screen.getByDisplayValue('State Bank of India')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12345678901234')).toBeInTheDocument();
      expect(screen.getByDisplayValue('SBIN0000123')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Rahul Sharma')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Main Branch, Mumbai')).toBeInTheDocument();
    });
  });
});
