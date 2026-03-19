import { useCallback } from 'react';
import { useSnackbar } from 'notistack';

/**
 * Notification system — now powered by notistack for consistency.
 * All hooks preserve the same API surface so existing consumers
 * continue to work without changes.
 */

/**
 * NotificationProvider — pass-through for backward compatibility.
 * Actual notifications are rendered by notistack's SnackbarProvider in App.js.
 */
export const NotificationProvider = ({ children }) => children;

/**
 * Primary notification hook.
 * Wraps notistack's useSnackbar with the convenience API that
 * the rest of the app already depends on.
 */
export const useNotifications = () => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const addNotification = useCallback((notification) => {
    const { type = 'info', message, autoHideDuration, persist, ...rest } = notification;
    return enqueueSnackbar(message, {
      variant: type,
      autoHideDuration,
      persist,
      ...rest,
    });
  }, [enqueueSnackbar]);

  const removeNotification = useCallback((id) => {
    closeSnackbar(id);
  }, [closeSnackbar]);

  const clearAllNotifications = useCallback(() => {
    closeSnackbar();
  }, [closeSnackbar]);

  const showSuccess = useCallback((message, options = {}) => {
    return enqueueSnackbar(message, { variant: 'success', ...options });
  }, [enqueueSnackbar]);

  const showError = useCallback((message, options = {}) => {
    const { autoHideDuration = 8000, ...rest } = options;
    return enqueueSnackbar(message, { variant: 'error', autoHideDuration, ...rest });
  }, [enqueueSnackbar]);

  const showWarning = useCallback((message, options = {}) => {
    return enqueueSnackbar(message, { variant: 'warning', ...options });
  }, [enqueueSnackbar]);

  const showInfo = useCallback((message, options = {}) => {
    return enqueueSnackbar(message, { variant: 'info', ...options });
  }, [enqueueSnackbar]);

  const showNotification = useCallback((message, type = 'info') => {
    return enqueueSnackbar(message, { variant: type });
  }, [enqueueSnackbar]);

  return {
    notifications: [],
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNotification,
  };
};

// Alias for backward compatibility
export const useNotification = useNotifications;

/**
 * Hook for API-specific notifications.
 */
export const useApiNotifications = () => {
  const notifications = useNotifications();

  const showLoading = useCallback((message = 'Loading...') => {
    return notifications.showInfo(message, { persist: true });
  }, [notifications]);

  const updateNotification = useCallback((id, updates) => {
    notifications.removeNotification(id);
    return notifications.addNotification(updates);
  }, [notifications]);

  const handleApiSuccess = useCallback((message, loadingId = null) => {
    if (loadingId) notifications.removeNotification(loadingId);
    return notifications.showSuccess(message);
  }, [notifications]);

  const handleApiError = useCallback((error, loadingId = null) => {
    if (loadingId) notifications.removeNotification(loadingId);
    const message = typeof error === 'string' ? error : error.message || 'An error occurred';
    return notifications.showError(message);
  }, [notifications]);

  const showValidationErrors = useCallback((errors) => {
    if (Array.isArray(errors)) {
      errors.forEach(err => {
        const msg = typeof err === 'string' ? err : err.message || 'Validation error';
        notifications.showError(msg);
      });
    } else {
      notifications.showError('Please check your input and try again');
    }
  }, [notifications]);

  const showOperationSuccess = useCallback((operation, entity) => {
    return notifications.showSuccess(`${entity} ${operation} successfully`);
  }, [notifications]);

  const showSaveSuccess = useCallback((entity = 'Record') => showOperationSuccess('saved', entity), [showOperationSuccess]);
  const showDeleteSuccess = useCallback((entity = 'Record') => showOperationSuccess('deleted', entity), [showOperationSuccess]);
  const showUpdateSuccess = useCallback((entity = 'Record') => showOperationSuccess('updated', entity), [showOperationSuccess]);

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
    showUpdateSuccess,
  };
};

/**
 * HOC for backward compatibility
 */
export const withNotifications = (Component) => {
  return (props) => <Component {...props} />;
};

export default NotificationProvider;
