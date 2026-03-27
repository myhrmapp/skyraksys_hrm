import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Card,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Login as LoginIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Import custom hook
import { useEmployeeForm } from './hooks/useEmployeeForm';

// Import components
import EmployeeFormHeader from './components/EmployeeFormHeader';
import EmployeeFormActions from './components/EmployeeFormActions';
import EmployeeFormTabs from './components/EmployeeFormTabs';
import TabPanel from './components/TabPanel';

// Import extracted tab components
import PersonalInformationTab from './tabs/PersonalInformationTab';
import EmploymentInformationTab from './tabs/EmploymentInformationTab';
import SalaryStructureTab from './tabs/SalaryStructureTab';
import ContactEmergencyTab from './tabs/ContactEmergencyTab';
import StatutoryBankingTab from './tabs/StatutoryBankingTab';
import UserAccountTab from './tabs/UserAccountTab';
import ValidationSummaryDialog from '../../shared/ValidationSummaryDialog';

const TabBasedEmployeeForm = ({ mode = 'admin' }) => {
  const navigate = useNavigate();
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  
  const {
    // State
    activeTab,
    formData,
    errors,
    touchedFields,
    isLoading,
    submitError,
    submitSuccess,
    departments,
    positions,
    managers,
    loadingRefData,
    selectedPhoto,
    photoPreview,
    showUnsavedDialog,
    lastSaved,
    autoSaving,
    currentUser,
    isAuthenticated,
    isEditMode,
    
    // Computed
    isCurrentTabValid,
    getTabValidationStatus,
    
    // Actions
    setActiveTab,
    handleFieldChange,
    handleFieldBlur,
    handleTabChange,
    handleSubmit,
    handleBackToEmployees,
    handlePhotoSelect,
    handlePhotoRemove,
    handleCancelNavigation,
    handleConfirmNavigation,
    
    // Draft restore dialog
    draftRestoreDialog,
    handleRestoreDraft,
    handleDismissDraft
  } = useEmployeeForm({ mode });

  // Handle login redirect
  const handleLoginRedirect = () => {
    navigate('/login');
  };

  // Show modern authentication error if not logged in
  if (!loadingRefData && !isAuthenticated) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: 'grey.50', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 2
      }}>
        <Card 
          elevation={4} 
          sx={{ 
            maxWidth: 600, 
            width: '100%', 
            p: 4, 
            textAlign: 'center',
            borderRadius: 3
          }}
        >
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              color: 'primary.main',
              mb: 0.5,
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' }
            }}
          >
            {isEditMode ? 'Edit Employee' : 'Add New Employee'}
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ 
              fontWeight: 500,
              fontSize: { xs: '0.875rem', md: '1rem' },
              mb: 4
            }}
          >
            {isEditMode ? 'Update employee details and information' : 'Create a comprehensive employee profile with all necessary details'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
            You need to be logged in to access the employee creation form. 
            Please authenticate to continue.
          </Typography>
          <Button
            variant="contained"
            startIcon={<LoginIcon />}
            onClick={handleLoginRedirect}
            size="large"
            sx={{ 
              py: 1.5, 
              px: 4,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1.1rem'
            }}
          >
            Go to Login
          </Button>
        </Card>
      </Box>
    );
  }

  if (loadingRefData) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh',
          bgcolor: 'grey.50',
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          flexDirection: 'column',
          gap: 3
        }}
      >
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" color="primary.main" fontWeight={600}>
          Loading form data...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we prepare the employee creation form
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, sm: 3, md: 4 } }}>
        
        <EmployeeFormHeader
          isEditMode={isEditMode}
          lastSaved={lastSaved}
          autoSaving={autoSaving}
          currentUser={currentUser}
          onBack={handleBackToEmployees}
          employeeName={isEditMode && formData.firstName ? `${formData.firstName} ${formData.lastName}`.trim() : null}
        />

        {/* Progress Messages */}
        {submitError && (
          <Alert 
            severity="error" 
            data-testid="employee-form-error-alert"
            sx={{ 
              mb: 3,
              borderRadius: 2,
              '& .MuiAlert-message': {
                whiteSpace: 'pre-line'
              }
            }}
          >
            {submitError}
          </Alert>
        )}

        {submitSuccess && (
          <Alert 
            severity="success" 
            data-testid="employee-form-success-alert"
            sx={{ 
              mb: 3,
              borderRadius: 2
            }}
          >
            {submitSuccess}
          </Alert>
        )}

        {/* Modern Tab-based Form */}
        <Card 
          elevation={0}
          sx={{ 
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'grey.200',
            overflow: 'hidden'
          }}
        >
          <EmployeeFormTabs
            activeTab={activeTab}
            handleTabChange={handleTabChange}
            getTabValidationStatus={getTabValidationStatus}
            hideSensitiveTabs={mode === 'self'}
          />

          {/* Tab Panels */}
          <TabPanel value={activeTab} index={0}>
            <PersonalInformationTab 
              formData={formData}
              errors={errors}
              touchedFields={touchedFields}
              onChange={handleFieldChange}
              onBlur={handleFieldBlur}
              selectedPhoto={selectedPhoto}
              photoPreview={photoPreview}
              onPhotoSelect={handlePhotoSelect}
              onPhotoRemove={handlePhotoRemove}
            />
          </TabPanel>
          
          <TabPanel value={activeTab} index={1}>
            {/* Combined Employment & Compensation Tab */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <EmploymentInformationTab
                formData={formData}
                errors={errors}
                touchedFields={touchedFields}
                onChange={handleFieldChange}
                onBlur={handleFieldBlur}
                departments={departments}
                positions={positions}
                managers={managers}
                loadingRefData={loadingRefData}
              />
              <Divider sx={{ my: 2 }}>
                <Chip label="Compensation Details" size="small" />
              </Divider>
              <SalaryStructureTab
                formData={formData}
                errors={errors}
                touchedFields={touchedFields}
                onChange={handleFieldChange}
                onBlur={handleFieldBlur}
              />
            </Box>
          </TabPanel>
          
          <TabPanel value={activeTab} index={2}>
            <ContactEmergencyTab
              formData={formData}
              errors={errors}
              touchedFields={touchedFields}
              onChange={handleFieldChange}
              onBlur={handleFieldBlur}
            />
          </TabPanel>
          
          {mode !== 'self' && (
          <TabPanel value={activeTab} index={3}>
            {/* Combined Statutory, Banking & Access Tab */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <StatutoryBankingTab
                formData={formData}
                errors={errors}
                touchedFields={touchedFields}
                onChange={handleFieldChange}
                onBlur={handleFieldBlur}
              />
              <Divider sx={{ my: 2 }}>
                <Chip label="User Access" size="small" />
              </Divider>
              <UserAccountTab
                formData={formData}
                errors={errors}
                touchedFields={touchedFields}
                onChange={handleFieldChange}
                onBlur={handleFieldBlur}
              />
            </Box>
          </TabPanel>
          )}

          <EmployeeFormActions
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onBack={handleBackToEmployees}
          onSubmit={() => {
              const allTabsValid = Object.values(getTabValidationStatus).every(t => !t.hasErrors);
              if (!allTabsValid) { setShowValidationSummary(true); return; }
              handleSubmit();
            }}
            isLoading={isLoading}
            isEditMode={isEditMode}
            isCurrentTabValid={isCurrentTabValid}
          />
        </Card>
      </Box>
      
      {/* Unsaved Changes Warning Dialog */}
      <Dialog
        open={showUnsavedDialog}
        onClose={handleCancelNavigation}
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: { xs: '90%', sm: 400 },
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6" component="span" fontWeight={600}>
            Unsaved Changes
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes that will be lost if you leave this page. 
            Are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleCancelNavigation}
            variant="outlined"
            data-testid="unsaved-dialog-stay-btn"
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2
            }}
          >
            Stay on Page
          </Button>
          <Button 
            onClick={handleConfirmNavigation}
            variant="contained"
            color="warning"
            data-testid="unsaved-dialog-leave-btn"
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2
            }}
          >
            Leave Without Saving
          </Button>
        </DialogActions>
      </Dialog>

      {/* Draft Restore Dialog (replaces window.confirm) */}
      <Dialog
        open={draftRestoreDialog.open}
        onClose={handleDismissDraft}
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: { xs: '90%', sm: 400 },
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <WarningIcon color="info" />
          <Typography variant="h6" component="span" fontWeight={600}>
            Restore Draft?
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Found a draft saved {draftRestoreDialog.minutesAgo} minutes ago. Would you like to restore it?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleDismissDraft}
            variant="outlined"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2
            }}
          >
            Discard
          </Button>
          <Button
            onClick={handleRestoreDraft}
            variant="contained"
            color="primary"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2
            }}
          >
            Restore Draft
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Cross-tab Validation Summary Dialog */}
      <ValidationSummaryDialog
        open={showValidationSummary}
        onClose={() => setShowValidationSummary(false)}
        onGoToTab={(tabIndex) => setActiveTab(tabIndex)}
        tabErrors={[
          { tabIndex: 0, tabLabel: 'Personal Info', fields: getTabValidationStatus[0]?.errorFields || [] },
          { tabIndex: 1, tabLabel: 'Employment & Compensation', fields: getTabValidationStatus[1]?.errorFields || [] },
          { tabIndex: 2, tabLabel: 'Contact & Emergency', fields: getTabValidationStatus[2]?.errorFields || [] },
          ...(mode !== 'self' ? [{ tabIndex: 3, tabLabel: 'Statutory, Banking & Access', fields: getTabValidationStatus[3]?.errorFields || [] }] : []),
        ]}
      />
    </Box>
  );
};

export default TabBasedEmployeeForm;
