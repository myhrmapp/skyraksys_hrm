import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotifications } from '../../../../contexts/NotificationContext';
import { employeeService } from '../../../../services/employee.service';
import { useEmployee, useUpdateEmployee } from '../../../../hooks/queries';

export const useEmployeeProfile = (mode = 'admin') => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showNotification } = useNotifications();

  // Show success toast when returning from the tab-driven edit form
  useEffect(() => {
    if (location.state?.snackbar) {
      showNotification(location.state.snackbar, 'success');
      // Clear the state so it doesn't re-fire on re-render
      window.history.replaceState({}, '');
    }
  }, [location.state?.snackbar, showNotification]);

  // 🚀 React Query hooks for data fetching and mutations
  const { data: employeeData, isLoading: isLoadingEmployee } = useEmployee(
    mode === 'self' ? null : id,
    { enabled: mode !== 'self' }
  );

  const updateMutation = useUpdateEmployee();

  // State
  const [employee, setEmployee] = useState(null);
  const [originalEmployee, setOriginalEmployee] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [showStatutory, setShowStatutory] = useState(false);
  const [showPayslipViewer, setShowPayslipViewer] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loadingRefData, setLoadingRefData] = useState(true);
  const [loadingSelf, setLoadingSelf] = useState(mode === 'self');
  
  // Photo upload state
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  // Permission checks
  const isAdmin = user?.role === 'admin';
  const isHR = user?.role === 'hr';
  // If mode is 'self', user can edit if they are the owner (which they are) but usually self-edit is limited.
  // For now, let's assume 'self' mode implies read-only for most fields unless we implement self-service edit.
  // The original MyProfile had an "Edit Profile" button that went to /employees/:id/edit.
  
  const canEditSensitive = isAdmin || isHR;
  const canEdit = isAdmin || isHR || user?.role === 'manager';
  // Self-service: employees can edit their own phone, address, and emergency contact
  const canSelfEdit = mode === 'self';

  // 🚀 Load reference data (departments, positions, managers)
  useEffect(() => {
    if (!user) return; // Wait for auth to load
    const loadRefData = async () => {
      try {
        setLoadingRefData(true);
        const canFetchManagers = ['admin', 'hr', 'manager'].includes(user?.role);
        const [deptResponse, posResponse, mgrResponse] = await Promise.all([
          employeeService.getDepartments().catch(err => {
            console.error('Error loading departments:', err);
            return { data: { data: [] } };
          }),
          employeeService.getPositions().catch(err => {
            console.error('Error loading positions:', err);
            return { data: { data: [] } };
          }),
          canFetchManagers
            ? employeeService.getManagers().catch(err => {
                console.error('Error loading managers:', err);
                return { data: { data: [] } };
              })
            : Promise.resolve({ data: { data: [] } })
        ]);

        setDepartments(deptResponse.data?.data || []);
        setPositions(posResponse.data?.data || []);
        setManagers(mgrResponse.data?.data || []);
      } catch (error) {
        console.error('Error loading reference data:', error);
      } finally {
        setLoadingRefData(false);
      }
    };

    loadRefData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🚀 Handle self-mode data fetching (my profile)
  useEffect(() => {
    if (mode === 'self') {
      const fetchMyProfile = async () => {
        setLoadingSelf(true);
        try {
          const empData = await employeeService.getMyProfile();
          if (empData) {
            setEmployee(empData);
            setOriginalEmployee({ ...empData });
            if (empData.photoUrl) {
              setPhotoPreview(`${process.env.REACT_APP_BACKEND_URL || ''}${empData.photoUrl}`);
            }
          }
        } catch (error) {
          console.error('Error fetching my profile:', error);
          if (error?.response?.status !== 401) {
            showNotification('Failed to load profile data', 'error');
          }
        } finally {
          setLoadingSelf(false);
        }
      };
      fetchMyProfile();
    }
  }, [mode, showNotification]);

  // 🚀 Populate employee data from React Query when available (admin/manager mode)
  useEffect(() => {
    if (mode !== 'self' && employeeData && !employee?.id) {
      setEmployee(employeeData);
      setOriginalEmployee({ ...employeeData });
      if (employeeData.photoUrl) {
        setPhotoPreview(`${process.env.REACT_APP_BACKEND_URL || ''}${employeeData.photoUrl}`);
      }
    }
  }, [employeeData, mode, employee?.id]);

  // When navigated here with editMode=true (e.g. from employee list), redirect to full tab form
  useEffect(() => {
    if (location.state?.editMode && id && (isAdmin || isHR || user?.role === 'manager')) {
      navigate(`/employees/${id}/edit`, { replace: true });
    }
  }, [location.state?.editMode, id, isAdmin, isHR, user?.role, navigate]);

  // 🚀 Handle save with React Query mutation
  const handleSave = async () => {
    // For self-service, use employee's own ID; for admin/manager, use URL param
    const employeeId = mode === 'self' ? employee?.id : id;
    if (!employeeId) {
      showNotification('Cannot save: employee ID unknown', 'error');
      return;
    }

    // For self-service, only send allowed fields
    const dataToSave = mode === 'self'
      ? {
          phone: employee.phone,
          address: employee.address,
          city: employee.city,
          state: employee.state,
          pinCode: employee.pinCode,
          emergencyContactName: employee.emergencyContactName,
          emergencyContactPhone: employee.emergencyContactPhone,
          emergencyContactRelation: employee.emergencyContactRelation,
        }
      : employee;

    // Use React Query mutation for update
    updateMutation.mutate(
      { id: employeeId, data: dataToSave },
      {
        onSuccess: async (updated) => {
          // 2. Upload photo if selected
          if (selectedPhoto) {
            try {
              const photoResponse = await employeeService.uploadPhoto(employeeId, selectedPhoto);
              if (photoResponse.success && photoResponse.data?.photoUrl) {
                updated.photoUrl = photoResponse.data.photoUrl;
                setPhotoPreview(`${process.env.REACT_APP_BACKEND_URL || ''}${updated.photoUrl}`);
              }
            } catch (photoError) {
              console.error('Error uploading photo:', photoError);
              showNotification('Employee data saved, but photo upload failed', 'warning');
            }
          }
          
          setEmployee(updated);
          setOriginalEmployee({ ...updated });
          setEditing(false);
          setSelectedPhoto(null);
          showNotification('Employee updated successfully', 'success');
        },
        onError: (error) => {
          console.error('Error saving employee:', error);
          showNotification(error.response?.data?.message || 'Failed to update employee', 'error');
        }
      }
    );
  };

  // Handle cancel
  const handleCancel = () => {
    setEmployee({ ...originalEmployee });
    setEditing(false);
    setSelectedPhoto(null);
    // Reset preview to original photo
    if (originalEmployee.photoUrl) {
      setPhotoPreview(`${process.env.REACT_APP_BACKEND_URL || ''}${originalEmployee.photoUrl}`);
    } else {
      setPhotoPreview('');
    }
  };

  // Handle photo selection
  const handlePhotoSelect = (file) => {
    setSelectedPhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoRemove = () => {
    setSelectedPhoto(null);
    setPhotoPreview('');
  };

  // Handle field change
  const handleChange = (field, value) => {
    // Convert empty strings to null for optional fields to ensure they are cleared in DB
    const finalValue = value === '' ? null : value;
    setEmployee(prev => ({ ...prev, [field]: finalValue }));
  };

  // Handle nested salary field changes
  // Fields arrive as 'salary.basicSalary', 'salary.allowances.hra', etc.
  const handleSalaryChange = (field, value) => {
    setEmployee(prev => {
      const salary = { ...(prev.salary || {}) };

      // Strip leading 'salary.' prefix — we're already inside the salary object
      const path = field.startsWith('salary.') ? field.slice('salary.'.length) : field;

      if (path.includes('.')) {
        // e.g. 'allowances.hra' → parent='allowances', child='hra'
        const dotIdx = path.indexOf('.');
        const parent = path.slice(0, dotIdx);
        const child = path.slice(dotIdx + 1);
        salary[parent] = {
          ...(salary[parent] || {}),
          [child]: value === '' ? 0 : (parseFloat(value) || 0),
        };
      } else {
        // e.g. 'basicSalary', 'currency'
        salary[path] = value === '' ? null : (parseFloat(value) || value);
      }

      return { ...prev, salary };
    });
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: employee?.salary?.currency || 'INR'
    }).format(amount);
  };

  // Derive combined loading state
  const loading = (mode === 'self' ? loadingSelf : isLoadingEmployee) || loadingRefData;
  const saving = updateMutation.isPending;

  return {
    // State
    id,
    employee,
    editing,
    loading,
    saving,
    showSensitive,
    showStatutory,
    showPayslipViewer,
    departments,
    positions,
    managers,
    selectedPhoto,
    photoPreview,
    
    // Permissions
    canEditSensitive,
    canEdit,
    canSelfEdit,
    
    // Helpers
    formatDate,
    formatCurrency,

    // Setters
    setEditing,
    setShowSensitive,
    setShowStatutory,
    setShowPayslipViewer,
    
    // Actions
    handleSave,
    handleCancel,
    handlePhotoSelect,
    handlePhotoRemove,
    handleChange,
    handleSalaryChange,
    navigate
  };
};

export default useEmployeeProfile;
