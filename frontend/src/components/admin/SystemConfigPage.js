import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
  Storage as DatabaseIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import http from '../../http-common';
import PropTypes from 'prop-types';
import { TabPanel } from '../common/TabbedPage';

const SystemConfigPage = ({ embedded } = {}) => {
  const navigate = useNavigate();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [systemConfig, setSystemConfig] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  const handlePasswordSubmit = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // First verify password
      await http.post('/system-config/verify-password', { password });

      // Then fetch system config
      const response = await http.post('/system-config/view', { password });
      
      setSystemConfig(response.data.data);
      setIsAuthenticated(true);
      setPasswordDialogOpen(false);
      
      // Fetch audit trail
      fetchAuditTrail();
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditTrail = async () => {
    try {
      const response = await http.get('/system-config/audit-trail?limit=20');
      setAuditTrail(response.data.data);
    } catch (err) {
      console.error('Failed to fetch audit trail:', err);
    }
  };

  const handleCopyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
  };

  const renderConfigSection = (title, icon, data, color = 'primary') => {
    return (
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={React.cloneElement(icon, { sx: { color: `${color}.main` } })}
          title={<Typography variant="h6">{title}</Typography>}
          sx={{ bgcolor: `${color}.lighter`, borderBottom: 1, borderColor: 'divider' }}
        />
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {Object.entries(data).map(([key, value]) => (
                  <TableRow key={key} hover>
                    <TableCell sx={{ fontWeight: 600, width: '30%' }}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', position: 'relative' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            wordBreak: 'break-all',
                            flex: 1,
                            color: value === 'NOT_SET' ? 'error.main' : 'text.primary'
                          }}
                        >
                          {value === 'NOT_SET' ? (
                            <Chip label="NOT SET" color="error" size="small" />
                          ) : typeof value === 'boolean' ? (
                            <Chip
                              label={value ? 'Enabled' : 'Disabled'}
                              color={value ? 'success' : 'default'}
                              size="small"
                            />
                          ) : (
                            String(value)
                          )}
                        </Typography>
                        {value !== 'NOT_SET' && (
                          <Tooltip title="Copy to clipboard">
                            <IconButton
                              size="small"
                              onClick={() => handleCopyToClipboard(String(value), key)}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  const renderAuditTrail = () => {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>User</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {auditTrail.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={log.action}
                    size="small"
                    color={
                      log.action.includes('DENIED') || log.action.includes('FAILED')
                        ? 'error'
                        : 'success'
                    }
                  />
                </TableCell>
                <TableCell>
                  {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                </TableCell>
                <TableCell>{log.details?.ip || 'N/A'}</TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {JSON.stringify(log.details, null, 2).substring(0, 100)}...
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ p: embedded ? 0 : 3 }}>
      {/* Password Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => {}}
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockIcon color="error" />
          <Typography variant="h6">Secure Access Required</Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            This page contains sensitive system configuration including credentials and secrets.
            Please re-enter your admin password to continue.
          </DialogContentText>
          <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
            All access attempts are logged and monitored.
          </Alert>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Admin Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePasswordSubmit();
            }}
            autoFocus
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate(-1)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handlePasswordSubmit}
            variant="contained"
            color="primary"
            disabled={loading || !password}
            startIcon={loading ? <CircularProgress size={20} /> : <LockIcon />}
          >
            {loading ? 'Verifying...' : 'Authenticate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Main Content (only shown after authentication) */}
      {isAuthenticated && systemConfig && (
        <Box>
          {/* Header */}
          {!embedded && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SecurityIcon fontSize="large" color="error" />
              System Configuration
            </Typography>
            <Alert severity="error" icon={<WarningIcon />}>
              <strong>WARNING:</strong> This page contains highly sensitive information including
              passwords, API keys, and database credentials. Do not share screenshots or copy this
              data to insecure locations.
            </Alert>
          </Box>
          )}

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
              <Tab icon={<SecurityIcon />} label="Authentication" />
              <Tab icon={<DatabaseIcon />} label="Database" />
              <Tab icon={<EmailIcon />} label="Email/SMTP" />
              <Tab icon={<SettingsIcon />} label="Application" />
              <Tab icon={<HistoryIcon />} label="Audit Trail" />
            </Tabs>
          </Box>

          {/* Authentication Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: 3 }}>
              {renderConfigSection(
                'Authentication & Security',
                <SecurityIcon />,
                systemConfig.authentication,
                'error'
              )}
            </Box>
          </TabPanel>

          {/* Database Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ p: 3 }}>
              {renderConfigSection(
                'Database Configuration',
                <DatabaseIcon />,
                systemConfig.database,
                'primary'
              )}
            </Box>
          </TabPanel>

          {/* Email Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 3 }}>
              {renderConfigSection(
                'Email/SMTP Configuration',
                <EmailIcon />,
                systemConfig.email,
                'info'
              )}
              {systemConfig.redis && renderConfigSection(
                'Redis Configuration',
                <DatabaseIcon />,
                systemConfig.redis,
                'warning'
              )}
            </Box>
          </TabPanel>

          {/* Application Tab */}
          <TabPanel value={activeTab} index={3}>
            <Box sx={{ p: 3 }}>
              {renderConfigSection(
                'Application Settings',
                <SettingsIcon />,
                systemConfig.application,
                'success'
              )}
              {renderConfigSection(
                'Rate Limiting',
                <SecurityIcon />,
                systemConfig.rateLimiting,
                'warning'
              )}
              {renderConfigSection(
                'Logging Configuration',
                <HistoryIcon />,
                systemConfig.logging,
                'info'
              )}
            </Box>
          </TabPanel>

          {/* Audit Trail Tab */}
          <TabPanel value={activeTab} index={4}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent System Config Access History
              </Typography>
              {renderAuditTrail()}
            </Box>
          </TabPanel>
        </Box>
      )}
    </Box>
  );
};

SystemConfigPage.propTypes = {
  embedded: PropTypes.bool,
};

export default SystemConfigPage;
