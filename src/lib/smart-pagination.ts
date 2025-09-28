import type { SupabaseClient } from '@supabase/supabase-js';

// Smart pagination interfaces
export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page?: number;
    limit: number;
    total?: number;
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
    nextPage?: number;
    prevPage?: number;
  };
  meta: {
    queryTime: number;
    cacheHit?: boolean;
  };
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  prevCursor?: string;
  hasMore: boolean;
  hasPrev: boolean;
}

// Smart pagination class
export class SmartPagination {
  private supabase: any;
  private defaultLimit: number;
  private maxLimit: number;

  constructor(supabase: any, defaultLimit: number = 20, maxLimit: number = 100) {
    this.supabase = supabase;
    this.defaultLimit = defaultLimit;
    this.maxLimit = maxLimit;
  }

  // Offset-based pagination (traditional page numbers)
  async paginateWithOffset<T>(
    table: string,
    options: PaginationOptions & {
      select?: string;
      countQuery?: boolean;
    } = {}
  ): Promise<PaginationResult<T>> {
    const startTime = Date.now();
    
    const {
      page = 1,
      limit = this.defaultLimit,
      orderBy = 'created_at',
      orderDirection = 'desc',
      select = '*',
      filters = {},
      countQuery = true,
    } = options;

    // Validate and sanitize inputs
    const sanitizedLimit = Math.min(Math.max(1, limit), this.maxLimit);
    const sanitizedPage = Math.max(1, page);
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    // Build base query
    let query = this.supabase
      .from(table)
      .select(select, { count: countQuery ? 'exact' : undefined })
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + sanitizedLimit - 1);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'object' && value.operator) {
          // Support for complex filters like { operator: 'gte', value: 100 }
          switch (value.operator) {
            case 'gte':
              query = query.gte(key, value.value);
              break;
            case 'lte':
              query = query.lte(key, value.value);
              break;
            case 'gt':
              query = query.gt(key, value.value);
              break;
            case 'lt':
              query = query.lt(key, value.value);
              break;
            case 'like':
              query = query.like(key, value.value);
              break;
            case 'ilike':
              query = query.ilike(key, value.value);
              break;
            default:
              query = query.eq(key, value.value);
          }
        } else {
          query = query.eq(key, value);
        }
      }
    });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Pagination query failed: ${error.message}`);
    }

    const queryTime = Date.now() - startTime;
    const total = count || 0;
    const hasMore = total > offset + sanitizedLimit;
    const hasPrev = sanitizedPage > 1;

    return {
      data: data || [],
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        total,
        hasMore,
        nextPage: hasMore ? sanitizedPage + 1 : undefined,
        prevPage: hasPrev ? sanitizedPage - 1 : undefined,
      },
      meta: {
        queryTime,
      },
    };
  }

  // Cursor-based pagination (more efficient for large datasets)
  async paginateWithCursor<T>(
    table: string,
    options: PaginationOptions & {
      select?: string;
      cursorColumn?: string;
    } = {}
  ): Promise<CursorPaginationResult<T>> {
    const {
      cursor,
      limit = this.defaultLimit,
      orderBy = 'created_at',
      orderDirection = 'desc',
      select = '*',
      filters = {},
      cursorColumn = orderBy,
    } = options;

    // Validate and sanitize inputs
    const sanitizedLimit = Math.min(Math.max(1, limit), this.maxLimit);

    // Build base query
    let query = this.supabase
      .from(table)
      .select(select)
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .limit(sanitizedLimit + 1); // +1 to check if there are more results

    // Apply cursor
    if (cursor) {
      if (orderDirection === 'desc') {
        query = query.lt(cursorColumn, cursor);
      } else {
        query = query.gt(cursorColumn, cursor);
      }
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Cursor pagination query failed: ${error.message}`);
    }

    const results = data || [];
    const hasMore = results.length > sanitizedLimit;
    
    // Remove the extra item used for hasMore check
    if (hasMore) {
      results.pop();
    }

    // Generate next cursor
    const nextCursor = hasMore && results.length > 0 
      ? results[results.length - 1][cursorColumn]
      : undefined;

    return {
      data: results,
      nextCursor,
      hasMore,
      hasPrev: !!cursor, // If we have a cursor, we can go back
    };
  }

  // Hybrid pagination (combines offset and cursor for optimal performance)
  async paginateHybrid<T>(
    table: string,
    options: PaginationOptions & {
      select?: string;
      cursorColumn?: string;
      useOffsetThreshold?: number;
    } = {}
  ): Promise<PaginationResult<T>> {
    const {
      page = 1,
      cursor,
      useOffsetThreshold = 1000, // Use cursor pagination after this many records
    } = options;

    const estimatedOffset = (page - 1) * (options.limit || this.defaultLimit);

    // Use cursor pagination for deep pages, offset for shallow pages
    if (cursor || estimatedOffset > useOffsetThreshold) {
      const cursorResult = await this.paginateWithCursor<T>(table, options);
      
      return {
        data: cursorResult.data,
        pagination: {
          limit: options.limit || this.defaultLimit,
          hasMore: cursorResult.hasMore,
          nextCursor: cursorResult.nextCursor,
          prevCursor: cursorResult.prevCursor,
        },
        meta: {
          queryTime: 0, // Would need to track this in cursor method
        },
      };
    } else {
      return this.paginateWithOffset<T>(table, options);
    }
  }

  // Search with pagination
  async searchWithPagination<T>(
    table: string,
    searchTerm: string,
    searchColumns: string[],
    options: PaginationOptions & {
      select?: string;
      exactMatch?: boolean;
    } = {}
  ): Promise<PaginationResult<T>> {
    const {
      page = 1,
      limit = this.defaultLimit,
      orderBy = 'created_at',
      orderDirection = 'desc',
      select = '*',
      filters = {},
      exactMatch = false,
    } = options;

    const sanitizedLimit = Math.min(Math.max(1, limit), this.maxLimit);
    const sanitizedPage = Math.max(1, page);
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    // Build search query
    let query = this.supabase
      .from(table)
      .select(select, { count: 'exact' })
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + sanitizedLimit - 1);

    // Apply search across multiple columns
    if (searchTerm && searchColumns.length > 0) {
      const searchOperator = exactMatch ? 'eq' : 'ilike';
      const searchValue = exactMatch ? searchTerm : `%${searchTerm}%`;

      // Create OR condition for multiple columns
      const orConditions = searchColumns
        .map(col => `${col}.${searchOperator}.${searchValue}`)
        .join(',');
      
      query = query.or(orConditions);
    }

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const startTime = Date.now();
    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Search pagination query failed: ${error.message}`);
    }

    const queryTime = Date.now() - startTime;
    const total = count || 0;
    const hasMore = total > offset + sanitizedLimit;

    return {
      data: data || [],
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        total,
        hasMore,
        nextPage: hasMore ? sanitizedPage + 1 : undefined,
        prevPage: sanitizedPage > 1 ? sanitizedPage - 1 : undefined,
      },
      meta: {
        queryTime,
      },
    };
  }

  // Aggregate pagination (for grouped results)
  async paginateWithAggregation<T>(
    table: string,
    aggregateColumn: string,
    aggregateFunction: 'count' | 'sum' | 'avg' | 'min' | 'max',
    groupByColumns: string[],
    options: PaginationOptions = {}
  ): Promise<PaginationResult<T>> {
    const {
      page = 1,
      limit = this.defaultLimit,
      orderBy = aggregateColumn,
      orderDirection = 'desc',
      filters = {},
    } = options;

    const sanitizedLimit = Math.min(Math.max(1, limit), this.maxLimit);
    const sanitizedPage = Math.max(1, page);
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    // Build aggregation query
    const selectColumns = [
      ...groupByColumns,
      `${aggregateFunction}(${aggregateColumn}) as ${aggregateColumn}_${aggregateFunction}`,
    ].join(', ');

    let query = this.supabase
      .from(table)
      .select(selectColumns, { count: 'exact' })
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + sanitizedLimit - 1);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const startTime = Date.now();
    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Aggregate pagination query failed: ${error.message}`);
    }

    const queryTime = Date.now() - startTime;
    const total = count || 0;
    const hasMore = total > offset + sanitizedLimit;

    return {
      data: data || [],
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        total,
        hasMore,
        nextPage: hasMore ? sanitizedPage + 1 : undefined,
        prevPage: sanitizedPage > 1 ? sanitizedPage - 1 : undefined,
      },
      meta: {
        queryTime,
      },
    };
  }
}

