import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';

export const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated on app startup via httpOnly cookie
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Cookie is sent automatically — just validate via /auth/me
        const userData = await authService.getProfile();
        // /auth/me returns employee as nested object; normalise to match login shape
        if (!userData.employeeId && userData.employee?.id) {
          userData.employeeId = userData.employee.id;
        }
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        // No valid session — user will need to log in
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      // Backend sets httpOnly cookies; response contains user data only
      const userData = response.user || response;
      
      // Update state
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      return { success: true, user: response.user };
    } catch (error) {
      console.error('Registration failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout(); // Clears httpOnly cookies on backend
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const updatedUser = await authService.updateProfile(profileData);
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Profile update failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Profile update failed' 
      };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await authService.changePassword(currentPassword, newPassword);
      return { success: true };
    } catch (error) {
      console.error('Password change failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Password change failed' 
      };
    }
  };

  // Role-based permission checks
  const hasRole = (role) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  // Computed booleans — safe to use with or without parentheses
  const isAdmin = hasRole('admin');
  const isHR = hasRole('hr');
  const isManager = hasRole('manager');
  const isEmployee = hasRole('employee');

  const canManageEmployees = hasAnyRole(['admin', 'hr']);
  const canApproveLeaves = hasAnyRole(['admin', 'hr', 'manager']);
  const canViewPayroll = hasAnyRole(['admin', 'hr']);
  const canManageSettings = hasAnyRole(['admin']);

  const value = {
    // State
    user,
    loading,
    isAuthenticated,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    
    // Role checks
    hasRole,
    hasAnyRole,
    isAdmin,
    isHR,
    isManager,
    isEmployee,
    canManageEmployees,
    canApproveLeaves,
    canViewPayroll,
    canManageSettings
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
