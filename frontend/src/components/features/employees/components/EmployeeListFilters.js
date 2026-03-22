import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  MenuItem,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

const EmployeeListFilters = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  departmentFilter,
  setDepartmentFilter,
  employmentTypeFilter,
  setEmploymentTypeFilter,
  locationFilter,
  setLocationFilter,
  departments,
  page,
  rowsPerPage,
  totalRecords
}) => {
  return (
    <Card 
      sx={{ 
        mb: 3, 
        borderRadius: 3,
        bgcolor: 'white',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search Bar */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              data-testid="employee-list-search"
              placeholder="Search by name, ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, bgcolor: 'grey.50' }
              }}
              size="medium"
            />
          </Grid>

          {/* Filters */}
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 140, flex: 1 }}
                size="small"
                fullWidth
                data-testid="employee-list-filter-status"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="On Leave">On Leave</MenuItem>
                <MenuItem value="Terminated">Terminated</MenuItem>
              </TextField>

              <TextField
                select
                label="Department"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                sx={{ minWidth: 160, flex: 1 }}
                size="small"
                fullWidth
                data-testid="employee-list-filter-department"
              >
                <MenuItem value="all">All Departments</MenuItem>
                {(departments || []).map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Type"
                value={employmentTypeFilter || ''}
                onChange={(e) => setEmploymentTypeFilter && setEmploymentTypeFilter(e.target.value)}
                sx={{ minWidth: 140, flex: 1 }}
                size="small"
                fullWidth
                data-testid="employee-list-filter-employment-type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="Full-time">Full-time</MenuItem>
                <MenuItem value="Part-time">Part-time</MenuItem>
                <MenuItem value="Contract">Contract</MenuItem>
                <MenuItem value="Intern">Intern</MenuItem>
              </TextField>

              <TextField
                select
                label="Location"
                value={locationFilter || ''}
                onChange={(e) => setLocationFilter && setLocationFilter(e.target.value)}
                sx={{ minWidth: 140, flex: 1 }}
                size="small"
                fullWidth
                data-testid="employee-list-filter-work-location"
              >
                <MenuItem value="">All Locations</MenuItem>
                <MenuItem value="Chennai">Chennai</MenuItem>
                <MenuItem value="Bangalore">Bangalore</MenuItem>
                <MenuItem value="Mumbai">Mumbai</MenuItem>
                <MenuItem value="Remote">Remote</MenuItem>
              </TextField>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2.5 }} />

        {/* Results Summary */}
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Active Filters: 
              {statusFilter && <Chip label={`Status: ${statusFilter}`} size="small" sx={{ ml: 1 }} onDelete={() => setStatusFilter('')} />}
              {departmentFilter !== 'all' && <Chip label="Department" size="small" sx={{ ml: 1 }} onDelete={() => setDepartmentFilter('all')} />}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Showing {Math.min(page * rowsPerPage + 1, totalRecords)}-{Math.min((page + 1) * rowsPerPage, totalRecords)} of {totalRecords}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default EmployeeListFilters;
