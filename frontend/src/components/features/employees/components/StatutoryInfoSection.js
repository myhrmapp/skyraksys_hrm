import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  IconButton,
  useTheme
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import InfoField from './InfoField';

const StatutoryInfoSection = ({ 
  employee, 
  editing, 
  onChange, 
  canEditSensitive,
  showStatutory,
  setShowStatutory
}) => {
  const theme = useTheme();
  return (
    <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              <AccountBalanceIcon sx={{ verticalAlign: 'middle', mr: 1, color: theme.palette.warning.main }} />
              Statutory & Banking
            </Typography>
            {editing && <Chip label="Editing" size="small" color="warning" icon={<EditIcon />} />}
          </Box>
          <IconButton onClick={() => setShowStatutory(!showStatutory)} size="small">
            {showStatutory ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
        </Box>

        {showStatutory ? (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="PF Number"
                value={employee.pfNumber}
                editing={editing}
                onChange={(val) => onChange('pfNumber', val)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="ESI Number"
                value={employee.esiNumber}
                editing={editing}
                onChange={(val) => onChange('esiNumber', val)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="PAN Number"
                value={employee.panNumber}
                editing={editing}
                onChange={(val) => onChange('panNumber', val)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="UAN Number"
                value={employee.uanNumber}
                editing={editing}
                onChange={(val) => onChange('uanNumber', val)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Aadhaar Number"
                value={employee.aadhaarNumber}
                editing={editing}
                onChange={(val) => onChange('aadhaarNumber', val)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Bank Name"
                value={employee.bankName}
                editing={editing}
                onChange={(val) => onChange('bankName', val)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Bank Account Number"
                value={employee.bankAccountNumber}
                editing={editing}
                onChange={(val) => onChange('bankAccountNumber', val)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="IFSC Code"
                value={employee.ifscCode}
                editing={editing}
                onChange={(val) => onChange('ifscCode', val)}
              />
            </Grid>
          </Grid>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
            <Typography color="text.secondary">
              Statutory information is hidden. Click the eye icon to reveal.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatutoryInfoSection;
