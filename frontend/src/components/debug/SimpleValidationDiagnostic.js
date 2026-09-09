import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import {
  validateEmployeeData,
  getValidationQuickFixes
} from '../../utils/validationFixes';

const SimpleValidationDiagnostic = () => {
  const [testResults, setTestResults] = useState(null);

  const runValidationTests = () => {
    const testCases = [
      {
        name: 'Missing Required Fields',
        data: {
          firstName: '',
          lastName: 'Doe',
          email: 'invalid-email',
          hireDate: '',
          departmentId: '',
          positionId: ''
        }
      },
      {
        name: 'Valid Data with Formatting Issues',
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@company.com',
          phone: '+91 98765 43210',
          hireDate: '2024-01-15',
          departmentId: '123e4567-e89b-12d3-a456-426614174000',
          positionId: '123e4567-e89b-12d3-a456-426614174001',
          aadhaarNumber: '1234 5678 9012',
          panNumber: 'abcde1234f',
          ifscCode: 'sbin0000123'
        }
      }
    ];

    const results = testCases.map(testCase => {
      const validationResult = validateEmployeeData(testCase.data);
      const quickFixes = getValidationQuickFixes(validationResult.errors);

      return {
        ...testCase,
        validationResult,
        quickFixes
      };
    });

    setTestResults(results);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        🔧 Validation Diagnostic Tool
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This tool helps diagnose validation issues with form data.
        Click "Run Validation Tests" to see how the validation system handles different data scenarios.
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            🧪 Test Controls
          </Typography>
          <Button
            variant="contained"
            onClick={runValidationTests}
            startIcon={<CheckCircleIcon />}
            color="primary"
          >
            Run Validation Tests
          </Button>
        </CardContent>
      </Card>

      {testResults && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">🔧 Validation Test Results</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {testResults.map((testCase, index) => (
              <Card key={`test-${index}`} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {testCase.name}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Original Data:</Typography>
                    <Paper sx={{ p: 1, bgcolor: 'grey.100', fontSize: '0.8rem' }}>
                      <pre>{JSON.stringify(testCase.data, null, 2)}</pre>
                    </Paper>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Sanitized Data:</Typography>
                    <Paper sx={{ p: 1, bgcolor: 'success.light', fontSize: '0.8rem' }}>
                      <pre>{JSON.stringify(testCase.validationResult.sanitizedData, null, 2)}</pre>
                    </Paper>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Validation Status:
                      <Chip
                        label={testCase.validationResult.isValid ? 'Valid' : 'Invalid'}
                        color={testCase.validationResult.isValid ? 'success' : 'error'}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                  </Box>

                  {Object.keys(testCase.validationResult.errors).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Validation Errors:</Typography>
                      {Object.entries(testCase.validationResult.errors).map(([field, error]) => (
                        <Alert key={field} severity="error" sx={{ mb: 1 }}>
                          <strong>{field}:</strong> {error}
                        </Alert>
                      ))}
                    </Box>
                  )}

                  {testCase.quickFixes.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Quick Fixes:</Typography>
                      {testCase.quickFixes.map((fix, fixIndex) => (
                        <Alert
                          key={`fix-${fixIndex}`}
                          severity={fix.type === 'error' ? 'error' : 'warning'}
                          sx={{ mb: 1 }}
                        >
                          <Typography variant="body2">
                            <strong>{fix.message}</strong><br />
                            Fix: {fix.fix}
                          </Typography>
                        </Alert>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </AccordionDetails>
        </Accordion>
      )}

      <Alert severity="success" sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>✅ How to Use This Information:</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          1. <strong>Check Required Fields:</strong> Ensure firstName, lastName, email, hireDate, departmentId, and positionId are provided
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          2. <strong>Validate Formats:</strong> Email should be valid, dates in YYYY-MM-DD format, phone numbers as 10-15 digits
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          3. <strong>Use Quick Fixes:</strong> Follow the suggested fixes to correct common validation issues
        </Typography>
        <Typography variant="body2">
          4. <strong>Check Sanitized Data:</strong> Use the sanitized version for API submission
        </Typography>
      </Alert>
    </Box>
  );
};

export default SimpleValidationDiagnostic;
