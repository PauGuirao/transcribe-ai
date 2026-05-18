// Simple performance monitor for caching operations

export interface CacheMonitorStats {
  hits: number;
  misses: number;
  hitRate: number;
  lastResetAt: number;
}

class CachePerformanceMonitor {
  private _hits = 0;
  private _misses = 0;
  private _lastResetAt = Date.now();

  recordHit(): void {
    this._hits++;
  }

  recordMiss(): void {
    this._misses++;
  }

  reset(): void {
    this._hits = 0;
    this._misses = 0;
    this._lastResetAt = Date.now();
  }

  getStats(): CacheMonitorStats {
    const total = this._hits + this._misses;
    return {
      hits: this._hits,
      misses: this._misses,
      hitRate: total === 0 ? 0 : this._hits / total,
      lastResetAt: this._lastResetAt,
    };
  }
}

export const cacheMonitor = new CachePerformanceMonitor();
export default cacheMonitor;