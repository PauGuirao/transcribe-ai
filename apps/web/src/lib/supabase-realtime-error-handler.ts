import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeError {
  type: 'connection' | 'subscription' | 'message' | 'timeout' | 'unknown';
  message: string;
  timestamp: number;
  subscriptionName?: string;
  retryCount?: number;
  originalError?: any;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export class RealtimeErrorHandler {
  private errors: RealtimeError[] = [];
  private retryAttempts = new Map<string, number>();
  private circuitBreakers = new Map<string, {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailureTime: number;
    nextAttemptTime: number;
  }>();

  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
  };

  private defaultCircuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
  };

  constructor(
    private retryConfig: Partial<RetryConfig> = {},
    private circuitBreakerConfig: Partial<CircuitBreakerConfig> = {}
  ) {
    this.retryConfig = { ...this.defaultRetryConfig, ...retryConfig };
    this.circuitBreakerConfig = { ...this.defaultCircuitBreakerConfig, ...circuitBreakerConfig };
  }

  /**
   * Handle realtime subscription errors with retry logic
   */
  async handleError(
    error: any,
    subscriptionName: string,
    retryCallback: () => Promise<RealtimeChannel | null>
  ): Promise<RealtimeChannel | null> {
    const realtimeError = this.createRealtimeError(error, subscriptionName);
    this.logError(realtimeError);

    // Check circuit breaker
    if (this.isCircuitOpen(subscriptionName)) {
      console.warn(`[REALTIME ERROR] Circuit breaker open for ${subscriptionName}, skipping retry`);
      return null;
    }

    // Attempt retry with exponential backoff
    const retryCount = this.retryAttempts.get(subscriptionName) || 0;
    
    if (retryCount < this.retryConfig.maxRetries!) {
      const delay = this.calculateRetryDelay(retryCount);
      
      console.log(`[REALTIME ERROR] Retrying ${subscriptionName} in ${delay}ms (attempt ${retryCount + 1}/${this.retryConfig.maxRetries})`);
      
      this.retryAttempts.set(subscriptionName, retryCount + 1);
      
      await this.sleep(delay);
      
      try {
        const result = await retryCallback();
        
        // Success - reset retry count and circuit breaker
        this.retryAttempts.delete(subscriptionName);
        this.resetCircuitBreaker(subscriptionName);
        
        console.log(`[REALTIME ERROR] Successfully reconnected ${subscriptionName}`);
        return result;
      } catch (retryError) {
        // Recursive retry
        return this.handleError(retryError, subscriptionName, retryCallback);
      }
    } else {
      // Max retries exceeded - open circuit breaker
      this.openCircuitBreaker(subscriptionName);
      this.retryAttempts.delete(subscriptionName);
      
      console.error(`[REALTIME ERROR] Max retries exceeded for ${subscriptionName}, circuit breaker opened`);
      return null;
    }
  }

  /**
   * Handle connection-level errors
   */
  handleConnectionError(error: any): void {
    const realtimeError: RealtimeError = {
      type: 'connection',
      message: `Connection error: ${error.message || 'Unknown connection error'}`,
      timestamp: Date.now(),
      originalError: error,
    };
    
    this.logError(realtimeError);
    
    // Notify all active subscriptions about connection issues
    this.notifyConnectionError(realtimeError);
  }

  /**
   * Handle message processing errors
   */
  handleMessageError(error: any, subscriptionName: string, payload?: any): void {
    const realtimeError: RealtimeError = {
      type: 'message',
      message: `Message processing error in ${subscriptionName}: ${error.message || 'Unknown message error'}`,
      timestamp: Date.now(),
      subscriptionName,
      originalError: { error, payload },
    };
    
    this.logError(realtimeError);
  }

  /**
   * Handle subscription timeout errors
   */
  handleTimeoutError(subscriptionName: string, timeoutMs: number): void {
    const realtimeError: RealtimeError = {
      type: 'timeout',
      message: `Subscription ${subscriptionName} timed out after ${timeoutMs}ms`,
      timestamp: Date.now(),
      subscriptionName,
    };
    
    this.logError(realtimeError);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySubscription: Record<string, number>;
    recentErrors: RealtimeError[];
    circuitBreakerStatus: Record<string, string>;
  } {
    const errorsByType: Record<string, number> = {};
    const errorsBySubscription: Record<string, number> = {};
    
    this.errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      if (error.subscriptionName) {
        errorsBySubscription[error.subscriptionName] = (errorsBySubscription[error.subscriptionName] || 0) + 1;
      }
    });

    const circuitBreakerStatus: Record<string, string> = {};
    this.circuitBreakers.forEach((breaker, name) => {
      circuitBreakerStatus[name] = breaker.state;
    });

    return {
      totalErrors: this.errors.length,
      errorsByType,
      errorsBySubscription,
      recentErrors: this.errors.slice(-10), // Last 10 errors
      circuitBreakerStatus,
    };
  }

  /**
   * Clear error history
   */
  clearErrors(): void {
    this.errors = [];
    this.retryAttempts.clear();
  }

  /**
   * Reset circuit breaker for a specific subscription
   */
  resetCircuitBreaker(subscriptionName: string): void {
    this.circuitBreakers.delete(subscriptionName);
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }

  private createRealtimeError(error: any, subscriptionName?: string): RealtimeError {
    let type: RealtimeError['type'] = 'unknown';
    let message = 'Unknown error';

    if (error.message) {
      message = error.message;
      
      if (message.includes('connection') || message.includes('network')) {
        type = 'connection';
      } else if (message.includes('subscription') || message.includes('channel')) {
        type = 'subscription';
      } else if (message.includes('timeout')) {
        type = 'timeout';
      } else if (message.includes('message') || message.includes('payload')) {
        type = 'message';
      }
    }

    return {
      type,
      message,
      timestamp: Date.now(),
      subscriptionName,
      originalError: error,
    };
  }

  private logError(error: RealtimeError): void {
    this.errors.push(error);
    
    // Keep only last 100 errors to prevent memory leaks
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    // Log to console with appropriate level
    const logMessage = `[REALTIME ERROR] ${error.type.toUpperCase()}: ${error.message}`;
    
    if (error.type === 'connection' || error.type === 'subscription') {
      console.error(logMessage, error.originalError);
    } else {
      console.warn(logMessage, error.originalError);
    }
  }

  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = this.retryConfig.baseDelay!;
    const maxDelay = this.retryConfig.maxDelay!;
    const backoffMultiplier = this.retryConfig.backoffMultiplier!;
    const jitter = this.retryConfig.jitter!;

    let delay = baseDelay * Math.pow(backoffMultiplier, retryCount);
    delay = Math.min(delay, maxDelay);

    if (jitter) {
      // Add random jitter (±25%)
      const jitterAmount = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    return Math.max(delay, 0);
  }

  private isCircuitOpen(subscriptionName: string): boolean {
    const breaker = this.circuitBreakers.get(subscriptionName);
    
    if (!breaker) {
      return false;
    }

    const now = Date.now();
    
    if (breaker.state === 'open') {
      if (now >= breaker.nextAttemptTime) {
        // Transition to half-open
        breaker.state = 'half-open';
        return false;
      }
      return true;
    }

    return false;
  }

  private openCircuitBreaker(subscriptionName: string): void {
    const now = Date.now();
    const resetTimeout = this.circuitBreakerConfig.resetTimeout!;
    
    this.circuitBreakers.set(subscriptionName, {
      state: 'open',
      failures: this.circuitBreakers.get(subscriptionName)?.failures || 0,
      lastFailureTime: now,
      nextAttemptTime: now + resetTimeout,
    });
  }

  private notifyConnectionError(error: RealtimeError): void {
    // This could be extended to notify UI components or trigger alerts
    console.warn('[REALTIME ERROR] Connection error detected, all subscriptions may be affected');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global error handler instance
export const realtimeErrorHandler = new RealtimeErrorHandler();

// Utility functions for common error scenarios
export const handleSubscriptionError = (
  error: any,
  subscriptionName: string,
  retryCallback: () => Promise<RealtimeChannel | null>
) => {
  return realtimeErrorHandler.handleError(error, subscriptionName, retryCallback);
};

export const handleConnectionError = (error: any) => {
  realtimeErrorHandler.handleConnectionError(error);
};

export const handleMessageError = (error: any, subscriptionName: string, payload?: any) => {
  realtimeErrorHandler.handleMessageError(error, subscriptionName, payload);
};

export const handleTimeoutError = (subscriptionName: string, timeoutMs: number) => {
  realtimeErrorHandler.handleTimeoutError(subscriptionName, timeoutMs);
};

// Error boundary for React components using realtime subscriptions
export class RealtimeErrorBoundary extends Error {
  constructor(
    message: string,
    public subscriptionName: string,
    public originalError: any
  ) {
    super(message);
    this.name = 'RealtimeErrorBoundary';
  }
}