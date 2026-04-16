import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Paper,
  IconButton,
  Switch,
  FormControlLabel,
  Alert,
  Tabs,
  Tab,
  Stack,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkIcon,
  Timeline as TimelineIcon,
  Refresh as RefreshIcon,
  Computer as ServerIcon,
  Devices as ClientIcon,
  Api as ApiIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import performanceService from '../../../services/performance.service';

/**
 * Performance Dashboard Component
 * Real-time monitoring for both client and server performance
 */
const PerformanceDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Server metrics (admin only)
  const [serverMetrics, setServerMetrics] = useState(null);
  const [apiMetrics, setApiMetrics] = useState(null);
  
  // Client metrics (all users)
  const [clientMetrics, setClientMetrics] = useState(null);
  const [healthMetrics, setHealthMetrics] = useState(null);
  
  const isAdmin = user?.role === 'admin';

  // Fetch server metrics (admin only)
  const fetchServerMetrics = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      const [serverRes, apiRes] = await Promise.all([
        performanceService.getServerMetrics(),
        performanceService.getAPIMetrics()
      ]);
      
      if (serverRes.success) setServerMetrics(serverRes.data);
      if (apiRes.success) setApiMetrics(apiRes.data);
    } catch (error) {
      console.error('Failed to fetch server metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Fetch client metrics (all users)
  const fetchClientMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const [clientRes, healthRes] = await Promise.all([
        Promise.resolve(performanceService.getClientMetrics()),
        performanceService.getHealthMetrics()
      ]);
      
      setClientMetrics(clientRes);
      if (healthRes.success) setHealthMetrics(healthRes.data);
    } catch (error) {
      console.error('Failed to fetch client metrics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (activeTab === 0) {
      fetchClientMetrics();
    } else if (activeTab === 1 && isAdmin) {
      fetchServerMetrics();
    }
  }, [activeTab, isAdmin, fetchClientMetrics, fetchServerMetrics]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (activeTab === 0) {
        fetchClientMetrics();
      } else if (activeTab === 1 && isAdmin) {
        fetchServerMetrics();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [activeTab, autoRefresh, isAdmin, fetchClientMetrics, fetchServerMetrics]);

  const getServerPerformanceScore = () => {
    if (!serverMetrics || !apiMetrics) return 0;
    
    let score = 100;
    
    // API error rate penalty
    const errorRate = parseFloat(apiMetrics.requests?.errorRate || 0);
    if (errorRate > 5) score -= 20;
    if (errorRate > 10) score -= 30;
    
    // Response time penalty
    const avgTime = apiMetrics.responseTime?.average || 0;
    if (avgTime > 500) score -= 15;
    if (avgTime > 1000) score -= 25;
    
    // Memory usage penalty
    const memPercent = serverMetrics.memory?.system?.usagePercent || 0;
    if (memPercent > 80) score -= 20;
    if (memPercent > 90) score -= 30;
    
    // CPU load penalty
    const cpuLoad = serverMetrics.cpu?.loadAverage?.['1min'] || 0;
    if (cpuLoad > 2) score -= 15;
    if (cpuLoad > 4) score -= 25;
    
    return Math.max(0, Math.min(100, score));
  };

  const getClientPerformanceScore = () => {
    if (!clientMetrics) return 0;
    return performanceService.calculatePerformanceScore(clientMetrics);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const MetricCard = ({ title, value, subtitle, color = 'primary', icon }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          {icon}
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
        </Stack>
        <Typography variant="h4" color={color} fontWeight="600">
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const ProgressCard = ({ title, value, total, unit, icon, color = 'primary' }) => {
    const percentage = total ? Math.round((value / total) * 100) : 0;
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            {icon}
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
          </Stack>
          <Box sx={{ mb: 1 }}>
            <Typography variant="h6" color={color}>
              {formatBytes(value)} / {formatBytes(total)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {percentage}% used
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={percentage} 
            color={percentage > 80 ? 'error' : percentage > 60 ? 'warning' : 'success'}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }} data-testid="performance-dashboard-page">
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="600">
          ⚡ Performance Dashboard
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                size="small"
                data-testid="perf-auto-refresh-toggle"
              />
            }
            label="Auto Refresh"
          />
          <IconButton 
            onClick={activeTab === 0 ? fetchClientMetrics : fetchServerMetrics}
            disabled={loading}
            data-testid="perf-refresh-btn"
          >
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>

      {/* Tab Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ px: 2 }}
        >
          <Tab 
            icon={<ClientIcon />} 
            label="Client Performance" 
            iconPosition="start"
            data-testid="perf-tab-client"
          />
          {isAdmin && (
            <Tab 
              icon={<ServerIcon />} 
              label="Server Performance" 
              iconPosition="start"
              data-testid="perf-tab-server"
            />
          )}
        </Tabs>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Client Performance Tab */}
      {activeTab === 0 && !loading && (
        <Box>
          <Typography variant="h5" fontWeight="600" sx={{ mb: 3 }}>
            Client Performance Metrics
          </Typography>
          
          {clientMetrics && (
            <Grid container spacing={3}>
              {/* Performance Score */}
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="Performance Score"
                  value={`${getClientPerformanceScore()}/100`}
                  color={getScoreColor(getClientPerformanceScore())}
                  icon={<SpeedIcon color="primary" />}
                  subtitle="Overall client performance"
                />
              </Grid>

              {/* Page Load Time */}
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="Page Load"
                  value={clientMetrics.performance?.navigation?.pageLoad ? `${Math.round(clientMetrics.performance.navigation.pageLoad)}ms` : 'N/A'}
                  color="info"
                  icon={<TimelineIcon color="info" />}
                  subtitle="Total page load time"
                />
              </Grid>

              {/* Memory Usage */}
              {clientMetrics.performance?.memory && (
                <Grid item xs={12} md={3}>
                  <ProgressCard
                    title="JS Memory"
                    value={clientMetrics.performance.memory.used * 1024 * 1024}
                    total={clientMetrics.performance.memory.limit * 1024 * 1024}
                    icon={<MemoryIcon color="primary" />}
                    color="primary"
                  />
                </Grid>
              )}

              {/* Connection Info */}
              {clientMetrics.performance?.connection && (
                <Grid item xs={12} md={3}>
                  <MetricCard
                    title="Connection"
                    value={clientMetrics.performance.connection.effectiveType || 'Unknown'}
                    color="success"
                    icon={<NetworkIcon color="success" />}
                    subtitle={`${clientMetrics.performance.connection.downlink || 0} Mbps`}
                  />
                </Grid>
              )}

              {/* Performance Details */}
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Performance Breakdown
                    </Typography>
                    {clientMetrics.performance?.navigation && (
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell>DNS Lookup</TableCell>
                            <TableCell align="right">{clientMetrics.performance.navigation.dnsLookup}ms</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>TCP Connection</TableCell>
                            <TableCell align="right">{clientMetrics.performance.navigation.tcpConnection}ms</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Server Response</TableCell>
                            <TableCell align="right">{clientMetrics.performance.navigation.serverResponse}ms</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>DOM Ready</TableCell>
                            <TableCell align="right">{clientMetrics.performance.navigation.domReady}ms</TableCell>
                          </TableRow>
                          {clientMetrics.performance.navigation.firstPaint && (
                            <TableRow>
                              <TableCell>First Contentful Paint</TableCell>
                              <TableCell align="right">{clientMetrics.performance.navigation.firstPaint.firstContentfulPaint}ms</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* System Info */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      System Information
                    </Typography>
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Platform</Typography>
                        <Typography variant="body2">{clientMetrics.client.platform}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Language</Typography>
                        <Typography variant="body2">{clientMetrics.client.language}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Screen Resolution</Typography>
                        <Typography variant="body2">
                          {clientMetrics.performance?.screen?.width}x{clientMetrics.performance?.screen?.height}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Viewport</Typography>
                        <Typography variant="body2">
                          {clientMetrics.performance?.screen?.viewport?.width}x{clientMetrics.performance?.screen?.viewport?.height}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Connection Status</Typography>
                        <Chip 
                          label={clientMetrics.client.onLine ? "Online" : "Offline"} 
                          color={clientMetrics.client.onLine ? "success" : "error"} 
                          size="small" 
                        />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* Server Performance Tab (Admin Only) */}
      {activeTab === 1 && isAdmin && !loading && (
        <Box>
          <Typography variant="h5" fontWeight="600" sx={{ mb: 3 }}>
            Server Performance Metrics
          </Typography>
          
          {serverMetrics && apiMetrics && (
            <Grid container spacing={3}>
              {/* Server Performance Score */}
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="Server Score"
                  value={`${getServerPerformanceScore()}/100`}
                  color={getScoreColor(getServerPerformanceScore())}
                  icon={<ServerIcon color="primary" />}
                  subtitle="Overall server health"
                />
              </Grid>

              {/* CPU Load */}
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="CPU Load (1m)"
                  value={(serverMetrics.cpu?.loadAverage?.['1min'] || 0).toFixed(2)}
                  color={(serverMetrics.cpu?.loadAverage?.['1min'] || 0) > 2 ? 'error' : 'success'}
                  icon={<SpeedIcon color="primary" />}
                  subtitle={`${serverMetrics.cpu?.count || 0} cores`}
                />
              </Grid>

              {/* Memory Usage */}
              <Grid item xs={12} md={3}>
                <ProgressCard
                  title="System Memory"
                  value={(serverMetrics.memory?.system?.used || 0) * 1024 * 1024}
                  total={(serverMetrics.memory?.system?.total || 1) * 1024 * 1024}
                  icon={<MemoryIcon color="primary" />}
                />
              </Grid>

              {/* API Response Time */}
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="API Response"
                  value={`${apiMetrics.responseTime?.average || 0}ms`}
                  color={(apiMetrics.responseTime?.average || 0) > 500 ? 'error' : 'success'}
                  icon={<ApiIcon color="primary" />}
                  subtitle={`P95: ${apiMetrics.responseTime?.p95 || 0}ms`}
                />
              </Grid>

              {/* Server Details */}
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Server Information
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Hostname</TableCell>
                          <TableCell align="right">{serverMetrics.server?.hostname || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Platform</TableCell>
                          <TableCell align="right">{serverMetrics.server?.platform || 'N/A'} ({serverMetrics.server?.arch || 'N/A'})</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Node.js Version</TableCell>
                          <TableCell align="right">{serverMetrics.server?.nodeVersion || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Uptime</TableCell>
                          <TableCell align="right">{formatUptime(serverMetrics.server?.uptime || 0)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Environment</TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={serverMetrics.server?.environment || 'unknown'} 
                              color={serverMetrics.server?.environment === 'production' ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>

              {/* API Performance */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      API Performance
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Total Requests</Typography>
                        <Typography variant="h6">{(apiMetrics.requests?.total || 0).toLocaleString()}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Success Rate</Typography>
                        <Typography variant="h6" color="success.main">
                          {apiMetrics.requests?.total > 0
                            ? ((apiMetrics.requests.successful / apiMetrics.requests.total) * 100).toFixed(1)
                            : '0.0'}%
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Cache Hit Rate</Typography>
                        <Typography variant="h6" color="info.main">{apiMetrics.cache?.hitRate || 'N/A'}</Typography>
                      </Box>
                      <Divider />
                      <Typography variant="subtitle2" color="text.secondary">Top Endpoints</Typography>
                      {(apiMetrics.endpoints || []).slice(0, 3).map((endpoint, idx) => (
                        <Box key={endpoint.path || idx} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption">{endpoint.path}</Typography>
                          <Typography variant="caption">{endpoint.avgTime}ms</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* Health Status for All Users */}
      {healthMetrics && (
        <Alert 
          severity={healthMetrics.server.status === 'healthy' ? 'success' : 'warning'} 
          sx={{ mb: 3 }}
        >
          Server Status: {healthMetrics.server.status.toUpperCase()} | 
          Database: {healthMetrics.database.status} | 
          Uptime: {formatUptime(healthMetrics.server.uptime)}
        </Alert>
      )}
    </Container>
  );
};

export default PerformanceDashboard;
