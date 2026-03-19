import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  Box,
  useTheme,
  alpha
} from '@mui/material';
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const variantConfig = {
  danger: { color: 'error', icon: DeleteIcon, confirmText: 'Delete' },
  warning: { color: 'warning', icon: WarningIcon, confirmText: 'Confirm' },
  info: { color: 'info', icon: InfoIcon, confirmText: 'OK' },
  success: { color: 'success', icon: CheckCircleIcon, confirmText: 'Confirm' },
};

/**
 * Reusable MUI-based confirmation dialog to replace all window.confirm() usages.
 * 
 * Usage:
 *   <ConfirmDialog
 *     open={open}
 *     title="Delete employee?"
 *     message="This action cannot be undone."
 *     variant="danger"
 *     onConfirm={handleDelete}
 *     onCancel={() => setOpen(false)}
 *   />
 */
const ConfirmDialog = ({
  open,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  variant = 'warning',
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  maxWidth = 'xs',
  children
}) => {
  const theme = useTheme();
  const config = variantConfig[variant] || variantConfig.warning;
  const IconComponent = config.icon;
  const buttonText = confirmText || config.confirmText;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth={maxWidth}
      fullWidth
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette[config.color].main, 0.1),
            }}
          >
            <IconComponent color={config.color} />
          </Box>
          <Typography variant="h6" component="span" fontWeight={600}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {children || (
          <DialogContentText id="confirm-dialog-description" sx={{ mt: 1 }}>
            {message}
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={onCancel}
          disabled={loading}
          variant="outlined"
          color="inherit"
          sx={{ textTransform: 'none', minWidth: 80 }}
          autoFocus
          data-testid="confirm-dialog-cancel-btn"
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={config.color}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ textTransform: 'none', minWidth: 80 }}
          data-testid="confirm-dialog-confirm-btn"
        >
          {loading ? 'Processing...' : buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

ConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  variant: PropTypes.oneOf(['danger', 'warning', 'info', 'success']),
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  maxWidth: PropTypes.string,
  children: PropTypes.node,
};

export default ConfirmDialog;
