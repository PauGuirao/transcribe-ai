import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { 
  realtimeErrorHandler, 
  handleSubscriptionError, 
  handleConnectionError, 
  handleMessageError, 
  handleTimeoutError,
  RealtimeError 
} from './supabase-realtime-error-handler';

// Realtime configuration for optimal performance
export const realtimeConfig = {
  eventsPerSecond: 10,
  heartbeatIntervalMs: 15000,
  reconnectDelayMs: 1000,
  maxReconnectAttempts: 5,
  enablePresence: false,
  reconnectAfterMs: (tries: number) => {
    return Math.min(1000 * Math.pow(2, tries), 30000);
  },
  timeout: 10000,
  logger: process.env.NODE_ENV === 'development' ? console : undefined,
};

// Performance tracking interface
interface RealtimeMetrics {
  subscriptionName: string;
  startTime: number;
  messageCount: number;
  errorCount: number;
  lastMessageTime?: number;
}

class RealtimePerformanceTracker {
  private metrics: Map<string, RealtimeMetrics> = new Map();

  startTracking(subscriptionName: string) {
    this.metrics.set(subscriptionName, {
      subscriptionName,
      startTime: Date.now(),
      messageCount: 0,
      errorCount: 0,
    });
  }

  recordMessage(subscriptionName: string) {
    const metric = this.metrics.get(subscriptionName);
    if (metric) {
      metric.messageCount++;
      metric.lastMessageTime = Date.now();
    }
  }

  recordError(subscriptionName: string) {
    const metric = this.metrics.get(subscriptionName);
    if (metric) {
      metric.errorCount++;
    }
  }

  getStats(subscriptionName: string) {
    const metric = this.metrics.get(subscriptionName);
    if (!metric) return null;

    const duration = Date.now() - metric.startTime;
    return {
      ...metric,
      duration,
      messagesPerSecond: metric.messageCount / (duration / 1000),
      errorRate: metric.errorCount / Math.max(metric.messageCount, 1),
    };
  }

  getAllStats() {
    const stats = Array.from(this.metrics.entries()).map(([name, metric]) => ({
      name,
      stats: this.getStats(name),
    }));

    return {
      activeSubscriptions: this.metrics.size,
      totalMessages: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.messageCount, 0),
      totalErrors: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.errorCount, 0),
      subscriptions: stats.filter(s => s.stats !== null),
    };
  }

  cleanup(subscriptionName: string) {
    this.metrics.delete(subscriptionName);
  }

  reset() {
    this.metrics.clear();
  }
}

const performanceTracker = new RealtimePerformanceTracker();

// Optimized realtime subscription manager
export class OptimizedRealtimeManager {
  private static instance: OptimizedRealtimeManager;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private pendingChannels: Map<string, RealtimeChannel> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = realtimeConfig.maxReconnectAttempts;

  static getInstance(): OptimizedRealtimeManager {
    if (!OptimizedRealtimeManager.instance) {
      OptimizedRealtimeManager.instance = new OptimizedRealtimeManager();
    }
    return OptimizedRealtimeManager.instance;
  }

