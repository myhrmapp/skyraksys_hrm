import http from '../http-common';

class AuthService {
  // Login user
  async login(email, password) {
    const response = await http.post('/auth/login', {
      email,
      password
    });
    return response.data.data;
  }

  // Register new user
  async register(userData) {
    try {
      const response = await http.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Logout user (calls backend to clear httpOnly cookies & blacklist token)
  async logout() {
    try {
      await http.post('/auth/logout');
    } catch (error) {
      // Best-effort — cookies may already be expired
      console.warn('Logout API call failed:', error.message);
    }
  }

  // Get user profile
  async getProfile() {
    const response = await http.get('/auth/me');
    return response.data.data;
  }

  // Update user profile
  async updateProfile(profileData) {
    const response = await http.put('/auth/me', profileData);
    return response.data.data;
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    const response = await http.put('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword: newPassword
    });
    return response.data;
  }

  // Access token is stored in an httpOnly cookie — not accessible from JS.
  // These methods exist for backward-compatible call sites but always return null/false.
  getAccessToken() { return null; }
  getToken() { return null; }

  // User info can only be obtained via the /auth/me endpoint (see AuthContext)
  getCurrentUser() { return null; }

  // Auth state is managed by AuthContext; cookie presence can't be checked from JS
  isAuthenticated() { return false; }

  // Reset user password (Admin/HR only)
  async resetPassword(resetData) {
    try {
      const response = await http.post('/auth/reset-password', resetData);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Toggle user account status (Admin/HR only)
  async toggleUserStatus(userId, isActive) {
    try {
      const response = await http.put(`/auth/users/${userId}/status`, { isActive });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Update user role (Admin only)
  async updateUserRole(userId, role) {
    try {
      const response = await http.put(`/auth/users/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Reset user password (Admin/HR only)
  async resetUserPassword(userId, newPassword) {
    try {
      const response = await http.put(`/auth/users/${userId}/reset-password`, { 
        newPassword,
        forceChange: true 
      });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Update user account (comprehensive update)
  async updateUserAccount(userId, userData) {
    try {
      const response = await http.put(`/auth/users/${userId}/account`, userData);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Create user account for employee
  async createUserAccount(employeeId, userData) {
    try {
      const response = await http.post(`/auth/users/employee/${employeeId}`, userData);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Get user account details by employee ID
  async getUserByEmployeeId(employeeId) {
    try {
      const response = await http.get(`/auth/users/employee/${employeeId}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Send password reset email to user
  async sendPasswordResetEmail(userId, tempPassword) {
    try {
      const response = await http.post(`/email/password-reset/${userId}`, { 
        tempPassword 
      });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Send account status change email
  async sendAccountStatusEmail(userId, isActive) {
    try {
      const response = await http.post(`/email/account-status/${userId}`, { 
        isActive 
      });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Check email service status
  async checkEmailStatus() {
    try {
      const response = await http.get('/email/status');
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Get all users (Admin/HR only)
  async getAllUsers(params = {}) {
    try {
      const response = await http.get('/auth/users', { params });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Terminate user (Admin only) - Soft delete by deactivating
  async deleteUser(userId) {
    try {
      const response = await http.delete(`/auth/users/${userId}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Alias for clarity
  async terminateUser(userId) {
    return this.deleteUser(userId);
  }

  // Lock/Unlock user account (Admin only)
  async lockUserAccount(userId, isLocked, reason = '') {
    try {
      const response = await http.put(`/auth/users/${userId}/lock`, { isLocked, reason });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Send welcome email to user (Admin/HR only)
  async sendWelcomeEmail(userId, includePassword = false, tempPassword = '') {
    try {
      const response = await http.post(`/auth/users/${userId}/send-welcome-email`, {
        includePassword,
        temporaryPassword: tempPassword
      });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Alias for backward compatibility
  async createEmployeeUserAccount(employeeId, userData) {
    return this.createUserAccount(employeeId, userData);
  }

  // No-op: tokens are in httpOnly cookies cleared by the backend on logout
  clearAuthData() { /* no-op */ }
}

export const authService = new AuthService();
