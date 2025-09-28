# Supabase Optimization Implementation

This document explains how to implement the Supabase optimization plan outlined in `SUPABASE_OPTIMIZATION_PLAN.md`.

## Overview

We've created two optimized Supabase client configurations:

1. **`supabase-admin.ts`** - For admin operations with service role key
2. **`supabase-optimized.ts`** - For API routes with connection pooling and performance tracking

## Implementation Details

### 1. Admin Client (`src/lib/supabase-admin.ts`)

This client is optimized for server-side admin operations:

```typescript
import { supabaseAdmin, connectionManager } from '@/lib/supabase-admin';

// Use the admin client directly
const { data, error } = await supabaseAdmin
  .from('users')
  .select('*');

// Or use the connection manager for connection reuse
const client = connectionManager.getConnection('admin-operations');
```

**Features:**
- Service role key authentication
- Disabled auto-refresh and session persistence
- Connection keep-alive headers
- Connection pooling simulation
- Automatic connection cleanup

### 2. Optimized Server Client (`src/lib/supabase-optimized.ts`)

This client is optimized for API routes with connection pooling:

```typescript
import { 
  createOptimizedServerClient, 
  connectionPool, 
  BatchOperations,
  trackQueryPerformance 
} from '@/lib/supabase-optimized';

// Create optimized client
const supabase = await createOptimizedServerClient();

// Use connection pool for reuse
const pooledClient = await connectionPool.getConnection('api-route');

// Batch operations
await BatchOperations.batchUpsert(supabase, 'table_name', data);

// Performance tracking
const result = await trackQueryPerformance('getUserProfile', async () => {
  return await supabase.from('profiles').select('*').eq('id', userId);
});
```

**Features:**
- Connection pooling with configurable limits
- Batch operations for bulk data processing
- Query performance tracking
- Automatic connection cleanup
- Optimized for Next.js 15 with async cookies

## Configuration Options

### Connection Pool Configuration

```typescript
export const connectionPoolConfig = {
  poolSize: 20,                    // Maximum number of connections
  idleTimeoutMillis: 30000,       // 30 seconds idle timeout
  connectionTimeoutMillis: 2000,   // 2 seconds connection timeout
};
```

### Supabase Client Configuration

```typescript
export const supabaseConfig = {
  auth: {
    autoRefreshToken: false,      // Disable for server-side
    persistSession: false,        // Disable for server-side
    detectSessionInUrl: false     // Disable for API routes
  },
  global: {
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=30, max=100'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10         // Limit realtime events
    }
  }
};
```

## Migration Guide

### For API Routes

**Before:**
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // ... other cookie methods
      },
    }
  );
}
```

**After:**
```typescript
import { connectionPool } from '@/lib/supabase-optimized';

export async function GET() {
  const supabase = await connectionPool.getConnection('api-route');
  // Your existing logic remains the same
}
```

### For Admin Operations

**Before:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**After:**
```typescript
import { supabaseAdmin } from '@/lib/supabase-admin';

// Use directly or through connection manager
const client = connectionManager.getConnection('admin-task');
```

## Performance Benefits

1. **Connection Reuse**: Reduces connection overhead by reusing existing connections
2. **Batch Operations**: Process multiple records efficiently
3. **Query Tracking**: Monitor and identify slow queries
4. **Resource Management**: Automatic cleanup of idle connections
5. **Optimized Headers**: Keep-alive connections reduce latency

## Monitoring

### Connection Pool Stats

```typescript
import { connectionPool } from '@/lib/supabase-optimized';

const stats = connectionPool.getStats();
console.log('Pool utilization:', stats.utilization + '%');
console.log('Active connections:', stats.activeConnections);
```

### Query Performance

The `trackQueryPerformance` function automatically logs:
- Slow queries (>1000ms)
- Failed queries with timing
- Performance metrics in production

## Best Practices

1. **Use Connection Pooling**: Always use the connection pool for API routes
2. **Batch Operations**: Use batch methods for bulk data operations
3. **Monitor Performance**: Regularly check connection pool stats
4. **Clean Up**: The system automatically cleans up idle connections
5. **Error Handling**: Always handle errors from batch operations

## Environment Variables

Ensure these environment variables are set:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Troubleshooting

### Common Issues

1. **Connection Limit Reached**: Increase `poolSize` in configuration
2. **Slow Queries**: Check performance logs and optimize queries
3. **Memory Usage**: Monitor connection cleanup and adjust timeouts

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
```

This will log query performance and connection pool statistics.