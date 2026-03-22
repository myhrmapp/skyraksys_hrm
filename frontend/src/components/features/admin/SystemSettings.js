import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Avatar,
  Stack
} from '@mui/material';
import { Save as SaveIcon, Upload as UploadIcon } from '@mui/icons-material';
import settingsService from '../../../services/settings.service';
import PropTypes from 'prop-types';

const SystemSettings = ({ embedded } = {}) => {
  const [settings, setSettings] = useState({
    companyName: '',
    companyAddress: '',
    companyContact: '',
    footerText: '',
    companyLogo: '',
    showEarningsBreakdown: true,
    showDeductionsBreakdown: true,
    showLeaveBalance: true,
    showEmployeeDetails: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const logoInputRef = useRef();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await settingsService.getPayslipTemplate();
        if (response.data?.data) {
          setSettings(response.data.data);
          setLogoPreview(response.data.data.companyLogo);
        }
      } catch (err) {
        setError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const [validationErrors, setValidationErrors] = useState({});

  const validateSettings = () => {
    const errors = {};
    if (!settings.companyName?.trim()) {
      errors.companyName = 'Company name is required';
    }
    if (!settings.companyAddress?.trim()) {
      errors.companyAddress = 'Company address is required';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateSettings()) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const response = await settingsService.updatePayslipTemplate(settings, selectedLogo);
      
      setSettings(response.data.data);
      if (response.data.data?.companyLogo) {
        setLogoPreview(response.data.data.companyLogo);
      }
      setSelectedLogo(null);
      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: embedded ? 0 : 4 }}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        {!embedded && (
        <>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Payslip Template Settings
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Customize the appearance and content of the generated payslips.
        </Typography>
        </>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Grid container spacing={4}>
          {/* Company Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Company Details</Typography>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Company Name"
                name="companyName"
                value={settings.companyName}
                onChange={handleInputChange}
                required
                error={!!validationErrors.companyName}
                helperText={validationErrors.companyName}
              />
              <TextField
                fullWidth
                label="Company Address"
                name="companyAddress"
                value={settings.companyAddress}
                onChange={handleInputChange}
                multiline
                rows={3}
                required
                error={!!validationErrors.companyAddress}
                helperText={validationErrors.companyAddress}
              />
              <TextField
                fullWidth
                label="Company Contact (Email/Phone)"
                name="companyContact"
                value={settings.companyContact}
                onChange={handleInputChange}
              />
              <TextField
                fullWidth
                label="Payslip Footer Text"
                name="footerText"
                value={settings.footerText}
                onChange={handleInputChange}
                multiline
                rows={2}
              />
            </Stack>
          </Grid>

          {/* Logo and Display Options */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Logo & Display Options</Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Avatar src={logoPreview} sx={{ width: 80, height: 80, bgcolor: 'grey.300' }} variant="rounded" />
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={() => logoInputRef.current.click()}
                >
                  Upload Logo
                </Button>
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoChange}
                  accept="image/png, image/jpeg"
                  hidden
                />
              </Box>
              <FormControlLabel
                control={<Switch checked={settings.showEmployeeDetails} onChange={handleInputChange} name="showEmployeeDetails" />}
                label="Show Employee Details Section"
              />
              <FormControlLabel
                control={<Switch checked={settings.showEarningsBreakdown} onChange={handleInputChange} name="showEarningsBreakdown" />}
                label="Show Earnings Breakdown"
              />
              <FormControlLabel
                control={<Switch checked={settings.showDeductionsBreakdown} onChange={handleInputChange} name="showDeductionsBreakdown" />}
                label="Show Deductions Breakdown"
              />
              <FormControlLabel
                control={<Switch checked={settings.showLeaveBalance} onChange={handleInputChange} name="showLeaveBalance" />}
                label="Show Leave Balance"
              />
            </Stack>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

SystemSettings.propTypes = {
  embedded: PropTypes.bool,
};

export default SystemSettings;
