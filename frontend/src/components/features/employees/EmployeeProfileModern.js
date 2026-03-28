/**
 * Modern Minimalistic Employee Profile Component
 * Clean, simple design with auto-populated fields and salary section
 * Refactored to use custom hooks and sub-components
 */
import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Typography,
  useTheme
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

// Hooks
import useEmployeeProfile from './hooks/useEmployeeProfile';
import { useMetadataCache } from '../../../hooks/useMetadataCache';

// Components
import EmployeeProfileHeader from './components/EmployeeProfileHeader';
import EmployeeProfileCard from './components/EmployeeProfileCard';
import PersonalInfoSection from './components/PersonalInfoSection';
import EmploymentInfoSection from './components/EmploymentInfoSection';
import SalaryInfoSection from './components/SalaryInfoSection';
import StatutoryInfoSection from './components/StatutoryInfoSection';
import PayslipViewer from '../../payslip/PayslipViewer';

const EmployeeProfileModern = ({ mode = 'admin' }) => {
  // Use the custom hook
  const {
    employee,
    loading,
    editing,
    saving,
    handleSave,
    handleCancel,
    handleChange,
    handleSalaryChange,
    departments,
    positions,
    managers,
    photoPreview,
    selectedPhoto,
    handlePhotoSelect,
    handlePhotoRemove,
    showSensitive,
    setShowSensitive,
    showStatutory,
    setShowStatutory,
    canEditSensitive,
    canEdit,
    canSelfEdit,
    formatDate,
    formatCurrency,
    navigate,
    id
  } = useEmployeeProfile(mode);

  const theme = useTheme();

  // Use cached metadata to avoid repeated fetches; fallback to hook values
  const meta = useMetadataCache({ includeManagers: true });
  const departmentsData = meta.departments?.length ? meta.departments : departments;
  const positionsData = meta.positions?.length ? meta.positions : positions;
  const managersData = meta.managers?.length ? meta.managers : managers;

  // Local state for PayslipViewer (UI specific)
  const [showPayslipViewer, setShowPayslipViewer] = useState(false);

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!employee) {
    return (
      <Box p={4}>
        <Alert severity="error">Employee not found</Alert>
      </Box>
    );
  }

  // In 'self' mode, we might want to restrict editing even if the user has a role that usually allows it (like manager)
  // But for now, we'll trust the hook's permission logic. 
  // If mode is 'self', the 'id' might be undefined in the hook if we didn't pass it, but the hook fetches 'me'.
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50', py: 4, pb: editing ? 12 : 4 }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: 3 }}>
        
        {/* Header with Actions */}
        <EmployeeProfileHeader 
          onBack={() => mode === 'self' ? navigate('/') : navigate('/employees')}
          editing={editing}
          onEdit={() => mode === 'self' ? navigate(`/my-profile/edit/${employee?.id}`) : navigate(`/employees/${id || employee?.id}/edit`)}
          saving={saving}
          onSave={handleSave}
          onCancel={handleCancel}
          canEdit={mode === 'self' ? canSelfEdit : canEdit}
          canEditSensitive={mode === 'self' ? false : canEditSensitive}
          id={id || employee.id}
          onViewPayslip={() => setShowPayslipViewer(true)}
          onManageUser={() => navigate(`/employees/${id || employee.id}/user-account`)}
          mode={mode}
        />

        {/* Profile Card (Avatar & Basic Info) */}
        <EmployeeProfileCard 
          employee={employee}
          editing={editing && mode === 'self'}
          selectedPhoto={selectedPhoto}
          photoPreview={photoPreview}
          onPhotoSelect={handlePhotoSelect}
          onPhotoRemove={handlePhotoRemove}
        />

        {/* Main Content Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
          {/* Left Column */}
          <Box>
            <PersonalInfoSection 
              employee={employee}
              editing={editing}
              onChange={handleChange}
              formatDate={formatDate}
            />
          </Box>

          {/* Right Column */}
          <Box>
            <EmploymentInfoSection 
              employee={employee}
              editing={editing}
              onChange={handleChange}
              formatDate={formatDate}
              departments={departmentsData}
              positions={positionsData}
              managers={managersData}
            />

            <SalaryInfoSection 
              employee={employee}
              editing={editing}
              onChange={handleSalaryChange}
              canEditSensitive={mode === 'self' ? false : canEditSensitive}
              showSalary={mode === 'self' ? true : (editing || showSensitive)}
              setShowSalary={setShowSensitive}
              formatCurrency={formatCurrency}
            />

            <StatutoryInfoSection 
              employee={employee}
              editing={editing}
              onChange={handleChange}
              canEditSensitive={mode === 'self' ? false : canEditSensitive}
              showStatutory={mode === 'self' ? true : showStatutory}
              setShowStatutory={setShowStatutory}
            />
          </Box>
        </Box>
      </Box>

      {/* Sticky Floating Action Bar - Only visible in edit mode */}
      {editing && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'white',
            borderTop: '2px solid',
            borderColor: 'warning.main',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            zIndex: 1100,
            py: 2,
            px: 3
          }}
        >
          <Box
            sx={{
              maxWidth: '1400px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                icon={<EditIcon />}
                label="Edit Mode Active" 
                color="warning" 
                sx={{ fontWeight: 600 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
                Make your changes and click Save to update the profile
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={saving}
                data-testid="employee-profile-footer-cancel-btn"
                sx={{
                  borderColor: '#cbd5e1',
                  color: '#64748b',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#94a3b8',
                    bgcolor: 'rgba(148, 163, 184, 0.05)'
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                data-testid="employee-profile-footer-save-btn"
                sx={{
                  bgcolor: '#10b981',
                  color: 'white',
                  fontWeight: 600,
                  px: 4,
                  '&:hover': {
                    bgcolor: '#059669',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                Save Changes
              </Button>
            </Box>
          </Box>
        </Box>
      )}
      
      {/* Payslip Viewer Dialog */}
      <PayslipViewer
        open={showPayslipViewer}
        onClose={() => setShowPayslipViewer(false)}
        employee={employee}
        mode="generate"
      />
    </Box>
  );
};

export default EmployeeProfileModern;