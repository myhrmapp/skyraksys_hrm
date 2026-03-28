import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Collapse,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  PlayCircleFilled as PlayIcon,
  ExpandMore,
  ExpandLess,
  PersonAdd,
  EventBusy,
  AccessTime,
  Schedule,
  Payment,
  Assignment,
  RateReview,
  Business,
  ManageAccounts,
  Security,
  Explore,
  Assessment,
  Hub,
  People,
  Help,
  ArrowBack,
  AdminPanelSettings,
  SupervisorAccount,
  Person,
  FilterList,
} from '@mui/icons-material';

const ICON_MAP = {
  PersonAdd, EventBusy, AccessTime, Schedule, Payment,
  Assignment, RateReview, Business, ManageAccounts,
  Security, Explore, Assessment, Hub, People, Help,
};

const ROLE_ICONS = {
  admin: <AdminPanelSettings fontSize="small" />,
  hr: <SupervisorAccount fontSize="small" />,
  manager: <SupervisorAccount fontSize="small" />,
  employee: <Person fontSize="small" />,
};

const ROLE_COLORS = {
  admin: 'error',
  hr: 'secondary',
  manager: 'warning',
  employee: 'info',
};

/**
 * UserGuide — In-app help page driven by guide-manifest.json
 *
 * Shows all recorded workflow guides grouped by module.
 * Each guide has: title, role, step-by-step instructions, and optional video.
 *
 * Placed at /user-guide route and also accessible from the Help & Support menu.
 */
