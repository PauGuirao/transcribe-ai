import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Optimized configuration for Supabase clients
export const supabaseConfig = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=30, max=100'
    }
  },
  // Realtime optimization
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
};

// Connection pool configuration (separate from Supabase client options)
export const connectionPoolConfig = {
  poolSize: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Factory function to create optimized server client
export async function createOptimizedServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...supabaseConfig,
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// Connection manager for reusing connections
class ConnectionPool {
  private static instance: ConnectionPool;
  private connections: Map<string, any> = new Map();
  private readonly maxConnections = connectionPoolConfig.poolSize;
  private readonly idleTimeout = connectionPoolConfig.idleTimeoutMillis;
  private readonly connectionTimeout = connectionPoolConfig.connectionTimeoutMillis;

  static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool();
    }
    return ConnectionPool.instance;
  }

  async getConnection(key: string = 'default') {
    if (!this.connections.has(key)) {
      if (this.connections.size >= this.maxConnections) {
        // Remove oldest idle connection
        const oldestKey = this.connections.keys().next().value;
        if (oldestKey) {
          this.connections.delete(oldestKey);
        }
      }
      
      const client = await createOptimizedServerClient();
      this.connections.set(key, {
        client,
        lastUsed: Date.now()
      });
      
      // Auto-cleanup after idle timeout
      setTimeout(() => {
        const connection = this.connections.get(key);
        if (connection && Date.now() - connection.lastUsed > this.idleTimeout) {
          this.connections.delete(key);
        }
      }, this.idleTimeout);
    }
    
    const connection = this.connections.get(key);
    if (connection) {
      connection.lastUsed = Date.now();
      return connection.client;
    }
    
    return await createOptimizedServerClient();
  }

  closeAllConnections() {
    this.connections.clear();
  }

  getStats() {
    return {
      activeConnections: this.connections.size,
      maxConnections: this.maxConnections,
      utilization: (this.connections.size / this.maxConnections) * 100
    };
  }
}

export const connectionPool = ConnectionPool.getInstance();

// Batch operation helper
export class BatchOperations {
  static async batchUpsert<T>(
    client: any,
    table: string,
    data: T[],
    options: { onConflict?: string; chunkSize?: number } = {}
  ) {
    const { onConflict = 'id', chunkSize = 100 } = options;
    const results = [];
    
    // Process in chunks to avoid overwhelming the database
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const { data: result, error } = await client
        .from(table)
        .upsert(chunk, { onConflict });
      
      if (error) throw error;
      results.push(...(result || []));
    }
    
    return results;
  }

  static async batchDelete(
    client: any,
    table: string,
    ids: string[],
    idColumn: string = 'id',
    chunkSize: number = 100
  ) {
    const results = [];
    
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { data, error } = await client
        .from(table)
        .delete()
        .in(idColumn, chunk);
      
      if (error) throw error;
      results.push(...(data || []));
    }
    
    return results;
  }
}

// Query performance tracker
export function trackQueryPerformance<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  return queryFn()
    .then(result => {
      const duration = Date.now() - startTime;
      
      // Log slow queries (over 1 second)
      if (duration > 1000) {
        console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
      }
      
      // Log to performance monitoring if available
      if (process.env.NODE_ENV === 'production') {
        console.log(`Query performance: ${queryName} - ${duration}ms`);
      }
      
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      console.error(`Query failed: ${queryName} (${duration}ms)`, error);
      throw error;
    });
}