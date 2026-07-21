import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
  Typography
} from '@mui/material';
import { Add, Delete, Edit, Inbox as InboxIcon, Refresh, PictureAsPdf } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { invoiceService } from '../../../services/invoice.service';
import http from '../../../http-common';
import EmptyState from '../../shared/EmptyState';
import ConfirmDialog from '../../common/ConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';

let lineItemKeySeed = 0;
const nextLineItemKey = () => {
  lineItemKeySeed += 1;
  return `row_${Date.now()}_${lineItemKeySeed}`;
};

const defaultInvoiceForm = () => ({
  id: null,
  clientCompany: '',
  clientGstin: '',
  clientAddress: '',
  billingMonth: new Date().getMonth() + 1,
  billingYear: new Date().getFullYear(),
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  currency: 'INR',
  workerType: 'mixed',
  templateId: '',
  taxPercent: 18,
  notes: '',
  lineItems: [
    {
      rowKey: nextLineItemKey(),
      employeeId: '',
      employeeName: '',
      employmentType: 'permanent',
      hoursSupported: 0,
      hourlyRate: 0,
      description: ''
    }
  ]
});

const defaultTemplateForm = () => ({
  id: null,
  name: '',
  description: '',
  currency: 'INR',
  isDefault: false,
  isActive: true,
  templateData: {
    title: 'Service Invoice',
    termsAndConditions: 'Payment due within 15 days from invoice date.',
    footerNote: 'This is a system-generated invoice.'
  }
});

const InvoiceManagementPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { dialogProps, confirm } = useConfirmDialog();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [phraseDialogOpen, setPhraseDialogOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(defaultInvoiceForm());
  const [templateForm, setTemplateForm] = useState(defaultTemplateForm());
  const [filters, setFilters] = useState({ month: '', year: '', status: '' });
  const [secretPhrase, setSecretPhrase] = useState('');
  const [sensitiveDataHidden, setSensitiveDataHidden] = useState(false);
  const [phraseForm, setPhraseForm] = useState({
    password: '',
    currentPhrase: '',
    newPhrase: '',
    confirmPhrase: ''
  });

  const getStatusChipColor = (status) => {
    if (status === 'paid') return 'success';
    if (status === 'sent') return 'info';
    if (status === 'cancelled') return 'error';
    return 'default';
  };

  const loadData = async (phraseOverride = '') => {
    try {
      setLoading(true);
      const activePhrase = phraseOverride || secretPhrase;
      const [invoiceRes, templateRes, employeeRes] = await Promise.all([
        invoiceService.getInvoices(filters, activePhrase),
        invoiceService.getTemplates(activePhrase),
        http.get('/employees', { params: { limit: 1000 } })
      ]);

      setInvoices(invoiceRes.data?.data?.invoices || []);
      setSensitiveDataHidden(!!invoiceRes.data?.data?.encryption?.sensitiveDataHidden);
      setTemplates(templateRes.data?.data || []);
      setEmployees(employeeRes.data?.data || []);
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to load invoice data';
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const unlockInvoiceData = async () => {
    if (!secretPhrase.trim()) {
      enqueueSnackbar('Enter the HR secret phrase to unlock sensitive invoice data', { variant: 'warning' });
      return;
    }

    await loadData(secretPhrase);
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const invoiceTotals = useMemo(() => {
    const subtotal = invoiceForm.lineItems.reduce((sum, item) => {
      const amount = (Number(item.hoursSupported || 0) * Number(item.hourlyRate || 0));
      return sum + amount;
    }, 0);
    const taxAmount = (subtotal * Number(invoiceForm.taxPercent || 0)) / 100;
    const totalAmount = subtotal + taxAmount;
    return {
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2)
    };
  }, [invoiceForm.lineItems, invoiceForm.taxPercent]);

  const addLineItem = () => {
    setInvoiceForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          rowKey: nextLineItemKey(),
          employeeId: '',
          employeeName: '',
          employmentType: 'permanent',
          hoursSupported: 0,
          hourlyRate: 0,
          description: ''
        }
      ]
    }));
  };

  const removeLineItem = (index) => {
    setInvoiceForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const updateLineItem = (index, key, value) => {
    setInvoiceForm((prev) => {
      const updated = [...prev.lineItems];
      const target = { ...updated[index], [key]: value };

      if (key === 'employeeId') {
        const emp = employees.find((e) => e.id === value);
        if (emp) {
          target.employeeName = `${emp.firstName} ${emp.lastName}`;
          target.employmentType = (emp.employmentType || 'permanent').toLowerCase() === 'contractor' ? 'contractor' : 'permanent';
        }
      }

      updated[index] = target;
      return { ...prev, lineItems: updated };
    });
  };

  const openCreateInvoice = () => {
    setInvoiceForm(defaultInvoiceForm());
    setInvoiceDialogOpen(true);
  };

  const openEditInvoice = (invoice) => {
    if (invoice.isSensitiveDataHidden) {
      enqueueSnackbar('Enter secret phrase and refresh before editing encrypted invoices', { variant: 'warning' });
      return;
    }

    setInvoiceForm({
      id: invoice.id,
      clientCompany: invoice.clientCompany || '',
      clientGstin: invoice.clientGstin || '',
      clientAddress: invoice.clientAddress || '',
      billingMonth: invoice.billingMonth,
      billingYear: invoice.billingYear,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency || 'INR',
      workerType: invoice.workerType || 'mixed',
      templateId: invoice.templateId || '',
      taxPercent: Number(invoice.taxPercent || 0),
      notes: invoice.notes || '',
      lineItems: (invoice.lineItems || []).map((item) => ({
        rowKey: nextLineItemKey(),
        employeeId: item.employeeId || '',
        employeeName: item.employeeName || '',
        employmentType: item.employmentType || 'permanent',
        hoursSupported: Number(item.hoursSupported || 0),
        hourlyRate: Number(item.hourlyRate || 0),
        description: item.description || ''
      }))
    });
    setInvoiceDialogOpen(true);
  };

  const saveInvoice = async () => {
    try {
      if (!invoiceForm.clientCompany || invoiceForm.lineItems.length === 0) {
        enqueueSnackbar('Client company and at least one line item are required', { variant: 'warning' });
        return;
      }

      if (!secretPhrase.trim()) {
        enqueueSnackbar('Secret phrase is required to save encrypted invoices', { variant: 'warning' });
        return;
      }

      const payload = {
        ...invoiceForm,
        templateId: invoiceForm.templateId || null,
        lineItems: invoiceForm.lineItems.map(({ rowKey, ...item }) => ({
          ...item,
          hoursSupported: Number(item.hoursSupported || 0),
          hourlyRate: Number(item.hourlyRate || 0)
        }))
      };

      if (invoiceForm.id) {
        await invoiceService.updateInvoice(invoiceForm.id, payload, secretPhrase);
        enqueueSnackbar('Invoice updated successfully', { variant: 'success' });
      } else {
        await invoiceService.createInvoice(payload, secretPhrase);
        enqueueSnackbar('Invoice created successfully', { variant: 'success' });
      }

      setInvoiceDialogOpen(false);
      setInvoiceForm(defaultInvoiceForm());
      loadData();
    } catch (error) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to save invoice', { variant: 'error' });
    }
  };

  const deleteInvoice = async (id) => {
    try {
      await invoiceService.deleteInvoice(id);
      enqueueSnackbar('Invoice deleted successfully', { variant: 'success' });
      loadData();
    } catch (error) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to delete invoice', { variant: 'error' });
    }
  };

  const requestDeleteInvoice = (invoiceId) => {
    confirm({
      title: 'Delete invoice?',
      message: 'This will permanently remove the invoice record. Continue?',
      variant: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        await deleteInvoice(invoiceId);
      }
    });
  };

  const updateInvoiceStatus = async (id, status) => {
    try {
      await invoiceService.updateStatus(id, status);
      enqueueSnackbar('Invoice status updated', { variant: 'success' });
      loadData();
    } catch (error) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to update status', { variant: 'error' });
    }
  };

  const downloadPdf = (id) => {
    window.open(`http://localhost:5000/api/invoices/${id}/pdf`, '_blank');
  };

  const openCreateTemplate = () => {
    setTemplateForm(defaultTemplateForm());
    setTemplateDialogOpen(true);
  };

  const openPhraseDialog = () => {
    setPhraseForm({
      password: '',
      currentPhrase: secretPhrase,
      newPhrase: '',
      confirmPhrase: ''
    });
    setPhraseDialogOpen(true);
  };

  const openEditTemplate = (template) => {
    setTemplateForm({
      id: template.id,
      name: template.name,
      description: template.description || '',
      currency: template.currency || 'INR',
      isDefault: !!template.isDefault,
      isActive: template.isActive !== false,
      templateData: {
        title: template.templateData?.title || 'Service Invoice',
        termsAndConditions: template.templateData?.termsAndConditions || '',
        footerNote: template.templateData?.footerNote || ''
      }
    });
    setTemplateDialogOpen(true);
  };

  const saveTemplate = async () => {
    try {
      if (!templateForm.name) {
        enqueueSnackbar('Template name is required', { variant: 'warning' });
        return;
      }

      if (!secretPhrase.trim()) {
        enqueueSnackbar('Secret phrase is required for secure invoice template actions', { variant: 'warning' });
        return;
      }

      const payload = {
        ...templateForm,
        templateData: {
          ...templateForm.templateData
        }
      };

      if (templateForm.id) {
        await invoiceService.updateTemplate(templateForm.id, payload, secretPhrase);
        enqueueSnackbar('Template updated successfully', { variant: 'success' });
      } else {
        await invoiceService.createTemplate(payload, secretPhrase);
        enqueueSnackbar('Template created successfully', { variant: 'success' });
      }

      setTemplateDialogOpen(false);
      setTemplateForm(defaultTemplateForm());
      loadData();
    } catch (error) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to save template', { variant: 'error' });
    }
  };

  const rotateSecretPhrase = async () => {
    try {
      if (!phraseForm.password || !phraseForm.currentPhrase || !phraseForm.newPhrase || !phraseForm.confirmPhrase) {
        enqueueSnackbar('Password, current phrase, new phrase, and confirmation are required', { variant: 'warning' });
        return;
      }

      const response = await invoiceService.rotateSecretPhrase(phraseForm);
      enqueueSnackbar(response.data?.message || 'Invoice secret phrase updated successfully', { variant: 'success' });
      setSecretPhrase(phraseForm.newPhrase);
      setPhraseDialogOpen(false);
      setPhraseForm({ password: '', currentPhrase: '', newPhrase: '', confirmPhrase: '' });
      loadData(phraseForm.newPhrase);
    } catch (error) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to rotate invoice secret phrase', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>Invoice Management</Typography>
          <Typography variant="body2" color="text.secondary">
            India-only vendor billing for permanent and contractor employees based on supported hours
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={openPhraseDialog}>Change Phrase</Button>
          <Button startIcon={<Refresh />} onClick={loadData} disabled={loading}>Refresh</Button>
        </Stack>
      </Stack>

      <Alert severity="warning" sx={{ mb: 2 }}>
        Invoice data is encrypted at rest. HR must provide the secret phrase to view or edit sensitive invoice details.
      </Alert>

      {sensitiveDataHidden && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Sensitive invoice fields are hidden. Enter the secret phrase and click Refresh to decrypt data.
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          type="password"
          label="HR Secret Phrase"
          placeholder="Enter the shared invoice secret phrase"
          value={secretPhrase}
          onChange={(e) => setSecretPhrase(e.target.value)}
        />
        <Button variant="contained" onClick={unlockInvoiceData} disabled={loading} sx={{ minWidth: 160 }}>
          Unlock Data
        </Button>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Invoices" />
        <Tab label="Templates" />
      </Tabs>

      {tab === 0 && (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1}>
                <TextField
                  label="Month"
                  type="number"
                  size="small"
                  value={filters.month}
                  onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))}
                />
                <TextField
                  label="Year"
                  type="number"
                  size="small"
                  value={filters.year}
                  onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="outlined" onClick={loadData}>Apply</Button>
              </Stack>
              <Button variant="contained" startIcon={<Add />} onClick={openCreateInvoice}>
                New Invoice
              </Button>
            </Stack>

            {invoices.length === 0 ? (
              <EmptyState
                icon={<InboxIcon sx={{ fontSize: 48 }} />}
                title="No invoices found"
                description="Create the first invoice for this billing period to get started."
                action={{ label: 'New Invoice', onClick: openCreateInvoice }}
              />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell align="right">Total (INR)</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} hover>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.clientCompany}</TableCell>
                      <TableCell>{invoice.billingMonth}/{invoice.billingYear}</TableCell>
                      <TableCell align="right">{Number(invoice.totalAmount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={invoice.status.toUpperCase()} color={getStatusChipColor(invoice.status)} />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => downloadPdf(invoice.id)} color="primary"><PictureAsPdf fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => openEditInvoice(invoice)} disabled={invoice.isSensitiveDataHidden}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => requestDeleteInvoice(invoice.id)} disabled={invoice.isSensitiveDataHidden}><Delete fontSize="small" /></IconButton>
                        <FormControl size="small" sx={{ minWidth: 110, ml: 1 }}>
                          <Select
                            value={invoice.status}
                            onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                          >
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="sent">Sent</MenuItem>
                            <MenuItem value="paid">Paid</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6">Invoice Templates</Typography>
              <Button variant="contained" startIcon={<Add />} onClick={openCreateTemplate}>New Template</Button>
            </Stack>
            {templates.length === 0 ? (
              <EmptyState
                icon={<InboxIcon sx={{ fontSize: 48 }} />}
                title="No invoice templates"
                description="Create a reusable format for client billing and set it as the default when ready."
                action={{ label: 'New Template', onClick: openCreateTemplate }}
              />
            ) : (
              <Grid container spacing={2}>
                {templates.map((template) => (
                  <Grid item xs={12} md={6} lg={4} key={template.id}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={600}>{template.name}</Typography>
                        {template.isDefault && <Chip label="Default" size="small" color="primary" />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {template.description || 'No description'}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Title: {template.templateData?.title || 'Service Invoice'}
                      </Typography>
                      <Button size="small" sx={{ mt: 1 }} onClick={() => openEditTemplate(template)}>Edit</Button>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{invoiceForm.id ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Use this module for client billing based on employee support hours. Line-item amounts auto-calculate from hours × rate.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><TextField fullWidth label="Client Company" value={invoiceForm.clientCompany} onChange={(e) => setInvoiceForm((p) => ({ ...p, clientCompany: e.target.value }))} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Client GSTIN" value={invoiceForm.clientGstin} onChange={(e) => setInvoiceForm((p) => ({ ...p, clientGstin: e.target.value }))} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Client Address" value={invoiceForm.clientAddress} onChange={(e) => setInvoiceForm((p) => ({ ...p, clientAddress: e.target.value }))} /></Grid>
            <Grid item xs={6} md={2}><TextField fullWidth type="number" label="Month" value={invoiceForm.billingMonth} onChange={(e) => setInvoiceForm((p) => ({ ...p, billingMonth: Number(e.target.value) }))} /></Grid>
            <Grid item xs={6} md={2}><TextField fullWidth type="number" label="Year" value={invoiceForm.billingYear} onChange={(e) => setInvoiceForm((p) => ({ ...p, billingYear: Number(e.target.value) }))} /></Grid>
            <Grid item xs={6} md={3}><TextField fullWidth type="date" label="Issue Date" InputLabelProps={{ shrink: true }} value={invoiceForm.issueDate} onChange={(e) => setInvoiceForm((p) => ({ ...p, issueDate: e.target.value }))} /></Grid>
            <Grid item xs={6} md={3}><TextField fullWidth type="date" label="Due Date" InputLabelProps={{ shrink: true }} value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm((p) => ({ ...p, dueDate: e.target.value }))} /></Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Worker Type</InputLabel>
                <Select value={invoiceForm.workerType} label="Worker Type" onChange={(e) => setInvoiceForm((p) => ({ ...p, workerType: e.target.value }))}>
                  <MenuItem value="mixed">Mixed</MenuItem>
                  <MenuItem value="permanent">Permanent</MenuItem>
                  <MenuItem value="contractor">Contractor</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Template</InputLabel>
                <Select value={invoiceForm.templateId} label="Template" onChange={(e) => setInvoiceForm((p) => ({ ...p, templateId: e.target.value }))}>
                  <MenuItem value="">Default Template</MenuItem>
                  {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}><TextField fullWidth type="number" label="Tax %" value={invoiceForm.taxPercent} onChange={(e) => setInvoiceForm((p) => ({ ...p, taxPercent: Number(e.target.value) }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Notes" value={invoiceForm.notes} onChange={(e) => setInvoiceForm((p) => ({ ...p, notes: e.target.value }))} /></Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>Billable Line Items</Typography>
              <Button size="small" startIcon={<Add />} onClick={addLineItem}>Add Row</Button>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Hours</TableCell>
                  <TableCell>Rate (INR/hr)</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {invoiceForm.lineItems.map((item, index) => {
                  const amount = Number(item.hoursSupported || 0) * Number(item.hourlyRate || 0);
                  return (
                    <TableRow key={item.rowKey}>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={item.employeeId}
                            displayEmpty
                            onChange={(e) => updateLineItem(index, 'employeeId', e.target.value)}
                          >
                            <MenuItem value=""><em>Manual entry</em></MenuItem>
                            {employees.map((emp) => (
                              <MenuItem key={emp.id} value={emp.id}>{emp.employeeId} - {emp.firstName} {emp.lastName}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField size="small" sx={{ mt: 1 }} fullWidth label="Name" value={item.employeeName} onChange={(e) => updateLineItem(index, 'employeeName', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select value={item.employmentType} onChange={(e) => updateLineItem(index, 'employmentType', e.target.value)}>
                            <MenuItem value="permanent">Permanent</MenuItem>
                            <MenuItem value="contractor">Contractor</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell><TextField size="small" type="number" value={item.hoursSupported} onChange={(e) => updateLineItem(index, 'hoursSupported', Number(e.target.value))} /></TableCell>
                      <TableCell><TextField size="small" type="number" value={item.hourlyRate} onChange={(e) => updateLineItem(index, 'hourlyRate', Number(e.target.value))} /></TableCell>
                      <TableCell>{amount.toFixed(2)}</TableCell>
                      <TableCell><TextField size="small" value={item.description} onChange={(e) => updateLineItem(index, 'description', e.target.value)} /></TableCell>
                      <TableCell>
                        {invoiceForm.lineItems.length > 1 && (
                          <IconButton size="small" color="error" onClick={() => removeLineItem(index)}><Delete fontSize="small" /></IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Stack direction="row" spacing={3} justifyContent="flex-end" sx={{ mt: 2 }}>
              <Typography>Subtotal: ₹{invoiceTotals.subtotal}</Typography>
              <Typography>Tax: ₹{invoiceTotals.taxAmount}</Typography>
              <Typography fontWeight={700}>Total: ₹{invoiceTotals.totalAmount}</Typography>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveInvoice}>Save Invoice</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{templateForm.id ? 'Edit Invoice Template' : 'Create Invoice Template'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><TextField fullWidth label="Template Name" value={templateForm.name} onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="Currency" value={templateForm.currency} onChange={(e) => setTemplateForm((p) => ({ ...p, currency: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Description" value={templateForm.description} onChange={(e) => setTemplateForm((p) => ({ ...p, description: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Invoice Title" value={templateForm.templateData.title} onChange={(e) => setTemplateForm((p) => ({ ...p, templateData: { ...p.templateData, title: e.target.value } }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Terms & Conditions" value={templateForm.templateData.termsAndConditions} onChange={(e) => setTemplateForm((p) => ({ ...p, templateData: { ...p.templateData, termsAndConditions: e.target.value } }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Footer Note" value={templateForm.templateData.footerNote} onChange={(e) => setTemplateForm((p) => ({ ...p, templateData: { ...p.templateData, footerNote: e.target.value } }))} /></Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Default Template</InputLabel>
                <Select value={templateForm.isDefault ? 'yes' : 'no'} label="Default Template" onChange={(e) => setTemplateForm((p) => ({ ...p, isDefault: e.target.value === 'yes' }))}>
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Active</InputLabel>
                <Select value={templateForm.isActive ? 'yes' : 'no'} label="Active" onChange={(e) => setTemplateForm((p) => ({ ...p, isActive: e.target.value === 'yes' }))}>
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveTemplate}>Save Template</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={phraseDialogOpen} onClose={() => setPhraseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Invoice Secret Phrase</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will re-encrypt all stored invoices. HR password and current phrase are required.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="HR Account Password"
                value={phraseForm.password}
                onChange={(e) => setPhraseForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Current Secret Phrase"
                value={phraseForm.currentPhrase}
                onChange={(e) => setPhraseForm((prev) => ({ ...prev, currentPhrase: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="New Secret Phrase"
                value={phraseForm.newPhrase}
                onChange={(e) => setPhraseForm((prev) => ({ ...prev, newPhrase: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Confirm New Phrase"
                value={phraseForm.confirmPhrase}
                onChange={(e) => setPhraseForm((prev) => ({ ...prev, confirmPhrase: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhraseDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={rotateSecretPhrase}>Update Phrase</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog {...dialogProps} />
    </Box>
  );
};

export default InvoiceManagementPage;
