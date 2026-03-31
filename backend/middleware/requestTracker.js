/**
 * In-memory request tracker middleware
 * Tracks API request counts, response times, error rates, and endpoint performance.
 * Data is reset on server restart (intentional — no persistence needed for live metrics).
 */

const MAX_ENDPOINT_ENTRIES = 50;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

class RequestTracker {
  constructor() {
    this.stats = {
      total: 0,
      successful: 0,
      failed: 0,
      responseTimes: [],       // rolling window of last 1000
      endpointMap: new Map(),  // path -> { count, totalTime, errors }
      startedAt: Date.now()
    };

    // Periodically trim response times to prevent unbounded growth
    this._cleanupTimer = setInterval(() => this._cleanup(), CLEANUP_INTERVAL_MS);
    if (this._cleanupTimer.unref) this._cleanupTimer.unref();
  }

  /**
   * Express middleware that tracks each request.
   */
  middleware() {
    return (req, res, next) => {
      // Skip non-API and health/metrics endpoints to avoid self-tracking noise
      if (!req.path.startsWith('/api/') || req.path.includes('/performance/')) {
        return next();
      }

      const start = process.hrtime.bigint();

      const onFinish = () => {
        res.removeListener('finish', onFinish);

        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

        this.stats.total++;

        if (res.statusCode >= 400) {
          this.stats.failed++;
        } else {
          this.stats.successful++;
        }

        // Rolling window of response times (keep last 1000)
        this.stats.responseTimes.push(durationMs);
        if (this.stats.responseTimes.length > 1000) {
          this.stats.responseTimes = this.stats.responseTimes.slice(-1000);
        }

        // Per-endpoint tracking (normalise IDs to :id)
        const normPath = this._normalisePath(req.method, req.path);
        const entry = this.stats.endpointMap.get(normPath) || { count: 0, totalTime: 0, errors: 0 };
        entry.count++;
        entry.totalTime += durationMs;
        if (res.statusCode >= 400) entry.errors++;
        this.stats.endpointMap.set(normPath, entry);

        // Cap endpoint entries
        if (this.stats.endpointMap.size > MAX_ENDPOINT_ENTRIES) {
          const first = this.stats.endpointMap.keys().next().value;
          this.stats.endpointMap.delete(first);
        }
      };

      res.on('finish', onFinish);
      next();
    };
  }

  /**
   * Returns a snapshot of tracked metrics.
   */
  getMetrics() {
    const times = this.stats.responseTimes;
    const sorted = [...times].sort((a, b) => a - b);
    const total = this.stats.total || 1; // avoid division by zero

    const average = times.length > 0
      ? Math.round(times.reduce((s, t) => s + t, 0) / times.length)
      : 0;

    const p95 = sorted.length > 0
      ? Math.round(sorted[Math.floor(sorted.length * 0.95)])
      : 0;

    const p99 = sorted.length > 0
      ? Math.round(sorted[Math.floor(sorted.length * 0.99)])
      : 0;

    // Top endpoints by request count
    const endpoints = [...this.stats.endpointMap.entries()]
      .map(([path, data]) => ({
        path,
        count: data.count,
        avgTime: Math.round(data.totalTime / data.count),
        errors: data.errors
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      requests: {
        total: this.stats.total,
        successful: this.stats.successful,
        failed: this.stats.failed,
        errorRate: total > 0 ? ((this.stats.failed / total) * 100).toFixed(1) : '0.0'
      },
      responseTime: {
        average,
        p95,
        p99,
        sampleSize: times.length
      },
      endpoints,
      uptime: Math.round((Date.now() - this.stats.startedAt) / 1000)
    };
  }

  _normalisePath(method, path) {
    // Replace UUIDs and numeric IDs with :id
    const normalised = path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id');
    return `${method} ${normalised}`;
  }

  _cleanup() {
    // Trim response times to last 1000
    if (this.stats.responseTimes.length > 1000) {
      this.stats.responseTimes = this.stats.responseTimes.slice(-1000);
    }
  }
}

// Singleton instance
const tracker = new RequestTracker();

module.exports = tracker;
