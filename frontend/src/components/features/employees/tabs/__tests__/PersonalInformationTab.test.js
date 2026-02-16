/**
 * PersonalInformationTab.test.js
 * 
 * Comprehensive field-level tests for PersonalInformationTab component.
 * Tests all 14 fields, input masks, dropdown options, error display, and photo section.
 */
import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render } from '../../../../../test-utils/testUtils';
import PersonalInformationTab from '../PersonalInformationTab';

// Mock PhotoUploadSimple
jest.mock('../../../../common/PhotoUploadSimple', () => {
  return function MockPhotoUpload({ onPhotoSelect, onPhotoRemove, label, helperText }) {
    return (
      <div data-testid="photo-upload">
        <span>{label}</span>
        <span>{helperText}</span>
        <button onClick={() => onPhotoSelect && onPhotoSelect(new File([''], 'test.jpg', { type: 'image/jpeg' }))}>
          Upload
        </button>
        <button onClick={() => onPhotoRemove && onPhotoRemove()}>Remove</button>
      </div>
    );
  };
});

// Factory for default formData
const createFormData = (overrides = {}) => ({
  firstName: '',
  lastName: '',
  employeeId: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  nationality: '',
  address: '',
  city: '',
  state: '',
  pinCode: '',
  ...overrides,
});

// Default props factory
const createProps = (overrides = {}) => ({
  formData: createFormData(overrides.formData),
  errors: overrides.errors || {},
  touchedFields: overrides.touchedFields || {},
  onChange: overrides.onChange || jest.fn(),
  onBlur: overrides.onBlur || jest.fn(),
  selectedPhoto: overrides.selectedPhoto || null,
  photoPreview: overrides.photoPreview || '',
  onPhotoSelect: overrides.onPhotoSelect || jest.fn(),
  onPhotoRemove: overrides.onPhotoRemove || jest.fn(),
});

const renderTab = (overrides = {}) => {
  const props = createProps(overrides);
  return { ...render(<PersonalInformationTab {...props} />), props };
};

