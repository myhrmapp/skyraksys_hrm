import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Save as SaveIcon,
  CloudDownload as BackupIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Article as LogIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  DataObject as DatabaseIcon
} from '@mui/icons-material';
import http from '../../../http-common';
import ConfirmDialog from '../../common/ConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import EnvironmentSelector from './components/EnvironmentSelector';
import DatabaseToolsTab from './tabs/DatabaseToolsTab';
import { TabPanel } from '../../common/TabbedPage';

const AdminDebugPanel = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', type: 'success' });
  const { dialogProps, confirm } = useConfirmDialog();
  
  // Environment State
  const [selectedEnvironment, setSelectedEnvironment] = useState(() => {
    return localStorage.getItem('admin_selected_environment') || 'LOCAL';
  });
  // System Info State
  const [systemInfo, setSystemInfo] = useState(null);
  const [databaseInfo, setDatabaseInfo] = useState(null);

  // Configuration State
  const [config, setConfig] = useState(null);
  const [editedConfig, setEditedConfig] = useState({});
  const [configBackups, setConfigBackups] = useState([]);

  // Log Viewer State
  const [logs, setLogs] = useState([]);
  const [logFiles, setLogFiles] = useState([]);
  const [selectedLogType, setSelectedLogType] = useState('combined');
  const [logSearch, setLogSearch] = useState('');
  const [logLines, setLogLines] = useState(100);
  const [logOffset, setLogOffset] = useState(0);
  const [logStats, setLogStats] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);
  
  const handleEnvironmentChange = (envName, envApiUrl) => {
    setSelectedEnvironment(envName);
    localStorage.setItem('admin_selected_environment', envName);
    showNotification(`Switched to ${envName} environment`, 'success');
  };

  const loadInitialData = async () => {
    await Promise.all([
      loadSystemInfo(),
      loadDatabaseInfo(),
      loadConfiguration(),
      loadLogFiles()
    ]);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ open: true, message, type });
    setTimeout(() => setNotification({ open: false, message: '', type: 'success' }), 5000);
  };

  // ==========================================
  // SYSTEM INFO FUNCTIONS
  // ==========================================

  const loadSystemInfo = async () => {
    try {
      const response = await http.get('/debug/system/info');
      if (response.data.success) {
        setSystemInfo(response.data.data);
      }
    } catch (error) {
      console.error('Error loading system info:', error);
      showNotification('Failed to load system info', 'error');
    }
  };

  const loadDatabaseInfo = async () => {
    try {
      const response = await http.get('/debug/system/database');
      if (response.data.success) {
        setDatabaseInfo(response.data.data);
      }
    } catch (error) {
      console.error('Error loading database info:', error);
      showNotification('Failed to load database info', 'error');
    }
  };

  // ==========================================
  // CONFIGURATION FUNCTIONS
  // ==========================================

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await http.get('/debug/config');
      if (response.data.success) {
        setConfig(response.data.data);
        setEditedConfig({});
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      showNotification('Failed to load configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key, value) => {
    setEditedConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveConfiguration = async () => {
    try {
      setLoading(true);
      const response = await http.put('/debug/config', { updates: editedConfig });
      if (response.data.success) {
        showNotification('Configuration saved! Server restart required.', 'success');
        await loadConfiguration();
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      showNotification(error.response?.data?.message || 'Failed to save configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      setLoading(true);
      const response = await http.post('/debug/config/backup');
      if (response.data.success) {
        showNotification('Backup created successfully', 'success');
        await loadBackups();
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      showNotification('Failed to create backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadBackups = async () => {
    try {
      const response = await http.get('/debug/config/backups');
      if (response.data.success) {
        setConfigBackups(response.data.data);
      }
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  };

  const restoreBackup = (backupFile) => {
    confirm({
      title: 'Restore Backup',
      message: `Restore configuration from ${backupFile}? This will overwrite current settings.`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          setLoading(true);
          const response = await http.post('/debug/config/restore', { backupFile });
          if (response.data.success) {
            showNotification('Configuration restored! Server restart required.', 'success');
            await loadConfiguration();
          }
        } catch (error) {
          console.error('Error restoring backup:', error);
          showNotification('Failed to restore backup', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // ==========================================
  // LOG VIEWER FUNCTIONS
  // ==========================================

  const loadLogFiles = async () => {
    try {
      const response = await http.get('/debug/logs');
      if (response.data.success) {
        setLogFiles(response.data.data.files);
        setLogStats(response.data.data.stats);
      }
    } catch (error) {
      console.error('Error loading log files:', error);
      showNotification('Failed to load log files', 'error');
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        lines: logLines,
        offset: logOffset,
        search: logSearch
      });
      
      const response = await http.get(`/debug/logs/${selectedLogType}?${params}`);
      if (response.data.success) {
        setLogs(response.data.data.logs);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      showNotification('Failed to load logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearLog = (logType) => {
    confirm({
      title: 'Clear Log',
      message: `Clear all entries in ${logType} log?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true);
          const response = await http.delete(`/debug/logs/${logType}`);
          if (response.data.success) {
            showNotification(`${logType} log cleared successfully`, 'success');
            await loadLogs();
            await loadLogFiles();
          }
        } catch (error) {
          console.error('Error clearing log:', error);
          showNotification('Failed to clear log', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  useEffect(() => {
    if (tabValue === 2) {
      loadLogs();
    }
  }, [selectedLogType, logLines, logOffset]);

  // ==========================================
  // RENDER FUNCTIONS
  // ==========================================

  const renderSystemInfo = () => (
    <Grid container spacing={3}>
      {/* Application Info */}
      <Grid item xs={12} md={6}>
        <Card sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <InfoIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Application</Typography>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2 }} />
            {systemInfo && (
              <>
                <Typography><strong>Name:</strong> {systemInfo.application.name}</Typography>
                <Typography><strong>Version:</strong> {systemInfo.application.version}</Typography>
                <Typography><strong>Environment:</strong> {systemInfo.node.env}</Typography>
                <Typography><strong>Node Version:</strong> {systemInfo.node.version}</Typography>
                <Typography><strong>Port:</strong> {systemInfo.application.port}</Typography>
                <Typography><strong>Host:</strong> {systemInfo.application.host}</Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Server Info */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <StorageIcon sx={{ mr: 1, color: '#6366f1' }} />
              <Typography variant="h6">Server</Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            {systemInfo && (
              <>
                <Typography><strong>Platform:</strong> {systemInfo.os.platform}</Typography>
                <Typography><strong>Architecture:</strong> {systemInfo.os.arch}</Typography>
                <Typography><strong>Hostname:</strong> {systemInfo.os.hostname}</Typography>
                <Typography><strong>OS Release:</strong> {systemInfo.os.release}</Typography>
                <Typography><strong>Uptime:</strong> {systemInfo.os.uptimeFormatted}</Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Memory Info */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Memory</Typography>
            <Divider sx={{ my: 2 }} />
            {systemInfo && (
              <>
                <Typography><strong>Total:</strong> {systemInfo.memory.totalFormatted}</Typography>
                <Typography><strong>Used:</strong> {systemInfo.memory.usedFormatted}</Typography>
                <Typography><strong>Free:</strong> {systemInfo.memory.freeFormatted}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography component="span"><strong>Usage:</strong></Typography>
                  <Chip
                    label={`${systemInfo.memory.usagePercent}%`}
                    color={parseFloat(systemInfo.memory.usagePercent) > 80 ? 'error' : 'success'}
                    size="small"
                  />
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* CPU Info */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>CPU</Typography>
            <Divider sx={{ my: 2 }} />
            {systemInfo && (
              <>
                <Typography><strong>Model:</strong> {systemInfo.cpu.model}</Typography>
                <Typography><strong>Cores:</strong> {systemInfo.cpu.cores}</Typography>
                <Typography><strong>Speed:</strong> {systemInfo.cpu.speed} MHz</Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Database Info */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <StorageIcon sx={{ mr: 1, color: '#6366f1' }} />
                <Typography variant="h6">Database</Typography>
              </Box>
              {databaseInfo?.connected && (
                <Chip icon={<CheckCircleIcon />} label="Connected" color="success" />
              )}
              <IconButton onClick={loadDatabaseInfo} size="small">
                <RefreshIcon />
              </IconButton>
            </Box>
            <Divider sx={{ my: 2 }} />
            {databaseInfo && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography><strong>Database:</strong> {databaseInfo.database}</Typography>
                  <Typography><strong>User:</strong> {databaseInfo.user}</Typography>
                  <Typography><strong>Host:</strong> {databaseInfo.config.host}</Typography>
                  <Typography><strong>Port:</strong> {databaseInfo.config.port}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography><strong>Size:</strong> {databaseInfo.sizeFormatted}</Typography>
                  <Typography><strong>Connections:</strong> {databaseInfo.connections}</Typography>
                  <Typography><strong>Version:</strong> {databaseInfo.version?.substring(0, 50)}...</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Table Statistics</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Table</TableCell>
                          <TableCell align="right">Rows</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {databaseInfo.tables?.slice(0, 10).map((table) => (
                          <TableRow key={table.tablename}>
                            <TableCell>{table.tablename}</TableCell>
                            <TableCell align="right">{table.row_count?.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Refresh Button */}
      <Grid item xs={12}>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={loadInitialData}
          fullWidth
          sx={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5558e3 0%, #7c4de8 100%)'
            }
          }}
        >
          Refresh All System Information
        </Button>
      </Grid>
    </Grid>
  );

  const renderConfiguration = () => (
    <Box>
      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={saveConfiguration}
          disabled={loading || Object.keys(editedConfig).length === 0}
          sx={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }
          }}
        >
          Save Changes
        </Button>
        <Button
          variant="outlined"
          startIcon={<BackupIcon />}
          onClick={createBackup}
          disabled={loading}
        >
          Create Backup
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadConfiguration}
          disabled={loading}
        >
          Reload
        </Button>
      </Box>

      {/* Configuration Sections */}
      {config?.sections.map((section, index) => (
        <Accordion key={index} defaultExpanded={index === 0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{section.name}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {section.variables.map((variable) => (
                <Grid item xs={12} md={6} key={variable.key}>
                  <TextField
                    fullWidth
                    label={variable.key}
                    value={editedConfig[variable.key] !== undefined ? editedConfig[variable.key] : variable.value}
                    onChange={(e) => handleConfigChange(variable.key, e.target.value)}
                    size="small"
                    multiline={variable.key.includes('SECRET') || variable.key.includes('PASSWORD')}
                    type={variable.key.includes('PASSWORD') && !editedConfig[variable.key] ? 'password' : 'text'}
                  />
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Backups Section */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Configuration Backups</Typography>
          <Divider sx={{ my: 2 }} />
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadBackups}
            sx={{ mb: 2 }}
          >
            Load Backups
          </Button>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>File Name</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {configBackups.map((backup) => (
                  <TableRow key={backup.fileName}>
                    <TableCell>{backup.fileName}</TableCell>
                    <TableCell>{backup.formattedSize}</TableCell>
                    <TableCell>{new Date(backup.created).toLocaleString()}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => restoreBackup(backup.fileName)}
                        color="primary"
                      >
                        <RestoreIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  const renderLogViewer = () => (
    <Box>
      {/* Log Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Log Type</InputLabel>
                <Select
                  value={selectedLogType}
                  label="Log Type"
                  onChange={(e) => setSelectedLogType(e.target.value)}
                >
                  <MenuItem value="combined">Combined</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="access">Access</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Lines</InputLabel>
                <Select
                  value={logLines}
                  label="Lines"
                  onChange={(e) => setLogLines(e.target.value)}
                >
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                  <MenuItem value={200}>200</MenuItem>
                  <MenuItem value={500}>500</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <IconButton size="small" onClick={loadLogs}>
                      <SearchIcon />
                    </IconButton>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={loadLogs}
                  fullWidth
                >
                  Refresh
                </Button>
                <Tooltip title="Clear log">
                  <IconButton
                    size="small"
                    onClick={() => clearLog(selectedLogType)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>

          {/* Log Stats */}
          {logStats && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Total Size: {logStats.totalSizeFormatted} | Total Lines: {logStats.totalLines.toLocaleString()}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Log Content */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper
              sx={{
                p: 2,
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                fontFamily: 'monospace',
                fontSize: '12px',
                maxHeight: '600px',
                overflow: 'auto'
              }}
            >
              {logs.length === 0 ? (
                <Typography color="text.secondary">No logs found</Typography>
              ) : (
                logs.map((log, index) => (
                  <Box
                    key={index}
                    sx={{
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      pb: 1,
                      mb: 1,
                      wordBreak: 'break-all'
                    }}
                  >
                    {log}
                  </Box>
                ))
              )}
            </Paper>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 600,
                  mb: 1
                }}
              >
                🔧 Admin Debug Panel
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Internal tool for system management, configuration, and monitoring
              </Typography>
            </Box>
            <EnvironmentSelector 
              selectedEnvironment={selectedEnvironment}
              onEnvironmentChange={handleEnvironmentChange}
            />
          </Box>
          
          {selectedEnvironment === 'PROD' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <strong>⚠️ PRODUCTION MODE:</strong> You are connected to the production environment. 
              All changes will affect live data!
            </Alert>
          )}
        </CardContent>
      </Card>

      {notification.open && (
        <Alert
          severity={notification.type}
          onClose={() => setNotification({ ...notification, open: false })}
          sx={{ mb: 3 }}
        >
          {notification.message}
        </Alert>
      )}

      <Card>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '16px',
              fontWeight: 500
            }
          }}
        >
          <Tab icon={<InfoIcon />} iconPosition="start" label="System Info" />
          <Tab icon={<SettingsIcon />} iconPosition="start" label="Configuration" />
          <Tab icon={<LogIcon />} iconPosition="start" label="Log Viewer" />
          <Tab icon={<DatabaseIcon />} iconPosition="start" label="Database Tools" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tabValue} index={0}>
            {renderSystemInfo()}
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            {renderConfiguration()}
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            {renderLogViewer()}
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <DatabaseToolsTab />
          </TabPanel>
        </Box>
      </Card>
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
};

export default AdminDebugPanel;
