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
        id="salary.basicSalary"
        name="salary.basicSalary"
        label="Basic Salary"
        type="text"
        value={formData.salary?.basicSalary || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.basicSalary', value);
        }}
        onBlur={() => onBlur && onBlur('salary.basicSalary')}
        error={touchedFields['salary.basicSalary'] && !!errors['salary.basicSalary']}
        helperText={touchedFields['salary.basicSalary'] && errors['salary.basicSalary'] ? errors['salary.basicSalary'] : 'Optional: Enter basic salary amount'}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
        placeholder="50000"
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth error={touchedFields['salary.currency'] && !!errors['salary.currency']}>
        <InputLabel>Currency</InputLabel>
        <Select
          id="salary.currency"
          name="salary.currency"
          inputProps={{ 'data-testid': 'salary-currency-select' }}
          value={formData.salary?.currency || 'INR'}
          onChange={(e) => onChange('salary.currency', e.target.value)}
          onBlur={() => onBlur && onBlur('salary.currency')}
          label="Currency"
        >
          <MenuItem value="INR">INR</MenuItem>
          <MenuItem value="USD">USD</MenuItem>
          <MenuItem value="EUR">EUR</MenuItem>
          <MenuItem value="GBP">GBP</MenuItem>
        </Select>
        {touchedFields['salary.currency'] && errors['salary.currency'] && <FormHelperText>{errors['salary.currency']}</FormHelperText>}
      </FormControl>
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth error={touchedFields['salary.payFrequency'] && !!errors['salary.payFrequency']}>
        <InputLabel>Pay Frequency</InputLabel>
        <Select
          id="salary.payFrequency"
          name="salary.payFrequency"
          inputProps={{ 'data-testid': 'salary-payfrequency-select' }}
          value={formData.salary?.payFrequency || 'monthly'}
          onChange={(e) => onChange('salary.payFrequency', e.target.value)}
          onBlur={() => onBlur && onBlur('salary.payFrequency')}
          label="Pay Frequency"
        >
          <MenuItem value="weekly">Weekly</MenuItem>
          <MenuItem value="biweekly">Bi-weekly</MenuItem>
          <MenuItem value="monthly">Monthly</MenuItem>
          <MenuItem value="annually">Annually</MenuItem>
        </Select>
        {touchedFields['salary.payFrequency'] && errors['salary.payFrequency'] && <FormHelperText>{errors['salary.payFrequency']}</FormHelperText>}
      </FormControl>
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.effectiveFrom"
        name="salary.effectiveFrom"
        label="Effective From"
        type="date"
        value={formData.salary?.effectiveFrom || ''}
        onChange={(e) => onChange('salary.effectiveFrom', e.target.value)}
        onBlur={() => onBlur && onBlur('salary.effectiveFrom')}
        error={touchedFields['salary.effectiveFrom'] && !!errors['salary.effectiveFrom']}
        helperText={touchedFields['salary.effectiveFrom'] && errors['salary.effectiveFrom'] ? errors['salary.effectiveFrom'] : ''}
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
        id="salary.allowances.hra"
        name="salary.allowances.hra"
        label="House Rent Allowance (HRA)"
        type="text"
        value={formData.salary?.allowances?.hra || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.allowances.hra', value);
        }}
        onBlur={() => onBlur && onBlur('salary.allowances.hra')}
        error={touchedFields['salary.allowances.hra'] && !!errors['salary.allowances.hra']}
        helperText={touchedFields['salary.allowances.hra'] && errors['salary.allowances.hra'] ? errors['salary.allowances.hra'] : ''}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.allowances.transport"
        name="salary.allowances.transport"
        label="Transport Allowance"
        type="text"
        value={formData.salary?.allowances?.transport || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.allowances.transport', value);
        }}
        onBlur={() => onBlur && onBlur('salary.allowances.transport')}
        error={touchedFields['salary.allowances.transport'] && !!errors['salary.allowances.transport']}
        helperText={touchedFields['salary.allowances.transport'] && errors['salary.allowances.transport'] ? errors['salary.allowances.transport'] : ''}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.allowances.medical"
        label="Medical Allowance"
        type="text"
        value={formData.salary?.allowances?.medical || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.allowances.medical', value);
        }}
        error={!!errors['salary.allowances.medical']}
        helperText={errors['salary.allowances.medical']}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.allowances.food"
        label="Food Allowance"
        type="text"
        value={formData.salary?.allowances?.food || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.allowances.food', value);
        }}
        error={!!errors['salary.allowances.food']}
        helperText={errors['salary.allowances.food']}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.allowances.communication"
        label="Communication Allowance"
        type="text"
        value={formData.salary?.allowances?.communication || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.allowances.communication', value);
        }}
        error={!!errors['salary.allowances.communication']}
        helperText={errors['salary.allowances.communication']}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.allowances.special"
        label="Special Allowance"
        type="text"
        value={formData.salary?.allowances?.special || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.allowances.special', value);
        }}
        error={!!errors['salary.allowances.special']}
        helperText={errors['salary.allowances.special']}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.allowances.other"
        label="Other Allowance"
        type="text"
        value={formData.salary?.allowances?.other || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.allowances.other', value);
        }}
        error={!!errors['salary.allowances.other']}
        helperText={errors['salary.allowances.other']}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
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
        id="salary.deductions.pf"
        label="Provident Fund (PF)"
        type="text"
        value={formData.salary?.deductions?.pf || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.deductions.pf', value);
        }}
        error={!!errors['salary.deductions.pf']}
        helperText={errors['salary.deductions.pf']}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.deductions.professionalTax"
        label="Professional Tax"
        type="text"
        value={formData.salary?.deductions?.professionalTax || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.deductions.professionalTax', value);
        }}
        error={!!errors['salary.deductions.professionalTax']}
        helperText={errors['salary.deductions.professionalTax']}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.deductions.incomeTax"
        label="Income Tax"
        type="text"
        value={formData.salary?.deductions?.incomeTax || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.deductions.incomeTax', value);
        }}
        error={!!errors['salary.deductions.incomeTax']}
        helperText={errors['salary.deductions.incomeTax']}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.deductions.esi"
        label="ESI (Employee State Insurance)"
        type="text"
        value={formData.salary?.deductions?.esi || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.deductions.esi', value);
        }}
        error={!!errors['salary.deductions.esi']}
        helperText={errors['salary.deductions.esi']}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.deductions.other"
        label="Other Deductions"
        type="text"
        value={formData.salary?.deductions?.other || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.deductions.other', value);
        }}
        error={!!errors['salary.deductions.other']}
        helperText={errors['salary.deductions.other']}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    </Grid>

    {/* Benefits Section */}
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Benefits & Incentives
      </Typography>
      <Divider sx={{ mb: 3 }} />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.benefits.bonus"
        label="Bonus"
        type="text"
        value={formData.salary?.benefits?.bonus || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.benefits.bonus', value);
        }}
        error={!!errors['salary.benefits.bonus']}
        helperText={errors['salary.benefits.bonus']}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.benefits.incentive"
        label="Incentive"
        type="text"
        value={formData.salary?.benefits?.incentive || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.benefits.incentive', value);
        }}
        error={!!errors['salary.benefits.incentive']}
        helperText={errors['salary.benefits.incentive']}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.benefits.overtime"
        label="Overtime"
        type="text"
        value={formData.salary?.benefits?.overtime || ''}
        onChange={(e) => {
          const value = sanitizeSalaryInput(e.target.value);
          onChange('salary.benefits.overtime', value);
        }}
        error={!!errors['salary.benefits.overtime']}
        helperText={errors['salary.benefits.overtime']}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    </Grid>

    {/* Tax Information Section */}
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Tax Information
      </Typography>
      <Divider sx={{ mb: 3 }} />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth error={!!errors['salary.taxInformation.taxRegime']}>
        <InputLabel>Tax Regime</InputLabel>
        <Select
          id="salary.taxInformation.taxRegime"
          value={formData.salary?.taxInformation?.taxRegime || 'old'}
          onChange={(e) => onChange('salary.taxInformation.taxRegime', e.target.value)}
          label="Tax Regime"
        >
          <MenuItem value="old">Old Tax Regime</MenuItem>
          <MenuItem value="new">New Tax Regime</MenuItem>
        </Select>
        {errors['salary.taxInformation.taxRegime'] && <FormHelperText>{errors['salary.taxInformation.taxRegime']}</FormHelperText>}
      </FormControl>
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.taxInformation.ctc"
        label="CTC (Cost to Company)"
        type="number"
        value={formData.salary?.taxInformation?.ctc || ''}
        onChange={(e) => onChange('salary.taxInformation.ctc', parseFloat(e.target.value) || 0)}
        error={!!errors['salary.taxInformation.ctc']}
        helperText={errors['salary.taxInformation.ctc']}
        inputProps={{ min: 0, step: 0.01 }}
      />
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="salary.taxInformation.takeHome"
        label="Take Home Salary"
        type="number"
        value={formData.salary?.taxInformation?.takeHome || ''}
        onChange={(e) => onChange('salary.taxInformation.takeHome', parseFloat(e.target.value) || 0)}
        error={!!errors['salary.taxInformation.takeHome']}
        helperText={errors['salary.taxInformation.takeHome']}
        inputProps={{ min: 0, step: 0.01 }}
      />
    </Grid>

    {/* Additional Notes */}
    <Grid item xs={12}>
      <TextField
        fullWidth
        id="salary.salaryNotes"
        label="Salary Notes"
        multiline
        rows={3}
        value={formData.salary?.salaryNotes || ''}
        onChange={(e) => onChange('salary.salaryNotes', e.target.value)}
        error={!!errors['salary.salaryNotes']}
        helperText={errors['salary.salaryNotes'] || 'Additional notes about salary structure, benefits, or special conditions'}
      />
    </Grid>
  </Grid>
);

export default SalaryStructureTab;
