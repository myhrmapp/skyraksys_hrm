import React from 'react';
import { Skeleton, TableRow, TableCell, Table, TableBody } from '@mui/material';

/**
 * Standard loading skeleton for tables across the app.
 * Usage: <TableSkeleton rows={5} cols={4} />
 */
const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <Table>
    <TableBody>
      {Array.from({ length: rows }).map((_, ri) => (
        <TableRow key={ri}>
          {Array.from({ length: cols }).map((_, ci) => (
            <TableCell key={ci}>
              <Skeleton variant="text" animation="wave" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default TableSkeleton;
