/**
 * SalaryStructureTab.test.js
 *
 * Comprehensive field-level tests for SalaryStructureTab component.
 * Tests 20+ fields: basic salary with ₹ prefix and numeric mask,
 * currency (4 options), payFrequency (4 options), effectiveFrom date,
 * 7 allowance fields, 5 deduction fields, 3 benefit fields,
 * taxRegime (2 options), CTC, takeHome, salaryNotes.
 */
import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders as render } from '../../../../../test-utils/testUtils';
import SalaryStructureTab from '../SalaryStructureTab';

const createSalaryData = (overrides = {}) => ({
  basicSalary: '',
  currency: 'INR',
  payFrequency: 'monthly',
  effectiveFrom: '',
  allowances: { hra: '', transport: '', medical: '', food: '', communication: '', special: '', other: '' },
  deductions: { pf: '', professionalTax: '', incomeTax: '', esi: '', other: '' },
  benefits: { bonus: '', incentive: '', overtime: '' },
  taxInformation: { taxRegime: 'old', ctc: '', takeHome: '' },
  salaryNotes: '',
  ...overrides,
});

const createProps = (overrides = {}) => ({
  formData: { salary: createSalaryData(overrides.salary), ...overrides.formDataExtra },
  errors: overrides.errors || {},
  touchedFields: overrides.touchedFields || {},
  onChange: overrides.onChange || jest.fn(),
  onBlur: overrides.onBlur || jest.fn(),
});

const renderTab = (overrides = {}) => {
  const props = createProps(overrides);
  return { ...render(<SalaryStructureTab {...props} />), props };
};

