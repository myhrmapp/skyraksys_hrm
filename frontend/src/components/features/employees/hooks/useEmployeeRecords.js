import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAuth } from '../../../../contexts/AuthContext';
import { timesheetService } from '../../../../services/timesheet.service';
import { leaveService } from '../../../../services/leave.service';

export const useEmployeeRecords = (targetEmployeeId = null) => {
  const { user } = useAuth();
  
  // Determine query parameters based on targetEmployeeId
  const queryParams = useMemo(() => {
    if (targetEmployeeId === 'ALL') {
      return {}; // Fetch all records
    } else if (targetEmployeeId) {
      return { employeeId: targetEmployeeId }; // Specific employee
    } else {
      const myId = user?.employeeId || user?.employee?.id;
      return myId ? { employeeId: myId } : null; // Current user
    }
  }, [targetEmployeeId, user]);

  // 🚀 Use React Query's useQueries for parallel data fetching
  const queries = useQueries({
    queries: [
      {
        queryKey: ['timesheets', 'history', queryParams],
        queryFn: () => timesheetService.getHistory(null, queryParams),
        enabled: !!queryParams,
        staleTime: 2 * 60 * 1000, // 2 minutes
      },
      {
        queryKey: ['leaves', 'history', queryParams],
        queryFn: () => leaveService.getAll(queryParams),
        enabled: !!queryParams,
        staleTime: 2 * 60 * 1000, // 2 minutes
      }
    ]
  });

  const [timesheetQuery, leaveQuery] = queries;
  
  // Derive loading and error states
  const loading = timesheetQuery.isLoading || leaveQuery.isLoading;
  const error = timesheetQuery.error || leaveQuery.error;

  const [leaveHistory, setLeaveHistory] = useState([]);
  const [timesheetHistory, setTimesheetHistory] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  // Helper function to get week number (ISO week)
  const getWeekNumber = (date) => {
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year
    tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
    // January 4 is always in week 1
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count weeks from there
    return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const processTimesheets = (timesheets) => {
    // Group timesheets by week (and employee if multiple) for display
    const weeklyGroups = {};
    
    timesheets.forEach(timesheet => {
      const workDate = new Date(timesheet.workDate);
      const year = workDate.getFullYear();
      const weekNumber = getWeekNumber(workDate);
      
      // If we are viewing all employees, we need to group by employee as well
      const employeeId = timesheet.employeeId || 'unknown';
      const weekKey = `${employeeId}-${year}-W${weekNumber}`;
      
      if (!weeklyGroups[weekKey]) {
        // Calculate week start and end dates
        // Prefer using the backend provided weekStartDate if available
        let weekStart;
        if (timesheet.weekStartDate) {
          weekStart = new Date(timesheet.weekStartDate);
        } else {
          const firstDayOfYear = new Date(year, 0, 1);
          const daysToAdd = (weekNumber - 1) * 7;
          weekStart = new Date(firstDayOfYear.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
          
          // Adjust to start of week (Monday)
          const dayOfWeek = weekStart.getDay();
          const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          weekStart.setDate(weekStart.getDate() - daysFromMonday);
        }
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        weeklyGroups[weekKey] = {
          id: weekKey,
          week: `Week ${weekNumber} (${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${year})`,
          year: year,
          weekNumber: weekNumber,
          employeeId: timesheet.employee?.employeeId || timesheet.employeeId,
          employeeName: timesheet.employee ? `${timesheet.employee.firstName} ${timesheet.employee.lastName}` : 'Unknown',
          timesheets: [],
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          status: 'draft',
          submittedDate: null
        };
      }
      
      weeklyGroups[weekKey].timesheets.push(timesheet);
    });
    
    // Process each week group to calculate totals and status
    const weeklyHistory = Object.values(weeklyGroups).map(week => {
      // Ensure hoursWorked is treated as a number
      const totalHours = week.timesheets.reduce((sum, ts) => sum + (Number(ts.hoursWorked) || 0), 0);
      
      // Calculate regular and overtime hours
      // Assuming 40 hours is the standard work week
      const regularHours = Math.min(totalHours, 40);
      const overtimeHours = Math.max(totalHours - 40, 0);
      
      // Determine week status
      const submittedTimesheets = week.timesheets.filter(ts => ts.status === 'Submitted' || ts.status === 'Approved' || ts.status === 'Rejected');
      const draftTimesheets = week.timesheets.filter(ts => ts.status === 'Draft');
      
      let weekStatus = 'draft';
      let submittedDate = null;
      
      if (submittedTimesheets.length > 0) {
        if (submittedTimesheets.every(ts => ts.status === 'Approved')) {
          weekStatus = 'approved';
        } else if (submittedTimesheets.some(ts => ts.status === 'Rejected')) {
          weekStatus = 'rejected';
        } else {
          weekStatus = 'submitted';
        }
        
        // Get the latest submitted date
        const submittedDates = submittedTimesheets
          .map(ts => ts.submittedAt || ts.updatedAt)
          .filter(date => date)
          .sort((a, b) => new Date(b) - new Date(a));
        
        if (submittedDates.length > 0) {
          submittedDate = new Date(submittedDates[0]).toLocaleDateString('en-US');
        }
      }
      
      return {
        ...week,
        totalHours,
        regularHours,
        overtimeHours,
        status: weekStatus,
        submittedDate: submittedDate || 'Not submitted',
        timesheetCount: week.timesheets.length,
        draftCount: draftTimesheets.length,
        submittedCount: submittedTimesheets.length
      };
    });
    
    // Sort by year and week descending (most recent first)
    weeklyHistory.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.weekNumber - a.weekNumber;
    });

    return weeklyHistory;
  };

  const calculateAttendance = (timesheets) => {
    // Group by Month (YYYY-MM)
    const monthlyGroups = {};
    
    timesheets.forEach(ts => {
      if (!ts.workDate) return;
      const date = new Date(ts.workDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = {
          month: monthName,
          totalDays: 0, // Will be calculated based on month length excluding weekends
          daysWorked: new Set(), // Use Set to count unique days
          hoursWorked: 0
        };
        
        // Calculate total working days in this month (Mon-Fri)
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let workingDays = 0;
        
        for (let d = 1; d <= daysInMonth; d++) {
          const dayDate = new Date(year, month, d);
          const dayOfWeek = dayDate.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sun (0) and Sat (6)
            workingDays++;
          }
        }
        monthlyGroups[monthKey].totalDays = workingDays;
      }
      
      if (Number(ts.hoursWorked) > 0) {
        monthlyGroups[monthKey].daysWorked.add(ts.workDate); // Assuming workDate is YYYY-MM-DD string or unique per day
        monthlyGroups[monthKey].hoursWorked += Number(ts.hoursWorked);
      }
    });
    
    return Object.values(monthlyGroups).map(group => {
      const daysWorkedCount = group.daysWorked.size;
      const percentage = group.totalDays > 0 ? (daysWorkedCount / group.totalDays) * 100 : 0;
      
      return {
        month: group.month,
        daysWorked: daysWorkedCount,
        totalDays: group.totalDays,
        percentage: Math.min(percentage, 100), // Cap at 100%
        totalHours: group.hoursWorked
      };
    }).sort((a, b) => new Date(b.month) - new Date(a.month)); // Sort by month descending
  };

  // 🚀 Process data when queries complete
  useEffect(() => {
    // Process timesheets
    if (timesheetQuery.data?.data) {
      const timesheets = timesheetQuery.data.data;
      setTimesheetHistory(processTimesheets(timesheets));
      
      // Calculate attendance from timesheets (only for single employee view)
      if (targetEmployeeId !== 'ALL') {
        setAttendanceHistory(calculateAttendance(timesheets));
      } else {
        setAttendanceHistory([]);
      }
    }

    // Process leaves
    if (leaveQuery.data?.data) {
      const leaves = Array.isArray(leaveQuery.data.data) 
        ? leaveQuery.data.data 
        : (leaveQuery.data.data.data || []);
      
      // Sort by applied date descending
      const sortedLeaves = leaves.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLeaveHistory(sortedLeaves);
    }
  }, [timesheetQuery.data, leaveQuery.data, targetEmployeeId]);

  // Refresh function
  const refresh = useCallback(() => {
    timesheetQuery.refetch();
    leaveQuery.refetch();
  }, [timesheetQuery, leaveQuery]);

  return {
    loading,
    error,
    leaveHistory,
    timesheetHistory,
    attendanceHistory,
    refresh
  };
};
