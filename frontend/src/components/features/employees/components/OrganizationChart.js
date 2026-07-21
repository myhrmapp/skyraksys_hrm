import React, { useMemo } from 'react';
import { Box, Typography, Avatar, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';

const TreeContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  padding: theme.spacing(4),
  overflowX: 'auto',
  minHeight: '400px'
}));


const EmployeeCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: '180px',
  maxWidth: '220px',
  background: 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '12px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  cursor: 'pointer',
  zIndex: 1,
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
  }
}));

const TreeNode = ({ node, isRoot }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', px: 2 }}>
      {!isRoot && (
        <Box sx={{
          position: 'absolute', top: -20, left: '50%', width: '2px', height: '20px', bgcolor: '#ccc'
        }} />
      )}
      <EmployeeCard elevation={0}>
        <Avatar src={node.profilePicture} sx={{ width: 64, height: 64, mb: 1, boxShadow: 2 }}>
          {node.firstName?.[0]}{node.lastName?.[0]}
        </Avatar>
        <Typography variant="subtitle1" fontWeight="bold" textAlign="center" noWrap sx={{ width: '100%' }}>
          {node.firstName} {node.lastName}
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" noWrap sx={{ width: '100%' }}>
          {node.position?.title || node.designation || 'Employee'}
        </Typography>
        <Typography variant="caption" sx={{ mt: 1, bgcolor: 'primary.light', color: 'primary.contrastText', px: 1, borderRadius: 1 }}>
          {node.department?.name || 'No Department'}
        </Typography>
      </EmployeeCard>

      {node.children && node.children.length > 0 && (
        <Box sx={{ position: 'relative', pt: '20px', mt: 0, display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ position: 'absolute', top: 0, left: '50%', width: '2px', height: '20px', bgcolor: '#ccc' }} />
          
          {/* Horizontal Line for siblings */}
          {node.children.length > 1 && (
            <Box sx={{ position: 'absolute', top: '20px', left: 0, right: 0, height: '2px', bgcolor: '#ccc' }} />
          )}

          <Box sx={{ display: 'flex', gap: 2, pt: '2px' }}>
            {node.children.map((child, idx) => (
              <Box key={child.id} sx={{ position: 'relative' }}>
                <TreeNode node={child} isRoot={false} />
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default function OrganizationChart({ employees }) {
  // Transform flat employees list into a hierarchy tree based on managerId
  const treeData = useMemo(() => {
    if (!employees || employees.length === 0) return null;

    const empMap = {};
    employees.forEach(emp => {
      empMap[emp.id] = { ...emp, children: [] };
    });

    let roots = [];

    employees.forEach(emp => {
      if (emp.managerId && empMap[emp.managerId]) {
        empMap[emp.managerId].children.push(empMap[emp.id]);
      } else {
        roots.push(empMap[emp.id]);
      }
    });

    // If there is only one root (e.g. CEO), return it. 
    // If multiple roots (e.g. department heads), we create a fake company root.
    if (roots.length === 1) {
      return roots[0];
    } else if (roots.length > 1) {
      return {
        id: 'company-root',
        firstName: 'Company',
        lastName: 'Board',
        designation: 'Leadership',
        children: roots
      };
    }
    return null;
  }, [employees]);

  if (!treeData) {
    return (
      <Box p={5} textAlign="center">
        <Typography color="text.secondary">No organizational data available.</Typography>
      </Box>
    );
  }

  return (
    <TreeContainer>
      <TreeNode node={treeData} isRoot={true} />
    </TreeContainer>
  );
}
