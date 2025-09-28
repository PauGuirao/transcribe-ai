import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

// Database query optimization utilities
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  select?: string;
}

export interface PaginationResult<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  nextOffset?: number;
}

// Optimized Supabase client creation with connection pooling
export async function createOptimizedSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

// Batch query operations to prevent N+1 queries
export class BatchQueryBuilder {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  // Optimized transcription query with proper joins
  async getTranscriptionsWithAudioData(
    alumneId: string, 
    userId: string, 
    options: QueryOptions = {}
  ): Promise<PaginationResult<any>> {
    const { 
      limit = 50, 
      offset = 0, 
      orderBy = 'created_at', 
      orderDirection = 'desc' 
    } = options;

    // Single query with proper join to avoid N+1
    const query = this.supabase
      .from('transcriptions')
      .select(`
        id,
        audio_id,
        created_at,
        updated_at,
        alumne_id,
        json_path,
        audios!inner (
          id,
          user_id,
          custom_name,
          filename,
          status
        )
      `, { count: 'exact' })
      .eq('alumne_id', alumneId)
      .eq('audios.user_id', userId)
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch transcriptions: ${error.message}`);
    }

    return {
      data: data || [],
      count: count || 0,
      hasMore: (count || 0) > offset + limit,
      nextOffset: (count || 0) > offset + limit ? offset + limit : undefined,
    };
  }

  // Optimized organization members query
  async getOrganizationMembersWithProfiles(
    organizationId: string,
    options: QueryOptions = {}
  ): Promise<any[]> {
    const { limit = 100, orderBy = 'created_at', orderDirection = 'desc' } = options;

    // Single query with proper join to get all member data
    const { data, error } = await this.supabase
      .from('organization_members')
      .select(`
        id,
        user_id,
        organization_id,
        role,
        created_at,
        profiles!inner (
          id,
          full_name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch organization members: ${error.message}`);
    }

    return data || [];
  }

  // Batch audio files query with transcription counts
  async getAudioFilesWithTranscriptionCounts(
    userId: string,
    options: QueryOptions = {}
  ): Promise<PaginationResult<any>> {
    const { 
      limit = 20, 
      offset = 0, 
      orderBy = 'created_at', 
      orderDirection = 'desc' 
    } = options;

    // Use a single query with aggregation to get transcription counts
    const { data, error, count } = await this.supabase
      .from('audios')
      .select(`
        id,
        filename,
        custom_name,
        status,
        created_at,
        updated_at,
        transcriptions (count)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch audio files: ${error.message}`);
    }

    return {
      data: data || [],
      count: count || 0,
      hasMore: (count || 0) > offset + limit,
      nextOffset: (count || 0) > offset + limit ? offset + limit : undefined,
    };
  }

  // Batch operations for bulk updates/inserts
  async batchUpdateAudioTitles(updates: Array<{ id: string; customName: string }>): Promise<void> {
    if (updates.length === 0) return;

    // Use upsert for batch operations
    const { error } = await this.supabase
      .from('audios')
      .upsert(
        updates.map(update => ({
          id: update.id,
          custom_name: update.customName,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );

    if (error) {
      throw new Error(`Failed to batch update audio titles: ${error.message}`);
    }
  }

  // Optimized user verification with organization check
  async verifyUserWithOrganization(userId: string): Promise<{
    user: any;
    profile: any;
    organization: any;
    memberRole: string | null;
  }> {
    // Single query to get user profile with organization data
    const { data, error } = await this.supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        current_organization_id,
        organizations!inner (
          id,
          name,
          image_url
        ),
        organization_members!inner (
          role
        )
      `)
      .eq('id', userId)
      .eq('organization_members.user_id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to verify user: ${error.message}`);
    }

    return {
      user: { id: userId },
      profile: data,
      organization: data?.organizations,
      memberRole: data?.organization_members?.[0]?.role || null,
    };
  }
}

// Query performance tracking
export class QueryPerformanceTracker {
  private static instance: QueryPerformanceTracker;
  private metrics: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map();

  static getInstance(): QueryPerformanceTracker {
    if (!QueryPerformanceTracker.instance) {
      QueryPerformanceTracker.instance = new QueryPerformanceTracker();
    }
    return QueryPerformanceTracker.instance;
  }

  async trackQuery<T>(queryName: string, queryFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.recordMetric(queryName, duration);
      
      // Log slow queries (> 1 second)
      if (duration > 1000) {
        console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.error(`Query failed: ${queryName} (${duration}ms)`, error);
      throw error;
    }
  }

  private recordMetric(queryName: string, duration: number): void {
    const existing = this.metrics.get(queryName) || { count: 0, totalTime: 0, avgTime: 0 };
    
    existing.count += 1;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    
    this.metrics.set(queryName, existing);
  }

  getMetrics(): Record<string, { count: number; totalTime: number; avgTime: number }> {
    return Object.fromEntries(this.metrics);
  }

  resetMetrics(): void {
    this.metrics.clear();
  }
}

// Smart pagination utility
export class SmartPagination {
  static calculateOptimalPageSize(estimatedRowSize: number, maxResponseSize: number = 1024 * 1024): number {
    // Calculate optimal page size based on estimated row size and max response size
    const optimalSize = Math.floor(maxResponseSize / estimatedRowSize);
    
    // Ensure reasonable bounds
    return Math.max(10, Math.min(100, optimalSize));
  }

  static createPaginationQuery(
    baseQuery: any,
    page: number = 1,
    pageSize: number = 20
  ) {
    const offset = (page - 1) * pageSize;
    return baseQuery.range(offset, offset + pageSize - 1);
  }

  static createCursorPagination(
    baseQuery: any,
    cursor?: string,
    limit: number = 20,
    orderColumn: string = 'created_at'
  ) {
    let query = baseQuery.limit(limit + 1); // +1 to check if there are more results
    
    if (cursor) {
      query = query.gt(orderColumn, cursor);
    }
    
    return query.order(orderColumn, { ascending: true });
  }
}

// Database connection health check
export async function checkDatabaseHealth(supabase: any): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    await supabase.from('profiles').select('id').limit(1);
    const latency = Date.now() - startTime;
    
    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}