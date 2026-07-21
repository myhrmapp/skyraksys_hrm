import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Pagination
} from '@mui/material';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

// Import custom hook
import { useEmployeeList } from './hooks/useEmployeeList';

// Import components
import EmployeeListHeader from './components/EmployeeListHeader';
import EmployeeListFilters from './components/EmployeeListFilters';
import EmployeeTableView from './components/EmployeeTableView';
import DeleteEmployeeDialog from './components/DeleteEmployeeDialog';
import CreateUserAccountDialog from './components/CreateUserAccountDialog';
import OrganizationChart from './components/OrganizationChart';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ViewList as ListIcon, AccountTree as OrgIcon } from '@mui/icons-material';

const EmployeeList = () => {
  const {
    // State
    employees,
    departments,
    totalRecords,
    error,
    searchTerm,
    statusFilter,
    departmentFilter,
    employmentTypeFilter,
    locationFilter,
    page,
    rowsPerPage,
    deleteDialogOpen,
    employeeToDelete,
    userAccountDialogOpen,
    selectedEmployee,
    userAccountData,
    creatingUser,
    canEdit,

    // Setters
    setSearchTerm,
    setStatusFilter,
    setDepartmentFilter,
    setEmploymentTypeFilter,
    setLocationFilter,
    setDeleteDialogOpen,
    
    // Actions
    loadEmployees,
    handleAddEmployee,
    handleEditEmployee,
    handleViewEmployee,
    handleDeleteClick,
    handleDeleteConfirm,
    handleCreateUserAccount,
    handleCloseUserAccountDialog,
    handleUserAccountDataChange,
    handleCreateUserSubmit,
    handleChangePage,
  } = useEmployeeList();

  const [displayMode, setDisplayMode] = React.useState('list');

  const handleDisplayModeChange = (event, newMode) => {
    if (newMode !== null) {
      setDisplayMode(newMode);
    }
  };

  // Filters are now fully server-side via useEmployeeList hook

  const handleExport = () => {
    const dataToExport = employees.map(emp => ({
      'Employee ID': emp.employeeId,
      'First Name': emp.firstName,
      'Last Name': emp.lastName,
      'Email': emp.email,
      'Phone': emp.phone,
      'Department': emp.department?.name,
      'Position': emp.position?.title || emp.designation,
      'Status': emp.status,
      'Joining Date': emp.joiningDate,
      'Work Location': emp.workLocation,
      'Employment Type': emp.employmentType
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, `employees_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <EmployeeListHeader 
          canEdit={canEdit} 
          onAddEmployee={handleAddEmployee}
          onExport={handleExport}
        />
        <ToggleButtonGroup
          value={displayMode}
          exclusive
          onChange={handleDisplayModeChange}
          aria-label="display mode"
          size="small"
        >
          <ToggleButton value="list" aria-label="list view" data-testid="employee-list-view-toggle-list">
            <ListIcon />
          </ToggleButton>
          <ToggleButton value="org" aria-label="org chart view" data-testid="employee-list-view-toggle-org">
            <OrgIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Error Display */}
      {error && (
        <Card sx={{ mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <CardContent>
            <Typography variant="h6">⚠️ Error</Typography>
            <Typography>{error}</Typography>
            <Button 
              variant="contained" 
              onClick={loadEmployees} 
              sx={{ mt: 2 }}
              color="inherit"
              data-testid="employee-list-retry-btn"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <EmployeeListFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        departmentFilter={departmentFilter}
        setDepartmentFilter={setDepartmentFilter}
        employmentTypeFilter={employmentTypeFilter}
        setEmploymentTypeFilter={setEmploymentTypeFilter}
        locationFilter={locationFilter}
        setLocationFilter={setLocationFilter}
        departments={departments}
        onAddEmployee={handleAddEmployee}
        page={page}
        rowsPerPage={rowsPerPage}
        totalRecords={totalRecords}
      />

      {/* Pagination */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        {displayMode === 'list' && (
          <Pagination 
            count={Math.ceil(totalRecords / rowsPerPage)} 
            page={page + 1} 
            onChange={(e, p) => handleChangePage(e, p - 1)} 
            color="primary"
            shape="rounded"
            data-testid="employee-list-pagination"
          />
        )}
      </Box>

      {/* Content */}
      {displayMode === 'org' ? (
        <Card sx={{ p: 2, minHeight: 600, overflow: 'auto' }}>
           <OrganizationChart employees={employees} />
        </Card>
      ) : (
        <EmployeeTableView 
          employees={employees}
          onView={handleViewEmployee}
          onEdit={handleEditEmployee}
          onDelete={handleDeleteClick}
          onCreateUserAccount={handleCreateUserAccount}
          onManageUserAccount={handleCreateUserAccount}
        />
      )}

      {/* Dialogs */}
      <DeleteEmployeeDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        employeeName={employeeToDelete ? `${employeeToDelete.firstName} ${employeeToDelete.lastName}` : ''}
      />

      <CreateUserAccountDialog
        open={userAccountDialogOpen}
        onClose={handleCloseUserAccountDialog}
        onSubmit={handleCreateUserSubmit}
        data={userAccountData}
        onChange={handleUserAccountDataChange}
        loading={creatingUser}
        employee={selectedEmployee}
      />
    </Box>
  );
};

export default EmployeeList;
