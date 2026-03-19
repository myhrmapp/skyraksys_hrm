import React from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  alpha,
  useTheme
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

const DeleteEmployeeDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  employee, 
  loading 
}) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: alpha(theme.palette.error.main, 0.1),
              width: 48,
              height: 48
            }}
          >
            <WarningIcon sx={{ color: 'error.main', fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Terminate Employee?
            </Typography>
            <Typography variant="caption" color="text.secondary">
              This will deactivate the employee account
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" color="text.secondary">
          Are you sure you want to terminate{' '}
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {employee?.firstName} {employee?.lastName}
          </Box>
          {employee?.employeeId && (
            <>
              {' '}(ID: <Box component="span" sx={{ fontWeight: 500 }}>{employee.employeeId}</Box>)
            </>
          )}
          ?
        </Typography>
        <Box 
          sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: alpha(theme.palette.info.main, 0.1), 
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
          }}
        >
          <Typography variant="body2" color="text.secondary">
            <strong>Note:</strong> This is a soft delete. The employee status will be set to "Terminated" and their user account will be deactivated. The employee record will remain in the system for historical purposes.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          data-testid="delete-employee-cancel-btn"
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 2
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="outlined"
          color="error"
          disabled={loading}
          data-testid="delete-employee-confirm-btn"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2
          }}
        >
          {loading ? 'Terminating...' : 'Terminate Employee'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteEmployeeDialog;
