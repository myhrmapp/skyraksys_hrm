import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Tooltip,
  Stack
} from '@mui/material';
import {
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VpnKey as VpnKeyIcon,
  Phone as PhoneIcon,
  Place as PlaceIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import EmptyState from '../../../shared/EmptyState';

const EmployeeTableView = ({ 
  employees, 
  onView, 
  onEdit, 
  onDelete, 
  onCreateUserAccount, 
  onManageUserAccount 
}) => {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 3, mt: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
      <Table sx={{ minWidth: 800 }} data-testid="employee-table">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 2 }}>Employee</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 2 }}>Contact</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 2 }}>Role & Dept</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 2 }}>Location & Date</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 2 }}>Status</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', py: 2 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {employees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} sx={{ py: 0, border: 0 }}>
                <EmptyState
                  icon={<PeopleIcon sx={{ fontSize: 48 }} />}
                  title="No employees found"
                  description="Try different filters or search terms."
                />
              </TableCell>
            </TableRow>
          ) : employees.map((emp) => (
            <TableRow 
              key={emp.id} 
              hover 
              sx={{ 
                '&:last-child td, &:last-child th': { border: 0 },
                transition: 'background-color 0.2s'
              }}
            >
              {/* Employee Name & ID */}
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    src={emp.photoUrl ? `${process.env.REACT_APP_BACKEND_URL || ''}${emp.photoUrl}` : undefined} 
                    sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: '1rem' }}
                  >
                    {emp.firstName?.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="600" color="text.primary">
                      {emp.firstName} {emp.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      ID: {emp.employeeId}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>

              {/* Contact Info */}
              <TableCell>
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {emp.email}
                  </Typography>
                  {emp.phone && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PhoneIcon sx={{ fontSize: 14 }} /> {emp.phone}
                    </Typography>
                  )}
                </Stack>
              </TableCell>

              {/* Role & Dept */}
              <TableCell>
                <Stack spacing={0.5}>
                  <Typography variant="body2" fontWeight="500">
                    {emp.position?.title || emp.designation || '-'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {emp.department?.name || '-'}
                  </Typography>
                </Stack>
              </TableCell>

              {/* Location & Date */}
              <TableCell>
                <Stack spacing={0.5}>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PlaceIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    {emp.workLocation || 'Main Office'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarIcon sx={{ fontSize: 14 }} />
                    Joined: {emp.joiningDate ? dayjs(emp.joiningDate).format('MMM D, YYYY') : '-'}
                  </Typography>
                </Stack>
              </TableCell>

              {/* Status */}
              <TableCell>
                <Stack direction="row" spacing={1}>
                  <Chip
                    label={emp.status}
                    color={
                      emp.status === 'Active' ? 'success' :
                      emp.status === 'On Leave' ? 'warning' :
                      emp.status === 'Inactive' ? 'default' : 'error'
                    }
                    size="small"
                    sx={{ fontWeight: 500, height: 24 }}
                  />
                </Stack>
              </TableCell>

              {/* Actions */}
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Tooltip title="View Profile">
                    <IconButton size="small" onClick={() => onView(emp.id)} data-testid="employee-table-view-btn" sx={{ color: 'primary.main', bgcolor: 'primary.50' }}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  {!emp.userId ? (
                    <Tooltip title="Create Login">
                      <IconButton size="small" onClick={() => onCreateUserAccount(emp)} data-testid="employee-table-create-login-btn" sx={{ color: 'success.main', bgcolor: 'success.50' }}>
                        <VpnKeyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Manage Login">
                      <IconButton size="small" onClick={() => onManageUserAccount(emp)} data-testid="employee-table-manage-login-btn" sx={{ color: 'info.main', bgcolor: 'info.50' }}>
                        <VpnKeyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}

                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => onEdit(emp.id)} data-testid="employee-table-edit-btn" sx={{ color: 'warning.main', bgcolor: 'warning.50' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default EmployeeTableView;
