import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Switch, FormControlLabel, 
  Button, Select, MenuItem, InputLabel, FormControl, 
  Alert, Divider, CircularProgress
} from '@mui/material';
import { Security, Lock, LockOpen, Warning } from '@mui/icons-material';
import api from '../../../services/api.service';

const PayrollVaultSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vaultStatus, setVaultStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch vault status
      const statusRes = await api.get('/vault/status');
      const status = statusRes.data;
      setVaultStatus(status);
      setIsEnabled(status.isEnabled);
      setSelectedUserId(status.designatedHrUserId || '');

      // Fetch HR users to select from
      const usersRes = await api.get('/users');
      // Filter for HR/Admin users (since backend doesn't support ?role=HR filtering natively yet)
      const hrUsers = (usersRes.data || []).filter(u => u.role === 'hr' || u.role === 'admin' || u.role === 'HR' || u.role === 'Admin');
      setUsers(hrUsers);
      
    } catch (err) {
      console.error('Error fetching vault data', err);
      setError('Failed to load Vault Settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (e) => {
    setIsEnabled(e.target.checked);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (isEnabled && !selectedUserId) {
        setError('You must select a Designated HR before enabling the Vault.');
        setSaving(false);
        return;
      }

      const endpoint = !vaultStatus.isConfigured ? '/vault/setup' : '/vault/toggle';
      const payload = !vaultStatus.isConfigured ? 
        { designatedHrUserId: selectedUserId } : 
        { enable: isEnabled, designatedHrUserId: selectedUserId };

      await api.post(endpoint, payload);
      setSuccess(`Vault successfully ${isEnabled ? 'enabled' : 'disabled'}.`);
      await fetchInitialData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, borderTop: `5px solid ${isEnabled ? '#2e7d32' : '#d32f2f'}` }}>
        <Box display="flex" alignItems="center" mb={2}>
          {isEnabled ? <Lock color="success" sx={{ fontSize: 40, mr: 2 }} /> : <LockOpen color="error" sx={{ fontSize: 40, mr: 2 }} />}
          <Typography variant="h4" fontWeight="bold">
            Payroll & Invoice Security Vault
          </Typography>
        </Box>
        
        <Typography variant="body1" color="textSecondary" mb={4}>
          The Security Vault encrypts all financial data in the database. When enabled, only the Designated HR can view all payslips. Employees can still view their own payslips.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        {!isEnabled && vaultStatus?.isConfigured && (
          <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
            <strong>WARNING:</strong> The Vault is currently disabled. All salaries are stored in plain text in the database. 
            System administrators and developers can read all payroll data.
          </Alert>
        )}

        <Box mb={4}>
          <FormControlLabel
            control={
              <Switch 
                checked={isEnabled} 
                onChange={handleToggle} 
                color="success" 
                size="large"
              />
            }
            label={
              <Typography variant="h6" fontWeight="bold">
                {isEnabled ? 'Vault is ACTIVE (Encrypted)' : 'Vault is INACTIVE (Plain Text)'}
              </Typography>
            }
          />
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Typography variant="h6" gutterBottom>
          Access Configuration
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 4 }}>
          <InputLabel>Designated HR User</InputLabel>
          <Select
            value={selectedUserId}
            label="Designated HR User"
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={!isEnabled}
          >
            {users.map(u => (
              <MenuItem key={u.id} value={u.id}>
                {u.email} ({u.employee?.firstName} {u.employee?.lastName})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box display="flex" justifyContent="flex-end">
          <Button 
            variant="contained" 
            color={isEnabled ? 'success' : 'error'}
            size="large"
            startIcon={<Security />}
            onClick={handleSave}
            disabled={saving || (isEnabled === vaultStatus?.isEnabled && selectedUserId === vaultStatus?.designatedHrUserId)}
          >
            {saving ? 'Saving...' : 'Apply Security Settings'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default PayrollVaultSettings;
