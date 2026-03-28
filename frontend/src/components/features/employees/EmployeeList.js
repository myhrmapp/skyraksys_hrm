import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Pagination
} from '@mui/material';
import {
  ViewModule as CardViewIcon,
  ViewList as TableViewIcon
} from '@mui/icons-material';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

// Import custom hook
import { useEmployeeList } from './hooks/useEmployeeList';

// Import components
import EmployeeListHeader from './components/EmployeeListHeader';
import EmployeeListFilters from './components/EmployeeListFilters';
import EmployeeTableView from './components/EmployeeTableView';
import EmployeeCardView from './components/EmployeeCardView';
import DeleteEmployeeDialog from './components/DeleteEmployeeDialog';
import CreateUserAccountDialog from './components/CreateUserAccountDialog';

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
    viewMode,
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
    setViewMode,
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
      <EmployeeListHeader 
        canEdit={canEdit} 
        onAddEmployee={handleAddEmployee}
        onExport={handleExport}
      />

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

      {/* View Toggle & Pagination */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newView) => newView && setViewMode(newView)}
          size="small"
          sx={{ bgcolor: 'white', boxShadow: 1 }}
        >
          <ToggleButton value="list" aria-label="list view" data-testid="employee-list-view-toggle-list">
            <TableViewIcon />
          </ToggleButton>
          <ToggleButton value="cards" aria-label="card view" data-testid="employee-list-view-toggle-cards">
            <CardViewIcon />
          </ToggleButton>
        </ToggleButtonGroup>

        <Pagination 
          count={Math.ceil(totalRecords / rowsPerPage)} 
          page={page + 1} 
          onChange={(e, p) => handleChangePage(e, p - 1)} 
          color="primary"
          shape="rounded"
          data-testid="employee-list-pagination"
        />
      </Box>

      {/* Content */}
      {viewMode === 'list' ? (
        <EmployeeTableView 
          employees={employees}
          onView={handleViewEmployee}
          onEdit={handleEditEmployee}
          onDelete={handleDeleteClick}
          onCreateUserAccount={handleCreateUserAccount}
          onManageUserAccount={handleCreateUserAccount} // Reusing same handler for now as per original code
        />
      ) : (
        <EmployeeCardView 
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
