import React from 'react';
import {
  Grid,
  Typography,
  Divider,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';

// Sanitize salary input: allow only digits and at most one decimal point
const sanitizeSalaryInput = (value) => {
  const stripped = value.replace(/[^0-9.]/g, '');
  const parts = stripped.split('.');
  return parts.length <= 2 ? stripped : parts[0] + '.' + parts.slice(1).join('');
};

const SalaryStructureTab = ({ formData, errors, touchedFields = {}, onChange, onBlur }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom>
        Basic Salary Information
      </Typography>
      <Divider sx={{ mb: 3 }} />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salaryStructure.basicSalary"
        name="salaryStructure.basicSalary"
        label="Basic Salary"
        type="text"
        value={formData.salaryStructure?.basicSalary || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salaryStructure.basicSalary', value);
        }}
        onBlur={() => onBlur && onBlur('salaryStructure.basicSalary')}
        error={touchedFields['salaryStructure.basicSalary'] && !!errors['salaryStructure.basicSalary']}
        helperText={touchedFields['salaryStructure.basicSalary'] && errors['salaryStructure.basicSalary'] ? errors['salaryStructure.basicSalary'] : 'Required: Enter basic salary amount'}
        InputProps={{
          startAdornment: <InputAdornment position="start">{formData.salaryStructure?.currency === 'USD' ? '$' : '₹'}</InputAdornment>,
        }}
        placeholder="50000"
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth error={touchedFields['salaryStructure.currency'] && !!errors['salaryStructure.currency']}>
        <InputLabel>Currency</InputLabel>
        <Select
          id="salaryStructure.currency"
          name="salaryStructure.currency"
          inputProps={{ 'data-testid': 'salary-currency-select' }}
          value={formData.salaryStructure?.currency || 'INR'}
          onChange={(e) => onChange('salaryStructure.currency', e.target.value)}
          onBlur={() => onBlur && onBlur('salaryStructure.currency')}
          label="Currency"
        >
          <MenuItem value="INR">INR</MenuItem>
          <MenuItem value="USD">USD</MenuItem>
          <MenuItem value="EUR">EUR</MenuItem>
          <MenuItem value="GBP">GBP</MenuItem>
        </Select>
        {touchedFields['salaryStructure.currency'] && errors['salaryStructure.currency'] && <FormHelperText>{errors['salaryStructure.currency']}</FormHelperText>}
      </FormControl>
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth error={touchedFields['salaryStructure.payFrequency'] && !!errors['salaryStructure.payFrequency']}>
        <InputLabel>Pay Frequency</InputLabel>
        <Select
          id="salaryStructure.payFrequency"
          name="salaryStructure.payFrequency"
          inputProps={{ 'data-testid': 'salary-payfrequency-select' }}
          value={formData.salaryStructure?.payFrequency || 'monthly'}
          onChange={(e) => onChange('salaryStructure.payFrequency', e.target.value)}
          onBlur={() => onBlur && onBlur('salaryStructure.payFrequency')}
          label="Pay Frequency"
        >
          <MenuItem value="weekly">Weekly</MenuItem>
          <MenuItem value="biweekly">Bi-weekly</MenuItem>
          <MenuItem value="monthly">Monthly</MenuItem>
          <MenuItem value="annually">Annually</MenuItem>
        </Select>
        {touchedFields['salaryStructure.payFrequency'] && errors['salaryStructure.payFrequency'] && <FormHelperText>{errors['salaryStructure.payFrequency']}</FormHelperText>}
      </FormControl>
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salaryStructure.effectiveFrom"
        name="salaryStructure.effectiveFrom"
        label="Effective From"
        type="date"
        value={formData.salaryStructure?.effectiveFrom || ''}
        onChange={(e) => onChange('salaryStructure.effectiveFrom', e.target.value)}
        onBlur={() => onBlur && onBlur('salaryStructure.effectiveFrom')}
        error={touchedFields['salaryStructure.effectiveFrom'] && !!errors['salaryStructure.effectiveFrom']}
        helperText={touchedFields['salaryStructure.effectiveFrom'] && errors['salaryStructure.effectiveFrom'] ? errors['salaryStructure.effectiveFrom'] : 'Date when this salary structure takes effect'}
        InputLabelProps={{ shrink: true }}
      />
    </Grid>

    {/* Allowances Section */}
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Allowances
      </Typography>
      <Divider sx={{ mb: 3 }} />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salaryStructure.hra"
        name="salaryStructure.hra"
        label="House Rent Allowance (HRA)"
        type="text"
        value={formData.salaryStructure?.hra || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salaryStructure.hra', value);
        }}
        onBlur={() => onBlur && onBlur('salaryStructure.hra')}
        error={touchedFields['salaryStructure.hra'] && !!errors['salaryStructure.hra']}
        helperText={touchedFields['salaryStructure.hra'] && errors['salaryStructure.hra'] ? errors['salaryStructure.hra'] : ''}
        InputProps={{
          startAdornment: <InputAdornment position="start">{formData.salaryStructure?.currency === 'USD' ? '$' : '₹'}</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salaryStructure.allowances"
        name="salaryStructure.allowances"
        label="Other Allowances"
        type="text"
        value={formData.salaryStructure?.allowances || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salaryStructure.allowances', value);
        }}
        onBlur={() => onBlur && onBlur('salaryStructure.allowances')}
        error={touchedFields['salaryStructure.allowances'] && !!errors['salaryStructure.allowances']}
        helperText={touchedFields['salaryStructure.allowances'] && errors['salaryStructure.allowances'] ? errors['salaryStructure.allowances'] : 'Total sum of all other allowances'}
        InputProps={{
          startAdornment: <InputAdornment position="start">{formData.salaryStructure?.currency === 'USD' ? '$' : '₹'}</InputAdornment>,
        }}
      />
    </Grid>
    
    {/* Deductions Section */}
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Deductions
      </Typography>
      <Divider sx={{ mb: 3 }} />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salaryStructure.pfContribution"
        label="Provident Fund (PF) Contribution"
        type="text"
        value={formData.salaryStructure?.pfContribution || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salaryStructure.pfContribution', value);
        }}
        error={!!errors['salaryStructure.pfContribution']}
        helperText={errors['salaryStructure.pfContribution']}
        InputProps={{
          startAdornment: <InputAdornment position="start">{formData.salaryStructure?.currency === 'USD' ? '$' : '₹'}</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salaryStructure.tds"
        label="TDS (Tax Deducted at Source)"
        type="text"
        value={formData.salaryStructure?.tds || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salaryStructure.tds', value);
        }}
        error={!!errors['salaryStructure.tds']}
        helperText={errors['salaryStructure.tds']}
        InputProps={{
          startAdornment: <InputAdornment position="start">{formData.salaryStructure?.currency === 'USD' ? '$' : '₹'}</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salaryStructure.professionalTax"
        label="Professional Tax"
        type="text"
        value={formData.salaryStructure?.professionalTax || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salaryStructure.professionalTax', value);
        }}
        error={!!errors['salaryStructure.professionalTax']}
        helperText={errors['salaryStructure.professionalTax']}
        InputProps={{
          startAdornment: <InputAdornment position="start">{formData.salaryStructure?.currency === 'USD' ? '$' : '₹'}</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salaryStructure.esi"
        label="ESI (Employee State Insurance)"
        type="text"
        value={formData.salaryStructure?.esi || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salaryStructure.esi', value);
        }}
        error={!!errors['salaryStructure.esi']}
        helperText={errors['salaryStructure.esi']}
        InputProps={{
          startAdornment: <InputAdornment position="start">{formData.salaryStructure?.currency === 'USD' ? '$' : '₹'}</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salaryStructure.otherDeductions"
        label="Other Deductions"
        type="text"
        value={formData.salaryStructure?.otherDeductions || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salaryStructure.otherDeductions', value);
        }}
        error={!!errors['salaryStructure.otherDeductions']}
        helperText={errors['salaryStructure.otherDeductions']}
        InputProps={{
          startAdornment: <InputAdornment position="start">{formData.salaryStructure?.currency === 'USD' ? '$' : '₹'}</InputAdornment>,
        }}
      />
    </Grid>
  </Grid>
);

export default SalaryStructureTab;
