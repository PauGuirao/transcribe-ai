// Performance monitoring and optimization utilities
import { createClient } from '@supabase/supabase-js';

interface PerformanceMetrics {
  timestamp: Date;
  endpoint: string;
  duration: number;
  success: boolean;
  userId?: string;
  error?: string;
  memoryUsage?: number;
  cpuUsage?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics in memory

  logRequest(
    endpoint: string,
    startTime: number,
    success: boolean,
    userId?: string,
    error?: string
  ): void {
    const metric: PerformanceMetrics = {
      timestamp: new Date(),
      endpoint,
      duration: Date.now() - startTime,
      success,
      userId,
      error,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow requests
    if (metric.duration > 5000) { // 5 seconds
      console.warn(`Slow request detected: ${endpoint} took ${metric.duration}ms`);
    }
  }

  getAverageResponseTime(endpoint?: string, timeWindow?: number): number {
    let filteredMetrics = this.metrics;
    
    if (endpoint) {
      filteredMetrics = filteredMetrics.filter(m => m.endpoint === endpoint);
    }
    
    if (timeWindow) {
      const cutoff = new Date(Date.now() - timeWindow);
      filteredMetrics = filteredMetrics.filter(m => m.timestamp > cutoff);
    }

    if (filteredMetrics.length === 0) return 0;
    
    const total = filteredMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / filteredMetrics.length;
  }

  getErrorRate(endpoint?: string, timeWindow?: number): number {
    let filteredMetrics = this.metrics;
    
    if (endpoint) {
      filteredMetrics = filteredMetrics.filter(m => m.endpoint === endpoint);
    }
    
    if (timeWindow) {
      const cutoff = new Date(Date.now() - timeWindow);
      filteredMetrics = filteredMetrics.filter(m => m.timestamp > cutoff);
    }

    if (filteredMetrics.length === 0) return 0;
    
    const errors = filteredMetrics.filter(m => !m.success).length;
    return (errors / filteredMetrics.length) * 100;
  }

  getRequestsPerMinute(endpoint?: string): number {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    let recentMetrics = this.metrics.filter(m => m.timestamp > oneMinuteAgo);
    
    if (endpoint) {
      recentMetrics = recentMetrics.filter(m => m.endpoint === endpoint);
    }
    
    return recentMetrics.length;
  }

  getSystemHealth(): {
    averageResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
    memoryUsage: number;
    activeUsers: number;
  } {
    const fiveMinutesAgo = new Date(Date.now() - 300000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > fiveMinutesAgo);
    
    const uniqueUsers = new Set(
      recentMetrics
        .filter(m => m.userId)
        .map(m => m.userId)
    ).size;

    return {
      averageResponseTime: this.getAverageResponseTime(undefined, 300000),
      errorRate: this.getErrorRate(undefined, 300000),
      requestsPerMinute: this.getRequestsPerMinute(),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      activeUsers: uniqueUsers,
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Middleware for automatic performance tracking
export function withPerformanceTracking(endpoint: string) {
  return (handler: Function) => {
    return async (req: any, res: any) => {
      const startTime = Date.now();
      let success = true;
      let error: string | undefined;
      let userId: string | undefined;

      try {
        // Extract user ID from request if available
        const authHeader = req.headers.authorization;
        if (authHeader) {
          // This would depend on your auth implementation
          userId = extractUserIdFromToken(authHeader);
        }

        const result = await handler(req, res);
        return result;
      } catch (err: any) {
        success = false;
        error = err.message;
        throw err;
      } finally {
        performanceMonitor.logRequest(endpoint, startTime, success, userId, error);
      }
    };
  };
}

// Database connection pool monitoring
export class DatabaseMonitor {
  private static instance: DatabaseMonitor;
  private connectionCount = 0;
  private maxConnections = 20; // Supabase default

  static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
  }

  incrementConnection(): void {
    this.connectionCount++;
    if (this.connectionCount > this.maxConnections * 0.8) {
      console.warn(`High database connection usage: ${this.connectionCount}/${this.maxConnections}`);
    }
  }

  decrementConnection(): void {
    this.connectionCount = Math.max(0, this.connectionCount - 1);
  }

  getConnectionStatus(): { current: number; max: number; utilization: number } {
    return {
      current: this.connectionCount,
      max: this.maxConnections,
      utilization: (this.connectionCount / this.maxConnections) * 100,
    };
  }
}

// Cache performance monitoring
export class CacheMonitor {
  private hits = 0;
  private misses = 0;
  private totalRequests = 0;

  recordHit(): void {
    this.hits++;
    this.totalRequests++;
  }

  recordMiss(): void {
    this.misses++;
    this.totalRequests++;
  }

  getHitRate(): number {
    if (this.totalRequests === 0) return 0;
    return (this.hits / this.totalRequests) * 100;
  }

  getStats(): { hits: number; misses: number; hitRate: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.totalRequests = 0;
  }
}

export const cacheMonitor = new CacheMonitor();

// Helper function to extract user ID from token (implement based on your auth)
function extractUserIdFromToken(authHeader: string): string | undefined {
  try {
    // This is a placeholder - implement based on your actual auth system
    const token = authHeader.replace('Bearer ', '');
    // Decode JWT or validate session token
    return undefined; // Return actual user ID
  } catch {
    return undefined;
  }
}

// Batch processing utilities
export class BatchProcessor<T> {
  private batch: T[] = [];
  private batchSize: number;
  private flushInterval: number;
  private processor: (items: T[]) => Promise<void>;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    batchSize: number,
    flushInterval: number,
    processor: (items: T[]) => Promise<void>
  ) {
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    this.processor = processor;
    this.startTimer();
  }

  add(item: T): void {
    this.batch.push(item);
    
    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0) return;
    
    const items = [...this.batch];
    this.batch = [];
    
    try {
      await this.processor(items);
    } catch (error) {
      console.error('Batch processing error:', error);
      // Optionally re-add failed items to batch
    }
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush(); // Flush remaining items
  }
}