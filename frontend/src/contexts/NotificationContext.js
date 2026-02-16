import React, { createContext, useContext, useCallback, useState } from 'react';
import { Snackbar, Alert, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

// Notification context
const NotificationContext = createContext();

/**
 * Notification Provider Component
 * Provides centralized notification management
 */
export const NotificationProvider = ({ children, maxNotifications = 3 }) => {
  const [notifications, setNotifications] = useState([]);

  /**
   * Add a new notification
   * @param {Object} notification - Notification object
   */
  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: 'info',
      autoHideDuration: 6000,
      ...notification
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Limit number of notifications
      return updated.slice(0, maxNotifications);
    });

    // Auto remove notification if autoHideDuration is set
    if (newNotification.autoHideDuration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.autoHideDuration);
    }

    return id;
  }, [maxNotifications]);

  /**
   * Remove a notification by ID
   * @param {number} id - Notification ID
   */
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Show success notification
   * @param {string} message - Success message
   * @param {Object} options - Additional options
   */
  const showSuccess = useCallback((message, options = {}) => {
    return addNotification({
      type: 'success',
      message,
      ...options
    });
  }, [addNotification]);

  /**
   * Show error notification
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   */
  const showError = useCallback((message, options = {}) => {
    return addNotification({
      type: 'error',
      message,
      autoHideDuration: 8000, // Longer duration for errors
      ...options
    });
  }, [addNotification]);

  /**
   * Show warning notification
   * @param {string} message - Warning message
   * @param {Object} options - Additional options
   */
  const showWarning = useCallback((message, options = {}) => {
    return addNotification({
      type: 'warning',
      message,
      ...options
    });
  }, [addNotification]);

  /**
   * Show info notification
   * @param {string} message - Info message
   * @param {Object} options - Additional options
   */
  const showInfo = useCallback((message, options = {}) => {
    return addNotification({
      type: 'info',
      message,
      ...options
    });
  }, [addNotification]);

  /**
   * Generic notification function for backward compatibility
   * @param {string} message - Notification message
   * @param {string} type - Notification type ('success', 'error', 'warning', 'info')
   */
  const showNotification = useCallback((message, type = 'info') => {
    switch (type) {
      case 'success':
        return showSuccess(message);
      case 'error':
        return showError(message);
      case 'warning':
        return showWarning(message);
      case 'info':
      default:
        return showInfo(message);
    }
  }, [showSuccess, showError, showWarning, showInfo]);

  const contextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNotification // Add backward compatibility
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationContainer 
        notifications={notifications}
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

/**
 * Notification Container Component
 * Renders the actual notification snackbars
 */
const NotificationContainer = ({ notifications, onRemove }) => {
  return (
    <>
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          anchorOrigin={{ 
            vertical: 'top', 
            horizontal: 'right' 
          }}
          style={{
            top: 24 + (index * 72) // Stack notifications vertically
          }}
          onClose={() => onRemove(notification.id)}
        >
          <Alert
            severity={notification.type}
            onClose={() => onRemove(notification.id)}
            action={
              <IconButton
                size="small"
                color="inherit"
                aria-label="Close notification"
                onClick={() => onRemove(notification.id)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
            sx={{
              minWidth: 300,
              maxWidth: 500
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

/**
 * Hook to use notifications
 * @returns {Object} Notification methods
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  
  return context;
};

// Alias for backward compatibility
export const useNotification = useNotifications;

/**
 * Hook for API-specific notifications
 * Provides convenient methods for common API scenarios
 */
export const useApiNotifications = () => {
  const notifications = useNotifications();

  /**
   * Show loading notification
   * @param {string} message - Loading message
   * @returns {number} Notification ID
   */
  const showLoading = useCallback((message = 'Loading...') => {
    return notifications.showInfo(message, {
      autoHideDuration: 0, // Don't auto-hide loading notifications
      action: null // No close button for loading
    });
  }, [notifications]);

  /**
   * Update notification (useful for loading -> success/error)
   * @param {number} id - Notification ID to update
   * @param {Object} updates - Updates to apply
   */
  const updateNotification = useCallback((id, updates) => {
    // Remove old notification
    notifications.removeNotification(id);
    // Add updated notification
    return notifications.addNotification(updates);
  }, [notifications]);

  /**
   * Handle API success with notification
   * @param {string} message - Success message
   * @param {number} loadingId - Loading notification ID to replace
   */
  const handleApiSuccess = useCallback((message, loadingId = null) => {
    if (loadingId) {
      notifications.removeNotification(loadingId);
    }
    return notifications.showSuccess(message);
  }, [notifications]);

  /**
   * Handle API error with notification
   * @param {string|Error} error - Error message or Error object
   * @param {number} loadingId - Loading notification ID to replace
   */
  const handleApiError = useCallback((error, loadingId = null) => {
    if (loadingId) {
      notifications.removeNotification(loadingId);
    }
    
    const message = typeof error === 'string' ? error : error.message || 'An error occurred';
    return notifications.showError(message);
  }, [notifications]);

  /**
   * Show validation errors
   * @param {Array} errors - Array of validation errors
   */
  const showValidationErrors = useCallback((errors) => {
    if (Array.isArray(errors)) {
      errors.forEach(error => {
        const message = typeof error === 'string' ? error : error.message || 'Validation error';
        notifications.showError(message);
      });
    } else {
      notifications.showError('Please check your input and try again');
    }
  }, [notifications]);

  /**
   * Show operation confirmation
   * @param {string} operation - Operation name
   * @param {string} entity - Entity name
   */
  const showOperationSuccess = useCallback((operation, entity) => {
    const message = `${entity} ${operation} successfully`;
    return notifications.showSuccess(message);
  }, [notifications]);

  /**
   * Show save success notification
   * @param {string} entity - Entity name
   */
  const showSaveSuccess = useCallback((entity = 'Record') => {
    return showOperationSuccess('saved', entity);
  }, [showOperationSuccess]);

  /**
   * Show delete success notification
   * @param {string} entity - Entity name
   */
  const showDeleteSuccess = useCallback((entity = 'Record') => {
    return showOperationSuccess('deleted', entity);
  }, [showOperationSuccess]);

  /**
   * Show update success notification
   * @param {string} entity - Entity name
   */
  const showUpdateSuccess = useCallback((entity = 'Record') => {
    return showOperationSuccess('updated', entity);
  }, [showOperationSuccess]);

  return {
    ...notifications,
    showLoading,
    updateNotification,
    handleApiSuccess,
    handleApiError,
    showValidationErrors,
    showOperationSuccess,
    showSaveSuccess,
    showDeleteSuccess,
    showUpdateSuccess
  };
};

/**
 * Higher-order component to wrap components with notification context
 * @param {React.Component} Component - Component to wrap
 * @returns {React.Component} Wrapped component
 */
export const withNotifications = (Component) => {
  return (props) => (
    <NotificationProvider>
      <Component {...props} />
    </NotificationProvider>
  );
};

export default NotificationProvider;
