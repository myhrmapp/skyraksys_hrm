/**
 * employeeValidation.test.js
 *
 * Comprehensive tests for employeeValidation utility.
 * Tests validateEmployeeForm, validateField, and transformEmployeeDataForAPI
 * covering all validation rules, regex patterns, error messages, and data transformation.
 */
import {
  validateEmployeeForm,
  validateField,
  transformEmployeeDataForAPI,
} from '../employeeValidation';

// Base valid form data for happy-path testing
const createValidFormData = (overrides = {}) => ({
  firstName: 'Rahul',
  lastName: 'Sharma',
  email: 'rahul@skyraksys.com',
  employeeId: 'SKYT1001',
  hireDate: '2024-01-15',
  departmentId: 'dept-uuid-123',
  positionId: 'pos-uuid-456',
  phone: '9876543210',
  dateOfBirth: '1990-05-15',
  gender: 'Male',
  maritalStatus: 'Single',
  nationality: 'Indian',
  employmentType: 'Full-time',
  status: 'Active',
  pinCode: '560001',
  probationPeriod: 6,
  noticePeriod: 30,
  address: '123 MG Road',
  city: 'Bangalore',
  state: 'Karnataka',
  aadhaarNumber: '123456789012',
  panNumber: 'ABCDE1234F',
  uanNumber: 'UAN123456789',
  esiNumber: 'ESI00000001234',
  ifscCode: 'SBIN0000123',
  bankAccountNumber: '12345678901234',
  emergencyContactPhone: '1234567890',
  emergencyContactRelation: 'Spouse',
  salary: {
    basicSalary: '50000',
    currency: 'INR',
    payFrequency: 'monthly',
    effectiveFrom: '2024-04-01',
    allowances: { hra: 15000, transport: 5000 },
    deductions: { pf: 6000 },
    benefits: { bonus: 10000 },
    taxInformation: { taxRegime: 'old', ctc: 120000, takeHome: 85000 },
  },
  userAccount: {
    enableLogin: false,
    role: 'employee',
    password: '',
    confirmPassword: '',
  },
  ...overrides,
});

