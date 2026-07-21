import { useEffect, useState, useRef } from 'react';
import { employeeService } from '../services/employee.service';
import { useAuth } from '../contexts/AuthContext';

const extractListData = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

// Lightweight in-memory cache for metadata to avoid repeat fetches
const cache = {
  departments: null,
  positions: null,
  managers: null,
};

export function useMetadataCache(options = { includeManagers: true }) {
  const { user: authUser } = useAuth();
  const [departments, setDepartments] = useState(cache.departments || []);
  const [positions, setPositions] = useState(cache.positions || []);
  const [managers, setManagers] = useState(cache.managers || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    async function load() {
      // Only fetch if missing
      const needDepts = !cache.departments;
      const needPositions = !cache.positions;
      const user = options.user || authUser;
      const canFetchManagers = user && ['admin', 'hr', 'manager'].includes(user.role);
      const needManagers = options.includeManagers && !cache.managers && canFetchManagers;
      if (!needDepts && !needPositions && !needManagers) return;

      setLoading(true);
      setError(null);
      try {
        const [deptRes, posRes, mgrRes] = await Promise.all([
          needDepts ? employeeService.getDepartments().catch(() => []) : Promise.resolve(cache.departments || []),
          needPositions ? employeeService.getPositions().catch(() => []) : Promise.resolve(cache.positions || []),
          needManagers ? employeeService.getManagers().catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
        ]);

        const d = extractListData(deptRes);
        const p = extractListData(posRes);
        const m = mgrRes?.data?.data || [];

        // Update cache
        if (needDepts) cache.departments = d;
        if (needPositions) cache.positions = p;
        if (needManagers) cache.managers = m;

        if (mounted.current) {
          setDepartments(cache.departments);
          setPositions(cache.positions);
          if (options.includeManagers && canFetchManagers) setManagers(cache.managers);
          if (options.includeManagers && !canFetchManagers) setManagers([]);
        }
      } catch (e) {
        if (mounted.current) setError(e);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    load();
    return () => { mounted.current = false; };
  }, [options.includeManagers, authUser]); // eslint-disable-line react-hooks/exhaustive-deps

  return { departments, positions, managers, loading, error };
}
