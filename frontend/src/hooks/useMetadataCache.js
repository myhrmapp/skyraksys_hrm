import { useEffect, useState, useRef } from 'react';
import { employeeService } from '../services/employee.service';

// Lightweight in-memory cache for metadata to avoid repeat fetches
const cache = {
  departments: null,
  positions: null,
  managers: null,
};

export function useMetadataCache(options = { includeManagers: true }) {
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
      const needManagers = options.includeManagers && !cache.managers;
      if (!needDepts && !needPositions && !needManagers) return;

      setLoading(true);
      setError(null);
      try {
        const [deptRes, posRes, mgrRes] = await Promise.all([
          needDepts ? employeeService.getDepartments().catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: cache.departments } }),
          needPositions ? employeeService.getPositions().catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: cache.positions } }),
          needManagers ? employeeService.getManagers().catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: cache.managers } }),
        ]);

        const d = deptRes.data?.data || [];
        const p = posRes.data?.data || [];
        const m = mgrRes?.data?.data || [];

        // Update cache
        if (needDepts) cache.departments = d;
        if (needPositions) cache.positions = p;
        if (needManagers) cache.managers = m;

        if (mounted.current) {
          setDepartments(cache.departments);
          setPositions(cache.positions);
          if (options.includeManagers) setManagers(cache.managers);
        }
      } catch (e) {
        if (mounted.current) setError(e);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    load();
    return () => { mounted.current = false; };
  }, [options.includeManagers]);

  return { departments, positions, managers, loading, error };
}
