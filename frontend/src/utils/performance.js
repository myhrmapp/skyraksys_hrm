
// React Performance Optimization Utilities

import React, { memo, useCallback, useMemo } from 'react';

// HOC for expensive list items
export const withMemoization = (Component, compareProps) => {
  return memo(Component, compareProps);
};

// Custom hook for optimized callbacks
export const useOptimizedCallback = (callback, dependencies) => {
  return useCallback(callback, dependencies);
};

// Custom hook for expensive calculations
export const useOptimizedMemo = (computation, dependencies) => {
  return useMemo(computation, dependencies);
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
  React.useEffect(() => {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render time: ${endTime - startTime}ms`);
      }
    };
  });
};

// List virtualization helper
export const VirtualizedList = memo(({ 
  items, 
  renderItem, 
  itemHeight = 50,
  containerHeight = 400 
}) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  );
  
  const visibleItems = items.slice(visibleStart, visibleEnd + 1);
  
  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.target.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              top: (visibleStart + index) * itemHeight,
              width: '100%',
              height: itemHeight
            }}
          >
            {renderItem(item, visibleStart + index)}
          </div>
        ))}
      </div>
    </div>
  );
});

export default {
  withMemoization,
  useOptimizedCallback,
  useOptimizedMemo,
  usePerformanceMonitor,
  VirtualizedList
};
