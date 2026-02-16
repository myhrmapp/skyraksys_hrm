/**
 * EmploymentInformationTab.test.js
 *
 * Comprehensive field-level tests for EmploymentInformationTab component.
 * Tests all 14 fields, cascading dropdown (Position filtered by Department),
 * number clamping, disable states, and option enumerations.
 */
import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders as render } from '../../../../../test-utils/testUtils';
import EmploymentInformationTab from '../EmploymentInformationTab';

const dept1 = { id: 'dept-1', name: 'Engineering' };
const dept2 = { id: 'dept-2', name: 'HR' };
const pos1 = { id: 'pos-1', title: 'Developer', level: 'Senior', departmentId: 'dept-1' };
const pos2 = { id: 'pos-2', title: 'QA Engineer', level: '', departmentId: 'dept-1' };
const pos3 = { id: 'pos-3', title: 'HR Manager', level: 'Lead', departmentId: 'dept-2' };
const mgr1 = { id: 'mgr-1', firstName: 'Alice', lastName: 'Boss' };

const createFormData = (overrides = {}) => ({
  hireDate: '',
  departmentId: '',
  positionId: '',
  managerId: '',
  employmentType: '',
  status: 'Active',
  workLocation: '',
  probationPeriod: '',
  noticePeriod: '',
  joiningDate: '',
  confirmationDate: '',
  resignationDate: '',
  lastWorkingDate: '',
  ...overrides,
});

const createProps = (overrides = {}) => ({
  formData: createFormData(overrides.formData),
  errors: overrides.errors || {},
  touchedFields: overrides.touchedFields || {},
  onChange: overrides.onChange || jest.fn(),
  onBlur: overrides.onBlur || jest.fn(),
  departments: overrides.departments || [dept1, dept2],
  positions: overrides.positions || [pos1, pos2, pos3],
  managers: overrides.managers || [mgr1],
  loadingRefData: overrides.loadingRefData || false,
});

const renderTab = (overrides = {}) => {
  const props = createProps(overrides);
  return { ...render(<EmploymentInformationTab {...props} />), props };
};

