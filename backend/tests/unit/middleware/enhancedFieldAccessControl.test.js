const { filterFieldsByRole } = require('../../../middleware/enhancedFieldAccessControl');

describe('Enhanced Field Access Control Middleware', () => {
  describe('filterFieldsByRole - Admin Role', () => {
    it('should allow admin to view all fields', () => {
      const data = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        salary: 50000,
        aadhaarNumber: '1234-5678-9012',
        panNumber: 'ABCDE1234F'
      };

      const filtered = filterFieldsByRole(data, 'admin', 'view');
      expect(filtered).toEqual(data);
    });

    it('should allow admin to edit all fields', () => {
      const data = {
        firstName: 'Jane',
        salary: 60000,
        aadhaarNumber: '9876-5432-1098'
      };

      const filtered = filterFieldsByRole(data, 'admin', 'edit');
      expect(filtered).toEqual(data);
    });
  });

  describe('filterFieldsByRole - HR Role', () => {
    it('should allow HR to view employee personal data', () => {
      const data = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        salary: 50000,
        aadhaarNumber: '1234-5678-9012',
        panNumber: 'ABCDE1234F',
        unauthorized: 'hidden'
      };

      const filtered = filterFieldsByRole(data, 'hr', 'view');
      
      expect(filtered.firstName).toBe('John');
      expect(filtered.salary).toBe(50000);
      expect(filtered.aadhaarNumber).toBe('1234-5678-9012');
      expect(filtered.unauthorized).toBeUndefined();
    });

    it('should allow HR to edit specific employee fields', () => {
      const data = {
        firstName: 'Jane',
        lastName: 'Smith',
        salary: 55000,
        departmentId: 'dept-123',
        email: 'jane@example.com',
        unauthorized: 'hidden'
      };

      const filtered = filterFieldsByRole(data, 'hr', 'edit');
      
      expect(filtered.firstName).toBe('Jane');
      expect(filtered.email).toBe('jane@example.com');
      expect(filtered.departmentId).toBe('dept-123');
    });

    it('should filter out fields HR cannot access', () => {
      const data = {
        id: '123',
        firstName: 'John',
        secretField: 'should be hidden',
        internalNote: 'confidential'
      };

      const filtered = filterFieldsByRole(data, 'hr', 'view');
      
      expect(filtered.firstName).toBe('John');
      expect(filtered.secretField).toBeUndefined();
      expect(filtered.internalNote).toBeUndefined();
    });
  });

  describe('filterFieldsByRole - Manager Role', () => {
    it('should allow manager to view basic employee information', () => {
      const data = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        departmentId: 'dept-123',
        salary: 50000, // Should be filtered
        aadhaarNumber: '1234-5678' // Should be filtered
      };

      const filtered = filterFieldsByRole(data, 'manager', 'view');
      
      expect(filtered.firstName).toBe('John');
      expect(filtered.email).toBe('john@example.com');
      expect(filtered.phone).toBe('1234567890');
      expect(filtered.departmentId).toBe('dept-123');
      expect(filtered.salary).toBeUndefined();
      expect(filtered.aadhaarNumber).toBeUndefined();
    });

    it('should allow manager to edit limited employee fields', () => {
      const data = {
        firstName: 'Jane',
        departmentId: 'dept-456',
        positionId: 'pos-789',
        workLocation: 'Remote',
        status: 'Active',
        salary: 60000 // Should be filtered
      };

      const filtered = filterFieldsByRole(data, 'manager', 'edit');
      
      expect(filtered.departmentId).toBe('dept-456');
      expect(filtered.positionId).toBe('pos-789');
      expect(filtered.workLocation).toBe('Remote');
      expect(filtered.status).toBe('Active');
      expect(filtered.salary).toBeUndefined();
    });

    it('should restrict manager from sensitive data', () => {
      const data = {
        id: '123',
        firstName: 'John',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '9876543210',
        aadhaarNumber: '1234-5678-9012',
        panNumber: 'ABCDE1234F',
        bankAccountNumber: '1234567890'
      };

      const filtered = filterFieldsByRole(data, 'manager', 'view');
      
      expect(filtered.firstName).toBe('John');
      expect(filtered.emergencyContactName).toBe('Jane Doe');
      expect(filtered.aadhaarNumber).toBeUndefined();
      expect(filtered.panNumber).toBeUndefined();
      expect(filtered.bankAccountNumber).toBeUndefined();
    });
  });

  describe('filterFieldsByRole - Employee Role', () => {
    it('should allow employee to view own basic information', () => {
      const data = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        employeeId: 'EMP001',
        departmentId: 'dept-123'
      };

      const filtered = filterFieldsByRole(data, 'employee', 'view');
      
      expect(filtered.firstName).toBe('John');
      expect(filtered.email).toBe('john@example.com');
      expect(filtered.employeeId).toBe('EMP001');
    });

    it('should allow employee to edit limited own fields', () => {
      const data = {
        firstName: 'Jane',
        phone: '9876543210',
        address: '123 Main St',
        emergencyContactName: 'John Doe',
        departmentId: 'dept-456', // Should be filtered
        salary: 50000 // Should be filtered
      };

      const filtered = filterFieldsByRole(data, 'employee', 'edit');
      
      expect(filtered.phone).toBe('9876543210');
      expect(filtered.address).toBe('123 Main St');
      expect(filtered.emergencyContactName).toBe('John Doe');
      expect(filtered.departmentId).toBeUndefined();
      expect(filtered.salary).toBeUndefined();
    });

    it('should restrict employee from viewing sensitive fields', () => {
      const data = {
        id: '123',
        firstName: 'John',
        salary: 50000,
        salaryStructure: { basic: 30000, hra: 20000 },
        uanNumber: 'UAN123456',
        pfNumber: 'PF123456'
      };

      const filtered = filterFieldsByRole(data, 'employee', 'view');
      
      expect(filtered.firstName).toBe('John');
      expect(filtered.salary).toBeUndefined();
      expect(filtered.salaryStructure).toBeUndefined();
      expect(filtered.uanNumber).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data object', () => {
      const filtered = filterFieldsByRole({}, 'admin', 'view');
      expect(filtered).toEqual({});
    });

    it('should handle unknown role gracefully', () => {
      const data = { firstName: 'John', lastName: 'Doe' };
      const filtered = filterFieldsByRole(data, 'unknown_role', 'view');
      
      // Should return empty or minimal fields for unknown role
      expect(Object.keys(filtered).length).toBeLessThanOrEqual(Object.keys(data).length);
    });

    it('should handle null values in data', () => {
      const data = {
        firstName: 'John',
        lastName: null,
        email: 'john@example.com',
        phone: null
      };

      const filtered = filterFieldsByRole(data, 'hr', 'view');
      expect(filtered.firstName).toBe('John');
      expect(filtered.lastName).toBeNull();
    });
  });
});