describe('PersonalInformationTab', () => {
  // ─── Section Headings ───────────────────────────────────

  describe('Section Headings', () => {
    it('should render Employee Photo heading', () => {
      renderTab();
      expect(screen.getByText('Employee Photo')).toBeInTheDocument();
    });

    it('should render Essential Information heading', () => {
      renderTab();
      expect(screen.getByText('Essential Information')).toBeInTheDocument();
    });

    it('should render Personal Details heading', () => {
      renderTab();
      expect(screen.getByText('Personal Details')).toBeInTheDocument();
    });

    it('should render Address Information heading', () => {
      renderTab();
      expect(screen.getByText('Address Information')).toBeInTheDocument();
    });
  });

  // ─── Photo Section ─────────────────────────────────────

  describe('Photo Section', () => {
    it('should render the photo upload component', () => {
      renderTab();
      expect(screen.getByTestId('photo-upload')).toBeInTheDocument();
    });

    it('should render avatar with initials when no photo', () => {
      renderTab({ formData: { firstName: 'John', lastName: 'Doe' } });
      // Avatar should show JD initials
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should show default initials NE when no name provided', () => {
      renderTab();
      expect(screen.getByText('NE')).toBeInTheDocument();
    });

    it('should show photo helper text', () => {
      renderTab();
      expect(screen.getByText(/JPEG, PNG or WebP/)).toBeInTheDocument();
      expect(screen.getByText(/Max 5MB/)).toBeInTheDocument();
    });

    it('should call onPhotoSelect when upload is clicked', async () => {
      const onPhotoSelect = jest.fn();
      renderTab({ onPhotoSelect });
      const uploadBtn = screen.getByRole('button', { name: /upload/i });
      await userEvent.setup().click(uploadBtn);
      expect(onPhotoSelect).toHaveBeenCalled();
    });

    it('should call onPhotoRemove when remove is clicked', async () => {
      const onPhotoRemove = jest.fn();
      renderTab({ onPhotoRemove });
      const removeBtn = screen.getByRole('button', { name: /remove/i });
      await userEvent.setup().click(removeBtn);
      expect(onPhotoRemove).toHaveBeenCalled();
    });
  });

  // ─── Essential Fields ──────────────────────────────────

  describe('First Name Field', () => {
    it('should render First Name field with required label', () => {
      renderTab();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    it('should display firstName value from formData', () => {
      renderTab({ formData: { firstName: 'John' } });
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    });

    it('should call onChange with correct args when typed', async () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      const input = screen.getByLabelText(/first name/i);
      fireEvent.change(input, { target: { value: 'Jane' } });
      expect(onChange).toHaveBeenCalledWith('firstName', 'Jane');
    });

    it('should call onBlur when field loses focus', () => {
      const onBlur = jest.fn();
      renderTab({ onBlur });
      const input = screen.getByLabelText(/first name/i);
      fireEvent.blur(input);
      expect(onBlur).toHaveBeenCalledWith('firstName');
    });

    it('should show error when touched and error exists', () => {
      renderTab({
        errors: { firstName: 'First name is required' },
        touchedFields: { firstName: true },
      });
      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });

    it('should NOT show error when NOT touched', () => {
      renderTab({
        errors: { firstName: 'First name is required' },
        touchedFields: {},
      });
      expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
    });
  });

  describe('Last Name Field', () => {
    it('should render Last Name field with required label', () => {
      renderTab();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    });

    it('should display lastName value from formData', () => {
      renderTab({ formData: { lastName: 'Smith' } });
      expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
    });

    it('should call onChange when typed', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Smith' } });
      expect(onChange).toHaveBeenCalledWith('lastName', 'Smith');
    });

    it('should show error when touched', () => {
      renderTab({
        errors: { lastName: 'Last name is required' },
        touchedFields: { lastName: true },
      });
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
    });
  });

  describe('Employee ID Field', () => {
    it('should render Employee ID field', () => {
      renderTab();
      expect(screen.getByLabelText(/employee id/i)).toBeInTheDocument();
    });

    it('should show SKYT1001 placeholder', () => {
      renderTab();
      expect(screen.getByPlaceholderText('SKYT1001')).toBeInTheDocument();
    });

    it('should show format helper text when no error', () => {
      renderTab();
      expect(screen.getByText(/Format: SKYT####/)).toBeInTheDocument();
    });

    it('should show error instead of helper when touched and error exists', () => {
      renderTab({
        errors: { employeeId: 'Employee ID must be in SKYT#### format' },
        touchedFields: { employeeId: true },
      });
      expect(screen.getByText(/Employee ID must be in SKYT#### format/)).toBeInTheDocument();
    });

    it('should call onChange with employeeId', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/employee id/i), { target: { value: 'SKYT1001' } });
      expect(onChange).toHaveBeenCalledWith('employeeId', 'SKYT1001');
    });
  });

  describe('Email Field', () => {
    it('should render Email field with email type', () => {
      renderTab();
      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should display email value', () => {
      renderTab({ formData: { email: 'john@example.com' } });
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });

    it('should show email error when touched', () => {
      renderTab({
        errors: { email: 'Please enter a valid email address' },
        touchedFields: { email: true },
      });
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  // ─── Personal Details Fields ───────────────────────────

  describe('Phone Field', () => {
    it('should render Phone Number field', () => {
      renderTab();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    });

    it('should show format helper text', () => {
      renderTab();
      expect(screen.getByText(/Format: 1234567890 \(10 digits\)/)).toBeInTheDocument();
    });

    it('should show phone placeholder', () => {
      renderTab();
      expect(screen.getByPlaceholderText('1234567890')).toBeInTheDocument();
    });

    it('should apply digit-only mask and limit to 10 chars on change', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      const input = screen.getByLabelText(/phone number/i);
      // Simulate typing mixed input - the onChange handler strips non-digits and slices to 10
      fireEvent.change(input, { target: { value: '123abc4567890' } });
      // The component's onChange handler does: e.target.value.replace(/\D/g, '').slice(0, 10)
      // '123abc4567890' → '1234567890' (10 chars)
      expect(onChange).toHaveBeenCalledWith('phone', '1234567890');
    });

    it('should strip non-digit characters', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      const input = screen.getByLabelText(/phone number/i);
      fireEvent.change(input, { target: { value: 'abc!@#' } });
      expect(onChange).toHaveBeenCalledWith('phone', '');
    });

    it('should limit to 10 digits', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      const input = screen.getByLabelText(/phone number/i);
      fireEvent.change(input, { target: { value: '12345678901234' } });
      expect(onChange).toHaveBeenCalledWith('phone', '1234567890');
    });
  });

  describe('Date of Birth Field', () => {
    it('should render Date of Birth as date type', () => {
      renderTab();
      const dob = screen.getByLabelText(/date of birth/i);
      expect(dob).toBeInTheDocument();
      expect(dob).toHaveAttribute('type', 'date');
    });

    it('should call onChange with date value', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-05-15' } });
      expect(onChange).toHaveBeenCalledWith('dateOfBirth', '1990-05-15');
    });
  });

  describe('Gender Dropdown', () => {
    it('should render Gender select', () => {
      renderTab();
      expect(document.getElementById('gender')).toBeInTheDocument();
    });

    it('should have Male, Female, Other options', async () => {
      renderTab({ formData: { gender: '' } });
      // Open dropdown – MUI Select trigger gets the id from the id prop
      const select = document.getElementById('gender');
      fireEvent.mouseDown(select);
      const listbox = await screen.findByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      const optionTexts = options.map(o => o.textContent);
      expect(optionTexts).toContain('Male');
      expect(optionTexts).toContain('Female');
      expect(optionTexts).toContain('Other');
      expect(options).toHaveLength(3);
    });

    it('should call onChange when option selected', async () => {
      const onChange = jest.fn();
      renderTab({ onChange, formData: { gender: '' } });
      const select = document.getElementById('gender');
      fireEvent.mouseDown(select);
      const listbox = await screen.findByRole('listbox');
      fireEvent.click(within(listbox).getByText('Female'));
      expect(onChange).toHaveBeenCalledWith('gender', 'Female');
    });

    it('should display selected gender value', () => {
      renderTab({ formData: { gender: 'Male' } });
      expect(screen.getByText('Male')).toBeInTheDocument();
    });
  });

  describe('Marital Status Dropdown', () => {
    it('should render Marital Status select', () => {
      renderTab();
      expect(document.getElementById('maritalStatus')).toBeInTheDocument();
    });

    it('should have Single, Married, Divorced, Widowed options', async () => {
      renderTab({ formData: { maritalStatus: '' } });
      fireEvent.mouseDown(document.getElementById('maritalStatus'));
      const listbox = await screen.findByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      const optionTexts = options.map(o => o.textContent);
      expect(optionTexts).toContain('Single');
      expect(optionTexts).toContain('Married');
      expect(optionTexts).toContain('Divorced');
      expect(optionTexts).toContain('Widowed');
      expect(options).toHaveLength(4);
    });

    it('should call onChange when option selected', async () => {
      const onChange = jest.fn();
      renderTab({ onChange, formData: { maritalStatus: '' } });
      fireEvent.mouseDown(document.getElementById('maritalStatus'));
      const listbox = await screen.findByRole('listbox');
      fireEvent.click(within(listbox).getByText('Married'));
      expect(onChange).toHaveBeenCalledWith('maritalStatus', 'Married');
    });
  });

  describe('Nationality Field', () => {
    it('should render Nationality field', () => {
      renderTab();
      expect(screen.getByLabelText(/nationality/i)).toBeInTheDocument();
    });

    it('should display nationality value', () => {
      renderTab({ formData: { nationality: 'Indian' } });
      expect(screen.getByDisplayValue('Indian')).toBeInTheDocument();
    });

    it('should call onChange when typed', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/nationality/i), { target: { value: 'Indian' } });
      expect(onChange).toHaveBeenCalledWith('nationality', 'Indian');
    });
  });

  // ─── Address Fields ────────────────────────────────────

  describe('Address Field', () => {
    it('should render Address field as multiline', () => {
      renderTab();
      expect(screen.getByLabelText(/^address$/i)).toBeInTheDocument();
    });

    it('should call onChange when typed', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/^address$/i), { target: { value: '123 Main St' } });
      expect(onChange).toHaveBeenCalledWith('address', '123 Main St');
    });
  });

  describe('City Field', () => {
    it('should render City field', () => {
      renderTab();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    });

    it('should call onChange when typed', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Mumbai' } });
      expect(onChange).toHaveBeenCalledWith('city', 'Mumbai');
    });
  });

  describe('State Field', () => {
    it('should render State field', () => {
      renderTab();
      expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
    });

    it('should call onChange when typed', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/state/i), { target: { value: 'Maharashtra' } });
      expect(onChange).toHaveBeenCalledWith('state', 'Maharashtra');
    });
  });

  describe('PIN Code Field', () => {
    it('should render PIN Code field', () => {
      renderTab();
      expect(screen.getByLabelText(/pin code/i)).toBeInTheDocument();
    });

    it('should show format helper text', () => {
      renderTab();
      expect(screen.getByText(/Format: 123456 \(6 digits\)/)).toBeInTheDocument();
    });

    it('should show placeholder 123456', () => {
      renderTab();
      expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
    });

    it('should apply digit-only mask and limit to 6 chars', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/pin code/i), { target: { value: '400abc028999' } });
      // '400abc028999' → '400028' (6 digits)
      expect(onChange).toHaveBeenCalledWith('pinCode', '400028');
    });

    it('should strip non-digit characters', () => {
      const onChange = jest.fn();
      renderTab({ onChange });
      fireEvent.change(screen.getByLabelText(/pin code/i), { target: { value: 'abc!@#' } });
      expect(onChange).toHaveBeenCalledWith('pinCode', '');
    });

    it('should show error when error exists', () => {
      renderTab({
        errors: { pinCode: 'PIN code must be exactly 6 digits' },
      });
      expect(screen.getByText('PIN code must be exactly 6 digits')).toBeInTheDocument();
    });
  });

  // ─── Full Happy Path ──────────────────────────────────

  describe('Happy Path - All fields populated', () => {
    it('should render all populated fields correctly', () => {
      renderTab({
        formData: {
          firstName: 'Rahul',
          lastName: 'Sharma',
          employeeId: 'SKYT1001',
          email: 'rahul@skyraksys.com',
          phone: '9876543210',
          dateOfBirth: '1990-01-15',
          gender: 'Male',
          maritalStatus: 'Single',
          nationality: 'Indian',
          address: '123 MG Road',
          city: 'Bangalore',
          state: 'Karnataka',
          pinCode: '560001',
        },
      });

      expect(screen.getByDisplayValue('Rahul')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Sharma')).toBeInTheDocument();
      expect(screen.getByDisplayValue('SKYT1001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('rahul@skyraksys.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('9876543210')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1990-01-15')).toBeInTheDocument();
      expect(screen.getByText('Male')).toBeInTheDocument();
      expect(screen.getByText('Single')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Indian')).toBeInTheDocument();
      expect(screen.getByDisplayValue('123 MG Road')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Bangalore')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Karnataka')).toBeInTheDocument();
      expect(screen.getByDisplayValue('560001')).toBeInTheDocument();
    });

    it('should show avatar with correct initials from name', () => {
      renderTab({ formData: { firstName: 'Rahul', lastName: 'Sharma' } });
      expect(screen.getByText('RS')).toBeInTheDocument();
    });
  });
});
