import http from '../http-common';

// Performance service for both client and server metrics
class PerformanceService {
  
  // Admin-only: Get detailed server performance metrics
  async getServerMetrics() {
    try {
      const response = await http.get('/performance/server-metrics');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch server metrics:', error);
      throw error;
    }
  }

  // Admin-only: Get API performance metrics
  async getAPIMetrics() {
    try {
      const response = await http.get('/performance/api-metrics');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch API metrics:', error);
      throw error;
    }
  }

  // All users: Get basic health metrics
  async getHealthMetrics() {
    try {
      const response = await http.get('/performance/health-metrics');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch health metrics:', error);
      throw error;
    }
  }

  // Client-side performance metrics for users
  getClientMetrics() {
    try {
      const metrics = {
        client: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
          timestamp: new Date().toISOString()
        },
        performance: {
          // Page load performance
          navigation: this.getNavigationMetrics(),
          // Memory usage (if supported)
          memory: this.getMemoryMetrics(),
          // Connection info
          connection: this.getConnectionMetrics(),
          // Screen info
          screen: this.getScreenMetrics()
        }
      };

      return metrics;
    } catch (error) {
      console.error('Failed to get client metrics:', error);
      return null;
    }
  }

  getNavigationMetrics() {
    if (!performance || !performance.timing) {
      return null;
    }

    const timing = performance.timing;
    const navigationStart = timing.navigationStart;

    return {
      dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
      tcpConnection: timing.connectEnd - timing.connectStart,
      serverResponse: timing.responseEnd - timing.requestStart,
      pageLoad: timing.loadEventEnd - navigationStart,
      domReady: timing.domContentLoadedEventEnd - navigationStart,
      firstPaint: this.getFirstPaintTime(),
      resources: this.getResourceMetrics()
    };
  }

  getFirstPaintTime() {
    try {
      const paintEntries = performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
      const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      
      return {
        firstPaint: firstPaint ? Math.round(firstPaint.startTime) : null,
        firstContentfulPaint: firstContentfulPaint ? Math.round(firstContentfulPaint.startTime) : null
      };
    } catch (error) {
      return null;
    }
  }

  getResourceMetrics() {
    try {
      const resources = performance.getEntriesByType('resource');
      const resourceSummary = {
        total: resources.length,
        byType: {},
        slowest: []
      };

      // Group by resource type
      resources.forEach(resource => {
        const type = this.getResourceType(resource.name);
        if (!resourceSummary.byType[type]) {
          resourceSummary.byType[type] = { count: 0, totalSize: 0, totalTime: 0 };
        }
        resourceSummary.byType[type].count++;
        resourceSummary.byType[type].totalSize += resource.transferSize || 0;
        resourceSummary.byType[type].totalTime += resource.duration || 0;
      });

      // Find slowest resources
      resourceSummary.slowest = resources
        .sort((a, b) => (b.duration || 0) - (a.duration || 0))
        .slice(0, 5)
        .map(resource => ({
          name: resource.name.split('/').pop(),
          duration: Math.round(resource.duration || 0),
          size: resource.transferSize || 0
        }));

      return resourceSummary;
    } catch (error) {
      return null;
    }
  }

  getResourceType(url) {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.gif') || url.includes('.svg')) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  getMemoryMetrics() {
    try {
      if (performance.memory) {
        return {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), // MB
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024), // MB
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024), // MB
          usagePercent: Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100)
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  getConnectionMetrics() {
    try {
      if (navigator.connection) {
        return {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt,
          saveData: navigator.connection.saveData
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  getScreenMetrics() {
    try {
      return {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth,
        devicePixelRatio: window.devicePixelRatio || 1,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };
    } catch (error) {
      return null;
    }
  }

  // Get performance score based on metrics
  calculatePerformanceScore(metrics) {
    let score = 100;

    if (metrics.performance && metrics.performance.navigation) {
      const nav = metrics.performance.navigation;
      
      // Page load time penalties
      if (nav.pageLoad > 3000) score -= 20;
      else if (nav.pageLoad > 2000) score -= 10;
      else if (nav.pageLoad > 1000) score -= 5;

      // First paint penalties  
      if (nav.firstPaint && nav.firstPaint.firstContentfulPaint) {
        if (nav.firstPaint.firstContentfulPaint > 2000) score -= 15;
        else if (nav.firstPaint.firstContentfulPaint > 1000) score -= 8;
      }

      // Server response penalties
      if (nav.serverResponse > 500) score -= 10;
      else if (nav.serverResponse > 200) score -= 5;
    }

    // Memory usage penalties
    if (metrics.performance && metrics.performance.memory) {
      const memUsage = metrics.performance.memory.usagePercent;
      if (memUsage > 80) score -= 15;
      else if (memUsage > 60) score -= 8;
    }

    return Math.max(0, Math.min(100, score));
  }
}

const performanceServiceInstance = new PerformanceService();
export default performanceServiceInstance;