import React from 'react';
import { Box, Typography, IconButton, Button, Stack, CircularProgress, Tooltip, Divider } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Receipt as ReceiptIcon,
  ManageAccounts as ManageAccountsIcon
} from '@mui/icons-material';

const EmployeeProfileHeader = ({
  id,
  editing,
  saving,
  canEdit,
  canEditSensitive,
  onBack,
  onEdit,
  onCancel,
  onSave,
  onViewPayslip,
  onManageUser
}) => {
  return (
    <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }} data-testid="employee-profile-header">
      <Tooltip title="Back to Employee List">
        <IconButton onClick={onBack} data-testid="employee-profile-back-btn" sx={{ bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <ArrowBackIcon />
        </IconButton>
      </Tooltip>
      
      <Box sx={{ flex: 1 }}>
        <Typography variant="h4" fontWeight={700} color="text.primary">
          Employee Profile
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage employee information and settings
        </Typography>
      </Box>
      
      <Stack direction="row" spacing={2} alignItems="center">
        {/* View Mode Actions */}
        {!editing && (
          <>
            {canEditSensitive && (
              <>
                <Button
                  variant="text"
                  startIcon={<ReceiptIcon />}
                  onClick={onViewPayslip}
                  data-testid="employee-profile-payslip-btn"
                  sx={{ 
                    color: 'text.secondary',
                    textTransform: 'none',
                    '&:hover': { color: 'primary.main', bgcolor: 'primary.50' }
                  }}
                >
                  Payslip
                </Button>
                <Button
                  variant="text"
                  startIcon={<ManageAccountsIcon />}
                  onClick={onManageUser}
                  sx={{ 
                    color: 'text.secondary',
                    textTransform: 'none',
                    '&:hover': { color: 'primary.main', bgcolor: 'primary.50' }
                  }}
                >
                  User Account
                </Button>
                <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24, alignSelf: 'center' }} />
              </>
            )}
            
            {canEdit && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={onEdit}
                data-testid="employee-profile-edit-btn"
                sx={{
                  bgcolor: '#1976d2',
                  px: 3,
                  py: 1,
                  textTransform: 'none',
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(25,118,210,0.2)',
                  fontWeight: 600
                }}
              >
                Edit Profile
              </Button>
            )}
          </>
        )}

        {/* Edit Mode Actions */}
        {editing && (
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={onCancel}
              disabled={saving}
              data-testid="employee-profile-cancel-btn"
              sx={{ 
                textTransform: 'none', 
                borderRadius: 2,
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'text.primary',
                  bgcolor: 'transparent'
                }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={onSave}
              disabled={saving}
              data-testid="employee-profile-save-btn"
              sx={{
                bgcolor: '#10b981',
                '&:hover': { bgcolor: '#059669' },
                textTransform: 'none',
                borderRadius: 2,
                px: 4,
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default EmployeeProfileHeader;
