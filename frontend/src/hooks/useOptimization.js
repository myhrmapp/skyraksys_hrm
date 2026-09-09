import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react';

/**
 * Higher-order component for React.memo with custom comparison
 * @param {React.Component} Component - Component to memoize
 * @param {Function} areEqual - Custom comparison function
 * @returns {React.Component} Memoized component
 */
export const withMemo = (Component, areEqual) => {
  const MemoizedComponent = memo(Component, areEqual);
  MemoizedComponent.displayName = `withMemo(${Component.displayName || Component.name})`;
  return MemoizedComponent;
};

/**
 * Hook for stable callback functions
 * @param {Function} callback - Callback function
 * @param {Array} deps - Dependencies array
 * @returns {Function} Stable callback
 */
export const useStableCallback = (callback, deps) => {
  return useCallback(callback, deps);
};

/**
 * Hook for expensive computations with memoization
 * @param {Function} factory - Factory function for computation
 * @param {Array} deps - Dependencies array
 * @returns {*} Memoized value
 */
export const useExpensiveValue = (factory, deps) => {
  return useMemo(factory, deps);
};

/**
 * Hook for debounced values
 * @param {*} value - Value to debounce
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {*} Debounced value
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook for throttled values
 * @param {*} value - Value to throttle
 * @param {number} limit - Throttle limit in milliseconds
 * @returns {*} Throttled value
 */
export const useThrottle = (value, limit) => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
};

/**
 * Hook for previous value
 * @param {*} value - Current value
 * @returns {*} Previous value
 */
export const usePrevious = (value) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

/**
 * Hook for component mount status
 * @returns {boolean} Mount status
 */
export const useIsMounted = () => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
};

/**
 * Hook for safe async operations
 * @param {Function} asyncFn - Async function
 * @param {Array} deps - Dependencies array
 * @returns {Object} State and handlers
 */
export const useSafeAsync = (asyncFn, deps = []) => {
  const [state, setState] = useState({
    loading: false,
    error: null,
    data: null
  });

  const isMounted = useIsMounted();

  const execute = useCallback(async (...args) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await asyncFn(...args);

      if (isMounted()) {
        setState({ loading: false, error: null, data: result });
      }

      return result;
    } catch (error) {
      if (isMounted()) {
        setState({ loading: false, error, data: null });
      }
      throw error;
    }
  }, deps);

  return { ...state, execute };
};

/**
 * Hook for deep comparison memo
 * @param {*} value - Value to memoize
 * @returns {*} Memoized value with deep comparison
 */
export const useDeepMemo = (value) => {
  const ref = useRef();

  if (!deepEqual(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
};

/**
 * Deep equality comparison
 * @param {*} a - First value
 * @param {*} b - Second value
 * @returns {boolean} Equality result
 */
const deepEqual = (a, b) => {
  if (a === b) return true;

  if (a == null || b == null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (let key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
};

/**
 * Hook for local storage with state sync
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value
 * @returns {Array} [value, setValue]
 */
export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setStoredValue = useCallback((newValue) => {
    try {
      setValue(newValue);
      window.localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [value, setStoredValue];
};

/**
 * Hook for intersection observer (lazy loading, infinite scroll)
 * @param {Object} options - Intersection observer options
 * @returns {Array} [ref, isIntersecting]
 */
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [ref, setRef] = useState(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(ref);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return [setRef, isIntersecting];
};

/**
 * Hook for window size
 * @returns {Object} Window dimensions
 */
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

/**
 * Hook for media queries
 * @param {string} query - Media query string
 * @returns {boolean} Match result
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

/**
 * Hook for optimized list rendering with virtualization helpers
 * @param {Array} items - List items
 * @param {number} itemHeight - Height of each item
 * @param {number} containerHeight - Container height
 * @returns {Object} Virtualization data
 */
export const useVirtualization = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, containerHeight, scrollTop]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    ...visibleItems,
    handleScroll
  };
};

/**
 * Performance monitoring hook
 * @param {string} name - Performance marker name
 * @param {Array} deps - Dependencies to monitor
 */
export const usePerformance = (name, deps = []) => {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (duration > 16.67) { // Longer than 1 frame at 60fps
        console.warn(`Performance: ${name} took ${duration.toFixed(2)}ms`);
      }

      // Mark performance for profiling tools
      if (typeof performance.mark === 'function') {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      }
    };
  }, deps);

  useEffect(() => {
    if (typeof performance.mark === 'function') {
      performance.mark(`${name}-start`);
    }
  }, deps);
};

/**
 * Component for lazy loading with Intersection Observer
 */
export const LazyComponent = memo(({
  children,
  fallback = <div>Loading...</div>,
  rootMargin = '100px',
  threshold = 0.1
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [ref, setRef] = useState(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(ref);

    return () => observer.disconnect();
  }, [ref, rootMargin, threshold]);

  return (
    <div ref={setRef}>
      {isVisible ? children : fallback}
    </div>
  );
});

LazyComponent.displayName = 'LazyComponent';

/**
 * Higher-order component for performance monitoring
 * @param {React.Component} Component - Component to monitor
 * @param {string} name - Performance name
 * @returns {React.Component} Monitored component
 */
export const withPerformanceMonitoring = (Component, name) => {
  const MonitoredComponent = (props) => {
    usePerformance(name || Component.displayName || Component.name);
    return <Component {...props} />;
  };

  MonitoredComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;

  return MonitoredComponent;
};

export default {
  withMemo,
  useStableCallback,
  useExpensiveValue,
  useDebounce,
  useThrottle,
  usePrevious,
  useIsMounted,
  useSafeAsync,
  useDeepMemo,
  useLocalStorage,
  useIntersectionObserver,
  useWindowSize,
  useMediaQuery,
  useVirtualization,
  usePerformance,
  LazyComponent,
  withPerformanceMonitoring
};
