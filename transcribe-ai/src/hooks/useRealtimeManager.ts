import { useEffect, useRef, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { realtimeManager, realtimePerformanceTracker } from '@/lib/supabase-realtime';

// Hook for managing realtime subscriptions with automatic cleanup
export function useRealtimeManager(supabase: SupabaseClient) {
  const subscriptionsRef = useRef<Set<string>>(new Set());

  // Subscribe to a channel with automatic tracking
  const subscribe = useCallback((
    channelName: string,
    options: {
      table: string;
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      schema?: string;
      filter?: string;
      onMessage: (payload: any) => void;
      onError?: (error: any) => void;
      onSubscribed?: () => void;
      onClosed?: () => void;
    }
  ) => {
    // Track this subscription
    subscriptionsRef.current.add(channelName);

    // Create the optimized subscription
    return realtimeManager.createOptimizedSubscription(supabase, {
      channelName,
      ...options,
    });
  }, [supabase]);

  // Unsubscribe from a specific channel
  const unsubscribe = useCallback((channelName: string) => {
    realtimeManager.unsubscribe(channelName);
    subscriptionsRef.current.delete(channelName);
  }, []);

  // Get subscription statistics
  const getStats = useCallback((channelName: string) => {
    return realtimeManager.getSubscriptionStats(channelName);
  }, []);

  // Get all active subscriptions managed by this hook
  const getActiveSubscriptions = useCallback(() => {
    return Array.from(subscriptionsRef.current);
  }, []);

  // Health check for all managed subscriptions
  const healthCheck = useCallback(async () => {
    const allStats = await realtimeManager.healthCheck();
    const managedSubscriptions = Array.from(subscriptionsRef.current);
    
    return {
      ...allStats,
      managedSubscriptions: managedSubscriptions.length,
      managedSubscriptionNames: managedSubscriptions,
    };
  }, []);

  // Cleanup all subscriptions managed by this hook
  const cleanup = useCallback(() => {
    console.log('[REALTIME HOOK] Cleaning up managed subscriptions');
    for (const channelName of subscriptionsRef.current) {
      realtimeManager.unsubscribe(channelName);
    }
    subscriptionsRef.current.clear();
  }, []);

  // Automatic cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    subscribe,
    unsubscribe,
    getStats,
    getActiveSubscriptions,
    healthCheck,
    cleanup,
  };
}

// Hook for monitoring realtime performance
export function useRealtimePerformance() {
  const getPerformanceStats = useCallback((subscriptionName: string) => {
    return realtimePerformanceTracker.getStats(subscriptionName);
  }, []);

  const getAllStats = useCallback(async () => {
    return await realtimeManager.healthCheck();
  }, []);

  return {
    getPerformanceStats,
    getAllStats,
  };
}

// Hook for audio status subscriptions (deprecated; use useTranscriptionData instead)
/**
 * @deprecated This hook is deprecated. Use useTranscriptionData for audio status updates.
 * It is now a no-op to avoid creating competing subscriptions.
 */
export function useAudioStatusSubscription(
  supabase: SupabaseClient,
  audioId: string | undefined,
  onStatusChange: (payload: any) => void,
  options?: {
    onError?: (error: any) => void;
    onSubscribed?: () => void;
    onClosed?: () => void;
  }
) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.warn('[DEPRECATED] useAudioStatusSubscription has been deprecated. Please use useTranscriptionData instead.');
  }
  return {
    getStats: () => null,
  };
}

// Hook for profile subscriptions (specialized)
export function useProfileSubscription(
  supabase: SupabaseClient,
  userId: string | undefined,
  onProfileChange: (payload: any) => void,
  options?: {
    onError?: (error: any) => void;
    onSubscribed?: () => void;
    onClosed?: () => void;
  }
) {
  const { subscribe, unsubscribe, getStats } = useRealtimeManager(supabase);

  useEffect(() => {
    if (!userId) return;

    const channelName = `profile-${userId}`;
    
    console.log(`[PROFILE SUBSCRIPTION] Setting up for userId: ${userId}`);

    subscribe(channelName, {
      table: 'profiles',
      event: 'UPDATE',
      filter: `id=eq.${userId}`,
      onMessage: onProfileChange,
      onError: options?.onError,
      onSubscribed: () => {
        console.log(`[PROFILE SUBSCRIPTION] Successfully subscribed: ${userId}`);
        options?.onSubscribed?.();
      },
      onClosed: () => {
        console.log(`[PROFILE SUBSCRIPTION] Subscription closed: ${userId}`);
        options?.onClosed?.();
      },
    });

    return () => {
      console.log(`[PROFILE SUBSCRIPTION] Cleaning up: ${userId}`);
      unsubscribe(channelName);
    };
  }, [userId, subscribe, unsubscribe, onProfileChange, options]);

  return {
    getStats: () => userId ? getStats(`profile-${userId}`) : null,
  };
}

// Hook for organization subscriptions (specialized)
export function useOrganizationSubscription(
  supabase: SupabaseClient,
  orgId: string | undefined,
  onOrgChange: (payload: any) => void,
  options?: {
    onError?: (error: any) => void;
    onSubscribed?: () => void;
    onClosed?: () => void;
  }
) {
  const { subscribe, unsubscribe, getStats } = useRealtimeManager(supabase);

  useEffect(() => {
    if (!orgId) return;

    const channelName = `organization-${orgId}`;
    
    console.log(`[ORG SUBSCRIPTION] Setting up for orgId: ${orgId}`);

    subscribe(channelName, {
      table: 'organizations',
      event: 'UPDATE',
      filter: `id=eq.${orgId}`,
      onMessage: onOrgChange,
      onError: options?.onError,
      onSubscribed: () => {
        console.log(`[ORG SUBSCRIPTION] Successfully subscribed: ${orgId}`);
        options?.onSubscribed?.();
      },
      onClosed: () => {
        console.log(`[ORG SUBSCRIPTION] Subscription closed: ${orgId}`);
        options?.onClosed?.();
      },
    });

    return () => {
      console.log(`[ORG SUBSCRIPTION] Cleaning up: ${orgId}`);
      unsubscribe(channelName);
    };
  }, [orgId, subscribe, unsubscribe, onOrgChange, options]);

  return {
    getStats: () => orgId ? getStats(`organization-${orgId}`) : null,
  };
}