  // Create optimized subscription with filtering and performance tracking
  createOptimizedSubscription<T = any>(
    supabase: SupabaseClient,
    options: {
      channelName: string;
      table: string;
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*' | Array<'INSERT' | 'UPDATE' | 'DELETE'>;
      schema?: string;
      filter?: string;
      onMessage: (payload: T) => void;
      onError?: (error: any) => void;
      onSubscribed?: () => void;
      onClosed?: () => void;
    }
  ): RealtimeChannel {
    const {
      channelName,
      table,
      event = '*',
      schema = 'public',
      filter,
      onMessage,
      onError,
      onSubscribed,
      onClosed,
    } = options;

    // Prevent duplicate channels: reuse existing or pending
    const existing = this.subscriptions.get(channelName);
    if (existing) {
      realtimeConfig.logger?.log?.(`[REALTIME] Reusing existing subscription for ${channelName}`);
      return existing;
    }
    const pendingExisting = this.pendingChannels.get(channelName);
    if (pendingExisting) {
      realtimeConfig.logger?.log?.(`[REALTIME] Reusing pending subscription for ${channelName}`);
      return pendingExisting;
    }

    // Start performance tracking
    performanceTracker.startTracking(channelName);

    const channel = supabase.channel(channelName, {
      config: {
        presence: realtimeConfig.enablePresence ? { key: channelName } : undefined,
      }
    });

    // Track as pending until subscribed
    this.pendingChannels.set(channelName, channel);

    // Set up postgres changes listener with error handling
    const handlePayload = (payload: T) => {
      try {
        performanceTracker.recordMessage(channelName);
        onMessage(payload);
      } catch (error) {
        performanceTracker.recordError(channelName);
        handleMessageError(error, channelName, payload);
        onError?.(error);
      }
    };

    const eventsArray = Array.isArray(event) ? event : [event];
    for (const evt of eventsArray) {
      channel.on(
        'postgres_changes' as any,
        {
          event: evt,
          schema,
          table,
          filter,
        },
        handlePayload
      );
    }

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[REALTIME] Successfully subscribed to ${channelName}`);
        this.subscriptions.set(channelName, channel);
        this.pendingChannels.delete(channelName);
        this.reconnectAttempts.delete(channelName);
        onSubscribed?.();
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[REALTIME] Channel error for ${channelName}:`, err);
        performanceTracker.recordError(channelName);
        // Special handling for binding mismatch: recreate with a fresh channel name to avoid stale server bindings
        const isBindingMismatch = !!err && (
          (typeof (err as any).message === 'string' && (err as any).message.includes('mismatch between server and client bindings')) ||
          String(err).includes('mismatch between server and client bindings')
        );
        if (isBindingMismatch) {
          try { channel.unsubscribe(); } catch {}
          this.subscriptions.delete(channelName);
          this.pendingChannels.delete(channelName);
          const newChannelName = `${channelName}-r${Math.floor(Math.random() * 10000)}`;
          const newOptions = { ...options, channelName: newChannelName };
          console.warn(`[REALTIME] Recovering from binding mismatch. Recreating channel as ${newChannelName}`);
          this.createOptimizedSubscription(supabase, newOptions);
          onError?.(err);
          return;
        }
        this.pendingChannels.delete(channelName);
        this.handleReconnection(supabase, channelName, options);
        onError?.(err);
      } else if (status === 'TIMED_OUT') {
        console.error(`[REALTIME] Subscription timed out for ${channelName}`);
        handleTimeoutError(channelName, realtimeConfig.timeout);
        this.pendingChannels.delete(channelName);
        this.handleReconnection(supabase, channelName, options);
        onError?.(new Error('Subscription timed out'));
      } else if (status === 'CLOSED') {
        console.warn(`[REALTIME] Subscription closed for ${channelName}`);
        this.subscriptions.delete(channelName);
        this.pendingChannels.delete(channelName);
        onClosed?.();
      }
    });

    return channel;
  }

  private handleReconnection<T>(
    supabase: SupabaseClient,
    channelName: string,
    options: any
  ) {
    const attempts = this.reconnectAttempts.get(channelName) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`[REALTIME] Max reconnection attempts reached for ${channelName}`);
      return;
    }

    const delay = realtimeConfig.reconnectAfterMs(attempts);
    this.reconnectAttempts.set(channelName, attempts + 1);

    console.log(`[REALTIME] Attempting to reconnect ${channelName} in ${delay}ms (attempt ${attempts + 1})`);

    setTimeout(() => {
      // Clean up old subscription
      const oldChannel = this.subscriptions.get(channelName) || this.pendingChannels.get(channelName);
      if (oldChannel) {
        oldChannel.unsubscribe();
        this.subscriptions.delete(channelName);
        this.pendingChannels.delete(channelName);
      }

      // Create new subscription
      this.createOptimizedSubscription(supabase, options);
    }, delay);
  }

  unsubscribe(channelName: string) {
    const channel = this.subscriptions.get(channelName) || this.pendingChannels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.subscriptions.delete(channelName);
      this.pendingChannels.delete(channelName);
      this.reconnectAttempts.delete(channelName);
      performanceTracker.cleanup(channelName);
      console.log(`[REALTIME] Unsubscribed from ${channelName}`);
    }
  }

  getSubscriptionStats(channelName: string) {
    return performanceTracker.getStats(channelName);
  }

  getActiveSubscriptions() {
    return Array.from(this.subscriptions.keys());
  }

  cleanup() {
    console.log('[REALTIME] Cleaning up all subscriptions...');
    
    for (const [name, channel] of this.subscriptions) {
      try {
        channel.unsubscribe();
        console.log(`[REALTIME] Cleaned up subscription: ${name}`);
      } catch (error) {
        console.error(`[REALTIME] Error cleaning up subscription ${name}:`, error);
      }
    }
    
    this.subscriptions.clear();
    this.reconnectAttempts.clear();
    performanceTracker.reset();
    realtimeErrorHandler.clearErrors();
    
    console.log('[REALTIME] Cleanup completed');
  }

  async healthCheck(): Promise<{
    activeSubscriptions: number;
    totalMessages: number;
    totalErrors: number;
    subscriptions: Array<{
      name: string;
      stats: any;
    }>;
  }> {
    const stats = performanceTracker.getAllStats();
    const errorStats = realtimeErrorHandler.getErrorStats();

    return {
      activeSubscriptions: stats.activeSubscriptions,
      totalMessages: stats.totalMessages,
      totalErrors: stats.totalErrors + errorStats.totalErrors,
      subscriptions: stats.subscriptions,
    };
  }
}

