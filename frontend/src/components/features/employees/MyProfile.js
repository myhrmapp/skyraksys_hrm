import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import EmployeeProfileModern from './EmployeeProfileModern';

/**
 * Self-Service Employee Profile View
 * Reuses the modern profile component in "self" mode.
 */
const MyProfile = () => {
  const { changePassword } = useAuth();
  const { showSuccess, showError } = useNotifications();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const validatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return 'All password fields are required';
    }
    if (newPassword.length < 8) {
      return 'New password must be at least 8 characters';
    }
    if (newPassword !== confirmPassword) {
      return 'New password and confirm password do not match';
    }
    return '';
  };

  const handleChangePassword = async () => {
    const validationError = validatePassword();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (!result.success) {
        setFormError(result.error || 'Failed to change password');
        showError(result.error || 'Failed to change password');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Password changed successfully');
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to change password';
      setFormError(message);
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box data-testid="my-profile-page">
      <EmployeeProfileModern mode="self" />

      <Box sx={{ maxWidth: 1400, mx: 'auto', px: 3, pb: 4 }}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardHeader
            title="Change Password"
            subheader="Update your account password securely"
          />
          <CardContent>
            <Stack spacing={2}>
              {formError && <Alert severity="error">{formError}</Alert>}

              <TextField
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                fullWidth
              />

              <TextField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                fullWidth
                helperText="Minimum 8 characters"
              />

              <TextField
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                fullWidth
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setFormError('');
                  }}
                  disabled={saving}
                >
                  Clear
                </Button>
                <Button
                  variant="contained"
                  onClick={handleChangePassword}
                  disabled={saving}
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </Button>
              </Box>

              <Typography variant="caption" color="text.secondary">
                Tip: Use a strong password with uppercase, lowercase, number, and special character.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default MyProfile;