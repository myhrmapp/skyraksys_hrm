import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  Email as EmailIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Visibility,
  VisibilityOff,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import http from '../../../http-common';
import PropTypes from 'prop-types';

const EmailConfiguration = ({ embedded } = {}) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [config, setConfig] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpSecure: false,
    smtpUser: '',
    smtpPassword: '',
    emailFrom: '',
    enabled: true
  });

  const [testEmail, setTestEmail] = useState('');

  // Predefined SMTP providers
  const smtpProviders = [
    { 
      label: 'Gmail', 
      host: 'smtp.gmail.com', 
      port: '587', 
      secure: false,
      help: 'Use App Password (not regular password)'
    },
    { 
      label: 'Outlook/Office 365', 
      host: 'smtp.office365.com', 
      port: '587', 
      secure: false 
    },
    { 
      label: 'SendGrid', 
      host: 'smtp.sendgrid.net', 
      port: '587', 
      secure: false,
      help: 'User: apikey, Password: Your API Key'
    },
    { 
      label: 'Mailgun', 
      host: 'smtp.mailgun.org', 
      port: '587', 
      secure: false 
    },
    { 
      label: 'Custom', 
      host: '', 
      port: '587', 
      secure: false 
    }
  ];

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const response = await http.get('/admin/email-config');
      if (response.data.success) {
        setConfig(response.data.data);
        setConnectionStatus(response.data.status);
      }
    } catch (err) {
      console.error('Failed to load email configuration:', err);
      setError('Failed to load email configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: e.target.type === 'checkbox' ? checked : value
    }));
  };

  const handleProviderChange = (provider) => {
    setConfig(prev => ({
      ...prev,
      smtpHost: provider.host,
      smtpPort: provider.port,
      smtpSecure: provider.secure
    }));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    // Validate SMTP fields
    if (config.enabled) {
      if (!config.smtpHost?.trim()) {
        setError('SMTP Host is required');
        return;
      }
      const port = Number(config.smtpPort);
      if (!config.smtpPort || isNaN(port) || port < 1 || port > 65535) {
        setError('SMTP Port must be a number between 1 and 65535');
        return;
      }
      if (!config.smtpUser?.trim()) {
        setError('SMTP Username is required');
        return;
      }
      if (config.emailFrom) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(config.emailFrom)) {
          setError('From Email must be a valid email address');
          return;
        }
      }
    }

    setLoading(true);

    try {
      const response = await http.post('/admin/email-config', config);
      if (response.data.success) {
        setSuccess('Email configuration saved successfully! Please restart the backend server for changes to take effect.');
        setConnectionStatus(null);
      } else {
        setError(response.data.message || 'Failed to save configuration');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save email configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await http.post('/admin/email-config/test', config);
      if (response.data.success) {
        setSuccess('Connection successful! SMTP configuration is working.');
        setConnectionStatus('connected');
      } else {
        setError(response.data.message || 'Connection failed');
        setConnectionStatus('failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Connection test failed');
      setConnectionStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      setError('Please enter a test email address');
      return;
    }

    setTestingEmail(true);
    setError('');
    setSuccess('');

    try {
      const response = await http.post('/admin/email-config/send-test', {
        ...config,
        testEmail
      });
      if (response.data.success) {
        setSuccess(`Test email sent successfully to ${testEmail}!`);
      } else {
        setError(response.data.message || 'Failed to send test email');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: embedded ? 0 : 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {!embedded && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <EmailIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Email Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure SMTP settings for sending emails (Welcome emails, Password resets, etc.)
            </Typography>
          </Box>
        </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Connection Status */}
        {connectionStatus && (
          <Card sx={{ mb: 3, bgcolor: connectionStatus === 'connected' ? 'success.50' : 'error.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {connectionStatus === 'connected' ? (
                  <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
                ) : (
                  <ErrorIcon sx={{ color: 'error.main', mr: 1 }} />
                )}
                <Typography variant="body1" fontWeight="medium">
                  {connectionStatus === 'connected' 
                    ? 'SMTP Connection Successful' 
                    : 'SMTP Connection Failed'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Quick Provider Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quick Setup - Select Provider
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {smtpProviders.map((provider) => (
              <Chip
                key={provider.label}
                label={provider.label}
                onClick={() => handleProviderChange(provider)}
                color={config.smtpHost === provider.host ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* SMTP Configuration Form */}
        <Grid container spacing={3}>
          {/* Enable/Disable */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.enabled}
                  onChange={handleChange}
                  name="enabled"
                  color="primary"
                />
              }
              label={
                <Typography variant="body1" fontWeight="medium">
                  Enable Email Service
                </Typography>
              }
            />
          </Grid>

          {/* SMTP Host */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="SMTP Host"
              name="smtpHost"
              value={config.smtpHost}
              onChange={handleChange}
              placeholder="smtp.gmail.com"
              helperText="Your email provider's SMTP server address"
              required
            />
          </Grid>

          {/* SMTP Port */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="SMTP Port"
              name="smtpPort"
              value={config.smtpPort}
              onChange={handleChange}
              placeholder="587"
              helperText="587 (TLS) or 465 (SSL)"
              required
            />
          </Grid>

          {/* SMTP Secure */}
          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.smtpSecure}
                  onChange={handleChange}
                  name="smtpSecure"
                />
              }
              label="Use SSL (Port 465)"
            />
          </Grid>

          {/* SMTP User */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="SMTP Username"
              name="smtpUser"
              value={config.smtpUser}
              onChange={handleChange}
              placeholder="your-email@gmail.com"
              helperText="Your email address or SMTP username"
              required
            />
          </Grid>

          {/* SMTP Password */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="SMTP Password"
              name="smtpPassword"
              type={showPassword ? 'text' : 'password'}
              value={config.smtpPassword}
              onChange={handleChange}
              placeholder="App password or API key"
              helperText="For Gmail, use App Password (not regular password)"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          {/* From Email */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="From Email Address"
              name="emailFrom"
              value={config.emailFrom}
              onChange={handleChange}
              placeholder="noreply@yourcompany.com"
              helperText="The email address that will appear in the 'From' field"
              required
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Test Email Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Test Email Configuration
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Test Email Address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                helperText="Enter an email address to receive a test email"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleSendTestEmail}
                disabled={testingEmail || !testEmail}
                startIcon={testingEmail ? <CircularProgress size={20} /> : <SendIcon />}
                sx={{ height: '56px' }}
              >
                {testingEmail ? 'Sending...' : 'Send Test Email'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={loadConfiguration}
            startIcon={<RefreshIcon />}
            disabled={loading}
          >
            Reset
          </Button>

          <Button
            variant="outlined"
            onClick={handleTestConnection}
            disabled={loading || !config.smtpHost || !config.smtpUser}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            Test Connection
          </Button>

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading || !config.smtpHost || !config.smtpUser}
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            Save Configuration
          </Button>
        </Box>

        {/* Help Section */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Gmail Setup Instructions:
          </Typography>
          <Typography variant="body2" component="div">
            1. Enable 2-Step Verification on your Google Account<br />
            2. Go to Google Account Security → App passwords<br />
            3. Generate an App password for "Mail"<br />
            4. Use the 16-character app password here (not your regular password)
          </Typography>
        </Alert>
      </Paper>
    </Container>
  );
};

EmailConfiguration.propTypes = {
  embedded: PropTypes.bool,
};

export default EmailConfiguration;