describe('SalaryStructureTab', () => {
  // ─── Section Headings ──────────────────────────────────

  describe('Section Headings', () => {
    it('should render Basic Salary Information heading', () => {
      renderTab();
      expect(screen.getByText('Basic Salary Information')).toBeInTheDocument();
    });

    it('should render Allowances heading', () => {
      renderTab();
      expect(screen.getByText('Allowances')).toBeInTheDocument();
    });

    it('should render Deductions heading', () => {
      renderTab();
      expect(screen.getByText('Deductions')).toBeInTheDocument();
    });

    it('should render Benefits & Incentives heading', () => {
      renderTab();
      expect(screen.getByText('Benefits & Incentives')).toBeInTheDocument();
    });

    it('should render Tax Information heading', () => {
      renderTab();
      expect(screen.getByText('Tax Information')).toBeInTheDocument();
    });
  });

  // ─── Basic Salary ─────────────────────────────────────

  describe('Basic Salary Field', () => {
    it('should render Basic Salary field', () => {
      renderTab();
      expect(screen.getByLabelText(/basic salary/i)).toBeInTheDocument();
    });

    it('should show ₹ prefix', () => {
      renderTab();
      const rupeeSigns = screen.getAllByText('₹');
      expect(rupeeSigns.length).toBeGreaterThanOrEqual(1);
    });

    it('should apply numeric mask (strips non-numeric except dots)', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/basic salary/i), { target: { value: '50,000abc' } });
      // Component does: e.target.value.replace(/[^0-9.]/g, '') → '50000'
      expect(onChange).toHaveBeenCalledWith('salary.basicSalary', '50000');
    });

    it('should allow decimal values', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/basic salary/i), { target: { value: '50000.50' } });
      expect(onChange).toHaveBeenCalledWith('salary.basicSalary', '50000.50');
    });

    it('should show placeholder 50000', () => {
      renderTab();
      expect(screen.getByPlaceholderText('50000')).toBeInTheDocument();
    });

    it('should show helper text when no error', () => {
      renderTab();
      expect(screen.getByText(/optional.*enter basic salary/i)).toBeInTheDocument();
    });

    it('should show error when touched and error exists', () => {
      renderTab({
        errors: { 'salary.basicSalary': 'Basic salary must be a positive number' },
        touchedFields: { 'salary.basicSalary': true },
      });
      expect(screen.getByText('Basic salary must be a positive number')).toBeInTheDocument();
    });
  });

  // ─── Currency Select ──────────────────────────────────

  describe('Currency Select', () => {
    it('should render Currency select', () => {
      renderTab();
      expect(document.getElementById('salary.currency')).toBeInTheDocument();
    });

    it('should have INR, USD, EUR, GBP options', async () => {
      renderTab();
      fireEvent.mouseDown(document.getElementById('salary.currency'));
      const listbox = await screen.findByRole('listbox');
      const texts = within(listbox).getAllByRole('option').map(o => o.textContent);
      expect(texts).toContain('INR');
      expect(texts).toContain('USD');
      expect(texts).toContain('EUR');
      expect(texts).toContain('GBP');
      expect(texts).toHaveLength(4);
    });

    it('should default to INR', () => {
      renderTab();
      expect(screen.getByText('INR')).toBeInTheDocument();
    });

    it('should call onChange when currency changed', async () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.mouseDown(document.getElementById('salary.currency'));
      const listbox = await screen.findByRole('listbox');
      fireEvent.click(within(listbox).getByText('USD'));
      expect(onChange).toHaveBeenCalledWith('salary.currency', 'USD');
    });
  });

  // ─── Pay Frequency Select ─────────────────────────────

  describe('Pay Frequency Select', () => {
    it('should render Pay Frequency select', () => {
      renderTab();
      expect(document.getElementById('salary.payFrequency')).toBeInTheDocument();
    });

    it('should have Weekly, Bi-weekly, Monthly, Annually options', async () => {
      renderTab();
      fireEvent.mouseDown(document.getElementById('salary.payFrequency'));
      const listbox = await screen.findByRole('listbox');
      const texts = within(listbox).getAllByRole('option').map(o => o.textContent);
      expect(texts).toContain('Weekly');
      expect(texts).toContain('Bi-weekly');
      expect(texts).toContain('Monthly');
      expect(texts).toContain('Annually');
      expect(texts).toHaveLength(4);
    });

    it('should default to Monthly', () => {
      renderTab();
      expect(screen.getByText('Monthly')).toBeInTheDocument();
    });
  });

  // ─── Effective From ───────────────────────────────────

  describe('Effective From Field', () => {
    it('should render Effective From date field', () => {
      renderTab();
      expect(screen.getByLabelText(/effective from/i)).toBeInTheDocument();
    });

    it('should be a date input', () => {
      renderTab();
      expect(screen.getByLabelText(/effective from/i)).toHaveAttribute('type', 'date');
    });

    it('should call onChange when date entered', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/effective from/i), { target: { value: '2024-04-01' } });
      expect(onChange).toHaveBeenCalledWith('salary.effectiveFrom', '2024-04-01');
    });
  });

  // ─── Allowance Fields ─────────────────────────────────

  describe('Allowance Fields', () => {
    const allowanceFields = [
      { label: /house rent allowance/i, path: 'salary.allowances.hra' },
      { label: /transport allowance/i, path: 'salary.allowances.transport' },
      { label: /medical allowance/i, path: 'salary.allowances.medical' },
      { label: /food allowance/i, path: 'salary.allowances.food' },
      { label: /communication allowance/i, path: 'salary.allowances.communication' },
      { label: /special allowance/i, path: 'salary.allowances.special' },
      { label: /other allowance/i, path: 'salary.allowances.other' },
    ];

    it.each(allowanceFields)('should render $path field', ({ label }) => {
      renderTab();
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });

    it('should apply numeric mask to allowance fields', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/house rent allowance/i), { target: { value: '15,000abc' } });
      expect(onChange).toHaveBeenCalledWith('salary.allowances.hra', '15000');
    });

    it('should show ₹ prefix on all allowance fields', () => {
      renderTab();
      // Multiple ₹ symbols should be present (1 for basic + 7 for allowances + 5 deductions + 3 benefits = 16)
      const rupeeSigns = screen.getAllByText('₹');
      expect(rupeeSigns.length).toBeGreaterThanOrEqual(8); // At least basic + 7 allowances
    });
  });

  // ─── Deduction Fields ─────────────────────────────────

  describe('Deduction Fields', () => {
    const deductionFields = [
      { label: /provident fund/i, path: 'salary.deductions.pf' },
      { label: /professional tax/i, path: 'salary.deductions.professionalTax' },
      { label: /income tax/i, path: 'salary.deductions.incomeTax' },
      { label: /ESI.*employee state/i, path: 'salary.deductions.esi' },
      { label: /other deductions/i, path: 'salary.deductions.other' },
    ];

    it.each(deductionFields)('should render $path field', ({ label }) => {
      renderTab();
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });

    it('should apply numeric mask to deduction fields', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/provident fund/i), { target: { value: '1,800abc' } });
      expect(onChange).toHaveBeenCalledWith('salary.deductions.pf', '1800');
    });
  });

  // ─── Benefit Fields ───────────────────────────────────

  describe('Benefit Fields', () => {
    const benefitFields = [
      { label: /^bonus$/i, path: 'salary.benefits.bonus' },
      { label: /incentive/i, path: 'salary.benefits.incentive' },
      { label: /overtime/i, path: 'salary.benefits.overtime' },
    ];

    it.each(benefitFields)('should render $path field', ({ label }) => {
      renderTab();
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });

    it('should apply numeric mask to benefit fields', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/^bonus$/i), { target: { value: '10,000abc' } });
      expect(onChange).toHaveBeenCalledWith('salary.benefits.bonus', '10000');
    });
  });

  // ─── Tax Information ──────────────────────────────────

  describe('Tax Regime Select', () => {
    it('should render Tax Regime select', () => {
      renderTab();
      expect(document.getElementById('salary.taxInformation.taxRegime')).toBeInTheDocument();
    });

    it('should have Old and New tax regime options', async () => {
      renderTab();
      fireEvent.mouseDown(document.getElementById('salary.taxInformation.taxRegime'));
      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByText('Old Tax Regime')).toBeInTheDocument();
      expect(within(listbox).getByText('New Tax Regime')).toBeInTheDocument();
    });

    it('should default to Old Tax Regime', () => {
      renderTab();
      expect(screen.getByText('Old Tax Regime')).toBeInTheDocument();
    });

    it('should call onChange when regime selected', async () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.mouseDown(document.getElementById('salary.taxInformation.taxRegime'));
      const listbox = await screen.findByRole('listbox');
      fireEvent.click(within(listbox).getByText('New Tax Regime'));
      expect(onChange).toHaveBeenCalledWith('salary.taxInformation.taxRegime', 'new');
    });
  });

  describe('CTC and Take Home Fields', () => {
    it('should render CTC field', () => {
      renderTab();
      expect(screen.getByLabelText(/CTC.*cost to company/i)).toBeInTheDocument();
    });

    it('should render Take Home Salary field', () => {
      renderTab();
      expect(screen.getByLabelText(/take home salary/i)).toBeInTheDocument();
    });

    it('should be number type inputs', () => {
      renderTab();
      expect(screen.getByLabelText(/CTC.*cost to company/i)).toHaveAttribute('type', 'number');
      expect(screen.getByLabelText(/take home salary/i)).toHaveAttribute('type', 'number');
    });
  });

  // ─── Salary Notes ─────────────────────────────────────

  describe('Salary Notes Field', () => {
    it('should render Salary Notes multiline field', () => {
      renderTab();
      expect(screen.getByLabelText(/salary notes/i)).toBeInTheDocument();
    });

    it('should show helper text', () => {
      renderTab();
      expect(screen.getByText(/additional notes about salary/i)).toBeInTheDocument();
    });

    it('should call onChange when typed', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/salary notes/i), { target: { value: 'Special bonus' } });
      expect(onChange).toHaveBeenCalledWith('salary.salaryNotes', 'Special bonus');
    });
  });

  // ─── Happy Path ───────────────────────────────────────

  describe('Happy Path - Complete salary structure', () => {
    it('should render all populated salary data', () => {
      renderTab({
        salary: {
          basicSalary: '50000',
          currency: 'INR',
          payFrequency: 'monthly',
          effectiveFrom: '2024-04-01',
          allowances: { hra: '15000', transport: '5000', medical: '2000', food: '1500', communication: '1000', special: '3000', other: '500' },
          deductions: { pf: '6000', professionalTax: '200', incomeTax: '5000', esi: '175', other: '100' },
          benefits: { bonus: '10000', incentive: '5000', overtime: '2000' },
          taxInformation: { taxRegime: 'old', ctc: '120000', takeHome: '85000' },
          salaryNotes: 'Annual review pending',
        },
      });

      expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('15000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('6000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
    });
  });
});
