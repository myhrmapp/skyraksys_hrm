import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAuth } from '../../../../contexts/AuthContext';
import { timesheetService } from '../../../../services/timesheet.service';
import { leaveService } from '../../../../services/leave.service';

export const useEmployeeRecords = (targetEmployeeId = null) => {
  const { user, hasAnyRole } = useAuth();
  const canViewAll = hasAnyRole(['admin', 'hr', 'manager']);

  // Determine query parameters based on targetEmployeeId
  const queryParams = useMemo(() => {
    const myId = user?.employeeId || user?.employee?.id;
    
    // For admins/HR/managers, if "ALL" is selected, we want to fetch all records.
    // The services interpret an empty object `{}` as "no filter".
    if (canViewAll && targetEmployeeId === 'ALL') {
      return {};
    }
    
    // If a specific employee is targeted (from search), use their ID.
    if (targetEmployeeId) {
      return { employeeId: targetEmployeeId };
    }
    
    // Default: any logged-in user fetching their own records.
    if (myId) {
      return { employeeId: myId };
    }

    // If no ID can be determined (e.g., user not fully loaded), disable queries.
    return null;
  }, [targetEmployeeId, user, canViewAll]);

  // 🚀 Use React Query's useQueries for parallel data fetching
  const queries = useQueries({
    queries: [
      {
        queryKey: ['timesheets', 'history', queryParams],
        queryFn: () => timesheetService.getHistory(queryParams),
        enabled: !!queryParams,
        staleTime: 2 * 60 * 1000, // 2 minutes
      },
      {
        queryKey: ['leaves', 'history', queryParams],
        queryFn: () => leaveService.getAll({ ...queryParams, limit: 500 }),
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
    // The Timesheet model stores one row per employee+project+task+week.
    // Group by employee + week so multiple projects in the same week are merged.
    // Model fields: weekStartDate, weekEndDate, weekNumber, year, totalHoursWorked, status
    const weeklyGroups = {};

    timesheets.forEach(timesheet => {
      if (!timesheet.weekStartDate) return; // skip rows with no week date

      const year = timesheet.year || new Date(timesheet.weekStartDate).getFullYear();
      const weekNumber = timesheet.weekNumber || getWeekNumber(new Date(timesheet.weekStartDate));
      if (isNaN(weekNumber) || isNaN(year)) return;

      const employeeId = timesheet.employeeId || 'unknown';
      const weekKey = `${employeeId}-${year}-W${weekNumber}`;

      if (!weeklyGroups[weekKey]) {
        const weekStart = new Date(timesheet.weekStartDate);
        const weekEnd = timesheet.weekEndDate
          ? new Date(timesheet.weekEndDate)
          : new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

        const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        weeklyGroups[weekKey] = {
          id: weekKey,
          week: `Week ${weekNumber} (${fmt(weekStart)}-${fmt(weekEnd)}, ${year})`,
          year,
          weekNumber,
          employeeId: timesheet.employee?.employeeId || timesheet.employeeId,
          employeeName: timesheet.employee
            ? `${timesheet.employee.firstName} ${timesheet.employee.lastName}`
            : 'Unknown',
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

    // Aggregate each week group
    const weeklyHistory = Object.values(weeklyGroups).map(week => {
      // Sum totalHoursWorked across all project/task rows for this week
      const totalHours = week.timesheets.reduce(
        (sum, ts) => sum + (Number(ts.totalHoursWorked) || 0), 0
      );

      const regularHours = Math.min(totalHours, 40);
      const overtimeHours = Math.max(totalHours - 40, 0);

      // Status: if any row is Approved/Rejected/Submitted treat week as non-draft
      const nonDraft = week.timesheets.filter(
        ts => ['Submitted', 'Approved', 'Rejected'].includes(ts.status)
      );
      const draftTimesheets = week.timesheets.filter(ts => ts.status === 'Draft');

      let weekStatus = 'draft';
      let submittedDate = null;

      if (nonDraft.length > 0) {
        if (nonDraft.every(ts => ts.status === 'Approved')) {
          weekStatus = 'approved';
        } else if (nonDraft.some(ts => ts.status === 'Rejected')) {
          weekStatus = 'rejected';
        } else {
          weekStatus = 'submitted';
        }

        const dates = nonDraft
          .map(ts => ts.submittedAt || ts.updatedAt)
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a));
        if (dates.length > 0) {
          submittedDate = new Date(dates[0]).toLocaleDateString('en-US');
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
        submittedCount: nonDraft.length
      };
    });

    // Most recent week first
    weeklyHistory.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.weekNumber - a.weekNumber;
    });

    return weeklyHistory;
  };

  const calculateAttendance = (timesheets) => {
    // Group by Month (YYYY-MM)
    const monthlyGroups = {};
    
    // Use weekStartDate (the model field) instead of workDate which doesn't exist.
    // Each timesheet row covers Mon–Sun; count that week's Mon–Fri days as worked.
    timesheets.forEach(ts => {
      if (!ts.weekStartDate) return;
      const date = new Date(ts.weekStartDate);
      if (isNaN(date.getTime())) return;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = {
          month: monthName,
          totalDays: 0,
          daysWorked: new Set(),
          hoursWorked: 0
        };

        // Count Mon–Fri working days in this month
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let workingDays = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          const dow = new Date(year, month, d).getDay();
          if (dow !== 0 && dow !== 6) workingDays++;
        }
        monthlyGroups[monthKey].totalDays = workingDays;
      }

      const hours = Number(ts.totalHoursWorked) || 0;
      if (hours > 0) {
        // Add weekStart as a proxy date so different weeks don't collapse to same key
        monthlyGroups[monthKey].daysWorked.add(ts.weekStartDate);
        monthlyGroups[monthKey].hoursWorked += hours;
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
    // normalizeResponse may return the array directly (no wrapper) when the backend
    // response has a nested 'data' property but no top-level 'pagination' key.
    if (leaveQuery.data) {
      let leaves;
      if (Array.isArray(leaveQuery.data)) {
        leaves = leaveQuery.data;                          // array returned directly
      } else if (Array.isArray(leaveQuery.data?.data)) {
        leaves = leaveQuery.data.data;                     // { data: [...] } wrapper
      } else {
        leaves = leaveQuery.data?.data?.data || [];        // nested double-wrap
      }

      // Sort by applied date descending
      const sortedLeaves = [...leaves].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLeaveHistory(sortedLeaves);
    }
  }, [timesheetQuery.data, leaveQuery.data, targetEmployeeId]); // eslint-disable-line react-hooks/exhaustive-deps

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
