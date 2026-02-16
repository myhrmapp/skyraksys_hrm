import React from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

const EmployeeFormActions = ({
  activeTab,
  setActiveTab,
  onBack,
  onSaveDraft,
  onSubmit,
  isLoading,
  isEditMode,
  isCurrentTabValid,
}) => {
  return (
    <Box 
      sx={{ 
        p: { xs: 3, md: 4 }, 
        bgcolor: 'grey.50',
        borderTop: '1px solid',
        borderColor: 'grey.200',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          disabled={activeTab === 0}
          onClick={() => setActiveTab(prev => prev - 1)}
          variant="outlined"
          sx={{ 
            minWidth: 100,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Previous
        </Button>
        <Button
          disabled={activeTab === 3}
          variant="outlined"
          onClick={() => setActiveTab(prev => prev + 1)}
          sx={{ 
            minWidth: 100,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Next
        </Button>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {/* Progress Indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Step {activeTab + 1} of 4
          </Typography>
          <Button 
            variant="outlined"
            onClick={onBack}
            sx={{ 
              width: 100, 
              '&:hover': {
                borderColor: '#cbd5e1',
                bgcolor: '#f8fafc'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            onClick={onSaveDraft}
            disabled={isLoading}
            startIcon={<SaveIcon />}
            sx={{ 
              minWidth: 140,
              py: 1.5,
              px: 3,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.dark',
                bgcolor: 'primary.50'
              }
            }}
          >
            Save as Draft
          </Button>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={isLoading || !isCurrentTabValid}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            sx={{ 
              minWidth: 180,
              py: 1.5,
              px: 4,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '1rem',
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4
              },
              '&:disabled': {
                bgcolor: 'grey.300',
                color: 'grey.500'
              }
            }}
          >
            {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Employee' : 'Create Employee')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default EmployeeFormActions;
