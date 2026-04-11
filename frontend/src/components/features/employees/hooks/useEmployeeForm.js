import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { validateEmployeeForm, transformEmployeeDataForAPI, validateField } from '../../../../utils/employeeValidation';
import { employeeService } from '../../../../services/employee.service';
import { authService } from '../../../../services/auth.service';
import { useAuth } from '../../../../contexts/AuthContext';
import { DEFAULT_CURRENCY_CODE } from '../../../../utils/formatCurrency';

// 🚀 React Query hooks for server state management
import { useEmployee, useCreateEmployee, useUpdateEmployee } from '../../../../hooks/queries';

export const useEmployeeForm = ({ mode = 'admin' } = {}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    // Required fields
    firstName: '',
    lastName: '',
    email: '',
    employeeId: '',
    hireDate: '',
    status: 'Active',
    departmentId: '',
    positionId: '',
    
    // Optional personal fields
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    nationality: 'Indian',
    maritalStatus: '',
    photoUrl: '',
    
    // Optional employment fields
    employmentType: 'Full-time',
    workLocation: '',
    joiningDate: '',
    confirmationDate: '',
    resignationDate: '',
    lastWorkingDate: '',
    probationPeriod: 6,
    noticePeriod: 30,
    managerId: '',
    
    // Optional emergency contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    
    // Optional statutory details
    aadhaarNumber: '',
    panNumber: '',
    uanNumber: '',
    pfNumber: '',
    esiNumber: '',
    
    // Optional bank details
    bankName: '',
    bankAccountNumber: '',
    ifscCode: '',
    bankBranch: '',
    accountHolderName: '',
    
    // Optional salary structure
    salaryStructure: '',
    
    // Comprehensive salary details (NEW NESTED FORMAT)
    salary: {
      // Basic Salary Components
      basicSalary: '',
      currency: DEFAULT_CURRENCY_CODE,
      payFrequency: 'monthly',
      effectiveFrom: '',
      
      // Allowances (NESTED)
      allowances: {
        hra: '',
        transport: '',
        medical: '',
        food: '',
        communication: '',
        special: '',
        other: ''
      },
      
      // Deductions (NESTED)
      deductions: {
        pf: '',
        professionalTax: '',
        incomeTax: '',
        esi: '',
        other: ''
      },
      
      // Benefits (NESTED)
      benefits: {
        bonus: '',
        incentive: '',
        overtime: ''
      },
      
      // Tax Information (NESTED)
      taxInformation: {
        taxRegime: 'old',
        ctc: '',
        takeHome: ''
      },
      
      // Salary Notes
      salaryNotes: ''
    },
    
    // User account details
    userAccount: {
      enableLogin: false,
      role: 'employee',
      password: '',
      confirmPassword: '',
      forcePasswordChange: true
    }
  });
  
  // UI state
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [wasSubmitted, setWasSubmitted] = useState(false);
  
  // 🚀 NEW: Loading state from React Query mutations
  const { data: employee, isLoading: isLoadingEmployee } = useEmployee(id);
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  
  // Combine all loading states
  const isLoading = isLoadingEmployee || createMutation.isPending || updateMutation.isPending;
  
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  
  // Reference data
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loadingRefData, setLoadingRefData] = useState(true);
  
  // Photo upload state
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  
  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  
  // Draft restore dialog state (replaces window.confirm)
  const [draftRestoreDialog, setDraftRestoreDialog] = useState({ open: false, draftData: null, minutesAgo: 0 });

  // Auto-save state
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef(null);

  // Load reference data function
  const loadReferenceData = useCallback(async () => {
    try {
      setLoadingRefData(true);
      setSubmitError('');

      const canFetchManagers = authUser && ['admin', 'hr', 'manager'].includes(authUser.role);

      const [deptResponse, mgrsResponse] = await Promise.all([
        employeeService.getDepartments().catch(err => {
          console.error('Error loading departments:', err);
          return { data: { data: [] } };
        }),
        canFetchManagers
          ? employeeService.getManagers().catch(err => {
              console.error('Error loading managers:', err);
              return { data: { data: [] } };
            })
          : Promise.resolve({ data: { data: [] } })
      ]);
      
      setDepartments(Array.isArray(deptResponse) ? deptResponse : deptResponse?.data?.data || deptResponse?.data || []);
      setManagers(Array.isArray(mgrsResponse) ? mgrsResponse : mgrsResponse?.data?.data || mgrsResponse?.data || []);
      
      const positionsResponse = await employeeService.getPositions().catch(err => {
        console.error('Error loading positions:', err);
        return { data: { data: [] } };
      });
      setPositions(Array.isArray(positionsResponse) ? positionsResponse : positionsResponse?.data?.data || positionsResponse?.data || []);
      
    } catch (error) {
      console.error('Error loading reference data:', error);
      setSubmitError(`Failed to load form data: ${error.message}. Please check your connection and try again.`);
    } finally {
      setLoadingRefData(false);
    }
  }, [authUser]);

  // Check authentication on component mount
  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
      setIsAuthenticated(true);
      loadReferenceData();
      
      // 🚀 NEW: No need to manually load employee data - React Query handles it
      
      if (!isEditMode) {
        // Restore draft for new employee
        const savedDraft = localStorage.getItem('employeeFormDraft');
        if (savedDraft) {
          try {
            const draftData = JSON.parse(savedDraft);
            const savedTime = new Date(draftData.savedAt);
            const hoursSinceLastSave = (new Date() - savedTime) / (1000 * 60 * 60);
            
            if (hoursSinceLastSave < 24) {
              // Show draft restore dialog instead of window.confirm
              setDraftRestoreDialog({
                open: true,
                draftData,
                minutesAgo: Math.round(hoursSinceLastSave * 60)
              });
            } else {
              localStorage.removeItem('employeeFormDraft');
            }
          } catch (error) {
            console.error('Error restoring draft:', error);
            localStorage.removeItem('employeeFormDraft');
          }
        }
      }
    } else {
      setSubmitError('Please login to access this page.');
      setLoadingRefData(false);
    }
  }, [id, isEditMode, authUser, loadReferenceData]); // Uses authUser from AuthContext

  // 🚀 NEW: Populate form data when employee is loaded via React Query
  useEffect(() => {
    if (isEditMode && employee && !formData.id) {
      // Transform employee data to match formData structure
      // Coalesce null/undefined API values to '' so MUI TextFields stay controlled
      const safeEmployee = Object.fromEntries(
        Object.entries(employee).map(([k, v]) => [k, v == null ? '' : v])
      );
      const transformedData = {
        ...formData,
        ...safeEmployee,
        // Ensure nested salary object is properly merged
        salary: {
          ...formData.salary,
          ...(employee.salary || {}),
          basicSalary: employee.salary?.basicSalary || '',
          allowances: {
            ...formData.salary.allowances,
            ...(employee.salary?.allowances || {})
          },
          deductions: {
            ...formData.salary.deductions,
            ...(employee.salary?.deductions || {})
          },
          benefits: {
            ...formData.salary.benefits,
            ...(employee.salary?.benefits || {})
          },
          taxInformation: {
            ...formData.salary.taxInformation,
            ...(employee.salary?.taxInformation || {})
          }
        },
        userAccount: {
          ...formData.userAccount,
          ...(employee.userAccount || {})
        }
      };
      
      setFormData(transformedData);
    }
  }, [employee, isEditMode, formData.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn user about unsaved changes when leaving page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
  
  // Auto-save to localStorage
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    if (hasUnsavedChanges && isAuthenticated) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        setAutoSaving(true);
        try {
          const draftData = {
            ...formData,
            savedAt: new Date().toISOString(),
            isDraft: true
          };
          localStorage.setItem('employeeFormDraft', JSON.stringify(draftData));
          setLastSaved(new Date());
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setAutoSaving(false);
        }
      }, 30000);
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, hasUnsavedChanges, isAuthenticated]);

  // Handle field changes
  const handleFieldChange = useCallback((fieldName, value) => {
    setFormData(prev => {
      let newFormData = { ...prev };
      
      if (fieldName.includes('.')) {
        const fieldPath = fieldName.split('.');
        
        // Deep clone each level of the nested path to avoid mutating previous state
        let current = newFormData;
        for (let i = 0; i < fieldPath.length - 1; i++) {
          const key = fieldPath[i];
          current[key] = current[key] && typeof current[key] === 'object'
            ? { ...current[key] }
            : {};
          current = current[key];
        }
        
        const finalKey = fieldPath[fieldPath.length - 1];
        current[finalKey] = value;
      } else {
        newFormData[fieldName] = value;
      }
      
      return newFormData;
    });
    
    setHasUnsavedChanges(true);
    
    setErrors(prevErrors => ({
      ...prevErrors,
      [fieldName]: null
    }));
    
    setSubmitError('');
    setSubmitSuccess('');
  }, []);

  // Handle field blur
  const handleFieldBlur = useCallback((fieldName) => {
    setTouchedFields(prev => ({
      ...prev,
      [fieldName]: true
    }));
    
    let fieldValue;
    if (fieldName.includes('.')) {
      const fieldPath = fieldName.split('.');
      fieldValue = formData;
      for (const key of fieldPath) {
        fieldValue = fieldValue?.[key];
        if (fieldValue === undefined) break;
      }
    } else {
      fieldValue = formData[fieldName];
    }
    
    const fieldError = validateField(fieldName, fieldValue, formData);
    if (fieldError) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [fieldName]: fieldError
      }));
      return;
    }

    // Async uniqueness checks for email and employeeId
    (async () => {
      try {
        if (fieldName === 'email' && fieldValue) {
          const exists = await employeeService.checkEmailExists(fieldValue);
          if (exists) {
            setErrors(prev => ({ ...prev, email: 'Email already exists. Please use a different email.' }));
          }
        }
        if (fieldName === 'employeeId' && fieldValue) {
          const exists = await employeeService.checkEmployeeIdExists(fieldValue);
          if (exists) {
            setErrors(prev => ({ ...prev, employeeId: 'Employee ID already exists. Please choose a unique ID.' }));
          }
        }
      } catch (e) {
        // Do not surface network errors here; avoid noisy global errors on blur
      }
    })();
  }, [formData]);

  // Validate current tab
  const isCurrentTabValid = useMemo(() => {
    if (!wasSubmitted) return true;
    
    const validation = validateEmployeeForm(formData);
    
    switch (activeTab) {
      case 0:
        const personalFields = ['firstName', 'lastName', 'email'];
        return personalFields.every(field => !validation.errors[field]);
      case 1:
        const employmentFields = ['hireDate', 'departmentId', 'positionId'];
        return employmentFields.every(field => !validation.errors[field]);
      case 2:
      case 3:
        return true;
      default:
        return validation.isValid;
    }
  }, [formData, activeTab, wasSubmitted]);
  
  // Get validation status for all tabs
  const getTabValidationStatus = useMemo(() => {
    const validation = validateEmployeeForm(formData);
    const tab0Fields = ['firstName', 'lastName', 'email'];
    const tab1Fields = ['hireDate', 'departmentId', 'positionId'];
    const tab2Fields = ['phone', 'emergencyContactPhone'];
    const tab3Fields = ['aadhaarNumber', 'panNumber', 'ifscCode'];

    return {
      0: {
        requiredFields: tab0Fields,
        hasErrors: tab0Fields.some(f => validation.errors[f]),
        errorFields: tab0Fields.filter(f => validation.errors[f]),
        isComplete: formData.firstName && formData.lastName && formData.email &&
                    !validation.errors.firstName && !validation.errors.lastName && !validation.errors.email
      },
      1: {
        requiredFields: tab1Fields,
        hasErrors: tab1Fields.some(f => validation.errors[f]),
        errorFields: tab1Fields.filter(f => validation.errors[f]),
        isComplete: formData.hireDate && formData.departmentId && formData.positionId &&
                    !validation.errors.hireDate && !validation.errors.departmentId && !validation.errors.positionId
      },
      2: {
        requiredFields: [],
        hasErrors: tab2Fields.some(f => validation.errors[f]),
        errorFields: tab2Fields.filter(f => validation.errors[f]),
        isComplete: true
      },
      3: {
        requiredFields: [],
        hasErrors: tab3Fields.some(f => validation.errors[f]),
        errorFields: tab3Fields.filter(f => validation.errors[f]),
        isComplete: true
      }
    };
  }, [formData]);

  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
  }, []);

  const handleSubmit = async () => {
    // Authentication check
    if (!isAuthenticated) {
      setSubmitError('Please login to create employees.');
      return;
    }

    // Mark form as submitted for validation display
    setWasSubmitted(true);
    setSubmitError('');
    setSubmitSuccess('');
    
    // Password validation for user account
    if (formData.userAccount.enableLogin) {
      if (formData.userAccount.password !== formData.userAccount.confirmPassword) {
        setErrors({ 'userAccount.password': 'Passwords do not match' });
        setSubmitError('Password validation failed:\n\n• Passwords do not match');
        return;
      }
      if (formData.userAccount.password.length < 8) {
        setErrors({ 'userAccount.password': 'Password must be at least 8 characters' });
        setSubmitError('Password validation failed:\n\n• Password must be at least 8 characters');
        return;
      }
      // Backend requires complexity: uppercase, lowercase, digit, special char
      const complexityRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
      if (!complexityRegex.test(formData.userAccount.password)) {
        setErrors({ 'userAccount.password': 'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)' });
        setSubmitError('Password validation failed:\n\n• Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)');
        return;
      }
    }
    
    // Form validation
    const validation = validateEmployeeForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      
      const errorFields = Object.keys(validation.errors);
      const touchedErrorFields = errorFields.reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {});
      setTouchedFields(prev => ({ ...prev, ...touchedErrorFields }));
      
      const fieldLabels = {
        firstName: 'First Name',
        lastName: 'Last Name', 
        email: 'Email',
        employeeId: 'Employee ID',
        hireDate: 'Hire Date',
        departmentId: 'Department',
        positionId: 'Position',
        phone: 'Phone',
        dateOfBirth: 'Date of Birth',
        gender: 'Gender',
        maritalStatus: 'Marital Status',
        employmentType: 'Employment Type',
        pinCode: 'PIN Code',
        aadhaarNumber: 'Aadhaar Number',
        panNumber: 'PAN Number',
        ifscCode: 'IFSC Code',
        bankAccountNumber: 'Bank Account Number',
        emergencyContactPhone: 'Emergency Contact Phone',
        probationPeriod: 'Probation Period',
        noticePeriod: 'Notice Period',
        salaryStructure: 'Salary Structure'
      };
      
      const errorList = errorFields.map(field => {
        const label = fieldLabels[field] || field;
        return `• ${label}: ${validation.errors[field]}`;
      }).join('\n');
      
      setSubmitError(`Please fix the following validation errors:\n\n${errorList}`);
      
      const firstErrorField = errorFields[0];
      const element = document.getElementById(firstErrorField) || 
                      document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => element.focus(), 300);
      }
      
      return;
    }
    
    // Transform data for API
    const apiData = transformEmployeeDataForAPI(formData);
    
    // Use React Query mutations for create/update
    if (isEditMode) {
      updateMutation.mutate(
        { id, data: apiData },
        {
          onSuccess: async (employeeData) => {
            setSubmitSuccess('Employee updated successfully!');

            // Upload photo if one was selected during edit
            if (selectedPhoto && employeeData?.id) {
              try {
                await employeeService.uploadPhoto(employeeData.id, selectedPhoto);
                setSelectedPhoto(null);
              } catch (photoError) {
                console.warn('Photo upload failed:', photoError);
              }
            }
            
            // Handle user account creation if needed
            if (formData.userAccount.enableLogin && employeeData?.id) {
              try {
                const userAccountData = {
                  email: employeeData.email || formData.email,
                  role: formData.userAccount.role,
                  password: formData.userAccount.password,
                  forcePasswordChange: formData.userAccount.forcePasswordChange
                };
                await authService.createUserAccount(employeeData.id, userAccountData);
                setSubmitSuccess(prev => prev + ' User account updated successfully.');
              } catch (userError) {
                console.warn('User account operation failed:', userError);
                setSubmitSuccess(prev => prev + ' User account update failed - you can set this up later.');
              }
            }
            
            localStorage.removeItem('employeeFormDraft');
            setHasUnsavedChanges(false);
            
            // Navigate back to profile after brief delay
            setTimeout(() => {
              const dest = mode === 'self' ? '/my-profile' : `/employees/${id}`;
              navigate(dest, { state: { snackbar: 'Employee updated successfully.' } });
            }, 1200);
          },
          onError: (error) => {
            console.error('Error updating employee:', error);
            
            if (error.response?.status === 401) {
              setSubmitError('Session expired. Please login again.');
              authService.logout();
              navigate('/login');
            } else {
              let errorMessage = 'Failed to update employee. Please check the form and try again.';
              
              if (error.response?.data) {
                const responseData = error.response.data;
                
                if (responseData.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
                  const fieldErrors = responseData.errors.map((err, index) => {
                    if (typeof err === 'object' && err.field && err.message) {
                      return `${err.field}: ${err.message}`;
                    } else if (typeof err === 'string') {
                      return err;
                    } else if (err.path && err.message) {
                      return `${err.path}: ${err.message}`;
                    }
                    return `Error ${index + 1}: ${JSON.stringify(err)}`;
                  });
                  
                  errorMessage = `Please fix the following issues:\n\n${fieldErrors.join('\n')}`;
                } else if (responseData.message) {
                  errorMessage = responseData.message;
                } else if (responseData.error) {
                  errorMessage = responseData.error;
                }
              }
              
              setSubmitError(errorMessage);
            }
          }
        }
      );
    } else {
      // Create mode
      const mutationData = selectedPhoto 
        ? { data: apiData, photo: selectedPhoto }
        : { data: apiData };
      
      createMutation.mutate(mutationData, {
        onSuccess: async (employeeData) => {
          const created = employeeData;
          setSubmitSuccess(`Employee created successfully! Employee ID: ${created?.employeeId || 'Generated'}`);
          
          // Note: User account is created atomically by the backend's createEmployee service.
          // No separate authService.createUserAccount() call needed here.
          
          localStorage.removeItem('employeeFormDraft');
          setHasUnsavedChanges(false);
          
          // Navigate to new employee profile
          if (created?.id) {
            navigate(`/employees/${created.id}`, { state: { snackbar: 'Employee created successfully.' } });
          } else {
            navigate('/employees');
          }
        },
        onError: (error) => {
          console.error('Error creating employee:', error);
          
          if (error.response?.status === 401) {
            setSubmitError('Session expired. Please login again.');
            authService.logout();
            navigate('/login');
          } else {
            let errorMessage = 'Failed to create employee. Please check the form and try again.';
            
            if (error.response?.data) {
              const responseData = error.response.data;
              
              if (responseData.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
                const fieldErrors = responseData.errors.map((err, index) => {
                  if (typeof err === 'object' && err.field && err.message) {
                    return `${err.field}: ${err.message}`;
                  } else if (typeof err === 'string') {
                    return err;
                  } else if (err.path && err.message) {
                    return `${err.path}: ${err.message}`;
                  }
                  return `Error ${index + 1}: ${JSON.stringify(err)}`;
                });
                
                errorMessage = `Please fix the following issues:\n\n${fieldErrors.join('\n')}`;
              } else if (responseData.message) {
                errorMessage = responseData.message;
              } else if (responseData.error) {
                errorMessage = responseData.error;
              }
            }
            
            setSubmitError(errorMessage);
          }
        }
      });
    }
  };

  const handleBackToEmployees = useCallback(() => {
    const destination = mode === 'self' ? '/my-profile' : (isEditMode ? `/employees/${id}` : '/employees');
    if (hasUnsavedChanges) {
      setPendingNavigation(destination);
      setShowUnsavedDialog(true);
    } else {
      navigate(destination);
    }
  }, [navigate, hasUnsavedChanges, isEditMode, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };
  
  const handleConfirmNavigation = () => {
    setShowUnsavedDialog(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  };

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
    setPhotoPreview(null);
  };
  


  return {
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
    handleRestoreDraft: useCallback(() => {
      if (draftRestoreDialog.draftData) {
        const { savedAt, isDraft, ...restoredData } = draftRestoreDialog.draftData;
        setFormData(prevData => ({
          ...prevData,
          ...restoredData
        }));
        setLastSaved(new Date(draftRestoreDialog.draftData.savedAt));
      }
      setDraftRestoreDialog({ open: false, draftData: null, minutesAgo: 0 });
    }, [draftRestoreDialog.draftData]),
    handleDismissDraft: useCallback(() => {
      setDraftRestoreDialog({ open: false, draftData: null, minutesAgo: 0 });
    }, [])
  };
};
