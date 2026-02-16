import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  AttachMoney as AttachMoneyIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import InfoField from './InfoField';
import { CURRENCY_SYMBOL } from '../../../../utils/formatCurrency';

const SalaryInfoSection = ({ 
  employee, 
  editing, 
  onChange, 
  canEditSensitive,
  showSalary,
  setShowSalary,
  formatCurrency
}) => {
  // Calculate totals for display
  const totalAllowances = employee.salary?.allowances ? 
    Object.values(employee.salary.allowances).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
    
  const totalDeductions = employee.salary?.deductions ? 
    Object.values(employee.salary.deductions).reduce((a, b) => a + (Number(b) || 0), 0) : 0;

  return (
    <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              <AttachMoneyIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#10b981' }} />
              Compensation
            </Typography>
            {editing && <Chip label="Editing" size="small" color="warning" icon={<EditIcon />} />}
          </Box>
          <IconButton onClick={() => setShowSalary(!showSalary)} size="small">
            {showSalary ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
        </Box>
        
        {showSalary ? (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Basic Salary"
                value={employee.salary?.basicSalary}
                editing={editing}
                type="number"
                onChange={(val) => onChange('salary.basicSalary', val)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{employee.salary?.currency || CURRENCY_SYMBOL}</InputAdornment>,
                }}
                displayValue={formatCurrency(employee.salary?.basicSalary)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Total Allowances"
                value={totalAllowances}
                editing={false} // Calculated field, not directly editable here
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">{employee.salary?.currency || CURRENCY_SYMBOL}</InputAdornment>,
                }}
                displayValue={formatCurrency(totalAllowances)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Overtime"
                value={employee.salary?.benefits?.overtime}
                editing={editing}
                type="number"
                onChange={(val) => onChange('salary.benefits.overtime', val)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{employee.salary?.currency || CURRENCY_SYMBOL}</InputAdornment>,
                }}
                displayValue={formatCurrency(employee.salary?.benefits?.overtime)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Bonus"
                value={employee.salary?.benefits?.bonus}
                editing={editing}
                type="number"
                onChange={(val) => onChange('salary.benefits.bonus', val)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{employee.salary?.currency || CURRENCY_SYMBOL}</InputAdornment>,
                }}
                displayValue={formatCurrency(employee.salary?.benefits?.bonus)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Incentive/Commission"
                value={employee.salary?.benefits?.incentive}
                editing={editing}
                type="number"
                onChange={(val) => onChange('salary.benefits.incentive', val)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{employee.salary?.currency || CURRENCY_SYMBOL}</InputAdornment>,
                }}
                displayValue={formatCurrency(employee.salary?.benefits?.incentive)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Total Deductions"
                value={totalDeductions}
                editing={false} // Calculated field
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">{employee.salary?.currency || CURRENCY_SYMBOL}</InputAdornment>,
                }}
                displayValue={formatCurrency(totalDeductions)}
              />
            </Grid>
          </Grid>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
            <Typography color="text.secondary">
              Salary information is hidden. Click the eye icon to reveal.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SalaryInfoSection;