describe('EmploymentInformationTab', () => {
  // ─── Hire Date ─────────────────────────────────────────

  describe('Hire Date Field', () => {
    it('should render hire date field', () => {
      renderTab();
      expect(screen.getByLabelText(/hire date/i)).toBeInTheDocument();
    });

    it('should be a date input', () => {
      renderTab();
      expect(screen.getByLabelText(/hire date/i)).toHaveAttribute('type', 'date');
    });

    it('should call onChange when date selected', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/hire date/i), { target: { value: '2024-01-15' } });
      expect(onChange).toHaveBeenCalledWith('hireDate', '2024-01-15');
    });

    it('should show helper text when no error', () => {
      renderTab();
      expect(screen.getByText(/date when employee was hired/i)).toBeInTheDocument();
    });

    it('should show error when touched and error exists', () => {
      renderTab({
        errors: { hireDate: 'Hire date is required' },
        touchedFields: { hireDate: true },
      });
      expect(screen.getByText('Hire date is required')).toBeInTheDocument();
    });
  });

  // ─── Department Select ─────────────────────────────────

  describe('Department Select', () => {
    it('should render Department select', () => {
      renderTab();
      expect(document.getElementById('departmentId')).toBeInTheDocument();
    });

    it('should list all departments', async () => {
      renderTab({ formData: { departmentId: '' } });
      fireEvent.mouseDown(document.getElementById('departmentId'));
      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByText('Engineering')).toBeInTheDocument();
      expect(within(listbox).getByText('HR')).toBeInTheDocument();
    });

    it('should call onChange with departmentId', async () => {
      const onChange = jest.fn();
      renderTab({ onChange, formData: { departmentId: '' } });
      fireEvent.mouseDown(document.getElementById('departmentId'));
      const listbox = await screen.findByRole('listbox');
      fireEvent.click(within(listbox).getByText('Engineering'));
      expect(onChange).toHaveBeenCalledWith('departmentId', 'dept-1');
    });

    it('should be disabled when loadingRefData is true', () => {
      renderTab({ loadingRefData: true });
      const select = document.getElementById('departmentId');
      expect(select).toHaveAttribute('aria-disabled', 'true');
    });

    it('should be disabled when departments array is empty', () => {
      renderTab({ departments: [] });
      const select = document.getElementById('departmentId');
      expect(select).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show helper text about department', () => {
      renderTab();
      expect(screen.getByText(/select the department this employee belongs to/i)).toBeInTheDocument();
    });

    it('should show error text when touched and error exists', () => {
      renderTab({
        errors: { departmentId: 'Department is required' },
        touchedFields: { departmentId: true },
      });
      expect(screen.getByText('Department is required')).toBeInTheDocument();
    });
  });

  // ─── Cascading Position Select ─────────────────────────

  describe('Cascading Position Select', () => {
    it('should render Position select', () => {
      renderTab();
      expect(document.getElementById('positionId')).toBeInTheDocument();
    });

    it('should be disabled when no department selected', () => {
      renderTab({ formData: { departmentId: '' } });
      const select = document.getElementById('positionId');
      expect(select).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show "Select department first" helper when no department', () => {
      renderTab({ formData: { departmentId: '' } });
      expect(screen.getByText(/select department first/i)).toBeInTheDocument();
    });

    it('should filter positions by selected department', async () => {
      renderTab({ formData: { departmentId: 'dept-1', positionId: '' } });
      fireEvent.mouseDown(document.getElementById('positionId'));
      const listbox = await screen.findByRole('listbox');
      // Should show dept-1 positions only
      expect(within(listbox).getByText(/Developer/)).toBeInTheDocument();
      expect(within(listbox).getByText('QA Engineer')).toBeInTheDocument();
      expect(within(listbox).queryByText(/HR Manager/)).not.toBeInTheDocument();
    });

    it('should show position count in helper text', () => {
      renderTab({ formData: { departmentId: 'dept-1' } });
      expect(screen.getByText(/2 position\(s\) available/i)).toBeInTheDocument();
    });

    it('should show position with level in parentheses', async () => {
      renderTab({ formData: { departmentId: 'dept-1', positionId: '' } });
      fireEvent.mouseDown(document.getElementById('positionId'));
      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByText('Developer (Senior)')).toBeInTheDocument();
    });

    it('should clear position when department changes and position belongs to different dept', async () => {
      const onChange = jest.fn();
      renderTab({
        onChange,
        formData: { departmentId: 'dept-1', positionId: 'pos-1' },
      });
      // Simulate changing department to dept-2
      fireEvent.mouseDown(document.getElementById('departmentId'));
      const listbox = await screen.findByRole('listbox');
      fireEvent.click(within(listbox).getByText('HR'));
      // Should call onChange for departmentId AND for positionId (clear)
      expect(onChange).toHaveBeenCalledWith('departmentId', 'dept-2');
      expect(onChange).toHaveBeenCalledWith('positionId', '');
    });

    it('should NOT clear position when switching to dept that contains current position', async () => {
      const onChange = jest.fn();
      // pos-3 belongs to dept-2 (HR Manager)
      renderTab({
        onChange,
        formData: { departmentId: 'dept-1', positionId: 'pos-3' },
      });
      // Change department from dept-1 to dept-2 where pos-3 belongs
      fireEvent.mouseDown(document.getElementById('departmentId'));
      const listbox = await screen.findByRole('listbox');
      fireEvent.click(within(listbox).getByText('HR'));
      expect(onChange).toHaveBeenCalledWith('departmentId', 'dept-2');
      // pos-3 belongs to dept-2, so position should NOT be cleared
      expect(onChange).not.toHaveBeenCalledWith('positionId', '');
    });
  });

  // ─── Manager Select ───────────────────────────────────

  describe('Manager Select', () => {
    it('should render Manager select', () => {
      renderTab();
      expect(document.getElementById('managerId')).toBeInTheDocument();
    });

    it('should have None option plus manager list', async () => {
      renderTab({ formData: { managerId: '' } });
      fireEvent.mouseDown(document.getElementById('managerId'));
      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByText('None')).toBeInTheDocument();
      expect(within(listbox).getByText('Alice Boss')).toBeInTheDocument();
    });

    it('should be disabled when loading', () => {
      renderTab({ loadingRefData: true });
      const select = document.getElementById('managerId');
      expect(select).toHaveAttribute('aria-disabled', 'true');
    });
  });

  // ─── Employment Type Select ────────────────────────────

  describe('Employment Type Select', () => {
    it('should render Employment Type select', () => {
      renderTab();
      expect(document.getElementById('employmentType')).toBeInTheDocument();
    });

    it('should have Full-time, Part-time, Contract, Intern options', async () => {
      renderTab({ formData: { employmentType: '' } });
      fireEvent.mouseDown(document.getElementById('employmentType'));
      const listbox = await screen.findByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      const texts = options.map(o => o.textContent);
      expect(texts).toContain('Full-time');
      expect(texts).toContain('Part-time');
      expect(texts).toContain('Contract');
      expect(texts).toContain('Intern');
      expect(options).toHaveLength(4);
    });

    it('should call onChange when option selected', async () => {
      const onChange = jest.fn();
      renderTab({ onChange, formData: { employmentType: '' } });
      fireEvent.mouseDown(document.getElementById('employmentType'));
      const listbox = await screen.findByRole('listbox');
      fireEvent.click(within(listbox).getByText('Contract'));
      expect(onChange).toHaveBeenCalledWith('employmentType', 'Contract');
    });
  });

  // ─── Status Select ────────────────────────────────────

  describe('Status Select', () => {
    it('should render Status select', () => {
      renderTab();
      expect(document.getElementById('status')).toBeInTheDocument();
    });

    it('should have Active, Inactive, On Leave, Terminated options', async () => {
      renderTab({ formData: { status: 'Active' } });
      fireEvent.mouseDown(document.getElementById('status'));
      const listbox = await screen.findByRole('listbox');
      const texts = within(listbox).getAllByRole('option').map(o => o.textContent);
      expect(texts).toContain('Active');
      expect(texts).toContain('Inactive');
      expect(texts).toContain('On Leave');
      expect(texts).toContain('Terminated');
    });

    it('should default to Active', () => {
      renderTab({ formData: { status: '' } });
      // When status is '' || 'Active', value is 'Active'
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  // ─── Work Location ────────────────────────────────────

  describe('Work Location Field', () => {
    it('should render Work Location field', () => {
      renderTab();
      expect(screen.getByLabelText(/work location/i)).toBeInTheDocument();
    });

    it('should call onChange when typed', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/work location/i), { target: { value: 'Remote' } });
      expect(onChange).toHaveBeenCalledWith('workLocation', 'Remote');
    });
  });

  // ─── Probation Period ─────────────────────────────────

  describe('Probation Period Field', () => {
    it('should render Probation Period number field', () => {
      renderTab();
      expect(screen.getByLabelText(/probation period/i)).toBeInTheDocument();
    });

    it('should show helper text about range', () => {
      renderTab();
      expect(screen.getByText(/number of months \(0-24\)/i)).toBeInTheDocument();
    });

    it('should clamp value to 0-24 range', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      // Value within range
      fireEvent.change(screen.getByLabelText(/probation period/i), { target: { value: '6' } });
      expect(onChange).toHaveBeenCalledWith('probationPeriod', 6);
    });

    it('should not call onChange for value > 24', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/probation period/i), { target: { value: '25' } });
      // The handler checks if value >= 0 && value <= 24, so it should NOT call onChange
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should show error when touched and error exists', () => {
      renderTab({
        errors: { probationPeriod: 'Probation period must be between 0-24 months' },
        touchedFields: { probationPeriod: true },
      });
      expect(screen.getByText('Probation period must be between 0-24 months')).toBeInTheDocument();
    });
  });

  // ─── Notice Period ─────────────────────────────────────

  describe('Notice Period Field', () => {
    it('should render Notice Period number field', () => {
      renderTab();
      expect(screen.getByLabelText(/notice period/i)).toBeInTheDocument();
    });

    it('should show helper text about range', () => {
      renderTab();
      expect(screen.getByText(/number of days \(0-365\)/i)).toBeInTheDocument();
    });

    it('should accept value in range', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/notice period/i), { target: { value: '30' } });
      expect(onChange).toHaveBeenCalledWith('noticePeriod', 30);
    });

    it('should not call onChange for value > 365', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/notice period/i), { target: { value: '400' } });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ─── Date Fields ──────────────────────────────────────

  describe('Date Fields', () => {
    it.each([
      ['Joining Date', 'joiningDate'],
      ['Confirmation Date', 'confirmationDate'],
      ['Resignation Date', 'resignationDate'],
      ['Last Working Date', 'lastWorkingDate'],
    ])('should render %s as date type', (label, _fieldName) => {
      renderTab();
      const input = screen.getByLabelText(new RegExp(label, 'i'));
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'date');
    });

    it('should call onChange for joiningDate', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/joining date/i), { target: { value: '2024-02-01' } });
      expect(onChange).toHaveBeenCalledWith('joiningDate', '2024-02-01');
    });
  });

  // ─── Happy Path ───────────────────────────────────────

  describe('Happy Path - All fields populated', () => {
    it('should render all filled values correctly', () => {
      renderTab({
        formData: {
          hireDate: '2024-01-15',
          departmentId: 'dept-1',
          positionId: 'pos-1',
          managerId: 'mgr-1',
          employmentType: 'Full-time',
          status: 'Active',
          workLocation: 'Office',
          probationPeriod: 6,
          noticePeriod: 30,
          joiningDate: '2024-01-20',
          confirmationDate: '2024-07-20',
          resignationDate: '',
          lastWorkingDate: '',
        },
      });

      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Office')).toBeInTheDocument();
      expect(screen.getByDisplayValue('6')).toBeInTheDocument();
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    });
  });
});