describe('validateEmployeeForm', () => {
  // ─── Happy Path ───────────────────────────────────────

  describe('Happy Path', () => {
    it('should return isValid=true for valid complete form data', () => {
      const result = validateEmployeeForm(createValidFormData());
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should return isValid=true with only required fields', () => {
      const result = validateEmployeeForm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        hireDate: '2024-01-01',
        departmentId: 'dept-1',
        positionId: 'pos-1',
      });
      expect(result.isValid).toBe(true);
    });
  });

  // ─── Required Fields ──────────────────────────────────

  describe('Required Fields', () => {
    it('should require firstName', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), firstName: '' });
      expect(result.errors.firstName).toBe('First name is required');
    });

    it('should require lastName', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), lastName: '' });
      expect(result.errors.lastName).toBe('Last name is required');
    });

    it('should require email', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), email: '' });
      expect(result.errors.email).toBe('Email is required');
    });

    it('should require hireDate', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), hireDate: '' });
      expect(result.errors.hireDate).toBe('Hire date is required');
    });

    it('should require departmentId', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), departmentId: '' });
      expect(result.errors.departmentId).toBe('Department is required');
    });

    it('should require positionId', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), positionId: '' });
      expect(result.errors.positionId).toBe('Position is required');
    });
  });

  // ─── First Name Validation ────────────────────────────

  describe('First Name Validation', () => {
    it('should reject firstName shorter than 2 chars', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), firstName: 'A' });
      expect(result.errors.firstName).toBe('First name must be at least 2 characters');
    });

    it('should reject firstName longer than 50 chars', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), firstName: 'A'.repeat(51) });
      expect(result.errors.firstName).toBe('First name must not exceed 50 characters');
    });

    it('should accept exactly 2 char firstName', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), firstName: 'AB' });
      expect(result.errors.firstName).toBeUndefined();
    });

    it('should accept exactly 50 char firstName', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), firstName: 'A'.repeat(50) });
      expect(result.errors.firstName).toBeUndefined();
    });
  });

  // ─── Last Name Validation ─────────────────────────────

  describe('Last Name Validation', () => {
    it('should reject lastName shorter than 2 chars', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), lastName: 'B' });
      expect(result.errors.lastName).toBe('Last name must be at least 2 characters');
    });

    it('should reject lastName longer than 50 chars', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), lastName: 'B'.repeat(51) });
      expect(result.errors.lastName).toBe('Last name must not exceed 50 characters');
    });
  });

  // ─── Email Validation ─────────────────────────────────

  describe('Email Validation', () => {
    it('should reject invalid email format', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), email: 'not-an-email' });
      expect(result.errors.email).toBe('Please enter a valid email address');
    });

    it('should accept valid email', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), email: 'user@domain.com' });
      expect(result.errors.email).toBeUndefined();
    });

    it('should reject email without @', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), email: 'userdomain.com' });
      expect(result.errors.email).toBe('Please enter a valid email address');
    });
  });

  // ─── Employee ID Validation ───────────────────────────

  describe('Employee ID Validation', () => {
    it('should accept valid SKYT format', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), employeeId: 'SKYT1234' });
      expect(result.errors.employeeId).toBeUndefined();
    });

    it('should reject invalid format', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), employeeId: 'EMP001' });
      expect(result.errors.employeeId).toContain('SKYT####');
    });

    it('should accept when employeeId is empty (optional)', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), employeeId: '' });
      expect(result.errors.employeeId).toBeUndefined();
    });

    it('should reject too short', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), employeeId: 'AB' });
      expect(result.errors.employeeId).toBe('Employee ID must be at least 3 characters');
    });
  });

  // ─── Hire Date Validation ─────────────────────────────

  describe('Hire Date Validation', () => {
    it('should reject future hire date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = validateEmployeeForm({
        ...createValidFormData(),
        hireDate: futureDate.toISOString().split('T')[0],
      });
      expect(result.errors.hireDate).toBe('Hire date cannot be in the future');
    });

    it('should accept today as hire date', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = validateEmployeeForm({ ...createValidFormData(), hireDate: today });
      expect(result.errors.hireDate).toBeUndefined();
    });
  });

  // ─── Phone Validation ─────────────────────────────────

  describe('Phone Validation', () => {
    it('should accept valid 10-digit phone', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), phone: '9876543210' });
      expect(result.errors.phone).toBeUndefined();
    });

    it('should reject too short phone', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), phone: '12345' });
      expect(result.errors.phone).toContain('10 digits');
    });

    it('should accept empty phone (optional)', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), phone: '' });
      expect(result.errors.phone).toBeUndefined();
    });
  });

  // ─── Date of Birth Validation ─────────────────────────

  describe('Date of Birth Validation', () => {
    it('should reject future date of birth', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = validateEmployeeForm({
        ...createValidFormData(),
        dateOfBirth: futureDate.toISOString().split('T')[0],
      });
      expect(result.errors.dateOfBirth).toBe('Date of birth must be in the past');
    });

    it('should reject underaged employee (< 18)', () => {
      const recentDate = new Date();
      recentDate.setFullYear(recentDate.getFullYear() - 15);
      const result = validateEmployeeForm({
        ...createValidFormData(),
        dateOfBirth: recentDate.toISOString().split('T')[0],
      });
      expect(result.errors.dateOfBirth).toBe('Employee must be at least 18 years old');
    });

    it('should accept 18+ date of birth', () => {
      const validDob = new Date();
      validDob.setFullYear(validDob.getFullYear() - 25);
      const result = validateEmployeeForm({
        ...createValidFormData(),
        dateOfBirth: validDob.toISOString().split('T')[0],
      });
      expect(result.errors.dateOfBirth).toBeUndefined();
    });

    it('should accept empty date of birth (optional)', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), dateOfBirth: '' });
      expect(result.errors.dateOfBirth).toBeUndefined();
    });
  });

  // ─── Enum Validations ─────────────────────────────────

  describe('Enum Validations', () => {
    it('should accept valid gender values', () => {
      ['Male', 'Female', 'Other'].forEach(gender => {
        const result = validateEmployeeForm({ ...createValidFormData(), gender });
        expect(result.errors.gender).toBeUndefined();
      });
    });

    it('should reject invalid gender', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), gender: 'Invalid' });
      expect(result.errors.gender).toBeDefined();
    });

    it('should accept all valid marital statuses', () => {
      ['Single', 'Married', 'Divorced', 'Widowed'].forEach(status => {
        const result = validateEmployeeForm({ ...createValidFormData(), maritalStatus: status });
        expect(result.errors.maritalStatus).toBeUndefined();
      });
    });

    it('should accept all valid employment types', () => {
      ['Full-time', 'Part-time', 'Contract', 'Intern'].forEach(type => {
        const result = validateEmployeeForm({ ...createValidFormData(), employmentType: type });
        expect(result.errors.employmentType).toBeUndefined();
      });
    });

    it('should accept all valid statuses', () => {
      ['Active', 'Inactive', 'On Leave', 'Terminated'].forEach(status => {
        const result = validateEmployeeForm({ ...createValidFormData(), status });
        expect(result.errors.status).toBeUndefined();
      });
    });
  });

  // ─── PIN Code Validation ──────────────────────────────

  describe('PIN Code Validation', () => {
    it('should accept valid 6-digit PIN', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), pinCode: '560001' });
      expect(result.errors.pinCode).toBeUndefined();
    });

    it('should reject invalid PIN', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), pinCode: '12345' });
      expect(result.errors.pinCode).toContain('6 digits');
    });
  });

  // ─── Statutory Validations ────────────────────────────

  describe('Statutory Validations', () => {
    it('should accept valid Aadhaar (12 digits)', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), aadhaarNumber: '123456789012' });
      expect(result.errors.aadhaarNumber).toBeUndefined();
    });

    it('should reject invalid Aadhaar', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), aadhaarNumber: '12345' });
      expect(result.errors.aadhaarNumber).toContain('12 digits');
    });

    it('should accept valid PAN format', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), panNumber: 'ABCDE1234F' });
      expect(result.errors.panNumber).toBeUndefined();
    });

    it('should reject invalid PAN format', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), panNumber: '12345ABCDE' });
      expect(result.errors.panNumber).toContain('format is invalid');
    });

    it('should accept valid UAN (12+ alphanum)', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), uanNumber: 'UAN123456789' });
      expect(result.errors.uanNumber).toBeUndefined();
    });

    it('should reject invalid UAN', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), uanNumber: 'SHORT' });
      expect(result.errors.uanNumber).toContain('12 alphanumeric');
    });

    it('should accept valid ESI (10-17 alphanum)', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), esiNumber: 'ESI00000001234' });
      expect(result.errors.esiNumber).toBeUndefined();
    });

    it('should reject invalid ESI', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), esiNumber: 'SHORT' });
      expect(result.errors.esiNumber).toContain('10-17');
    });

    it('should accept valid IFSC format', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), ifscCode: 'SBIN0000123' });
      expect(result.errors.ifscCode).toBeUndefined();
    });

    it('should reject invalid IFSC format', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), ifscCode: '12345' });
      expect(result.errors.ifscCode).toContain('format is invalid');
    });
  });

  // ─── Bank Account Validation ──────────────────────────

  describe('Bank Account Validation', () => {
    it('should accept valid account number (9-20 chars)', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), bankAccountNumber: '12345678901234' });
      expect(result.errors.bankAccountNumber).toBeUndefined();
    });

    it('should reject too short account number', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), bankAccountNumber: '12345678' });
      expect(result.errors.bankAccountNumber).toContain('9-20');
    });

    it('should reject too long account number', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), bankAccountNumber: '1'.repeat(21) });
      expect(result.errors.bankAccountNumber).toContain('9-20');
    });
  });

  // ─── Emergency Contact Validation ─────────────────────

  describe('Emergency Contact Validation', () => {
    it('should accept valid emergency phone', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), emergencyContactPhone: '9876543210' });
      expect(result.errors.emergencyContactPhone).toBeUndefined();
    });

    it('should reject invalid emergency phone', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), emergencyContactPhone: '12345' });
      expect(result.errors.emergencyContactPhone).toContain('10-15');
    });
  });

  // ─── Numeric Range Validations ────────────────────────

  describe('Numeric Range Validations', () => {
    it('should accept probationPeriod 0-24', () => {
      [0, 6, 24].forEach(val => {
        const result = validateEmployeeForm({ ...createValidFormData(), probationPeriod: val });
        expect(result.errors.probationPeriod).toBeUndefined();
      });
    });

    it('should reject probationPeriod > 24', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), probationPeriod: 25 });
      expect(result.errors.probationPeriod).toContain('0-24');
    });

    it('should accept noticePeriod 0-365', () => {
      [0, 30, 365].forEach(val => {
        const result = validateEmployeeForm({ ...createValidFormData(), noticePeriod: val });
        expect(result.errors.noticePeriod).toBeUndefined();
      });
    });

    it('should reject noticePeriod > 365', () => {
      const result = validateEmployeeForm({ ...createValidFormData(), noticePeriod: 400 });
      expect(result.errors.noticePeriod).toContain('0-365');
    });
  });

  // ─── Date Cross-field Validation ──────────────────────

  describe('Date Cross-field Validations', () => {
    it('should reject joiningDate before hireDate', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        hireDate: '2024-03-01',
        joiningDate: '2024-02-01',
      });
      expect(result.errors.joiningDate).toContain('before hire date');
    });

    it('should accept joiningDate after hireDate', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        hireDate: '2024-01-01',
        joiningDate: '2024-01-15',
      });
      expect(result.errors.joiningDate).toBeUndefined();
    });

    it('should reject confirmationDate before hire/joiningDate', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        hireDate: '2024-03-01',
        confirmationDate: '2024-02-01',
      });
      expect(result.errors.confirmationDate).toContain('before joining/hire date');
    });
  });

  // ─── Salary Validation ────────────────────────────────

  describe('Salary Validation', () => {
    it('should accept valid salary structure', () => {
      const result = validateEmployeeForm(createValidFormData());
      expect(result.errors['salary.basicSalary']).toBeUndefined();
    });

    it('should reject negative basic salary', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        salary: { ...createValidFormData().salary, basicSalary: -1000 },
      });
      expect(result.errors['salary.basicSalary']).toContain('positive number');
    });

    it('should require currency when salary provided', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        salary: { ...createValidFormData().salary, currency: '' },
      });
      expect(result.errors['salary.currency']).toBeDefined();
    });

    it('should require payFrequency when salary provided', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        salary: { ...createValidFormData().salary, payFrequency: '' },
      });
      expect(result.errors['salary.payFrequency']).toBeDefined();
    });

    it('should skip salary validation when basicSalary empty', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        salary: { basicSalary: '', currency: '', payFrequency: '' },
      });
      expect(result.errors['salary.currency']).toBeUndefined();
    });

    it('should reject negative allowances', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        salary: {
          ...createValidFormData().salary,
          allowances: { hra: -100 },
        },
      });
      expect(result.errors['salary.allowances.hra']).toContain('positive number');
    });

    it('should reject negative deductions', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        salary: {
          ...createValidFormData().salary,
          deductions: { pf: -100 },
        },
      });
      expect(result.errors['salary.deductions.pf']).toContain('positive number');
    });
  });

  // ─── User Account Validation ──────────────────────────

  describe('User Account Validation', () => {
    it('should skip validation when enableLogin is false', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        userAccount: { enableLogin: false, password: '' },
      });
      expect(result.errors['userAccount.password']).toBeUndefined();
    });

    it('should require password when login enabled', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        userAccount: { enableLogin: true, password: '', role: 'employee' },
      });
      expect(result.errors['userAccount.password']).toContain('required');
    });

    it('should reject short password', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        userAccount: { enableLogin: true, password: '12345', confirmPassword: '12345', role: 'employee' },
      });
      expect(result.errors['userAccount.password']).toContain('6 characters');
    });

    it('should require confirmPassword when login enabled', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        userAccount: { enableLogin: true, password: 'Test@123', confirmPassword: '', role: 'employee' },
      });
      expect(result.errors['userAccount.confirmPassword']).toBeDefined();
    });

    it('should reject mismatching passwords', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        userAccount: { enableLogin: true, password: 'Test@123', confirmPassword: 'Different', role: 'employee' },
      });
      expect(result.errors['userAccount.confirmPassword']).toContain('do not match');
    });

    it('should require valid role when login enabled', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        userAccount: { enableLogin: true, password: 'Test@123', confirmPassword: 'Test@123', role: 'invalid' },
      });
      expect(result.errors['userAccount.role']).toBeDefined();
    });

    it('should accept valid login setup', () => {
      const result = validateEmployeeForm({
        ...createValidFormData(),
        userAccount: { enableLogin: true, password: 'Test@123', confirmPassword: 'Test@123', role: 'employee' },
      });
      expect(result.errors['userAccount.password']).toBeUndefined();
      expect(result.errors['userAccount.confirmPassword']).toBeUndefined();
      expect(result.errors['userAccount.role']).toBeUndefined();
    });
  });
});

