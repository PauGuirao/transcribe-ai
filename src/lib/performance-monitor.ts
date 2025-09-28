/**
 * Performance Monitoring System for Database Queries
 * Provides comprehensive tracking and analysis of query performance
 */

export interface QueryMetrics {
  queryName: string;
  executionTime: number;
  timestamp: number;
  route: string;
  userId?: string;
  parameters?: Record<string, any>;
}

export interface PerformanceStats {
  queryName: string;
  totalExecutions: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  totalTime: number;
  p95Time: number;
  p99Time: number;
  errorRate: number;
  lastExecuted: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: QueryMetrics[] = [];
  private errors: Map<string, number> = new Map();
  private maxMetricsSize = 10000; // Keep last 10k metrics

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Track a successful query execution
   */
  trackQuery(
    queryName: string,
    executionTime: number,
    route: string,
    userId?: string,
    parameters?: Record<string, any>
  ) {
    const metric: QueryMetrics = {
      queryName,
      executionTime,
      timestamp: Date.now(),
      route,
      userId,
      parameters
    };

    this.metrics.push(metric);

    // Keep metrics array size manageable
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }
  }

  /**
   * Track a query error
   */
  trackError(queryName: string) {
    const currentCount = this.errors.get(queryName) || 0;
    this.errors.set(queryName, currentCount + 1);
  }

  /**
   * Get performance statistics for a specific query
   */
  getQueryStats(queryName: string): PerformanceStats | null {
    const queryMetrics = this.metrics.filter(m => m.queryName === queryName);
    if (queryMetrics.length === 0) return null;

    const executionTimes = queryMetrics.map(m => m.executionTime).sort((a, b) => a - b);
    const totalExecutions = queryMetrics.length;
    const totalTime = executionTimes.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / totalExecutions;
    const minTime = executionTimes[0];
    const maxTime = executionTimes[executionTimes.length - 1];
    
    // Calculate percentiles
    const p95Index = Math.floor(executionTimes.length * 0.95);
    const p99Index = Math.floor(executionTimes.length * 0.99);
    const p95Time = executionTimes[p95Index] || maxTime;
    const p99Time = executionTimes[p99Index] || maxTime;

    const errorCount = this.errors.get(queryName) || 0;
    const errorRate = errorCount / (totalExecutions + errorCount);
    const lastExecuted = Math.max(...queryMetrics.map(m => m.timestamp));

    return {
      queryName,
      totalExecutions,
      averageTime: Math.round(averageTime),
      minTime,
      maxTime,
      totalTime,
      p95Time,
      p99Time,
      errorRate,
      lastExecuted
    };
  }

  /**
   * Get all query statistics sorted by average execution time
   */
  getAllStats(): PerformanceStats[] {
    const queryNames = [...new Set(this.metrics.map(m => m.queryName))];
    const stats = queryNames
      .map(name => this.getQueryStats(name))
      .filter(stat => stat !== null) as PerformanceStats[];

    return stats.sort((a, b) => b.averageTime - a.averageTime);
  }

  /**
   * Get slow queries (above threshold)
   */
  getSlowQueries(thresholdMs = 1000): PerformanceStats[] {
    return this.getAllStats().filter(stat => stat.averageTime > thresholdMs);
  }

  /**
   * Get queries with high error rates
   */
  getHighErrorQueries(errorRateThreshold = 0.05): PerformanceStats[] {
    return this.getAllStats().filter(stat => stat.errorRate > errorRateThreshold);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const stats = this.getAllStats();
    const totalQueries = this.metrics.length;
    const totalErrors = Array.from(this.errors.values()).reduce((sum, count) => sum + count, 0);
    const averageExecutionTime = stats.length > 0 
      ? stats.reduce((sum, stat) => sum + stat.averageTime, 0) / stats.length 
      : 0;

    const slowQueries = this.getSlowQueries();
    const highErrorQueries = this.getHighErrorQueries();

    return {
      totalQueries,
      totalErrors,
      errorRate: totalQueries > 0 ? totalErrors / (totalQueries + totalErrors) : 0,
      averageExecutionTime: Math.round(averageExecutionTime),
      uniqueQueries: stats.length,
      slowQueries: slowQueries.length,
      highErrorQueries: highErrorQueries.length,
      topSlowQueries: slowQueries.slice(0, 5),
      recentMetrics: this.metrics.slice(-10)
    };
  }

  /**
   * Get metrics for a specific time range
   */
  getMetricsInRange(startTime: number, endTime: number): QueryMetrics[] {
    return this.metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
  }

  /**
   * Get metrics for a specific route
   */
  getRouteMetrics(route: string): QueryMetrics[] {
    return this.metrics.filter(m => m.route === route);
  }

  /**
   * Clear old metrics (older than specified days)
   */
  clearOldMetrics(daysToKeep = 7) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    metrics: QueryMetrics[];
    errors: Record<string, number>;
    summary: any;
  } {
    return {
      metrics: [...this.metrics],
      errors: Object.fromEntries(this.errors),
      summary: this.getPerformanceSummary()
    };
  }

  /**
   * Reset all metrics and errors
   */
  reset() {
    this.metrics = [];
    this.errors.clear();
  }
}

/**
 * Utility function to measure execution time of async functions
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>,
  queryName: string,
  route: string,
  userId?: string
): Promise<{ result: T; executionTime: number }> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const executionTime = Date.now() - startTime;
    
    PerformanceMonitor.getInstance().trackQuery(queryName, executionTime, route, userId);
    
    return { result, executionTime };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    PerformanceMonitor.getInstance().trackError(queryName);
    PerformanceMonitor.getInstance().trackQuery(queryName, executionTime, route, userId);
    throw error;
  }
}

/**
 * Decorator for automatic performance tracking
 */
export function trackPerformance(queryName: string, route: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await method.apply(this, args);
        const executionTime = Date.now() - startTime;
        
        PerformanceMonitor.getInstance().trackQuery(queryName, executionTime, route);
        
        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        PerformanceMonitor.getInstance().trackError(queryName);
        PerformanceMonitor.getInstance().trackQuery(queryName, executionTime, route);
        throw error;
      }
    };
  };
}

// Global performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();