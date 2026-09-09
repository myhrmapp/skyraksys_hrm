import React, { useState } from 'react';
import {
  Box,
  Select,
  MenuItem,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Tooltip
} from '@mui/material';
import {
  Computer as LocalIcon,
  DeveloperMode as DevIcon,
  Science as StagingIcon,
  Public as ProdIcon
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const ENVIRONMENTS = {
  LOCAL: {
    name: 'Local',
    apiUrl: '',
    color: '#10b981',
    icon: <LocalIcon fontSize="small" />
  },
  DEV: {
    name: 'Development',
    apiUrl: '',
    color: '#3b82f6',
    icon: <DevIcon fontSize="small" />
  },
  STAGING: {
    name: 'Staging',
    apiUrl: '',
    color: '#f59e0b',
    icon: <StagingIcon fontSize="small" />
  },
  PROD: {
    name: 'Production',
    apiUrl: '',
    color: '#ef4444',
    icon: <ProdIcon fontSize="small" />
  }
};

const EnvironmentSelector = ({ selectedEnvironment, onEnvironmentChange, showWarning = true }) => {
  const [confirmDialog, setConfirmDialog] = useState({ open: false, env: null });

  const handleEnvironmentSelect = (envName) => {
    const environment = ENVIRONMENTS[envName];

    if (envName === 'PROD' && showWarning) {
      setConfirmDialog({ open: true, env: environment });
    } else {
      onEnvironmentChange(envName, environment.apiUrl);
    }
  };

  const handleConfirmProd = () => {
    const env = confirmDialog.env;
    onEnvironmentChange('PROD', env.apiUrl);
    setConfirmDialog({ open: false, env: null });
  };

  const currentEnv = ENVIRONMENTS[selectedEnvironment] || ENVIRONMENTS.LOCAL;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Select
          value={selectedEnvironment}
          onChange={(e) => handleEnvironmentSelect(e.target.value)}
          size="small"
          sx={{
            minWidth: 200,
            '& .MuiSelect-select': {
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }
          }}
        >
          {Object.entries(ENVIRONMENTS).map(([key, env]) => (
            <MenuItem key={key} value={key}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {env.icon}
                <Typography>{env.name}</Typography>
                <Chip
                  label={key}
                  size="small"
                  sx={{
                    bgcolor: env.color,
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '10px'
                  }}
                />
              </Box>
            </MenuItem>
          ))}
        </Select>

        <Tooltip title={`Connected to ${currentEnv.name}`}>
          <Chip
            icon={currentEnv.icon}
            label={currentEnv.name}
            sx={{
              bgcolor: currentEnv.color,
              color: 'white',
              fontWeight: 600,
              animation: selectedEnvironment === 'PROD' ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.7 }
              }
            }}
          />
        </Tooltip>
      </Box>

      {/* Production Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, env: null })}>
        <DialogTitle sx={{ color: '#ef4444', fontWeight: 600 }}>
          ⚠️ WARNING: Production Environment
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            You are about to connect to the PRODUCTION environment!
          </Alert>
          <Typography variant="body2" paragraph>
            <strong>Environment:</strong> {confirmDialog.env?.name}
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>API URL:</strong> {confirmDialog.env?.apiUrl}
          </Typography>
          <Typography variant="body2" color="error">
            All changes will affect LIVE data and real users. Proceed with extreme caution!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, env: null })}>
            Cancel
          </Button>
          <Button onClick={handleConfirmProd} variant="contained" color="error">
            I Understand - Connect to Production
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

EnvironmentSelector.propTypes = {
  selectedEnvironment: PropTypes.string.isRequired,
  onEnvironmentChange: PropTypes.func.isRequired,
  showWarning: PropTypes.bool
};

export { ENVIRONMENTS };
export default EnvironmentSelector;

