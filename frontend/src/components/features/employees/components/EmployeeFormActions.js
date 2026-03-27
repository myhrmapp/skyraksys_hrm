import React from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

const EmployeeFormActions = ({
  activeTab,
  setActiveTab,
  onBack,
  onSubmit,
  isLoading,
  isEditMode,
  isCurrentTabValid,
}) => {
  const isLastTab = activeTab === 3;

  const submitLabel = isLoading
    ? (isEditMode ? 'Saving...' : isLastTab ? 'Creating...' : 'Saving...')
    : isEditMode
    ? 'Save Changes'
    : isLastTab
    ? 'Create Employee'
    : 'Save & Continue';

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        bgcolor: 'grey.50',
        borderTop: '1px solid',
        borderColor: 'grey.200',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      {/* Left: Previous / Next */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          disabled={activeTab === 0}
          onClick={() => setActiveTab(prev => prev - 1)}
          variant="outlined"
          data-testid="employee-form-prev-btn"
          sx={{ minWidth: 100, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          Previous
        </Button>
        <Button
          disabled={isLastTab}
          variant="outlined"
          onClick={() => setActiveTab(prev => prev + 1)}
          data-testid="employee-form-next-btn"
          sx={{ minWidth: 100, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          Next
        </Button>
      </Box>

      {/* Right: Step indicator + Cancel + Submit */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          Step {activeTab + 1} of 4
        </Typography>
        <Button
          variant="outlined"
          onClick={onBack}
          data-testid="employee-form-cancel-btn"
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={isLoading || !isCurrentTabValid}
          data-testid="employee-form-submit-btn"
          startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon sx={{ fontSize: 18 }} />}
          sx={{
            minWidth: 160,
            py: 1,
            px: 3,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            boxShadow: 2,
            '&:hover': { boxShadow: 4 },
          }}
        >
          {submitLabel}
        </Button>
      </Box>
    </Box>
  );
};

export default EmployeeFormActions;