// ─── validateField ──────────────────────────────────────

describe('validateField', () => {
  it('should return error for empty firstName', () => {
    const error = validateField('firstName', '', {});
    expect(error).toBe('First name is required');
  });

  it('should return null for valid firstName', () => {
    const error = validateField('firstName', 'John', createValidFormData());
    expect(error).toBeNull();
  });

  it('should handle nested field paths', () => {
    const error = validateField('salary.basicSalary', -100, {
      salary: { basicSalary: -100, currency: 'INR', payFrequency: 'monthly' },
    });
    expect(error).toContain('positive number');
  });

  it('should return null for valid nested field', () => {
    const error = validateField('salary.basicSalary', '50000', {
      salary: { basicSalary: '50000', currency: 'INR', payFrequency: 'monthly' },
    });
    expect(error).toBeNull();
  });
});

// ─── transformEmployeeDataForAPI ────────────────────────

describe('transformEmployeeDataForAPI', () => {
  it('should include required fields', () => {
    const result = transformEmployeeDataForAPI(createValidFormData());
    expect(result.firstName).toBe('Rahul');
    expect(result.lastName).toBe('Sharma');
    expect(result.email).toBe('rahul@skyraksys.com');
  });

  it('should trim whitespace from string fields', () => {
    const result = transformEmployeeDataForAPI({
      ...createValidFormData(),
      firstName: '  Rahul  ',
      lastName: '  Sharma  ',
    });
    expect(result.firstName).toBe('Rahul');
    expect(result.lastName).toBe('Sharma');
  });

  it('should exclude empty optional fields', () => {
    const result = transformEmployeeDataForAPI({
      ...createValidFormData(),
      address: '',
      city: '',
    });
    expect(result.address).toBeUndefined();
    expect(result.city).toBeUndefined();
  });

  it('should include salary when basicSalary provided', () => {
    const result = transformEmployeeDataForAPI(createValidFormData());
    expect(result.salary).toBeDefined();
    expect(result.salary.basicSalary).toBe(50000);
    expect(result.salary.currency).toBe('INR');
    expect(result.salary.payFrequency).toBe('monthly');
  });

  it('should exclude salary when basicSalary empty', () => {
    const result = transformEmployeeDataForAPI({
      ...createValidFormData(),
      salary: { basicSalary: '' },
    });
    expect(result.salary).toBeUndefined();
  });

  it('should convert numeric fields', () => {
    const result = transformEmployeeDataForAPI(createValidFormData());
    expect(result.probationPeriod).toBe(6);
    expect(result.noticePeriod).toBe(30);
  });

  it('should map Internship to Intern', () => {
    const result = transformEmployeeDataForAPI({
      ...createValidFormData(),
      employmentType: 'Internship',
    });
    expect(result.employmentType).toBe('Intern');
  });

  it('should uppercase PAN and IFSC', () => {
    const result = transformEmployeeDataForAPI({
      ...createValidFormData(),
      panNumber: 'abcde1234f',
      ifscCode: 'sbin0000123',
    });
    expect(result.panNumber).toBe('ABCDE1234F');
    expect(result.ifscCode).toBe('SBIN0000123');
  });

  it('should set nationality default to Indian', () => {
    const result = transformEmployeeDataForAPI({
      ...createValidFormData(),
      nationality: '',
    });
    expect(result.nationality).toBe('Indian');
  });

  it('should include salary allowances, deductions, and benefits', () => {
    const result = transformEmployeeDataForAPI(createValidFormData());
    expect(result.salary.allowances.hra).toBe(15000);
    expect(result.salary.allowances.transport).toBe(5000);
    expect(result.salary.deductions.pf).toBe(6000);
    expect(result.salary.benefits.bonus).toBe(10000);
  });

  it('should include tax information', () => {
    const result = transformEmployeeDataForAPI(createValidFormData());
    expect(result.salary.taxInformation.taxRegime).toBe('old');
    expect(result.salary.taxInformation.ctc).toBe(120000);
    expect(result.salary.taxInformation.takeHome).toBe(85000);
  });

  it('should set default country to India', () => {
    const result = transformEmployeeDataForAPI(createValidFormData());
    expect(result.country).toBe('India');
  });
});
