import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Performance monitoring hook for React components
 * Tracks render times, mount times, and component lifecycle performance
 */
export const usePerformanceMonitor = (componentName, options = {}) => {
  const {
    trackRenders = true,
    trackMounts = true,
    logToConsole = process.env.NODE_ENV === 'development',
    threshold = 100 // ms - log if render takes longer than this
  } = options;

  const renderStartTime = useRef(Date.now());
  const mountStartTime = useRef(Date.now());
  const renderCount = useRef(0);
  const [performanceData, setPerformanceData] = useState({
    averageRenderTime: 0,
    totalRenders: 0,
    slowRenders: 0,
    mountTime: 0,
    lastRenderTime: 0
  });

  // Track component mount time
  useEffect(() => {
    if (trackMounts) {
      const mountTime = Date.now() - mountStartTime.current;

      if (logToConsole) {
        console.log(`📊 ${componentName} mounted in ${mountTime}ms`);
      }

      setPerformanceData(prev => ({
        ...prev,
        mountTime
      }));
    }
  }, [componentName, trackMounts, logToConsole]);

  // Track render performance
  useEffect(() => {
    if (trackRenders) {
      const renderTime = Date.now() - renderStartTime.current;
      renderCount.current += 1;

      const isSlowRender = renderTime > threshold;

      if (logToConsole && isSlowRender) {
        console.warn(`⚠️ Slow render detected: ${componentName} took ${renderTime}ms`);
      }

      setPerformanceData(prev => {
        const newTotalRenders = renderCount.current;
        const newAverageRenderTime =
          (prev.averageRenderTime * (newTotalRenders - 1) + renderTime) / newTotalRenders;

        return {
          ...prev,
          averageRenderTime: newAverageRenderTime,
          totalRenders: newTotalRenders,
          slowRenders: isSlowRender ? prev.slowRenders + 1 : prev.slowRenders,
          lastRenderTime: renderTime
        };
      });
    }
  }, [trackRenders, threshold, logToConsole, componentName]);

  // Reset render timer before each render
  renderStartTime.current = Date.now();

  const getPerformanceReport = useCallback(() => {
    return {
      component: componentName,
      ...performanceData,
      performanceScore: calculatePerformanceScore(performanceData)
    };
  }, [componentName, performanceData]);

  return {
    performanceData,
    getPerformanceReport
  };
};

/**
 * Calculate performance score (0-100)
 */
const calculatePerformanceScore = (data) => {
  const { averageRenderTime, slowRenders, totalRenders, mountTime } = data;

  let score = 100;

  // Penalize slow average render time
  if (averageRenderTime > 50) score -= 20;
  if (averageRenderTime > 100) score -= 20;
  if (averageRenderTime > 200) score -= 30;

  // Penalize high percentage of slow renders
  const slowRenderPercentage = totalRenders > 0 ? (slowRenders / totalRenders) * 100 : 0;
  if (slowRenderPercentage > 10) score -= 15;
  if (slowRenderPercentage > 25) score -= 20;

  // Penalize slow mount time
  if (mountTime > 500) score -= 10;
  if (mountTime > 1000) score -= 20;

  return Math.max(0, score);
};

/**
 * Hook for tracking API request performance
 */
export const useAPIPerformanceMonitor = () => {
  const [apiMetrics, setApiMetrics] = useState({
    totalRequests: 0,
    averageResponseTime: 0,
    slowRequests: 0,
    failedRequests: 0,
    cacheHits: 0
  });

  const trackRequest = useCallback((startTime, endTime, url, success = true, fromCache = false) => {
    const responseTime = endTime - startTime;
    const isSlowRequest = responseTime > 1000; // 1 second threshold

    setApiMetrics(prev => {
      const newTotalRequests = prev.totalRequests + 1;
      const newAverageResponseTime =
        (prev.averageResponseTime * prev.totalRequests + responseTime) / newTotalRequests;

      return {
        totalRequests: newTotalRequests,
        averageResponseTime: newAverageResponseTime,
        slowRequests: isSlowRequest ? prev.slowRequests + 1 : prev.slowRequests,
        failedRequests: success ? prev.failedRequests : prev.failedRequests + 1,
        cacheHits: fromCache ? prev.cacheHits + 1 : prev.cacheHits
      };
    });

    // Log slow requests in development
    if (process.env.NODE_ENV === 'development' && isSlowRequest) {
      console.warn(`🐌 Slow API request: ${url} took ${responseTime}ms`);
    }

    return responseTime;
  }, []);

  return {
    apiMetrics,
    trackRequest
  };
};

/**
 * Bundle size monitoring utilities
 */
export const useBundleMonitor = () => {
  const [bundleInfo, setBundleInfo] = useState({
    chunkCount: 0,
    totalSize: 0,
    loadedChunks: new Set()
  });

  useEffect(() => {
    // Monitor webpack chunks if available
    if (typeof window !== 'undefined' && window.__webpack_require__) {
      const webpackRequire = window.__webpack_require__;

      // Track loaded chunks
      const originalRequire = webpackRequire.e;
      webpackRequire.e = function(chunkId) {
        setBundleInfo(prev => ({
          ...prev,
          loadedChunks: new Set([...prev.loadedChunks, chunkId])
        }));

        return originalRequire.call(this, chunkId);
      };
    }
  }, []);

  const getChunkLoadInfo = useCallback(() => {
    return {
      loadedChunks: Array.from(bundleInfo.loadedChunks),
      chunkCount: bundleInfo.loadedChunks.size
    };
  }, [bundleInfo]);

  return {
    bundleInfo,
    getChunkLoadInfo
  };
};

/**
 * Memory usage monitoring hook
 */
export const useMemoryMonitor = () => {
  const [memoryInfo, setMemoryInfo] = useState({
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0
  });

  useEffect(() => {
    const updateMemoryInfo = () => {
      if (performance.memory) {
        setMemoryInfo({
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getMemoryUsagePercent = useCallback(() => {
    if (memoryInfo.jsHeapSizeLimit === 0) return 0;
    return (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
  }, [memoryInfo]);

  return {
    memoryInfo,
    getMemoryUsagePercent
  };
};
