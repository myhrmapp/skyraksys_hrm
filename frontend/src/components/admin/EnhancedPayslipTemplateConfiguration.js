import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Chip,
  Avatar,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  DragIndicator as DragIcon,
  CloudUpload as UploadIcon,
  Image as ImageIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
// Disabled for migration - drag/drop needs alternative implementation
// import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useLoading } from '../../contexts/LoadingContext';
import { useNotification } from '../../contexts/NotificationContext';
import { payrollService } from '../../services/payroll.service';
import ConfirmDialog from '../common/ConfirmDialog';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import PayslipPreview from './PayslipPreview';
import { TabPanel } from '../common/TabbedPage';

const EnhancedPayslipTemplateConfiguration = () => {
  const { isLoading, setLoading } = useLoading();
  const { showNotification } = useNotification();
  const { dialogProps, confirm } = useConfirmDialog();

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [logoPreview, setLogoPreview] = useState(null);
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    isDefault: false,
    
    // Fields (matching database schema)
    headerFields: [],
    earningsFields: [],
    deductionsFields: [],
    footerFields: [],
    
    // Enhanced Styling (stored in styling JSON column)
    styling: {
      // Typography
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      headingFontSize: '16px',
      
      // Colors
      primaryColor: '#1976d2',
      secondaryColor: '#424242',
      headerBackgroundColor: '#f5f5f5',
      footerBackgroundColor: '#f5f5f5',
      borderColor: '#e0e0e0',
      textColor: '#000000',
      labelColor: '#666666',
      
      // Layout
      pageSize: 'A4',
      orientation: 'portrait',
      margin: '20px',
      padding: '15px',
      borderWidth: '1px',
      borderStyle: 'solid',
      
      // Company Info (nested in styling)
      companyInfo: {
        name: '',
        logo: null,
        logoPosition: 'left',
        logoSize: 'medium',
        address: '',
        email: '',
        phone: '',
        website: '',
        gst: '',
        cin: '',
        pan: ''
      },
      
      // Custom CSS
      customCSS: '',
      
      // Watermark
      watermark: {
        enabled: false,
        text: 'CONFIDENTIAL',
        opacity: 0.1,
        fontSize: '48px',
        color: '#cccccc',
        rotation: -45
      },
      
      // HTML Templates
      htmlTemplates: {
        header: '',
        footer: '',
        disclaimer: 'This is a computer-generated payslip and does not require a signature.'
      }
    }
  });

  // Available payslip fields
  const availableFields = {
    header: [
      { id: 'companyName', label: 'Company Name', type: 'text' },
      { id: 'companyAddress', label: 'Company Address', type: 'text' },
      { id: 'payPeriod', label: 'Pay Period', type: 'text' },
      { id: 'payslipNumber', label: 'Payslip Number', type: 'text' },
      { id: 'employeeName', label: 'Employee Name', type: 'text' },
      { id: 'employeeId', label: 'Employee ID', type: 'text' },
      { id: 'department', label: 'Department', type: 'text' },
      { id: 'designation', label: 'Designation', type: 'text' },
      { id: 'bankAccount', label: 'Bank Account', type: 'text' },
      { id: 'panNumber', label: 'PAN Number', type: 'text' }
    ],
    earnings: [
      { id: 'basicSalary', label: 'Basic Salary', type: 'currency' },
      { id: 'hra', label: 'House Rent Allowance', type: 'currency' },
      { id: 'conveyance', label: 'Conveyance Allowance', type: 'currency' },
      { id: 'medical', label: 'Medical Allowance', type: 'currency' },
      { id: 'special', label: 'Special Allowance', type: 'currency' },
      { id: 'overtimePay', label: 'Overtime Pay', type: 'currency' },
      { id: 'bonus', label: 'Bonus', type: 'currency' },
      { id: 'grossSalary', label: 'Gross Salary', type: 'currency', calculated: true }
    ],
    deductions: [
      { id: 'pfContribution', label: 'PF Contribution', type: 'currency' },
      { id: 'esi', label: 'ESI', type: 'currency' },
      { id: 'tds', label: 'TDS', type: 'currency' },
      { id: 'professionalTax', label: 'Professional Tax', type: 'currency' },
      { id: 'loanDeduction', label: 'Loan Deduction', type: 'currency' },
      { id: 'advanceDeduction', label: 'Advance Deduction', type: 'currency' },
      { id: 'totalDeductions', label: 'Total Deductions', type: 'currency', calculated: true }
    ],
    footer: [
      { id: 'netSalary', label: 'Net Salary', type: 'currency', calculated: true },
      { id: 'netSalaryInWords', label: 'Net Salary in Words', type: 'text', calculated: true },
      { id: 'workingDays', label: 'Working Days', type: 'number' },
      { id: 'presentDays', label: 'Present Days', type: 'number' },
      { id: 'leavesTaken', label: 'Leaves Taken', type: 'number' },
      { id: 'generatedDate', label: 'Generated Date', type: 'date' },
      { id: 'paymentDate', label: 'Payment Date', type: 'date' }
    ]
  };

  // Predefined color themes
  const colorThemes = [
    { name: 'Professional Blue', primary: '#1976d2', secondary: '#424242' },
    { name: 'Corporate Gray', primary: '#607d8b', secondary: '#37474f' },
    { name: 'Modern Purple', primary: '#7b1fa2', secondary: '#4a148c' },
    { name: 'Enterprise Green', primary: '#388e3c', secondary: '#1b5e20' },
    { name: 'Executive Navy', primary: '#0d47a1', secondary: '#01579b' },
    { name: 'Elegant Teal', primary: '#00695c', secondary: '#004d40' }
  ];

  // Load existing templates
  const loadTemplates = useCallback(async () => {
    setLoading('load-templates', true);
    try {
      const response = await payrollService.getPayslipTemplates();
      // Backend returns { success: true, data: { templates: [...], pagination: {} } }
      const d = response.data;
      const templatesData =
        Array.isArray(d?.data?.templates) ? d.data.templates  // { data: { templates: [] } }
        : Array.isArray(d?.data)          ? d.data            // { data: [] }
        : Array.isArray(d?.templates)     ? d.templates       // { templates: [] }
        : Array.isArray(d)                ? d                 // raw array
        : [];
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load templates:', error);
      showNotification('Failed to load payslip templates', 'error');
      setTemplates([]); // Set empty array on error
    } finally {
      setLoading('load-templates', false);
    }
  }, [setLoading, showNotification]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateTemplate = () => {
    setTemplateForm({
      name: '',
      description: '',
      isDefault: false,
      headerFields: [],
      earningsFields: [],
      deductionsFields: [],
      footerFields: [],
      styling: {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        headingFontSize: '16px',
        primaryColor: '#1976d2',
        secondaryColor: '#424242',
        headerBackgroundColor: '#f5f5f5',
        footerBackgroundColor: '#f5f5f5',
        borderColor: '#e0e0e0',
        textColor: '#000000',
        labelColor: '#666666',
        pageSize: 'A4',
        orientation: 'portrait',
        margin: '20px',
        padding: '15px',
        borderWidth: '1px',
        borderStyle: 'solid',
        customCSS: '',
        companyInfo: {
          name: '',
          logo: null,
          logoPosition: 'left',
          logoSize: 'medium',
          address: '',
          email: '',
          phone: '',
          website: '',
          gst: '',
          cin: '',
          pan: ''
        },
        watermark: {
          enabled: false,
          text: 'CONFIDENTIAL',
          opacity: 0.1,
          fontSize: '48px',
          color: '#cccccc',
          rotation: -45
        },
        htmlTemplates: {
          header: '',
          footer: '',
          disclaimer: 'This is a computer-generated payslip and does not require a signature.'
        }
      }
    });
    setSelectedTemplate(null);
    setLogoPreview(null);
    setTemplateDialog(true);
    setActiveTab(0);
  };

  const handleEditTemplate = (template) => {
    setTemplateForm(template);
    setSelectedTemplate(template);
    setLogoPreview(template.styling?.companyInfo?.logo || null);
    setTemplateDialog(true);
    setActiveTab(0);
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showNotification('Logo file size must be less than 2MB', 'warning');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setLogoPreview(base64);
        setTemplateForm(prev => ({
          ...prev,
          styling: { 
            ...prev.styling, 
            companyInfo: { ...prev.styling.companyInfo, logo: base64 }
          }
        }));
        showNotification('Logo uploaded successfully', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setTemplateForm(prev => ({
      ...prev,
      styling: { 
        ...prev.styling, 
        companyInfo: { ...prev.styling.companyInfo, logo: null }
      }
    }));
  };

  const applyColorTheme = (theme) => {
    setTemplateForm(prev => ({
      ...prev,
      styling: {
        ...prev.styling,
        primaryColor: theme.primary,
        secondaryColor: theme.secondary,
        headerBackgroundColor: `${theme.primary}15`,
        footerBackgroundColor: `${theme.primary}08`
      }
    }));
    showNotification(`Applied ${theme.name} theme`, 'success');
  };

  const handleSaveTemplate = async () => {
    // Validation
    if (!templateForm.name.trim()) {
      showNotification('Template name is required', 'warning');
      setActiveTab(0); // Go to basic info tab
      return;
    }

    if (templateForm.name.trim().length < 3) {
      showNotification('Template name must be at least 3 characters', 'warning');
      setActiveTab(0);
      return;
    }

    setLoading('save-template', true);
    try {
      if (selectedTemplate) {
        await payrollService.updatePayslipTemplate(selectedTemplate.id, templateForm);
        showNotification('✅ Template updated successfully', 'success');
      } else {
        await payrollService.createPayslipTemplate(templateForm);
        showNotification('✅ Template created successfully', 'success');
      }
      
      setTemplateDialog(false);
      setActiveTab(0); // Reset to first tab
      loadTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save template';
      showNotification(`❌ ${errorMessage}`, 'error');
    } finally {
      setLoading('save-template', false);
    }
  };

  const handleDeleteTemplate = (templateId) => {
    confirm({
      title: 'Delete Template',
      message: 'Are you sure you want to delete this template?',
      variant: 'danger',
      onConfirm: async () => {
        setLoading('delete-template', true);
        try {
          await payrollService.deletePayslipTemplate(templateId);
          showNotification('Template deleted successfully', 'success');
          loadTemplates();
        } catch (error) {
          console.error('Failed to delete template:', error);
          showNotification('Failed to delete template', 'error');
        } finally {
          setLoading('delete-template', false);
        }
      }
    });
  };

  const addFieldToSection = (section, field) => {
    setTemplateForm(prev => ({
      ...prev,
      [`${section}Fields`]: [...prev[`${section}Fields`], { ...field, id: `${field.id}_${Date.now()}` }]
    }));
  };

  const removeFieldFromSection = (section, fieldIndex) => {
    setTemplateForm(prev => ({
      ...prev,
      [`${section}Fields`]: prev[`${section}Fields`].filter((_, index) => index !== fieldIndex)
    }));
  };

  // eslint-disable-next-line no-unused-vars
  const handleDragEnd = (result, section) => {
    if (!result.destination) return;

    const items = Array.from(templateForm[`${section}Fields`]);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTemplateForm(prev => ({
      ...prev,
      [`${section}Fields`]: items
    }));
  };

  const renderFieldSection = (section, title, availableFields) => (
    <Accordion defaultExpanded>
      <AccordionSummary 
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${section}-fields-content`}
        id={`${section}-fields-header`}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Typography variant="h6">{title}</Typography>
          <Chip 
            label={`${templateForm[`${section}Fields`].length} selected`} 
            size="small" 
            color={templateForm[`${section}Fields`].length > 0 ? 'primary' : 'default'}
            sx={{ ml: 'auto' }} 
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
          <strong>Step 1:</strong> Click on available fields below to add them to your template
        </Typography>
        <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {availableFields.map(field => (
            <Chip
              key={field.id}
              label={field.label}
              onClick={() => addFieldToSection(section, field)}
              disabled={templateForm[`${section}Fields`].some(f => f.id.startsWith(field.id))}
              color={field.calculated ? 'secondary' : 'default'}
              variant="outlined"
              icon={<AddIcon />}
              clickable
              sx={{
                '&:hover': { transform: 'scale(1.05)' },
                '&:focus': { outline: '2px solid', outlineColor: 'primary.main' },
                transition: 'all 0.2s'
              }}
            />
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
          <strong>Step 2:</strong> Drag and drop selected fields below to reorder them
        </Typography>
        {templateForm[`${section}Fields`].length === 0 ? (
          <Alert severity="info" icon={<LightbulbIcon />}>
            No fields selected yet. Click on available fields above to add them to your template.
          </Alert>
        ) : (
          <List
            sx={{
              bgcolor: 'transparent',
              borderRadius: 1,
              p: 1,
            }}
          >
            {templateForm[`${section}Fields`].map((field, index) => (
              <ListItem
                key={field.id}
                sx={{ 
                  border: 1, 
                  borderColor: 'grey.300', 
                  mb: 1, 
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <Box sx={{ mr: 1, cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                  <DragIcon color="action" />
                </Box>
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>{field.label}</Typography>
                      {field.calculated && (
                        <Chip label="Auto-calculated" size="small" color="secondary" variant="outlined" />
                      )}
                    </Box>
                  }
                  secondary={`Type: ${field.type}`} 
                />
                <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
                  <Tooltip title="Move up">
                    <span>
                      <IconButton
                        size="small"
                        disabled={index === 0}
                        onClick={() => {
                          const fields = [...templateForm[`${section}Fields`]];
                          [fields[index - 1], fields[index]] = [fields[index], fields[index - 1]];
                          setTemplateForm(prev => ({ ...prev, [`${section}Fields`]: fields }));
                        }}
                        aria-label={`Move ${field.label} up`}
                      >
                        <Typography sx={{ fontSize: 16 }}>▲</Typography>
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton
                        size="small"
                        disabled={index === templateForm[`${section}Fields`].length - 1}
                        onClick={() => {
                          const fields = [...templateForm[`${section}Fields`]];
                          [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
                          setTemplateForm(prev => ({ ...prev, [`${section}Fields`]: fields }));
                        }}
                        aria-label={`Move ${field.label} down`}
                      >
                        <Typography sx={{ fontSize: 16 }}>▼</Typography>
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
                <ListItemSecondaryAction>
                  <Tooltip title="Remove field">
                    <IconButton
                      edge="end"
                      onClick={() => removeFieldFromSection(section, index)}
                      size="small"
                      color="error"
                      aria-label={`Remove ${field.label}`}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </AccordionDetails>
    </Accordion>
  );

  // TabPanel imported from ../common/TabbedPage

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle shortcuts when dialog is open
      if (!templateDialog) return;

      // Ctrl/Cmd + S to save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (activeTab === 4) {
          handleSaveTemplate();
        }
      }

      // Ctrl/Cmd + Right Arrow to go to next tab
      if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowRight') {
        event.preventDefault();
        if (activeTab < 4) {
          setActiveTab(activeTab + 1);
        }
      }

      // Ctrl/Cmd + Left Arrow to go to previous tab
      if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowLeft') {
        event.preventDefault();
        if (activeTab > 0) {
          setActiveTab(activeTab - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [templateDialog, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box sx={{ p: 3 }} data-testid="payslip-template-config-page">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            📄 Payslip Template Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create and customize payslip templates with logo, colors, and HTML customization
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleCreateTemplate}
          data-testid="payslip-template-create-btn"
        >
          Create Template
        </Button>
      </Box>

      {/* Templates Grid */}
      {isLoading('load-templates') ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={6} lg={4} key={i}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ width: 40, height: 40, bgcolor: 'grey.300', borderRadius: 1 }} />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ height: 20, bgcolor: 'grey.300', borderRadius: 1, mb: 1 }} />
                      <Box sx={{ height: 16, bgcolor: 'grey.200', borderRadius: 1, width: '60%' }} />
                    </Box>
                  </Box>
                  <Box sx={{ height: 40, bgcolor: 'grey.200', borderRadius: 1, mb: 2 }} />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ height: 32, width: 80, bgcolor: 'grey.300', borderRadius: 1 }} />
                    <Box sx={{ height: 32, width: 80, bgcolor: 'grey.300', borderRadius: 1 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid item xs={12} md={6} lg={4} key={template.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  '&:hover': { 
                    boxShadow: 6, 
                    transform: 'translateY(-4px)' 
                  }
                }}
              >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {template.styling?.companyInfo?.logo && (
                      <Avatar 
                        src={template.styling.companyInfo.logo} 
                        variant="rounded"
                        sx={{ width: 40, height: 40 }}
                      />
                    )}
                    <Typography variant="h6">
                      {template.name}
                    </Typography>
                  </Box>
                  {template.isDefault && (
                    <Chip label="Default" color="success" size="small" />
                  )}
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {template.description || 'No description'}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                  <Chip 
                    label={`${(template.headerFields?.length || 0) + 
                           (template.earningsFields?.length || 0) + 
                           (template.deductionsFields?.length || 0) + 
                           (template.footerFields?.length || 0)} Fields`} 
                    size="small" 
                    variant="outlined"
                  />
                  {template.styling?.companyInfo?.logo && (
                    <Chip label="Has Logo" size="small" icon={<ImageIcon />} />
                  )}
                  {template.styling?.customCSS && (
                    <Chip label="Custom CSS" size="small" icon={<CodeIcon />} />
                  )}
                </Stack>

                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditTemplate(template)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PreviewIcon />}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setPreviewDialog(true);
                    }}
                  >
                    Preview
                  </Button>
                  {!template.isDefault && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

          {templates.length === 0 && !isLoading('load-templates') && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Templates Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create your first payslip template to get started
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateTemplate}
                >
                  Create First Template
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Enhanced Template Editor Dialog */}
      <Dialog 
        open={templateDialog} 
        onClose={() => setTemplateDialog(false)} 
        maxWidth="xl" 
        fullWidth
        disableEscapeKeyDown={false}
        keepMounted={false}
        PaperProps={{ 
          sx: { height: '90vh' },
          role: 'dialog',
          'aria-labelledby': 'template-dialog-title'
        }}
      >
        <DialogTitle id="template-dialog-title">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="h2">
              {selectedTemplate ? '✏️ Edit Template' : '➕ Create Template'}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip 
                label={`Step ${activeTab + 1} of 5`} 
                color="primary" 
                variant="outlined"
                size="small"
              />
              <Typography variant="caption" color="text.secondary">
                Press Tab to navigate, Esc to close
              </Typography>
            </Stack>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Tabs 
            value={activeTab} 
            onChange={(e, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
            aria-label="Template configuration steps"
          >
            <Tab 
              label="1. Basic Info" 
              id="tab-0" 
              aria-controls="tabpanel-0"
              icon={activeTab === 0 ? <Typography variant="caption">📝</Typography> : null}
              iconPosition="start"
            />
            <Tab 
              label="2. Company & Logo" 
              id="tab-1" 
              aria-controls="tabpanel-1"
              icon={activeTab === 1 ? <Typography variant="caption">🏢</Typography> : null}
              iconPosition="start"
            />
            <Tab 
              label="3. Fields" 
              id="tab-2" 
              aria-controls="tabpanel-2"
              icon={activeTab === 2 ? <Typography variant="caption">📋</Typography> : null}
              iconPosition="start"
            />
            <Tab 
              label="4. Styling & Colors" 
              id="tab-3" 
              aria-controls="tabpanel-3"
              icon={activeTab === 3 ? <Typography variant="caption">🎨</Typography> : null}
              iconPosition="start"
            />
            <Tab 
              label="5. Advanced" 
              id="tab-4" 
              aria-controls="tabpanel-4"
              icon={activeTab === 4 ? <Typography variant="caption">⚙️</Typography> : null}
              iconPosition="start"
            />
          </Tabs>

          {/* Tab 1: Basic Info */}
          <TabPanel value={activeTab} index={0} contentSx={{ py: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Alert severity="info" icon={<Typography>ℹ️</Typography>}>
                  <strong>Getting Started:</strong> Give your template a unique name and description. 
                  You can set it as default to use for all new payslips.
                </Alert>
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Template Name *"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  error={templateForm.name.trim().length > 0 && templateForm.name.trim().length < 3}
                  helperText={
                    templateForm.name.trim().length > 0 && templateForm.name.trim().length < 3
                      ? "Name must be at least 3 characters"
                      : "E.g., 'Monthly Salary Template' or 'Executive Payslip'"
                  }
                  autoFocus
                  inputProps={{
                    maxLength: 100,
                    'aria-label': 'Template name',
                    'aria-required': 'true'
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={templateForm.isDefault}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                      color="primary"
                      inputProps={{ 'aria-label': 'Set as default template' }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">Set as Default Template</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Use this for all new payslips
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  multiline
                  rows={3}
                  helperText={`${templateForm.description?.length || 0}/500 - Brief description of what this template is used for`}
                  inputProps={{
                    maxLength: 500,
                    'aria-label': 'Template description'
                  }}
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 2: Company & Logo */}
          <TabPanel value={activeTab} index={1} contentSx={{ py: 3 }}>
            <Grid container spacing={3}>
              {/* Logo Upload Section */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      🏢 Company Logo
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                      <Box>
                        {logoPreview ? (
                          <Box sx={{ position: 'relative' }}>
                            <Avatar 
                              src={logoPreview} 
                              variant="rounded"
                              sx={{ width: 120, height: 120 }}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              sx={{ position: 'absolute', top: -10, right: -10 }}
                              onClick={handleRemoveLogo}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        ) : (
                          <Avatar 
                            variant="rounded"
                            sx={{ width: 120, height: 120, bgcolor: 'grey.200' }}
                          >
                            <ImageIcon sx={{ fontSize: 48, color: 'grey.500' }} />
                          </Avatar>
                        )}
                      </Box>
                      <Box>
                        <Button
                          variant="contained"
                          component="label"
                          startIcon={<UploadIcon />}
                        >
                          Upload Logo
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handleLogoUpload}
                          />
                        </Button>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          Recommended: 300x300px, PNG/JPG, Max 2MB
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>Logo Position</InputLabel>
                          <Select
                            value={["left","center","right"].includes(templateForm.styling.companyInfo.logoPosition) ? templateForm.styling.companyInfo.logoPosition : ""}
                            onChange={(e) => setTemplateForm(prev => ({
                              ...prev,
                              styling: { ...prev.styling, companyInfo: { ...prev.styling.companyInfo, logoPosition: e.target.value }}
                            }))}
                          >
                            <MenuItem value="left">Left</MenuItem>
                            <MenuItem value="center">Center</MenuItem>
                            <MenuItem value="right">Right</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>Logo Size</InputLabel>
                          <Select
                            value={["small","medium","large"].includes(templateForm.styling.companyInfo.logoSize) ? templateForm.styling.companyInfo.logoSize : ""}
                            onChange={(e) => setTemplateForm(prev => ({
                              ...prev,
                              styling: { ...prev.styling, companyInfo: { ...prev.styling.companyInfo, logoSize: e.target.value }}
                            }))}
                          >
                            <MenuItem value="small">Small (60px)</MenuItem>
                            <MenuItem value="medium">Medium (80px)</MenuItem>
                            <MenuItem value="large">Large (120px)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Company Information */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Company Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Company Name *"
                          value={templateForm.styling.companyInfo.name}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, companyInfo: { ...prev.styling.companyInfo, name: e.target.value }}
                          }))}
                          required
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Address"
                          value={templateForm.styling.companyInfo.address}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, companyInfo: { ...prev.styling.companyInfo, address: e.target.value }}
                          }))}
                          multiline
                          rows={2}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Email"
                          type="email"
                          value={templateForm.styling.companyInfo.email}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, companyInfo: { ...prev.styling.companyInfo, email: e.target.value }}
                          }))}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Phone"
                          value={templateForm.styling.companyInfo.phone}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, companyInfo: { ...prev.styling.companyInfo, phone: e.target.value }}
                          }))}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Website"
                          value={templateForm.styling.companyInfo.website}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, companyInfo: { ...prev.styling.companyInfo, website: e.target.value }}
                          }))}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="GST Number"
                          value={templateForm.styling.companyInfo.gst}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, companyInfo: { ...prev.styling.companyInfo, gst: e.target.value }}
                          }))}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="CIN"
                          value={templateForm.styling.companyInfo.cin}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, companyInfo: { ...prev.styling.companyInfo, cin: e.target.value }}
                          }))}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="PAN"
                          value={templateForm.styling.companyInfo.pan}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, companyInfo: { ...prev.styling.companyInfo, pan: e.target.value }}
                          }))}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 3: Fields */}
          <TabPanel value={activeTab} index={2} contentSx={{ py: 3 }}>
            <Alert severity="info" icon={<Typography>📋</Typography>} sx={{ mb: 3 }}>
              <strong>Configure Payslip Fields:</strong> Select which fields to include in your payslip template. 
              You can add, remove, and reorder fields in each section. Fields marked as "Auto-calculated" will be computed automatically.
            </Alert>
            <Stack spacing={2}>
              {renderFieldSection('header', '📋 Header Fields', availableFields.header)}
              {renderFieldSection('earnings', '💰 Earnings Fields', availableFields.earnings)}
              {renderFieldSection('deductions', '➖ Deductions Fields', availableFields.deductions)}
              {renderFieldSection('footer', '📊 Footer Fields', availableFields.footer)}
            </Stack>

            {/* Progress Summary */}
            <Paper sx={{ p: 2, mt: 3, bgcolor: 'primary.50', borderLeft: 4, borderColor: 'primary.main' }}>
              <Typography variant="subtitle2" gutterBottom>
                📊 Template Progress
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Header</Typography>
                  <Typography variant="h6">{templateForm.headerFields.length} fields</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Earnings</Typography>
                  <Typography variant="h6">{templateForm.earningsFields.length} fields</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Deductions</Typography>
                  <Typography variant="h6">{templateForm.deductionsFields.length} fields</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Footer</Typography>
                  <Typography variant="h6">{templateForm.footerFields.length} fields</Typography>
                </Grid>
              </Grid>
            </Paper>
          </TabPanel>

          {/* Tab 4: Styling & Colors */}
          <TabPanel value={activeTab} index={3} contentSx={{ py: 3 }}>
            <Grid container spacing={3}>
              {/* Color Themes */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      🎨 Quick Color Themes
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Select a pre-designed color theme or customize your own colors below
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      {colorThemes.map((theme, index) => (
                        <Grid item xs={6} md={4} lg={2} key={theme.name}>
                          <Paper
                            component="button"
                            type="button"
                            sx={{
                              p: 2,
                              cursor: 'pointer',
                              border: 2,
                              borderColor: templateForm.styling.primaryColor === theme.primary ? 'primary.main' : 'transparent',
                              '&:hover': { borderColor: 'primary.light', transform: 'scale(1.02)' },
                              '&:focus': { borderColor: 'primary.main', outline: '2px solid', outlineColor: 'primary.light' },
                              transition: 'all 0.2s',
                              backgroundColor: 'background.paper',
                              width: '100%',
                              textAlign: 'left'
                            }}
                            onClick={() => applyColorTheme(theme)}
                            tabIndex={0}
                            aria-label={`Apply ${theme.name} theme`}
                            role="button"
                          >
                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                              <Box 
                                sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  bgcolor: theme.primary, 
                                  borderRadius: 1,
                                  boxShadow: 1
                                }} 
                                aria-hidden="true"
                              />
                              <Box 
                                sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  bgcolor: theme.secondary, 
                                  borderRadius: 1,
                                  boxShadow: 1
                                }} 
                                aria-hidden="true"
                              />
                            </Box>
                            <Typography variant="body2" fontWeight={templateForm.styling.primaryColor === theme.primary ? 600 : 400}>
                              {theme.name}
                            </Typography>
                            {templateForm.styling.primaryColor === theme.primary && (
                              <Chip label="Active" size="small" color="primary" sx={{ mt: 0.5 }} />
                            )}
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Custom Colors */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Custom Colors
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Primary Color"
                          type="color"
                          value={templateForm.styling.primaryColor}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, primaryColor: e.target.value }
                          }))}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Secondary Color"
                          type="color"
                          value={templateForm.styling.secondaryColor}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, secondaryColor: e.target.value }
                          }))}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Header Background"
                          type="color"
                          value={templateForm.styling.headerBackgroundColor}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, headerBackgroundColor: e.target.value }
                          }))}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Footer Background"
                          type="color"
                          value={templateForm.styling.footerBackgroundColor}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, footerBackgroundColor: e.target.value }
                          }))}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Text Color"
                          type="color"
                          value={templateForm.styling.textColor}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, textColor: e.target.value }
                          }))}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Border Color"
                          type="color"
                          value={templateForm.styling.borderColor}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, borderColor: e.target.value }
                          }))}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Typography */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Typography
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>Font Family</InputLabel>
                          <Select
                            value={["Arial, sans-serif","'Times New Roman', serif","Helvetica, sans-serif","Georgia, serif","'Courier New', monospace"].includes(templateForm.styling.fontFamily) ? templateForm.styling.fontFamily : ""}
                            onChange={(e) => setTemplateForm(prev => ({
                              ...prev,
                              styling: { ...prev.styling, fontFamily: e.target.value }
                            }))}
                          >
                            <MenuItem value="Arial, sans-serif">Arial</MenuItem>
                            <MenuItem value="'Times New Roman', serif">Times New Roman</MenuItem>
                            <MenuItem value="Helvetica, sans-serif">Helvetica</MenuItem>
                            <MenuItem value="Georgia, serif">Georgia</MenuItem>
                            <MenuItem value="'Courier New', monospace">Courier New</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Font Size"
                          value={templateForm.styling.fontSize}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, fontSize: e.target.value }
                          }))}
                          helperText="E.g., 12px, 0.875rem"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Heading Font Size"
                          value={templateForm.styling.headingFontSize}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, headingFontSize: e.target.value }
                          }))}
                          helperText="E.g., 16px, 1rem"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Layout */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Layout
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>Page Size</InputLabel>
                          <Select
                            value={["A4","Letter"].includes(templateForm.styling.pageSize) ? templateForm.styling.pageSize : ""}
                            onChange={(e) => setTemplateForm(prev => ({
                              ...prev,
                              styling: { ...prev.styling, pageSize: e.target.value }
                            }))}
                          >
                            <MenuItem value="A4">A4</MenuItem>
                            <MenuItem value="Letter">Letter</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>Orientation</InputLabel>
                          <Select
                            value={["portrait","landscape"].includes(templateForm.styling.orientation) ? templateForm.styling.orientation : ""}
                            onChange={(e) => setTemplateForm(prev => ({
                              ...prev,
                              styling: { ...prev.styling, orientation: e.target.value }
                            }))}
                          >
                            <MenuItem value="portrait">Portrait</MenuItem>
                            <MenuItem value="landscape">Landscape</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Page Margin"
                          value={templateForm.styling.margin}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, margin: e.target.value }
                          }))}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 5: Advanced */}
          <TabPanel value={activeTab} index={4} contentSx={{ py: 3 }}>
            <Grid container spacing={3}>
              {/* Watermark */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        🔒 Watermark
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={templateForm.styling.watermark.enabled}
                            onChange={(e) => setTemplateForm(prev => ({
                              ...prev,
                              styling: {
                                ...prev.styling,
                                watermark: { ...prev.styling.watermark, enabled: e.target.checked }
                              }
                            }))}
                          />
                        }
                        label="Enable Watermark"
                      />
                    </Box>
                    
                    {templateForm.styling.watermark.enabled && (
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Watermark Text"
                            value={templateForm.styling.watermark.text}
                            onChange={(e) => setTemplateForm(prev => ({
                              ...prev,
                              styling: {
                                ...prev.styling,
                                watermark: { ...prev.styling.watermark, text: e.target.value }
                              }
                            }))}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Opacity"
                            type="number"
                            inputProps={{ min: 0, max: 1, step: 0.1 }}
                            value={templateForm.styling.watermark.opacity}
                            onChange={(e) => setTemplateForm(prev => ({
                              ...prev,
                              styling: {
                                ...prev.styling,
                                watermark: { ...prev.styling.watermark, opacity: parseFloat(e.target.value) }
                              }
                            }))}
                          />
                        </Grid>
                      </Grid>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Custom HTML */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      📝 Custom HTML Templates
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Custom Header HTML"
                          value={templateForm.styling.htmlTemplates.header}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, htmlTemplates: { ...prev.styling.htmlTemplates, header: e.target.value }}
                          }))}
                          multiline
                          rows={4}
                          helperText="HTML code for custom header section"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Custom Footer HTML"
                          value={templateForm.styling.htmlTemplates.footer}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, htmlTemplates: { ...prev.styling.htmlTemplates, footer: e.target.value }}
                          }))}
                          multiline
                          rows={4}
                          helperText="HTML code for custom footer section"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Disclaimer Text"
                          value={templateForm.styling.htmlTemplates.disclaimer}
                          onChange={(e) => setTemplateForm(prev => ({
                            ...prev,
                            styling: { ...prev.styling, htmlTemplates: { ...prev.styling.htmlTemplates, disclaimer: e.target.value }}
                          }))}
                          multiline
                          rows={2}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Custom CSS */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      🎨 Custom CSS
                    </Typography>
                    <TextField
                      fullWidth
                      label="Custom CSS Code"
                      value={templateForm.styling.customCSS}
                      onChange={(e) => setTemplateForm(prev => ({
                        ...prev,
                        styling: { ...prev.styling, customCSS: e.target.value }
                      }))}
                      multiline
                      rows={10}
                      helperText="Add custom CSS for advanced styling"
                      InputProps={{
                        sx: { fontFamily: 'monospace', fontSize: '12px' }
                      }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            {/* Left side - Help text */}
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5 }}>
              <LightbulbIcon fontSize="small" /> Tip: Use Ctrl+← → to navigate tabs, Ctrl+S to save
            </Typography>

            {/* Right side - Action buttons */}
            <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
              <Button 
                onClick={() => {
                  setTemplateDialog(false);
                  setActiveTab(0);
                }}
                variant="outlined"
              >
                Cancel
              </Button>
              {activeTab > 0 && (
                <Button 
                  onClick={() => setActiveTab(activeTab - 1)}
                  variant="outlined"
                  startIcon={<span>←</span>}
                >
                  Previous
                </Button>
              )}
              {activeTab < 4 ? (
                <Button 
                  variant="contained" 
                  onClick={() => setActiveTab(activeTab + 1)}
                  endIcon={<span>→</span>}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSaveTemplate}
                  variant="contained"
                  color="success"
                  startIcon={<SaveIcon />}
                  disabled={isLoading('save-template')}
                  sx={{ minWidth: 120 }}
                >
                  {isLoading('save-template') ? 'Saving...' : 'Save Template'}
                </Button>
              )}
            </Stack>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Template Preview
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', minHeight: 600, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ width: '100%', maxWidth: '800px' }}>
                <PayslipPreview template={selectedTemplate} />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
};

export default React.memo(EnhancedPayslipTemplateConfiguration);
