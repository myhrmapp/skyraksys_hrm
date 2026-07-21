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
  // Map from the new flat salaryStructure
  const salary = employee.salaryStructure || {};
  
  // Calculate totals for display
  const totalAllowances = (Number(salary.hra) || 0) + (Number(salary.allowances) || 0);
  const totalDeductions = (Number(salary.pfContribution) || 0) + (Number(salary.tds) || 0) + (Number(salary.professionalTax) || 0) + (Number(salary.esi) || 0) + (Number(salary.otherDeductions) || 0);

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
                value={salary.basicSalary}
                editing={editing}
                type="number"
                testId="salary-basicSalary"
                onChange={(val) => onChange('salaryStructure.basicSalary', val)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{salary.currency || CURRENCY_SYMBOL}</InputAdornment>,
                }}
                displayValue={formatCurrency(salary.basicSalary, salary.currency)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Total Allowances (HRA + Other)"
                value={totalAllowances}
                editing={false} // Calculated field
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">{salary.currency || CURRENCY_SYMBOL}</InputAdornment>,
                }}
                displayValue={formatCurrency(totalAllowances, salary.currency)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Total Deductions (PF, TDS, etc.)"
                value={totalDeductions}
                editing={false} // Calculated field
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">{salary.currency || CURRENCY_SYMBOL}</InputAdornment>,
                }}
                displayValue={formatCurrency(totalDeductions, salary.currency)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Net Take Home (Est)"
                value={(Number(salary.basicSalary) || 0) + totalAllowances - totalDeductions}
                editing={false}
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">{salary.currency || CURRENCY_SYMBOL}</InputAdornment>,
                }}
                displayValue={formatCurrency((Number(salary.basicSalary) || 0) + totalAllowances - totalDeductions, salary.currency)}
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