export default function UserGuide() {
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedModule, setExpandedModule] = useState(null);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    fetch('/guides/guide-manifest.json')
      .then(res => {
        if (!res.ok) throw new Error('Guide manifest not found. Run: node e2e-excel/utils/generate-guide-manifest.js');
        return res.json();
      })
      .then(data => { setManifest(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const filteredModules = useMemo(() => {
    if (!manifest) return [];
    const q = search.toLowerCase();

    return manifest.modules
      .map(m => ({
        ...m,
        guides: m.guides.filter(g => {
          // Role filter
          if (roleFilter !== 'all' && g.role !== roleFilter) return false;
          // Tab filter (video only)
          if (tabIndex === 1 && !g.videoUrl) return false;
          // Search filter
          if (q) {
            return (
              g.title.toLowerCase().includes(q) ||
              g.testId.toLowerCase().includes(q) ||
              (g.action || '').toLowerCase().includes(q) ||
              (g.tags || []).some(t => t.toLowerCase().includes(q)) ||
              (g.roleDisplay || '').toLowerCase().includes(q) ||
              (g.module || '').toLowerCase().includes(q)
            );
          }
          return true;
        }),
      }))
      .filter(m => m.guides.length > 0);
  }, [manifest, search, tabIndex, roleFilter]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">User Guide Not Yet Generated</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            To generate the user guide with video walkthroughs:
          </Typography>
          <Box component="ol" sx={{ mt: 1, pl: 2, '& li': { mb: 0.5 } }}>
            <li><code>cd frontend</code></li>
            <li><code>node e2e-excel/utils/generate-guide-manifest.js</code></li>
            <li><code>npx playwright test -c playwright-guide.config.js business-workflows</code></li>
          </Box>
        </Alert>
      </Box>
    );
  }

  // Detail view for a selected guide
  if (selectedGuide) {
    return <GuideDetail guide={selectedGuide} onBack={() => setSelectedGuide(null)} />;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          User Guide
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Step-by-step walkthroughs for every feature in SkyrakSys HRM.
          {manifest.totalWithVideo > 0 && ` ${manifest.totalWithVideo} guides include video recordings.`}
        </Typography>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip label={`${manifest.totalGuides} Guides`} color="primary" />
        <Chip label={`${manifest.modules.length} Modules`} variant="outlined" />
        {manifest.totalWithVideo > 0 && (
          <Chip icon={<PlayIcon />} label={`${manifest.totalWithVideo} Videos`} color="success" />
        )}
      </Box>

      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search guides by name, module, role, or tag..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Filters row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
        >
          <Tab label="All Guides" />
          <Tab label="With Video" disabled={manifest.totalWithVideo === 0} />
        </Tabs>

        <Divider orientation="vertical" flexItem />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList fontSize="small" color="action" />
          <ToggleButtonGroup
            value={roleFilter}
            exclusive
            onChange={(_, v) => v && setRoleFilter(v)}
            size="small"
          >
            <ToggleButton value="all">All Roles</ToggleButton>
            <ToggleButton value="admin">
              <Tooltip title="Administrator"><AdminPanelSettings fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="hr">
              <Tooltip title="HR Manager"><SupervisorAccount fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="manager">
              <Tooltip title="Manager"><SupervisorAccount fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="employee">
              <Tooltip title="Employee"><Person fontSize="small" /></Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Module accordion list */}
      <List disablePadding>
        {filteredModules.map(mod => {
          const ModIcon = ICON_MAP[mod.icon] || Help;
          const guidesForTab = mod.guides;
          if (guidesForTab.length === 0) return null;

          const videoCount = guidesForTab.filter(g => g.videoUrl).length;
          const isExpanded = expandedModule === mod.module;
          return (
            <Paper key={mod.module} sx={{ mb: 1, overflow: 'hidden' }} variant="outlined">
              <ListItemButton onClick={() => setExpandedModule(isExpanded ? null : mod.module)}>
                <ListItemIcon>
                  <ModIcon sx={{ color: mod.color }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" fontWeight="medium">{mod.module}</Typography>
                  }
                  secondary={`${guidesForTab.length} guide${guidesForTab.length > 1 ? 's' : ''}`}
                />
                {videoCount > 0 && (
                  <Chip
                    size="small"
                    icon={<PlayIcon />}
                    label={`${videoCount} video${videoCount > 1 ? 's' : ''}`}
                    sx={{ mr: 1 }}
                    color="success"
                    variant="outlined"
                  />
                )}
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={isExpanded} unmountOnExit>
                <Divider />
                <List disablePadding sx={{ pl: 2 }}>
                  {guidesForTab.map(guide => (
                    <ListItemButton
                      key={guide.testId}
                      onClick={() => setSelectedGuide(guide)}
                      sx={{ borderLeft: `3px solid ${mod.color}`, my: 0.5 }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {guide.title}
                            </Typography>
                            {guide.videoUrl && (
                              <Tooltip title="Video walkthrough available">
                                <PlayIcon fontSize="small" color="success" />
                              </Tooltip>
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Chip size="small" label={guide.testId} variant="outlined" />
                            {guide.roleDisplay && (
                              <Chip
                                size="small"
                                icon={ROLE_ICONS[guide.role]}
                                label={guide.roleDisplay}
                                color={ROLE_COLORS[guide.role] || 'default'}
                                variant="outlined"
                              />
                            )}
                            {(guide.tags || []).slice(0, 4).map(tag => (
                              <Chip key={tag} size="small" label={tag} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                            ))}
                          </Box>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </Paper>
          );
        })}
      </List>

      {filteredModules.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography variant="h6">No guides match your search</Typography>
          <Typography variant="body2">Try a different keyword or clear the search</Typography>
        </Box>
      )}
    </Box>
  );
}

/**
 * GuideDetail — expanded view with video player + step-by-step instructions
 */
function GuideDetail({ guide, onBack }) {
  const hasSteps = guide.steps && guide.steps.length > 0;
  const hasVideo = !!guide.videoUrl;

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      {/* Back button */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={onBack} size="small">
          <ArrowBack />
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          Back to all guides
        </Typography>
      </Box>

      {/* Guide header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {guide.title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Chip label={guide.testId} color="primary" size="small" />
          <Chip label={guide.module} style={{ backgroundColor: guide.color, color: '#fff' }} size="small" />
          {guide.roleDisplay && (
            <Chip
              icon={ROLE_ICONS[guide.role]}
              label={guide.roleDisplay}
              color={ROLE_COLORS[guide.role] || 'default'}
              variant="outlined"
              size="small"
            />
          )}
          {(guide.tags || []).map(tag => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Box>
        {guide.recordedAt && (
          <Typography variant="caption" color="text.secondary">
            Recorded: {new Date(guide.recordedAt).toLocaleDateString()}
            {guide.duration && ` • Duration: ${(guide.duration / 1000).toFixed(1)}s`}
          </Typography>
        )}
      </Box>

      {/* Video + Steps layout: side by side on large screens when both exist */}
      <Box sx={{
        display: 'flex',
        flexDirection: hasVideo && hasSteps ? { xs: 'column', md: 'row' } : 'column',
        gap: 3,
        mb: 3,
      }}>
        {/* Video player */}
        <Box sx={{ flex: hasSteps ? '1 1 55%' : '1 1 100%', minWidth: 0 }}>
          {hasVideo ? (
            <Card>
              <CardMedia
                component="video"
                src={`/${guide.videoUrl}`}
                controls
                sx={{ width: '100%', maxHeight: 500, bgcolor: '#000' }}
              />
              <CardContent sx={{ py: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Video walkthrough — recorded from automated E2E test
                </Typography>
              </CardContent>
            </Card>
          ) : guide.screenshotUrl ? (
            <Card>
              <CardMedia
                component="img"
                src={`/${guide.screenshotUrl}`}
                alt={guide.title}
                sx={{ width: '100%', maxHeight: 400, objectFit: 'contain' }}
              />
            </Card>
          ) : (
            <Alert severity="info">
              Video not yet recorded for this guide.
            </Alert>
          )}
        </Box>

        {/* Step-by-step instructions */}
        {hasSteps && (
          <Box sx={{ flex: hasVideo ? '1 1 45%' : '1 1 100%', minWidth: 0 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Step-by-Step Instructions
            </Typography>
            <Stepper orientation="vertical" activeStep={-1}>
              {guide.steps.map((step, i) => (
                <Step key={i} active>
                  <StepLabel>
                    <Typography variant="body2">
                      {renderStepText(step)}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}
      </Box>

      {!hasSteps && !hasVideo && (
        <Alert severity="info" sx={{ mb: 3 }}>
          This guide does not have recorded content yet.
        </Alert>
      )}
    </Box>
  );
}

/** Render step text with bold and code formatting (safe — no dangerouslySetInnerHTML) */
function renderStepText(text) {
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Match **bold** or `code`
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`(.+?)`/);

    let nextMatch = null;
    let type = null;

    if (boldMatch && codeMatch) {
      if (boldMatch.index <= codeMatch.index) {
        nextMatch = boldMatch; type = 'bold';
      } else {
        nextMatch = codeMatch; type = 'code';
      }
    } else if (boldMatch) {
      nextMatch = boldMatch; type = 'bold';
    } else if (codeMatch) {
      nextMatch = codeMatch; type = 'code';
    }

    if (!nextMatch) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    if (nextMatch.index > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, nextMatch.index)}</span>);
    }

    if (type === 'bold') {
      parts.push(<strong key={key++}>{nextMatch[1]}</strong>);
    } else {
      parts.push(<code key={key++} style={{ backgroundColor: '#f5f5f5', padding: '1px 4px', borderRadius: 3, fontSize: '0.85em' }}>{nextMatch[1]}</code>);
    }

    remaining = remaining.slice(nextMatch.index + nextMatch[0].length);
  }

  return <>{parts}</>;
}