// Global instance
export const realtimeManager = OptimizedRealtimeManager.getInstance();

// Utility functions for common subscription patterns
export const createAudioStatusSubscription = (
  supabase: SupabaseClient,
  audioId: string,
  onStatusChange: (payload: any) => void,
  onError?: (error: any) => void
) => {
  return realtimeManager.createOptimizedSubscription(supabase, {
    channelName: `audio-status-${audioId}`,
    table: 'audios',
    event: 'UPDATE',
    filter: `id=eq.${audioId}`,
    onMessage: (payload) => {
      if (payload.new?.status && ['completed', 'error'].includes(payload.new.status)) {
        onStatusChange(payload);
      }
    },
    onError,
    onSubscribed: () => {
      console.log(`[REALTIME] Audio status subscription active for ${audioId}`);
    },
  });
};

export const createProfileSubscription = (
  supabase: SupabaseClient,
  userId: string,
  onProfileChange: (payload: any) => void,
  onError?: (error: any) => void
) => {
  return realtimeManager.createOptimizedSubscription(supabase, {
    channelName: `profile-${userId}`,
    table: 'profiles',
    event: 'UPDATE',
    filter: `id=eq.${userId}`,
    onMessage: onProfileChange,
    onError,
  });
};

export const createOrganizationSubscription = (
  supabase: SupabaseClient,
  orgId: string,
  onOrgChange: (payload: any) => void,
  onError?: (error: any) => void
) => {
  return realtimeManager.createOptimizedSubscription(supabase, {
    channelName: `organization-${orgId}`,
    table: 'organizations',
    event: 'UPDATE',
    filter: `id=eq.${orgId}`,
    onMessage: onOrgChange,
    onError,
  });
};

export const createOrganizationMembersSubscription = (
  supabase: SupabaseClient,
  orgId: string,
  onMembersChange: (payload: any) => void,
  onError?: (error: any) => void
) => {
  return realtimeManager.createOptimizedSubscription(supabase, {
    channelName: `organization-members-${orgId}`,
    table: 'organization_members',
    event: ['INSERT', 'UPDATE', 'DELETE'],
    filter: `organization_id=eq.${orgId}`,
    onMessage: onMembersChange,
    onError,
    onSubscribed: () => {
      console.log(`[REALTIME] Organization members subscription active for ${orgId}`);
    },
  });
};

// Export performance tracker for external use
export { performanceTracker as realtimePerformanceTracker };