import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Typography,
  Button,
  Alert,
  Chip,
  Box,
  Divider,
  IconButton,
  Stack,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import ConfirmDialog from '../../common/ConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';

const EditPayslipDialog = ({ open, payslip, onClose, onSave, loading }) => {
  const [earnings, setEarnings] = useState({});
  const [deductions, setDeductions] = useState({});
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [addComponentDialog, setAddComponentDialog] = useState({ open: false, type: null, name: '' });
  const { dialogProps, confirm } = useConfirmDialog();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (payslip) {
      setEarnings(payslip.earnings || {});
      setDeductions(payslip.deductions || {});
      setOvertimeHours(payslip.attendance?.overtimeHours || 0);
      setReason('');
      setErrors({});
    }
  }, [payslip]);

  const calculateTotals = () => {
    const totalEarnings = Object.values(earnings).reduce(
      (sum, val) => sum + parseFloat(val || 0),
      0
    );
    const totalDeductions = Object.values(deductions).reduce(
      (sum, val) => sum + parseFloat(val || 0),
      0
    );
    const netPay = totalEarnings - totalDeductions;

    return { totalEarnings, totalDeductions, netPay };
  };

  const { totalEarnings, totalDeductions, netPay } = calculateTotals();

  const handleAddComponent = (type) => {
    setAddComponentDialog({ open: true, type, name: '' });
  };

  const handleConfirmAddComponent = () => {
    const { type, name } = addComponentDialog;
    if (name && name.trim()) {
      const key = name.trim().replace(/\s+/g, '');
      if (type === 'earning') {
        if (earnings[key]) {
          enqueueSnackbar('Component already exists!', { variant: 'warning' });
          setAddComponentDialog({ open: false, type: null, name: '' });
          return;
        }
        setEarnings({ ...earnings, [key]: 0 });
      } else {
        if (deductions[key]) {
          enqueueSnackbar('Component already exists!', { variant: 'warning' });
          setAddComponentDialog({ open: false, type: null, name: '' });
          return;
        }
        setDeductions({ ...deductions, [key]: 0 });
      }
    }
    setAddComponentDialog({ open: false, type: null, name: '' });
  };

  const handleRemoveComponent = (type, key) => {
    confirm({
      title: 'Remove Component',
      message: `Remove "${formatLabel(key)}"?`,
      variant: 'warning',
      onConfirm: async () => {
        if (type === 'earning') {
          const newEarnings = { ...earnings };
          delete newEarnings[key];
          setEarnings(newEarnings);
        } else {
          const newDeductions = { ...deductions };
          delete newDeductions[key];
          setDeductions(newDeductions);
        }
      }
    });
  };

  const handleEarningChange = (key, value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0) return; // Prevent negative values
    setEarnings({ ...earnings, [key]: numValue });
  };

  const handleDeductionChange = (key, value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0) return; // Prevent negative values
    setDeductions({ ...deductions, [key]: numValue });
  };

  const validate = () => {
    const newErrors = {};

    if (!reason.trim()) {
      newErrors.reason = 'Reason is required for audit trail';
    } else if (reason.trim().length < 10) {
      newErrors.reason = 'Please provide a detailed reason (at least 10 characters)';
    }

    if (netPay < 0) {
      newErrors.netPay = 'Net pay cannot be negative. Please adjust earnings or deductions.';
    }

    if (Object.keys(earnings).length === 0) {
      newErrors.earnings = 'At least one earning component is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave({
        payslipId: payslip.id,
        earnings,
        deductions,
        attendance: { overtimeHours: parseFloat(overtimeHours) || 0 },
        reason: reason.trim()
      });
    }
  };

  const formatLabel = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  if (!payslip) return null;

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6">
              Edit Payslip - {payslip.payslipNumber}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {payslip.employee?.employeeId} - {payslip.employee?.firstName} {payslip.employee?.lastName}
            </Typography>
          </Box>
          <Chip label={(payslip.status || 'Unknown').toUpperCase()} color="warning" size="small" />
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight="bold">
            Manual Adjustment Warning
          </Typography>
          <Typography variant="body2">
            All changes will be logged in the audit trail. You must provide a detailed reason for this adjustment.
            Only draft payslips can be edited.
          </Typography>
        </Alert>

        <Grid container spacing={3}>
          {/* Earnings Section */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, bgcolor: 'success.50' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" color="success.main">
                  💰 Earnings
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleAddComponent('earning')}
                  variant="outlined"
                  color="success"
                >
                  Add
                </Button>
              </Stack>

              {Object.keys(earnings).length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No earning components. Click "Add" to create one.
                </Alert>
              ) : (
                Object.entries(earnings).map(([key, value]) => (
                  <Stack direction="row" spacing={1} key={key} sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label={formatLabel(key)}
                      type="number"
                      value={value}
                      onChange={(e) => handleEarningChange(key, e.target.value)}
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography>,
                      }}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveComponent('earning', key)}
                      sx={{ mt: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))
              )}

              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight="bold">
                  Total Earnings:
                </Typography>
                <Typography variant="h6" color="success.main" fontWeight="bold">
                  ₹{totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Deductions Section */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, bgcolor: 'error.50' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" color="error.main">
                  ➖ Deductions
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleAddComponent('deduction')}
                  variant="outlined"
                  color="error"
                >
                  Add
                </Button>
              </Stack>

              {Object.keys(deductions).length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No deductions. This is optional.
                </Alert>
              ) : (
                Object.entries(deductions).map(([key, value]) => (
                  <Stack direction="row" spacing={1} key={key} sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label={formatLabel(key)}
                      type="number"
                      value={value}
                      onChange={(e) => handleDeductionChange(key, e.target.value)}
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography>,
                      }}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveComponent('deduction', key)}
                      sx={{ mt: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))
              )}

              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight="bold">
                  Total Deductions:
                </Typography>
                <Typography variant="h6" color="error.main" fontWeight="bold">
                  ₹{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Net Pay Summary */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'info.50' }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                ⏱️ Overtime Hours
              </Typography>
              <TextField
                fullWidth
                label="Overtime Hours"
                type="number"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(Math.max(0, parseFloat(e.target.value) || 0))}
                inputProps={{ min: 0, step: 0.5 }}
                size="small"
                helperText="OT pay auto-calculated at 1.5x hourly rate during generation. Edit the overtimePay earning above to adjust the amount."
              />
            </Paper>
          </Grid>

          {/* Net Pay Amount */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                bgcolor: errors.netPay ? 'error.light' : 'primary.main',
                color: 'white' 
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight="bold">
                  NET PAY:
                </Typography>
                <Typography variant="h3" fontWeight="bold">
                  ₹{netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Stack>
              {errors.netPay && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errors.netPay}
                </Alert>
              )}
            </Paper>
          </Grid>

          {/* Reason for Adjustment */}
          <Grid item xs={12}>
            <TextField
              data-testid="edit-payslip-reason"
              fullWidth
              label="Reason for Manual Adjustment *"
              multiline
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errors.reason && e.target.value.trim().length >= 10) {
                  setErrors({ ...errors, reason: undefined });
                }
              }}
              required
              error={!!errors.reason}
              helperText={
                errors.reason ||
                'Required for audit trail. Be specific about what was changed and why. Minimum 10 characters.'
              }
              placeholder="Example: Added performance bonus of ₹5,000 as per management approval email dated Oct 25, 2025. Deducted advance salary of ₹3,000 taken on Oct 15, 2025."
            />
          </Grid>

          {errors.earnings && (
            <Grid item xs={12}>
              <Alert severity="error">{errors.earnings}</Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          data-testid="edit-payslip-save-btn"
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          startIcon={<SaveIcon />}
          size="large"
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
    <ConfirmDialog {...dialogProps} />

    {/* Add Component Name Dialog */}
    <Dialog
      open={addComponentDialog.open}
      onClose={() => setAddComponentDialog({ open: false, type: null, name: '' })}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        Add {addComponentDialog.type === 'earning' ? 'Earning' : 'Deduction'} Component
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Component Name"
          placeholder={addComponentDialog.type === 'earning' ? 'e.g., Special Allowance' : 'e.g., Advance Deduction'}
          value={addComponentDialog.name}
          onChange={(e) => setAddComponentDialog(prev => ({ ...prev, name: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmAddComponent(); }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAddComponentDialog({ open: false, type: null, name: '' })}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirmAddComponent}
          disabled={!addComponentDialog.name?.trim()}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default EditPayslipDialog;
