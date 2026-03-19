import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  Chip,
  Avatar,
  IconButton,
  Collapse,
  Stack,
  Divider,
  Grid,
  Button
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Inbox as InboxIcon
} from '@mui/icons-material';

/**
 * Enhanced Responsive Table Component
 * Automatically switches between table and card view based on screen size
 */
const ResponsiveTable = ({
  columns,
  data,
  loading,
  mobileBreakpoint = 'md',
  renderMobileCard,
  renderTableRow,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(mobileBreakpoint));

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent sx={{ py: 6, textAlign: 'center' }}>
          <InboxIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            No records found
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Mobile Card View
  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {data.map((item, index) => (
          <Card key={item.id || index} elevation={2}>
            <CardContent sx={{ p: 2 }}>
              {renderMobileCard ? renderMobileCard(item, index) : (
                <DefaultMobileCard item={item} columns={columns} />
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  // Desktop Table View
  return (
    <Card>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table {...props}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  sx={{
                    minWidth: column.minWidth,
                    fontWeight: 'bold',
                    backgroundColor: theme.palette.grey[50]
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item, index) => (
              renderTableRow ? renderTableRow(item, index) : (
                <DefaultTableRow key={item.id || index} item={item} columns={columns} />
              )
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

/**
 * Default Mobile Card Component
 */
const DefaultMobileCard = ({ item, columns }) => {
  const [expanded, setExpanded] = useState(false);
  const visibleColumns = columns.slice(0, 3); // Show first 3 columns by default
  const hiddenColumns = columns.slice(3);

  return (
    <Box>
      {/* Primary Information */}
      {visibleColumns.map((column) => (
        <Box key={column.id} sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {column.label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: column.primary ? 'bold' : 'normal' }}>
            {column.render ? column.render(item[column.id], item) : item[column.id]}
          </Typography>
        </Box>
      ))}

      {/* Expandable Additional Information */}
      {hiddenColumns.length > 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ p: 0.5 }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          
          <Collapse in={expanded}>
            <Divider sx={{ my: 1 }} />
            {hiddenColumns.map((column) => (
              <Box key={column.id} sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {column.label}
                </Typography>
                <Typography variant="body2">
                  {column.render ? column.render(item[column.id], item) : item[column.id]}
                </Typography>
              </Box>
            ))}
          </Collapse>
        </>
      )}
    </Box>
  );
};

/**
 * Default Table Row Component
 */
const DefaultTableRow = ({ item, columns }) => (
  <TableRow hover>
    {columns.map((column) => (
      <TableCell key={column.id} align={column.align || 'left'}>
        {column.render ? column.render(item[column.id], item) : item[column.id]}
      </TableCell>
    ))}
  </TableRow>
);

/**
 * Enhanced Employee Mobile Card
 */
export const EmployeeMobileCard = ({ employee }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box>
      {/* Primary Employee Info */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
          {employee.user?.firstName?.charAt(0) || 'E'}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {employee.user?.firstName} {employee.user?.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {employee.position} • {employee.department}
          </Typography>
        </Box>
        <Chip
          label={employee.status}
          color={employee.status === 'active' ? 'success' : 'default'}
          size="small"
        />
      </Box>

      {/* Quick Info */}
      <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Employee ID
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {employee.employeeId}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Hire Date
          </Typography>
          <Typography variant="body2">
            {new Date(employee.hireDate).toLocaleDateString()}
          </Typography>
        </Box>
      </Stack>

      {/* Expandable Details */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{ p: 0.5 }}
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={1}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body2">
              {employee.user?.email}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Phone
            </Typography>
            <Typography variant="body2">
              {employee.phone || 'Not provided'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Manager
            </Typography>
            <Typography variant="body2">
              {employee.manager || 'Not assigned'}
            </Typography>
          </Box>
        </Stack>
      </Collapse>
    </Box>
  );
};

/**
 * Enhanced Leave Request Mobile Card
 */
export const LeaveRequestMobileCard = ({ request, onAction }) => {
  const [expanded, setExpanded] = useState(false);

  const statusColors = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    cancelled: 'default'
  };

  const leaveTypes = {
    annual: { label: 'Annual Leave', color: 'primary' },
    sick: { label: 'Sick Leave', color: 'error' },
    personal: { label: 'Personal Leave', color: 'warning' },
    maternity: { label: 'Maternity Leave', color: 'secondary' },
    emergency: { label: 'Emergency Leave', color: 'info' }
  };

  const leaveType = leaveTypes[request.leaveType] || { label: request.leaveType, color: 'default' };

  return (
    <Box>
      {/* Primary Request Info */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
          {request.employeeName.split(' ').map(n => n[0]).join('')}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {request.employeeName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {request.employeeId}
          </Typography>
        </Box>
        <Chip
          label={request.status.toUpperCase()}
          color={statusColors[request.status]}
          size="small"
        />
      </Box>

      {/* Leave Details */}
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Leave Type
            </Typography>
            <Typography variant="body2">
              <Chip label={leaveType.label} color={leaveType.color} size="small" />
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              Duration
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {request.days} days
            </Typography>
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            Period
          </Typography>
          <Typography variant="body2">
            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
          </Typography>
        </Box>
      </Stack>

      {/* Expandable Details */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{ p: 0.5 }}
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={1}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Reason
            </Typography>
            <Typography variant="body2">
              {request.reason}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Applied Date
            </Typography>
            <Typography variant="body2">
              {new Date(request.appliedDate).toLocaleDateString()}
            </Typography>
          </Box>
          {request.status === 'pending' && onAction && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <IconButton
                size="small"
                color="success"
                onClick={() => onAction(request, 'approve')}
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                ✓
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => onAction(request, 'reject')}
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                ✗
              </IconButton>
            </Stack>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
};

// PayrollMobileCard component for payroll entries
export const PayrollMobileCard = ({ payslip, onAction, onDownload }) => {
  const [expanded, setExpanded] = useState(false);
  
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'success';
      case 'calculated': return 'info';
      case 'paid': return 'success';
      case 'draft': return 'default';
      case 'cancelled': return 'error';
      case 'finalized': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return '\u2713';
      case 'calculated': return '\u23F1';
      case 'paid': return '$';
      case 'draft': return '\u270E';
      case 'cancelled': return '\u2715';
      case 'finalized': return '\u2713';
      default: return '\u2022';
    }
  };

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        mb: 2,
        '&:hover': {
          boxShadow: 2,
          borderColor: 'primary.main'
        }
      }}
    >
      {/* Header with employee info */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          {payslip.employeeName?.split(' ').map(n => n[0]).join('') || 'U'}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" fontWeight="bold">
            {payslip.employeeName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {payslip.employeeId} • {payslip.department}
          </Typography>
        </Box>
        <Chip
          label={payslip.status?.toUpperCase() || 'UNKNOWN'}
          color={getStatusColor(payslip.status)}
          size="small"
          icon={<span>{getStatusIcon(payslip.status)}</span>}
        />
      </Stack>

      {/* Pay info */}
      <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Pay Period
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {payslip.payPeriod}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Net Pay
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="success.main">
            ₹{(payslip.netPay || 0).toLocaleString('en-IN')}
          </Typography>
        </Box>
      </Stack>

      {/* Action buttons */}
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 1 }}>
        <IconButton
          size="small"
          onClick={() => onAction && onAction(payslip, 'view')}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          👁
        </IconButton>
        {payslip.status === 'draft' && (
          <IconButton
            size="small"
            color="primary"
            onClick={() => onAction && onAction(payslip, 'process')}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            ▶
          </IconButton>
        )}
        <IconButton
          size="small"
          onClick={() => onDownload && onDownload(payslip.id)}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          ⬇
        </IconButton>
      </Stack>

      {/* Expandable Details */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{ p: 0.5 }}
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={1}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Gross Pay
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              ₹{(payslip.grossPay || 0).toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Deductions
            </Typography>
            <Typography variant="body2" color="error.main">
              ₹{((payslip.taxDeductions || 0) + (payslip.socialSecurity || 0) + (payslip.otherDeductions || 0)).toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Tax Deductions
            </Typography>
            <Typography variant="body2">
              ₹{(payslip.taxDeductions || 0).toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Social Security
            </Typography>
            <Typography variant="body2">
              ₹{(payslip.socialSecurity || 0).toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Other Deductions
            </Typography>
            <Typography variant="body2">
              ₹{(payslip.otherDeductions || 0).toLocaleString('en-IN')}
            </Typography>
          </Box>
        </Stack>
      </Collapse>
    </Box>
  );
};

// Timesheet Mobile Card Component
export const TimesheetMobileCard = ({ timesheet, onApprove, onReject, onView }) => (
  <Card 
    sx={{ 
      mb: 2, 
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      '&:hover': {
        boxShadow: 2,
        borderColor: 'primary.main'
      }
    }}
  >
    <CardContent sx={{ p: 2 }}>
      {/* Header with Employee and Status */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <Avatar 
            sx={{ 
              mr: 2, 
              bgcolor: 'primary.main',
              width: 40,
              height: 40
            }}
          >
            {timesheet.employeeName.split(' ').map(n => n[0]).join('')}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {timesheet.employeeName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {timesheet.employeeId} • {timesheet.department}
            </Typography>
          </Box>
        </Box>
        <Chip
          label={timesheet.status.toUpperCase()}
          color={
            timesheet.status?.toLowerCase() === 'approved' ? 'success' :
            timesheet.status?.toLowerCase() === 'rejected' ? 'error' :
            timesheet.status?.toLowerCase() === 'submitted' ? 'warning' : 'default'
          }
          size="small"
        />
      </Box>

      {/* Period and Hours Info */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Period
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {timesheet.period}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Hours Worked
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {timesheet.totalHours || 0}h
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Overtime
            </Typography>
            <Typography variant="body2" color="warning.main" fontWeight="medium">
              {timesheet.overtimeHours || 0}h
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Submitted
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {timesheet.submittedDate}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button 
          size="small" 
          variant="outlined"
          onClick={() => onView?.(timesheet)}
          sx={{ flex: 1, minWidth: 'auto' }}
        >
          View
        </Button>
        {timesheet.status?.toLowerCase() === 'submitted' && (
          <>
            <Button 
              size="small" 
              variant="contained"
              color="success"
              onClick={() => onApprove?.(timesheet.id)}
              sx={{ flex: 1, minWidth: 'auto' }}
            >
              Approve
            </Button>
            <Button 
              size="small" 
              variant="contained"
              color="error"
              onClick={() => onReject?.(timesheet.id)}
              sx={{ flex: 1, minWidth: 'auto' }}
            >
              Reject
            </Button>
          </>
        )}
      </Box>
    </CardContent>
  </Card>
);

export default ResponsiveTable;
