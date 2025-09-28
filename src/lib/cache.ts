// Cache utility for API responses
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

import { cacheMonitor } from './performance';

// Enhanced caching strategy with specific TTL values for different data types
export const CACHE_DURATIONS = {
  USER_PROFILE: 5 * 60 * 1000,      // 5 minutes
  ORGANIZATION: 10 * 60 * 1000,     // 10 minutes
  SUBSCRIPTION: 15 * 60 * 1000,     // 15 minutes
  MEMBERS: 3 * 60 * 1000,           // 3 minutes
  INVITATIONS: 2 * 60 * 1000,       // 2 minutes
  SHORT_LIVED: 1 * 60 * 1000,       // 1 minute
  LONG_LIVED: 30 * 60 * 1000,       // 30 minutes
};

export class APICache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set(key: string, data: any, ttlMs = 5 * 60 * 1000): void {
     // Remove oldest entries if cache is full
     if (this.cache.size >= this.maxSize) {
       const oldestKey = this.cache.keys().next().value;
       if (oldestKey) {
         this.cache.delete(oldestKey);
       }
     }

     this.cache.set(key, {
       data,
       timestamp: Date.now(),
       ttl: ttlMs,
     });
   }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      cacheMonitor.recordMiss();
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      cacheMonitor.recordMiss();
      return null;
    }

    cacheMonitor.recordHit();
    return entry.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; maxSize: number; utilization: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: (this.cache.size / this.maxSize) * 100,
    };
  }

  // Generate cache key from request parameters
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${prefix}:${sortedParams}`;
  }

  // Invalidate cache entries by prefix
  invalidateByPrefix(prefix: string): void {
    for (const [key] of this.cache) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const apiCache = new APICache();

// Cache headers for different scenarios
export const CACHE_HEADERS = {
  // Short cache for frequently changing data
  SHORT: {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    "CDN-Cache-Control": "public, s-maxage=60",
  },
  // Medium cache for semi-static data
  MEDIUM: {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    "CDN-Cache-Control": "public, s-maxage=300",
  },
  // Long cache for static data
  LONG: {
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    "CDN-Cache-Control": "public, s-maxage=3600",
  },
  // No cache for sensitive data
  NO_CACHE: {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
    "Pragma": "no-cache",
    "Expires": "0",
  },
};

// Helper function to create cached response
export function createCachedResponse<T>(
  data: T,
  cacheType: keyof typeof CACHE_HEADERS = "MEDIUM",
  status: number = 200
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: CACHE_HEADERS[cacheType],
  });
}

// Decorator for caching API responses
export function withCache<T>(
  cacheKey: string,
  ttl?: number,
  cacheType: keyof typeof CACHE_HEADERS = "MEDIUM"
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Try to get from cache first
      const cached = apiCache.get(cacheKey);
      if (cached) {
        return createCachedResponse(cached, cacheType);
      }

      // Execute original method
      const result = await method.apply(this, args);
      
      // Cache the result if it's successful
      if (result && result.status >= 200 && result.status < 300) {
        const data = await result.clone().json();
        apiCache.set(cacheKey, data, ttl);
      }

      return result;
    };
  };
}

// Enhanced caching functions for specific data types

// Cache organization data more aggressively
export const getCachedOrganization = async (orgId: string, supabaseClient: any) => {
  const cacheKey = `org:${orgId}`;
  let cached = apiCache.get(cacheKey);
  
  if (!cached) {
    const { data, error } = await supabaseClient
      .from("organizations")
      .select("id, name, plan_type, subscription_status, max_members, stripe_customer_id, stripe_subscription_id")
      .eq("id", orgId)
      .single();
    
    if (!error && data) {
      apiCache.set(cacheKey, data, CACHE_DURATIONS.ORGANIZATION);
      cached = data;
    } else {
      throw error || new Error('Organization not found');
    }
  }
  
  return cached;
};

// Cache user profile data
export const getCachedUserProfile = async (userId: string, supabaseClient: any) => {
  const cacheKey = `profile:${userId}`;
  let cached = apiCache.get(cacheKey);
  
  if (!cached) {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id, current_organization_id, tokens, email")
      .eq("id", userId)
      .single();
    
    if (!error && data) {
      apiCache.set(cacheKey, data, CACHE_DURATIONS.USER_PROFILE);
      cached = data;
    } else {
      throw error || new Error('User profile not found');
    }
  }
  
  return cached;
};

// Cache organization members data
export const getCachedOrganizationMembers = async (orgId: string, supabaseClient: any) => {
  const cacheKey = `members:${orgId}`;
  let cached = apiCache.get(cacheKey);
  
  if (!cached) {
    const { data, error } = await supabaseClient
      .from("organization_members")
      .select(`
        id,
        role,
        joined_at,
        user_id,
        profiles(
          id,
          email,
          full_name
        )
      `)
      .eq("organization_id", orgId)
      .order("joined_at", { ascending: true });
    
    if (error) {
      console.error('Error fetching organization members from database:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      cached = [];
      apiCache.set(cacheKey, cached, CACHE_DURATIONS.MEMBERS);
      return cached;
    }

    // Transform the data to match expected format (without avatar URLs for now)
    const membersWithProfiles = data.map((member: any) => ({
      ...member,
      profiles: {
        ...(Array.isArray(member.profiles) ? member.profiles[0] : member.profiles),
        avatar_url: null // Will be handled by API route with admin access
      }
    }));
    
    apiCache.set(cacheKey, membersWithProfiles, CACHE_DURATIONS.MEMBERS);
    cached = membersWithProfiles;
  }
  

  return cached;
};

// Cache subscription status data
export const getCachedSubscriptionStatus = async (userId: string, supabaseClient: any) => {
  const cacheKey = `subscription:${userId}`;
  let cached = apiCache.get(cacheKey);
  
  if (!cached) {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select(`
        id,
        current_organization_id,
        tokens,
        organization:organizations!current_organization_id(
          id,
          name,
          plan_type,
          subscription_status,
          max_members,
          stripe_customer_id,
          stripe_subscription_id
        )
      `)
      .eq("id", userId)
      .single();
    
    if (!error && data) {
      apiCache.set(cacheKey, data, CACHE_DURATIONS.SUBSCRIPTION);
      cached = data;
    } else {
      throw error || new Error('Subscription status not found');
    }
  }
  
  return cached;
};