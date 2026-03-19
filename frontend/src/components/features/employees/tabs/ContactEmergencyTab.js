import React from 'react';
import {
  Grid,
  Typography,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';

const ContactEmergencyTab = ({ formData, errors, touchedFields = {}, onChange, onBlur }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom>
        Emergency Contact Information
      </Typography>
      <Divider sx={{ mb: 3 }} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="emergencyContactName"
        name="emergencyContactName"
        label="Emergency Contact Name"
        data-testid="field-emergencyContactName"
        value={formData.emergencyContactName}
        onChange={(e) => onChange('emergencyContactName', e.target.value)}
        onBlur={() => onBlur && onBlur('emergencyContactName')}
        helperText="Optional"
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="emergencyContactPhone"
        name="emergencyContactPhone"
        label="Emergency Contact Phone"
        data-testid="field-emergencyContactPhone"
        value={formData.emergencyContactPhone}
        onChange={(e) => {
          // Only allow digits and limit to 15 characters
          const value = e.target.value.replace(/\D/g, '').slice(0, 15);
          onChange('emergencyContactPhone', value);
        }}
        onBlur={() => onBlur && onBlur('emergencyContactPhone')}
        error={touchedFields.emergencyContactPhone && !!errors.emergencyContactPhone}
        helperText={touchedFields.emergencyContactPhone && errors.emergencyContactPhone ? errors.emergencyContactPhone : 'Optional - Format: 1234567890 (10-15 digits)'}
        placeholder="1234567890"
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth error={touchedFields.emergencyContactRelation && !!errors.emergencyContactRelation}>
        <InputLabel>Relationship</InputLabel>
        <Select
          id="emergencyContactRelation"
          name="emergencyContactRelation"
          inputProps={{ 'data-testid': 'emergency-relation-select' }}
          value={formData.emergencyContactRelation}
          onChange={(e) => onChange('emergencyContactRelation', e.target.value)}
          onBlur={() => onBlur && onBlur('emergencyContactRelation')}
          label="Relationship"
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          <MenuItem value="Spouse">Spouse</MenuItem>
          <MenuItem value="Parent">Parent</MenuItem>
          <MenuItem value="Child">Child</MenuItem>
          <MenuItem value="Sibling">Sibling</MenuItem>
          <MenuItem value="Friend">Friend</MenuItem>
          <MenuItem value="Guardian">Guardian</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </Select>
        {touchedFields.emergencyContactRelation && errors.emergencyContactRelation && (
          <FormHelperText>{errors.emergencyContactRelation}</FormHelperText>
        )}
      </FormControl>
    </Grid>
  </Grid>
);

export default ContactEmergencyTab;