// Utility functions
export function calculateOptimalPageSize(
  estimatedRowSize: number,
  maxResponseSize: number = 1024 * 1024 // 1MB
): number {
  const optimalSize = Math.floor(maxResponseSize / estimatedRowSize);
  return Math.max(10, Math.min(100, optimalSize));
}

export function generateCacheKey(
  table: string,
  options: PaginationOptions,
  prefix: string = 'pagination'
): string {
  const keyParts = [
    prefix,
    table,
    options.page || 'cursor',
    options.limit || 20,
    options.orderBy || 'created_at',
    options.orderDirection || 'desc',
    JSON.stringify(options.filters || {}),
  ];
  
  return keyParts.join(':');
}

// Performance monitoring for pagination
export class PaginationPerformanceMonitor {
  private metrics: Map<string, {
    count: number;
    totalTime: number;
    avgTime: number;
    slowQueries: number;
  }> = new Map();

  trackQuery(queryType: string, queryTime: number, threshold: number = 1000): void {
    const existing = this.metrics.get(queryType) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      slowQueries: 0,
    };

    existing.count += 1;
    existing.totalTime += queryTime;
    existing.avgTime = existing.totalTime / existing.count;
    
    if (queryTime > threshold) {
      existing.slowQueries += 1;
      console.warn(`Slow pagination query: ${queryType} took ${queryTime}ms`);
    }

    this.metrics.set(queryType, existing);
  }

  getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics);
  }

  resetMetrics(): void {
    this.metrics.clear();
  }
}