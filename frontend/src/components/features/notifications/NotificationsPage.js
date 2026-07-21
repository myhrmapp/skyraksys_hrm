import React, { useEffect } from 'react';
import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useNotifications } from '../../../contexts/NotificationContext';

const NotificationsPage = () => {
  const { notifications, markAllAsRead, clearAllNotifications } = useNotifications();

  useEffect(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const formatDate = (dateValue) => {
    if (!dateValue) return '—';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>Notifications</Typography>
          <Typography variant="body2" color="text.secondary">
            Review status updates, approvals, and payroll activity in one place.
          </Typography>
        </Box>
        {notifications.length > 0 && (
          <Button variant="outlined" onClick={clearAllNotifications}>
            Clear all
          </Button>
        )}
      </Stack>

      {notifications.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6">No notifications yet</Typography>
          <Typography variant="body2" color="text.secondary">
            Approval and payroll updates will appear here once they are triggered.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Message</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notifications.map((notification, index) => (
                <TableRow key={notification.id || `${notification.message}-${index}`} hover>
                  <TableCell>
                    {!notification.read ? (
                      <Chip label="New" size="small" color="primary" />
                    ) : (
                      <Chip label="Read" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {notification.title || 'System update'}
                  </TableCell>
                  <TableCell>{notification.message}</TableCell>
                  <TableCell>{formatDate(notification.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default NotificationsPage;
