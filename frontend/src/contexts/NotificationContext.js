import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import notificationService from '../services/notification.service';
import socketService from '../services/socket.service';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

/**
 * Notification system — now powered by notistack for consistency.
 * All hooks preserve the same API surface so existing consumers
 * continue to work without changes.
 */

/**
 * NotificationProvider — retains backward compatibility while exposing
 * a small in-memory notification store for unread-count and center access.
 */
export const NotificationProvider = ({ children }) => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [notifications, setNotifications] = useState([]);
  const [popupNotification, setPopupNotification] = useState(null);

  const pushNotification = useCallback((notification) => {
    const entry = {
      id: notification.id || `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: notification.title || 'System update',
      message: notification.message || 'New notification',
      type: notification.type || 'info',
      read: Boolean(notification.read),
      createdAt: notification.createdAt || new Date().toISOString(),
      ...notification,
    };

    setNotifications((prev) => [entry, ...prev].slice(0, 50));
    return entry.id;
  }, []);

  const addNotification = useCallback((notification) => {
    const { type = 'info', message, autoHideDuration, persist, title, ...rest } = notification;
    const id = pushNotification({
      title,
      message,
      type,
      ...rest,
    });

    enqueueSnackbar(message, {
      variant: type,
      autoHideDuration,
      persist,
      ...rest,
    });

    return id;
  }, [enqueueSnackbar, pushNotification]);

  const removeNotification = useCallback(async (id) => {
    closeSnackbar(id);
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    // Optional: implement API delete if needed later
  }, [closeSnackbar]);

  const clearAllNotifications = useCallback(async () => {
    closeSnackbar();
    setNotifications([]);
    // Assuming backend clear all isn't strictly required yet, but we can call it
  }, [closeSnackbar]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  }, []);

  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // If not authenticated, clear notifications and disconnect socket
    if (!isAuthenticated) {
      setNotifications([]);
      socketService.disconnect();
      return;
    }

    // Connect to socket when context mounts and user is authenticated
    socketService.connect();
    
    // Authenticate with socket to join user and role specific rooms
    if (user && user.id) {
      socketService.emit('authenticate', { 
        userId: user.id, 
        role: user.role 
      });
    }

    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const res = await notificationService.getNotifications();
        if (res && res.data) {
          setNotifications(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };
    fetchNotifications();

    // Listen to real-time events
    const handleNewNotification = (notification) => {
      pushNotification(notification);
      
      if (notification.isPopup) {
        setPopupNotification(notification);
      } else {
        enqueueSnackbar(notification.title || 'New Notification', {
          variant: notification.type || 'info',
          autoHideDuration: notification.targetAudience === 'ALL' ? 10000 : 5000 // Announcements stay longer
        });
      }
    };

    socketService.on('broadcast', handleNewNotification);
    socketService.on('new_notification', handleNewNotification);

    return () => {
      socketService.off('broadcast', handleNewNotification);
      socketService.off('new_notification', handleNewNotification);
      // We don't disconnect globally because other contexts might need it, 
      // but if this is the only consumer, we could disconnect.
    };
  }, [pushNotification, enqueueSnackbar, isAuthenticated, user]);

  const showSuccess = useCallback((message, options = {}) => {
    const id = pushNotification({ message, type: 'success', title: 'Success', ...options });
    enqueueSnackbar(message, { variant: 'success', ...options });
    return id;
  }, [enqueueSnackbar, pushNotification]);

  const showError = useCallback((message, options = {}) => {
    const { autoHideDuration = 8000, ...rest } = options;
    const id = pushNotification({ message, type: 'error', title: 'Error', ...rest });
    enqueueSnackbar(message, { variant: 'error', autoHideDuration, ...rest });
    return id;
  }, [enqueueSnackbar, pushNotification]);

  const showWarning = useCallback((message, options = {}) => {
    const id = pushNotification({ message, type: 'warning', title: 'Warning', ...options });
    enqueueSnackbar(message, { variant: 'warning', ...options });
    return id;
  }, [enqueueSnackbar, pushNotification]);

  const showInfo = useCallback((message, options = {}) => {
    const id = pushNotification({ message, type: 'info', title: 'Info', ...options });
    enqueueSnackbar(message, { variant: 'info', ...options });
    return id;
  }, [enqueueSnackbar, pushNotification]);

  const showNotification = useCallback((message, type = 'info') => {
    const id = pushNotification({ message, type, title: type.charAt(0).toUpperCase() + type.slice(1) });
    enqueueSnackbar(message, { variant: type });
    return id;
  }, [enqueueSnackbar, pushNotification]);

  const value = useMemo(() => ({
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    markAllAsRead,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNotification,
  }), [addNotification, clearAllNotifications, markAllAsRead, notifications, removeNotification, showError, showInfo, showNotification, showSuccess, showWarning]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {popupNotification && (
        <Dialog open={true} onClose={() => setPopupNotification(null)} maxWidth="sm" fullWidth>
           <DialogTitle sx={{ backgroundColor: popupNotification.type === 'error' ? '#f44336' : popupNotification.type === 'warning' ? '#ff9800' : popupNotification.type === 'success' ? '#4caf50' : '#2196f3', color: 'white' }}>
             {popupNotification.title || 'Announcement'}
           </DialogTitle>
           <DialogContent dividers>
             {popupNotification.imageUrl && (
               <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, mt: 1 }}>
                 <img src={popupNotification.imageUrl} alt="Announcement" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', objectFit: 'contain' }} />
               </Box>
             )}
             <Typography variant="body1" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
               {popupNotification.message}
             </Typography>
           </DialogContent>
           <DialogActions>
             <Button variant="contained" onClick={() => setPopupNotification(null)}>Acknowledge</Button>
           </DialogActions>
        </Dialog>
      )}
    </NotificationContext.Provider>
  );
};

/**
 * Primary notification hook.
 * Wraps notistack's useSnackbar with the convenience API that
 * the rest of the app already depends on.
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }

  return context;
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
