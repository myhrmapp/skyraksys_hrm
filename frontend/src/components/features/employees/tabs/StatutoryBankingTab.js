import React from 'react';
import {
  Grid,
  Typography,
  Divider,
  TextField,
  InputAdornment,
  Tooltip,
  IconButton
} from '@mui/material';
import { HelpOutline as HelpIcon } from '@mui/icons-material';

const StatutoryBankingTab = ({ formData, errors, touchedFields = {}, onChange, onBlur }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom>
        Statutory Details
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        All statutory fields are optional but recommended for payroll compliance
      </Typography>
      <Divider sx={{ mb: 3 }} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="aadhaarNumber"
        name="aadhaarNumber"
        label="Aadhaar Number"
        data-testid="field-aadharNumber"
        value={formData.aadhaarNumber}
        onChange={(e) => {
          // Only allow digits and limit to 12 characters
          const value = e.target.value.replace(/\D/g, '').slice(0, 12);
          onChange('aadhaarNumber', value);
        }}
        onBlur={() => onBlur && onBlur('aadhaarNumber')}
        error={touchedFields.aadhaarNumber && !!errors.aadhaarNumber}
        helperText={touchedFields.aadhaarNumber && errors.aadhaarNumber ? errors.aadhaarNumber : 'Optional - Format: 123456789012 (12 digits)'}
        placeholder="123456789012"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Aadhaar is a 12-digit unique identification number issued by UIDAI. Example: 123456789012" arrow>
                <IconButton edge="end" size="small">
                  <HelpIcon fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          )
        }}
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="panNumber"
        name="panNumber"
        label="PAN Number"
        data-testid="field-panNumber"
        value={formData.panNumber}
        onChange={(e) => {
          // Format and validate PAN pattern
          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
          onChange('panNumber', value);
        }}
        onBlur={() => onBlur && onBlur('panNumber')}
        error={touchedFields.panNumber && !!errors.panNumber}
        helperText={touchedFields.panNumber && errors.panNumber ? errors.panNumber : 'Optional - Format: ABCDE1234F (5 letters, 4 digits, 1 letter)'}
        placeholder="ABCDE1234F"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="PAN (Permanent Account Number) format: 5 uppercase letters, 4 digits, 1 uppercase letter. Example: ABCDE1234F" arrow>
                <IconButton edge="end" size="small">
                  <HelpIcon fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          )
        }}
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="uanNumber"
        name="uanNumber"
        label="UAN Number"
        data-testid="field-uanNumber"
        value={formData.uanNumber}
        onChange={(e) => {
          // Allow alphanumeric only, uppercase, 12+ characters
          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
          onChange('uanNumber', value);
        }}
        onBlur={() => onBlur && onBlur('uanNumber')}
        error={touchedFields.uanNumber && !!errors.uanNumber}
        helperText={touchedFields.uanNumber && errors.uanNumber ? errors.uanNumber : 'Optional - Universal Account Number for EPF (12+ alphanumeric)'}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="UAN (Universal Account Number) is a unique number allotted by EPFO for tracking EPF contributions. Format: 12 or more alphanumeric characters" arrow>
                <IconButton edge="end" size="small">
                  <HelpIcon fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          )
        }}
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="pfNumber"
        name="pfNumber"
        label="PF Number"
        data-testid="field-pfNumber"
        value={formData.pfNumber}
        onChange={(e) => onChange('pfNumber', e.target.value)}
        onBlur={() => onBlur && onBlur('pfNumber')}
        error={touchedFields.pfNumber && !!errors.pfNumber}
        helperText={touchedFields.pfNumber && errors.pfNumber ? errors.pfNumber : 'Optional - Employee Provident Fund number'}
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="esiNumber"
        name="esiNumber"
        label="ESI Number"
        data-testid="field-esiNumber"
        value={formData.esiNumber}
        onChange={(e) => {
          // Allow alphanumeric only, uppercase, 10-17 characters
          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
          onChange('esiNumber', value);
        }}
        onBlur={() => onBlur && onBlur('esiNumber')}
        error={touchedFields.esiNumber && !!errors.esiNumber}
        helperText={touchedFields.esiNumber && errors.esiNumber ? errors.esiNumber : 'Optional - Employee State Insurance number (10-17 alphanumeric)'}
        placeholder="ESI00000001234"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="ESI Number is a unique identification number for Employee State Insurance. Format: 10-17 alphanumeric characters" arrow>
                <IconButton edge="end" size="small">
                  <HelpIcon fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          )
        }}
      />
    </Grid>
    
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Banking Details
      </Typography>
      <Divider sx={{ mb: 3 }} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="bankName"
        name="bankName"
        label="Bank Name"
        data-testid="field-bankName"
        value={formData.bankName}
        onChange={(e) => onChange('bankName', e.target.value)}
        onBlur={() => onBlur && onBlur('bankName')}
        error={touchedFields.bankName && !!errors.bankName}
        helperText={touchedFields.bankName && errors.bankName ? errors.bankName : 'Name of the bank'}
        placeholder="State Bank of India"
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="bankAccountNumber"
        name="bankAccountNumber"
        label="Account Number"
        data-testid="field-bankAccountNumber"
        value={formData.bankAccountNumber}
        onChange={(e) => onChange('bankAccountNumber', e.target.value)}
        onBlur={() => onBlur && onBlur('bankAccountNumber')}
        error={touchedFields.bankAccountNumber && !!errors.bankAccountNumber}
        helperText={touchedFields.bankAccountNumber && errors.bankAccountNumber ? errors.bankAccountNumber : 'Bank account number (9-20 digits)'}
        placeholder="12345678901234"
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="ifscCode"
        name="ifscCode"
        label="IFSC Code"
        data-testid="field-bankIfscCode"
        value={formData.ifscCode}
        onChange={(e) => {
          // Format IFSC code: ABCD0123456 (4 letters, 1 zero, 6 alphanumeric)
          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
          onChange('ifscCode', value);
        }}
        onBlur={() => onBlur && onBlur('ifscCode')}
        error={touchedFields.ifscCode && !!errors.ifscCode}
        helperText={touchedFields.ifscCode && errors.ifscCode ? errors.ifscCode : 'Format: SBIN0000123 (4 letters, 0, 6 characters)'}
        placeholder="SBIN0000123"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="IFSC (Indian Financial System Code): 11 characters - 4 bank code letters + 0 + 6 branch code. Example: SBIN0000123" arrow>
                <IconButton edge="end" size="small">
                  <HelpIcon fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          )
        }}
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="accountHolderName"
        label="Account Holder Name"
        value={formData.accountHolderName}
        onChange={(e) => onChange('accountHolderName', e.target.value)}
        error={!!errors.accountHolderName}
        helperText={errors.accountHolderName || 'Name as per bank records'}
        placeholder="John Doe"
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="bankBranch"
        label="Bank Branch"
        data-testid="field-bankBranch"
        value={formData.bankBranch}
        onChange={(e) => onChange('bankBranch', e.target.value)}
        error={!!errors.bankBranch}
        helperText={errors.bankBranch || 'Branch name and location'}
        placeholder="Main Branch, Mumbai"
      />
    </Grid>
  </Grid>
);

export default StatutoryBankingTab;
