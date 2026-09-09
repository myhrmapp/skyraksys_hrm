// Frontend utility functions for employee creation sync
import http from '../http-common';

/**
 * Utility functions to map frontend department/position names to backend IDs
 */
class EmployeeCreationUtils {
  static departmentCache = null;
  static positionCache = null;

  // Fetch and cache departments
  static async getDepartments() {
    if (!this.departmentCache) {
      try {
        const response = await http.get('/employees/meta/departments');
        this.departmentCache = response.data.data;
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        throw new Error('Unable to load departments');
      }
    }
    return this.departmentCache;
  }

  // Fetch and cache positions
  static async getPositions() {
    if (!this.positionCache) {
      try {
        const response = await http.get('/employees/meta/positions');
        this.positionCache = response.data.data;
      } catch (error) {
        console.error('Failed to fetch positions:', error);
        throw new Error('Unable to load positions');
      }
    }
    return this.positionCache;
  }

  // Map department name to ID
  static async mapDepartmentToId(departmentName) {
    if (!departmentName) return null;

    const departments = await this.getDepartments();
    const department = departments.find(dept =>
      dept.name.toLowerCase() === departmentName.toLowerCase()
    );

    if (!department) {
      throw new Error(`Department "${departmentName}" not found`);
    }

    return department.id;
  }

  // Map position name to ID
  static async mapPositionToId(positionTitle) {
    if (!positionTitle) return null;

    const positions = await this.getPositions();
    const position = positions.find(pos =>
      pos.title.toLowerCase() === positionTitle.toLowerCase()
    );

    if (!position) {
      throw new Error(`Position "${positionTitle}" not found`);
    }

    return position.id;
  }

  // Create backend-compatible payload
  static async createEmployeePayload(formData) {
    try {
      const departmentId = await this.mapDepartmentToId(formData.department);
      const positionId = await this.mapPositionToId(formData.position);

      return {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        hireDate: formData.hireDate,
        departmentId,  // FIXED: Use ID instead of name
        positionId,    // FIXED: Use ID instead of name
        employeeId: formData.employeeId || undefined,
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zipCode: formData.zipCode || null,
        pinCode: formData.pinCode || formData.zipCode || null, // Support both
        employmentType: formData.employmentType || 'Full-time',
        workLocation: formData.workLocation || null,
        salary: formData.salary ? parseFloat(formData.salary) : null,

        // Statutory Details (Critical for payslips)
        aadhaarNumber: formData.aadhaarNumber || null,
        panNumber: formData.panNumber || null,
        uanNumber: formData.uanNumber || null,
        pfNumber: formData.pfNumber || null,
        esiNumber: formData.esiNumber || null,

        // Bank Details (Critical for payslips)
        bankName: formData.bankName || null,
        bankAccountNumber: formData.bankAccountNumber || null,
        ifscCode: formData.ifscCode || null,
        bankBranch: formData.bankBranch || null,
        accountHolderName: formData.accountHolderName || null,

        // Personal Details
        maritalStatus: formData.maritalStatus || null,
        nationality: formData.nationality || 'Indian',

        // Emergency Contact
        emergencyContactName: formData.emergencyContactName || null,
        emergencyContactPhone: formData.emergencyContactPhone || null,
        emergencyContactRelation: formData.emergencyContactRelation || null,

        status: 'Active'  // Set default status
      };
    } catch (error) {
      console.error('Error creating employee payload:', error);
      throw error;
    }
  }

  // Get available department names for dropdown
  static async getDepartmentNames() {
    const departments = await this.getDepartments();
    return departments.map(dept => dept.name);
  }

  // Get available position titles for dropdown
  static async getPositionTitles() {
    const positions = await this.getPositions();
    return positions.map(pos => pos.title);
  }

  // Clear cache (useful for refreshing data)
  static clearCache() {
    this.departmentCache = null;
    this.positionCache = null;
  }
}

export default EmployeeCreationUtils;
