/**
 * IDCardCustomizer.js
 * Admin panel to customize the employee ID card appearance.
 * Settings are saved to localStorage so all users pick them up immediately.
 * (Can be extended to save via API/system_configs table later.)
 */
import React, { useState, useEffect } from 'react';
import api from '../../../services/api.service';
import {
  Box, Card, CardContent, CardHeader, Divider, Grid,
  TextField, Switch, Button, Typography,
  Alert, Chip, Tooltip, IconButton, Collapse,
} from '@mui/material';
import {
  Save as SaveIcon,
  RestartAlt as ResetIcon,
  Visibility as PreviewIcon,
  Badge as BadgeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { PreviewCard } from '../employees/components/IDCardModal';


const DEFAULT_SETTINGS = {
  primaryColor:   '#1A4B8C',
  accentColor:    '#0099D4',
  tagline:        'GROW TOGETHER',
  websiteUrl:     'WWW.SKYRAKSYS.COM',
  showQrCode:     true,
  showDepartment: true,
  showDesignation:true,
  showWebsite:    true,
};

// Demo employee for the live preview
const DEMO_EMPLOYEE = {
  firstName: 'Terrence',
  lastName: 'Vishal',
  employeeId: 'SK022',
  department: { name: 'Technology' },
  position: { title: 'Software Engineer' },
  photoUrl: null,
};

const ColorInput = ({ label, value, onChange }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <Box
      sx={{
        width: 36, height: 36, borderRadius: 1,
        bgcolor: value, border: '2px solid rgba(0,0,0,0.12)',
        flexShrink: 0, cursor: 'pointer',
        '&:hover': { transform: 'scale(1.08)', transition: 'transform 0.15s' }
      }}
    />
    <TextField
      label={label}
      value={value}
      onChange={e => onChange(e.target.value)}
      size="small"
      fullWidth
      inputProps={{ maxLength: 7 }}
      helperText="Hex color e.g. #0099D4"
    />
    <input
      type="color"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: 36, height: 36, border: 'none', cursor: 'pointer', borderRadius: 4, padding: 0 }}
      title={`Pick ${label}`}
    />
  </Box>
);

const IDCardCustomizer = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewOpen, setPreviewOpen] = useState(true);

  // Load from backend on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings/idcard-template');
        if (res.data) {
          setSettings(res.data);
        }
      } catch (err) {
        console.error('Failed to load ID card settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);


  // Unified change handler used in JSX — delegates by value type
  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await api.put('/settings/idcard-template', settings);
      setSuccessMsg('Settings saved successfully to the database.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to save ID card settings:', err);
      setErrorMsg('Failed to save settings. Make sure you have Admin/HR privileges.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset to default Skyraksys branding?')) {
      setSettings(DEFAULT_SETTINGS);
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <BadgeIcon sx={{ color: '#0099D4', fontSize: 28 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>ID Card Customizer</Typography>
          <Typography variant="body2" color="text.secondary">
            Customize the appearance of employee ID cards across the system
          </Typography>
        </Box>
        <Chip
          label="Live Preview Active"
          size="small"
          color="info"
          sx={{ ml: 'auto', fontWeight: 600 }}
          icon={<PreviewIcon />}
        />
      </Box>

      {successMsg && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 4, borderRadius: 2 }}>
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>
          {errorMsg}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* ── Settings Panel ─────────────────────────────── */}
        <Grid item xs={12} md={6}>
          {/* Colors */}
          <Card sx={{ mb: 2 }}>
            <CardHeader
              title="Brand Colors"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
              subheader="Controls the card background gradient and accents"
            />
            <Divider />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <ColorInput
                label="Primary Color (Left panel / Footer)"
                value={settings.primaryColor}
                onChange={v => handleChange('primaryColor', v)}
              />
              <ColorInput
                label="Accent Color (Gradient end / QR color)"
                value={settings.accentColor}
                onChange={v => handleChange('accentColor', v)}
              />
            </CardContent>
          </Card>

          {/* Text */}
          <Card sx={{ mb: 2 }}>
            <CardHeader
              title="Card Text"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
            />
            <Divider />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Tagline (Footer)"
                value={settings.tagline}
                onChange={e => handleChange('tagline', e.target.value)}
                fullWidth
                size="small"
                placeholder="e.g. GROW TOGETHER"
                inputProps={{ maxLength: 40 }}
              />
              <TextField
                label="Website URL (Side text)"
                value={settings.websiteUrl}
                onChange={e => handleChange('websiteUrl', e.target.value)}
                fullWidth
                size="small"
                placeholder="e.g. WWW.SKYRAKSYS.COM"
                inputProps={{ maxLength: 60 }}
              />
            </CardContent>
          </Card>

          {/* Toggles */}
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title="Display Options"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
              subheader="Choose what information appears on the card"
            />
            <Divider />
            <CardContent>
              {[
                { key: 'showQrCode',      label: 'Show QR Code',       desc: 'Links to employee profile' },
                { key: 'showDesignation', label: 'Show Designation',   desc: 'Job title / position' },
                { key: 'showDepartment',  label: 'Show Department',    desc: 'Department name' },
                { key: 'showWebsite',     label: 'Show Website URL',   desc: 'Vertical side text' },
              ].map(({ key, label, desc }) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{label}</Typography>
                    <Typography variant="caption" color="text.secondary">{desc}</Typography>
                  </Box>
                  <Switch
                    checked={settings[key]}
                    onChange={e => handleChange(key, e.target.checked)}
                    color="primary"
                  />
                </Box>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              sx={{
                flex: 1,
                background: 'linear-gradient(135deg, #1A4B8C, #0099D4)',
                fontWeight: 700,
                py: 1.2,
                '&:hover': { background: 'linear-gradient(135deg, #0D3361, #006FA3)' },
              }}
            >
              Save Settings
            </Button>
            <Tooltip title="Reset to SKYRAKSYS defaults">
              <Button
                variant="outlined"
                startIcon={<ResetIcon />}
                onClick={handleReset}
                color="error"
                sx={{ fontWeight: 600 }}
              >
                Reset
              </Button>
            </Tooltip>
          </Box>
        </Grid>

        {/* ── Live Preview ───────────────────────────────── */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Live Preview"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
              subheader="Updates instantly as you change settings"
              action={
                <IconButton size="small" onClick={() => setPreviewOpen(p => !p)}>
                  {previewOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              }
            />
            <Divider />
            <Collapse in={previewOpen}>
              <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4, bgcolor: '#e8f4fb' }}>
                <PreviewCard employee={DEMO_EMPLOYEE} cfg={settings} />
              </CardContent>
            </Collapse>
          </Card>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight={600}>How it works</Typography>
            <Typography variant="caption">
              Changes saved here apply to all employee ID cards system-wide. 
              Employees and admins can view &amp; print cards from any Employee Profile page using the <strong>"ID Card"</strong> button.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default IDCardCustomizer;
