import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  Paper,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  PlayArrow as ExecuteIcon,
  Refresh as RefreshIcon,
  Storage as TableIcon,
  Search as SearchIcon,
  Save as SaveIcon,
  Delete as ClearIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  CloudDownload as BackupIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import http from '../../../../http-common';
import ConfirmDialog from '../../../common/ConfirmDialog';
import useConfirmDialog from '../../../../hooks/useConfirmDialog';

function SubTabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ padding: '16px 0' }}>
      {value === index && children}
    </div>
  );
}

const DatabaseToolsTab = () => {
  const [subTabValue, setSubTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', type: 'success' });

  // SQL Console State
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM "Employees" LIMIT 10;');
  const [queryResults, setQueryResults] = useState(null);
  const [readOnlyMode, setReadOnlyMode] = useState(true);
  const [queryHistory, setQueryHistory] = useState([]);

  // Table Browser State
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [tableSchema, setTableSchema] = useState(null);
  const [tablePage, setTablePage] = useState(0);
  const [tableRowsPerPage, setTableRowsPerPage] = useState(50);

  // Database Stats State
  const [dbStats, setDbStats] = useState(null);
  const [connections, setConnections] = useState([]);

  // Dialog State
  const [schemaDialog, setSchemaDialog] = useState({ open: false, table: null });
  const { dialogProps, confirm } = useConfirmDialog();

  useEffect(() => {
    loadTables();
    loadDatabaseStats();
    loadConnections();
    loadQueryHistory();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ open: true, message, type });
    setTimeout(() => setNotification({ open: false, message: '', type: 'success' }), 5000);
  };

  const loadTables = async () => {
    try {
      const response = await http.get('/debug/database/tables');
      if (response.data.success) {
        setTables(response.data.data);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      showNotification('Failed to load tables', 'error');
    }
  };

  const loadDatabaseStats = async () => {
    try {
      const response = await http.get('/debug/database/stats');
      if (response.data.success) {
        setDbStats(response.data.data);
      }
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  };

  const loadConnections = async () => {
    try {
      const response = await http.get('/debug/database/connections');
      if (response.data.success) {
        setConnections(response.data.data);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const loadQueryHistory = () => {
    const history = JSON.parse(localStorage.getItem('sqlQueryHistory') || '[]');
    setQueryHistory(history);
  };

  const saveQueryToHistory = (query) => {
    const history = JSON.parse(localStorage.getItem('sqlQueryHistory') || '[]');
    const newHistory = [
      { query, timestamp: new Date().toISOString() },
      ...history.slice(0, 19) // Keep last 20 queries
    ];
    localStorage.setItem('sqlQueryHistory', JSON.stringify(newHistory));
    setQueryHistory(newHistory);
  };

  const executeQuery = async () => {
    if (!sqlQuery.trim()) {
      showNotification('Please enter a SQL query', 'warning');
      return;
    }

    try {
      setLoading(true);
      const response = await http.post('/debug/database/execute', {
        query: sqlQuery,
        readOnly: readOnlyMode,
        maxRows: 1000
      });

      if (response.data.success) {
        setQueryResults(response.data);
        showNotification(`Query executed successfully (${response.data.rowCount} rows)`, 'success');
        saveQueryToHistory(sqlQuery);
      } else {
        showNotification(response.data.error || 'Query failed', 'error');
        setQueryResults({ success: false, error: response.data.error, results: [] });
      }
    } catch (error) {
      console.error('Error executing query:', error);
      showNotification(error.response?.data?.message || 'Failed to execute query', 'error');
      setQueryResults({ success: false, error: error.message, results: [] });
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (tableName) => {
    try {
      setLoading(true);
      setSelectedTable(tableName);

      // Load table schema
      const schemaResponse = await http.get(`/debug/database/schema/${tableName}`);
      if (schemaResponse.data.success) {
        setTableSchema(schemaResponse.data.data);
      }

      // Load table data
      const dataResponse = await http.get(`/debug/database/table-data/${tableName}`, {
        params: {
          limit: tableRowsPerPage,
          offset: tablePage * tableRowsPerPage
        }
      });

      if (dataResponse.data.success) {
        setTableData(dataResponse.data.data);
      }
    } catch (error) {
      console.error('Error loading table data:', error);
      showNotification('Failed to load table data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const backupTable = (tableName) => {
    confirm({
      title: 'Create Backup',
      message: `Create a backup of table "${tableName}"?`,
      variant: 'info',
      onConfirm: async () => {
        try {
          setLoading(true);
          const response = await http.post(`/debug/database/backup/${tableName}`);
          if (response.data.success) {
            showNotification(response.data.message, 'success');
            await loadTables();
          }
        } catch (error) {
          console.error('Error backing up table:', error);
          showNotification('Failed to backup table', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const renderSQLConsole = () => (
    <Box>
      <Grid container spacing={2}>
        {/* Query Input */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">SQL Query Editor</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={readOnlyMode}
                      onChange={(e) => setReadOnlyMode(e.target.checked)}
                      color="warning"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {readOnlyMode ? '🔒 Read-Only' : '⚠️ Write Enabled'}
                    </Box>
                  }
                />
              </Box>

              {!readOnlyMode && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <strong>Warning:</strong> Write mode is enabled. INSERT, UPDATE, DELETE operations are allowed.
                  Use with caution!
                </Alert>
              )}

              <TextField
                fullWidth
                multiline
                rows={8}
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="Enter your SQL query here..."
                sx={{
                  fontFamily: 'monospace',
                  '& textarea': {
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: '14px'
                  }
                }}
              />

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<ExecuteIcon />}
                  onClick={executeQuery}
                  disabled={loading}
                  sx={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }
                  }}
                >
                  Execute Query
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={() => setSqlQuery('')}
                >
                  Clear
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={() => {
                    saveQueryToHistory(sqlQuery);
                    showNotification('Query saved to history', 'success');
                  }}
                >
                  Save to History
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Query Results */}
        {queryResults && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    {queryResults.success ? 'Query Results' : 'Query Error'}
                  </Typography>
                  {queryResults.success && (
                    <Chip
                      label={`${queryResults.rowCount} rows • ${queryResults.executionTime}ms`}
                      color="success"
                      size="small"
                    />
                  )}
                </Box>

                {queryResults.success ? (
                  <>
                    {queryResults.truncated && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Results limited to {queryResults.maxRows} rows
                      </Alert>
                    )}
                    <TableContainer sx={{ maxHeight: 500 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            {queryResults.results[0] && Object.keys(queryResults.results[0]).map((key) => (
                              <TableCell key={key} sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>
                                {key}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {queryResults.results.map((row, index) => (
                            <TableRow key={index} hover>
                              {Object.values(row).map((value, i) => (
                                <TableCell key={i}>
                                  {value === null ? (
                                    <em style={{ color: '#9ca3af' }}>NULL</em>
                                  ) : typeof value === 'object' ? (
                                    JSON.stringify(value)
                                  ) : (
                                    String(value)
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                ) : (
                  <Alert severity="error">
                    <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                      {queryResults.error}
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Query History */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Query History ({queryHistory.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {queryHistory.length === 0 ? (
                <Typography color="text.secondary">No query history</Typography>
              ) : (
                <Box>
                  {queryHistory.map((item, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 1,
                        mb: 1,
                        border: '1px solid #e2e8f0',
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#f8fafc' }
                      }}
                      onClick={() => setSqlQuery(item.query)}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {new Date(item.timestamp).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        {item.query}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );

  const renderTableBrowser = () => (
    <Grid container spacing={2}>
      {/* Tables List */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Tables ({tables.length})</Typography>
              <IconButton size="small" onClick={loadTables}>
                <RefreshIcon />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
              {tables.map((table) => (
                <Paper
                  key={table.table_name}
                  sx={{
                    p: 2,
                    mb: 1,
                    cursor: 'pointer',
                    border: selectedTable === table.table_name ? '2px solid #6366f1' : '1px solid #e2e8f0',
                    '&:hover': { backgroundColor: '#f8fafc' }
                  }}
                  onClick={() => loadTableData(table.table_name)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TableIcon fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight={500}>
                        {table.table_name}
                      </Typography>
                    </Box>
                    <Tooltip title="Backup Table">
                      <IconButton size="small" onClick={(e) => {
                        e.stopPropagation();
                        backupTable(table.table_name);
                      }}>
                        <BackupIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {table.size} • {table.column_count} columns
                  </Typography>
                </Paper>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Table Data */}
      <Grid item xs={12} md={8}>
        {selectedTable ? (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{selectedTable}</Typography>
                <Box>
                  <Button
                    size="small"
                    startIcon={<InfoIcon />}
                    onClick={() => setSchemaDialog({ open: true, table: selectedTable })}
                  >
                    Schema
                  </Button>
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : tableData ? (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Showing {tableData.data.length} of {tableData.total} rows
                  </Typography>
                  <TableContainer sx={{ maxHeight: 500 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          {tableData.data[0] && Object.keys(tableData.data[0]).map((key) => (
                            <TableCell key={key} sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>
                              {key}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tableData.data.map((row, index) => (
                          <TableRow key={index} hover>
                            {Object.values(row).map((value, i) => (
                              <TableCell key={i}>
                                {value === null ? (
                                  <em style={{ color: '#9ca3af' }}>NULL</em>
                                ) : typeof value === 'object' ? (
                                  JSON.stringify(value)
                                ) : (
                                  String(value).substring(0, 100)
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <TableIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Select a table to view data
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>
  );

  const renderDatabaseStats = () => (
    <Grid container spacing={2}>
      {/* Database Overview */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Database Overview</Typography>
            <Divider sx={{ my: 2 }} />
            {dbStats ? (
              <>
                <Typography><strong>Size:</strong> {dbStats.databaseSize}</Typography>
                <Typography><strong>Tables:</strong> {dbStats.tableCount}</Typography>
                <Typography><strong>Total Rows:</strong> {dbStats.totalRows.toLocaleString()}</Typography>
              </>
            ) : (
              <CircularProgress size={24} />
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Largest Tables */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Largest Tables</Typography>
            <Divider sx={{ my: 2 }} />
            {dbStats ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Table</TableCell>
                      <TableCell>Size</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dbStats.largestTables.map((table) => (
                      <TableRow key={table.table_name}>
                        <TableCell>{table.table_name}</TableCell>
                        <TableCell>{table.size}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <CircularProgress size={24} />
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Active Connections */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Active Connections ({connections.length})</Typography>
              <IconButton size="small" onClick={loadConnections}>
                <RefreshIcon />
              </IconButton>
            </Box>
            <Divider sx={{ my: 2 }} />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>PID</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Application</TableCell>
                    <TableCell>State</TableCell>
                    <TableCell>Query</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {connections.map((conn) => (
                    <TableRow key={conn.pid}>
                      <TableCell>{conn.pid}</TableCell>
                      <TableCell>{conn.usename}</TableCell>
                      <TableCell>{conn.application_name}</TableCell>
                      <TableCell>
                        <Chip label={conn.state} size="small" color={conn.state === 'active' ? 'success' : 'default'} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conn.query || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box>
      {notification.open && (
        <Alert severity={notification.type} onClose={() => setNotification({ ...notification, open: false })} sx={{ mb: 3 }}>
          {notification.message}
        </Alert>
      )}

      <Tabs
        value={subTabValue}
        onChange={(e, newValue) => setSubTabValue(newValue)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        <Tab label="SQL Console" />
        <Tab label="Table Browser" />
        <Tab label="Database Stats" />
      </Tabs>

      <SubTabPanel value={subTabValue} index={0}>
        {renderSQLConsole()}
      </SubTabPanel>
      <SubTabPanel value={subTabValue} index={1}>
        {renderTableBrowser()}
      </SubTabPanel>
      <SubTabPanel value={subTabValue} index={2}>
        {renderDatabaseStats()}
      </SubTabPanel>

      {/* Schema Dialog */}
      <Dialog
        open={schemaDialog.open}
        onClose={() => setSchemaDialog({ open: false, table: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Table Schema: {schemaDialog.table}
        </DialogTitle>
        <DialogContent>
          {tableSchema && (
            <Box>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Columns</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Column</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Nullable</TableCell>
                      <TableCell>Default</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableSchema.columns.map((col) => (
                      <TableRow key={col.column_name}>
                        <TableCell>
                          {col.column_name}
                          {tableSchema.primaryKeys.includes(col.column_name) && (
                            <Chip label="PK" size="small" color="primary" sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                        <TableCell>{col.data_type}</TableCell>
                        <TableCell>{col.is_nullable}</TableCell>
                        <TableCell>{col.column_default || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {tableSchema.foreignKeys.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Foreign Keys</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Column</TableCell>
                          <TableCell>References</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tableSchema.foreignKeys.map((fk, index) => (
                          <TableRow key={index}>
                            <TableCell>{fk.column_name}</TableCell>
                            <TableCell>{fk.foreign_table_name}.{fk.foreign_column_name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {tableSchema.indexes.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Indexes</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Index Name</TableCell>
                          <TableCell>Column</TableCell>
                          <TableCell>Type</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tableSchema.indexes.map((idx, index) => (
                          <TableRow key={index}>
                            <TableCell>{idx.index_name}</TableCell>
                            <TableCell>{idx.column_name}</TableCell>
                            <TableCell>
                              {idx.is_primary && <Chip label="Primary" size="small" color="primary" />}
                              {idx.is_unique && !idx.is_primary && <Chip label="Unique" size="small" color="secondary" />}
                              {!idx.is_primary && !idx.is_unique && <Chip label="Index" size="small" />}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSchemaDialog({ open: false, table: null })}>Close</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
};

export default DatabaseToolsTab;
