import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, CardHeader, Chip, CircularProgress, Divider, Grid, IconButton, List, ListItem, ListItemText, Stack, Tooltip, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';
import http from '../../../http-common';
import { useAuth } from '../../../contexts/AuthContext';

const InfoRow = ({ label, value }) => (
  <Stack direction="row" spacing={1} justifyContent="space-between" sx={{ py: 0.5 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 500 }}>{String(value ?? '-')}</Typography>
  </Stack>
);

export default function AdminConfigPage() {
  const { isAdmin } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [diag, setDiag] = useState({ running: false, results: [] });

  const apiBase = useMemo(() => process.env.REACT_APP_API_URL || '/api', []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await http.get('/admin/config');
      setConfig(res.data.data || {});
    } catch (e) {
      console.error('Failed to load config', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSeeding = async (enabled) => {
    try {
      await http.post('/admin/config/toggle-seeding', { enabled });
      await loadConfig();
    } catch (e) {
      console.error('Toggle seeding failed', e);
    }
  };

  const seedNow = async () => {
    try {
      await http.post('/admin/config/seed-now');
    } catch (e) {
      console.error('Seed now failed', e);
    }
  };

  const purgeDemo = async () => {
    try {
      await http.post('/admin/config/purge-demo');
    } catch (e) {
      console.error('Purge demo failed', e);
    }
  };

  const runDiagnostics = async () => {
    const steps = [];
    const push = (name, status, details) => steps.push({ name, status, details });
    setDiag({ running: true, results: [] });
    try {
      // 1) Health
      try {
        const h = await http.get('/health');
        push('API Health', 'ok', h.data);
      } catch (e) {
        push('API Health', 'fail', e?.response?.data || e.message);
      }

      // 2) Auth preflight (no creds) - should return 401/403 but not CORS/network error
      try {
        await http.get('/admin/config');
        push('Auth Protection', 'warn', 'Endpoint accessible unexpectedly (should be protected)');
      } catch (e) {
        const code = e?.response?.status;
        if (code === 401 || code === 403) {
          push('Auth Protection', 'ok', `Protected as expected (${code})`);
        } else {
          push('Auth Protection', 'fail', e?.message || 'Unexpected error');
        }
      }

      // 3) CORS origin echo (heuristic): try a simple OPTIONS request via fetch
      try {
        const resp = await fetch(`${apiBase}/health`, { method: 'OPTIONS' });
        push('CORS Preflight', resp.ok ? 'ok' : 'warn', `status=${resp.status}`);
      } catch (e) {
        push('CORS Preflight', 'fail', e.message);
      }

      // 4) Base URL reachability
      try {
        const resp = await fetch(apiBase);
        push('Base URL Reachability', resp.ok ? 'ok' : 'warn', `status=${resp.status}`);
      } catch (e) {
        push('Base URL Reachability', 'fail', e.message);
      }
    } finally {
      setDiag({ running: false, results: steps });
    }
  };

  if (!isAdmin()) {
    return (
      <Box p={3}>
        <Typography variant="h6">Access denied</Typography>
        <Typography variant="body2" color="text.secondary">Admin role required.</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Admin Configuration & Diagnostics</Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Reload">
            <IconButton onClick={loadConfig}><RefreshIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Run diagnostics">
            <Button onClick={runDiagnostics} variant="outlined" startIcon={<SecurityIcon />}>Diagnostics</Button>
          </Tooltip>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Current Configuration" action={loading && <CircularProgress size={20} />} />
            <Divider />
            <CardContent>
              {config ? (
                <>
                  <InfoRow label="Environment" value={config.nodeEnv} />
                  <InfoRow label="API Base URL" value={config.apiBaseUrl} />
                  <InfoRow label="Domain" value={config.domain} />
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" gutterBottom>Database</Typography>
                  <InfoRow label="Host" value={config.db?.host} />
                  <InfoRow label="Port" value={config.db?.port} />
                  <InfoRow label="Name" value={config.db?.name} />
                  <InfoRow label="User" value={config.db?.user} />
                  <InfoRow label="SSL" value={config.db?.ssl ? 'Enabled' : 'Disabled'} />
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" gutterBottom>Security & Limits</Typography>
                  <InfoRow label="CORS Allow All" value={config.corsAllowAll ? 'Yes' : 'No'} />
                  <InfoRow label="Rate Limit" value={config.rateLimit?.enabled ? 'Enabled' : 'Disabled'} />
                  {config.rateLimit?.enabled && (
                    <>
                      <InfoRow label="Window (ms)" value={config.rateLimit.windowMs} />
                      <InfoRow label="Max Requests" value={config.rateLimit.max} />
                      <InfoRow label="Login Limit" value={config.rateLimit.authEnabled ? `${config.rateLimit.authMax}/${config.rateLimit.authWindowMs}ms` : 'Disabled'} />
                    </>
                  )}
                  <Divider sx={{ my: 1 }} />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2">Demo Seeding</Typography>
                    <Chip size="small" label={config.seedDemoData ? 'ENABLED' : 'DISABLED'} color={config.seedDemoData ? 'success' : 'default'} />
                    <Button size="small" variant="outlined" onClick={() => toggleSeeding(!config.seedDemoData)}>
                      {config.seedDemoData ? 'Disable' : 'Enable'}
                    </Button>
                  </Stack>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">No data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Admin Actions" />
            <Divider />
            <CardContent>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" color="primary" startIcon={<PlayCircleFilledWhiteIcon />} onClick={seedNow}>Seed Now</Button>
                <Button variant="outlined" color="error" startIcon={<DeleteSweepIcon />} onClick={purgeDemo}>Purge Demo</Button>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Connectivity & CORS Diagnostics</Typography>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <Chip size="small" label={`REACT_APP_API_URL: ${apiBase}`} />
              </Stack>
              <Button onClick={runDiagnostics} startIcon={<SecurityIcon />} size="small" variant="outlined">Run Diagnostics</Button>
              <List dense>
                {diag.results.map((r, idx) => (
                  <ListItem key={idx}>
                    <ListItemText
                      primary={<Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ minWidth: 180 }}>{r.name}</Typography>
                        <Chip size="small" color={r.status === 'ok' ? 'success' : r.status === 'warn' ? 'warning' : 'error'} label={r.status.toUpperCase()} />
                      </Stack>}
                      secondary={<Typography variant="caption" sx={{ wordBreak: 'break-all' }}>{typeof r.details === 'string' ? r.details : JSON.stringify(r.details)}</Typography>}
                    />
                  </ListItem>
                ))}
                {diag.running && (
                  <ListItem>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    <Typography variant="caption">Running diagnostics...</Typography>
                  </ListItem>
                )}
              </List>
              <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                <ReportGmailerrorredIcon fontSize="small" color="warning" />
                <Typography variant="caption">If CORS fails, ensure backend CORS allow-list includes this origin and consider same-origin deployment via Nginx.</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
