'use client';

import { useState, useEffect } from 'react';
import { useRealtimePerformance } from '@/hooks/useRealtimeManager';
import { realtimeManager } from '@/lib/supabase-realtime';

interface RealtimeStats {
  activeSubscriptions: number;
  totalMessages: number;
  totalErrors: number;
  subscriptions: Array<{
    name: string;
    stats: {
      subscriptionName: string;
      startTime: number;
      messageCount: number;
      errorCount: number;
      duration: number;
      messagesPerSecond: number;
      errorRate: number;
      lastMessageTime?: number;
    };
  }>;
}

export function RealtimeMonitor() {
  const [stats, setStats] = useState<RealtimeStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { getAllStats } = useRealtimePerformance();

  useEffect(() => {
    const updateStats = async () => {
      try {
        const currentStats = await getAllStats();
        setStats(currentStats);
      } catch (error) {
        console.error('[REALTIME MONITOR] Failed to get stats:', error);
      }
    };

    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000);
    updateStats(); // Initial load

    return () => clearInterval(interval);
  }, [getAllStats]);

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors z-50"
      >
        📡 Realtime Monitor
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 max-w-md z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          📡 Realtime Monitor
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {stats ? (
        <div className="space-y-3">
          {/* Overall Stats */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              <div className="text-blue-600 dark:text-blue-400 font-medium">
                {stats.activeSubscriptions}
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-xs">
                Active
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
              <div className="text-green-600 dark:text-green-400 font-medium">
                {stats.totalMessages}
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-xs">
                Messages
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
              <div className="text-red-600 dark:text-red-400 font-medium">
                {stats.totalErrors}
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-xs">
                Errors
              </div>
            </div>
          </div>

          {/* Individual Subscriptions */}
          {stats.subscriptions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Active Subscriptions
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {stats.subscriptions.map(({ name, stats: subStats }) => (
                  <div
                    key={name}
                    className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs"
                  >
                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                      {name}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
                      <div>
                        Messages: {subStats.messageCount}
                      </div>
                      <div>
                        Errors: {subStats.errorCount}
                      </div>
                      <div>
                        Rate: {subStats.messagesPerSecond.toFixed(2)}/s
                      </div>
                      <div>
                        Error Rate: {(subStats.errorRate * 100).toFixed(1)}%
                      </div>
                    </div>
                    {subStats.lastMessageTime && (
                      <div className="text-gray-500 dark:text-gray-500 mt-1">
                        Last: {new Date(subStats.lastMessageTime).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Health Status */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Health Status
              </span>
              <span
                className={`font-medium ${
                  stats.totalErrors === 0
                    ? 'text-green-600 dark:text-green-400'
                    : stats.totalErrors < 5
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {stats.totalErrors === 0
                  ? '✅ Healthy'
                  : stats.totalErrors < 5
                  ? '⚠️ Warning'
                  : '❌ Critical'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={() => {
                realtimeManager.cleanup();
                setStats(null);
              }}
              className="w-full bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
            >
              🧹 Cleanup All Subscriptions
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
          Loading stats...
        </div>
      )}
    </div>
  );
}

// Hook for displaying realtime alerts
export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>>([]);

  const addAlert = (type: 'error' | 'warning' | 'info', message: string) => {
    const alert = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: Date.now(),
    };
    
    setAlerts(prev => [...prev, alert].slice(-10)); // Keep only last 10 alerts
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 5000);
  };

  const clearAlerts = () => setAlerts([]);

  return {
    alerts,
    addAlert,
    clearAlerts,
  };
}

// Component for displaying realtime alerts
export function RealtimeAlerts() {
  const { alerts } = useRealtimeAlerts();

  if (alerts.length === 0 || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium max-w-sm ${
            alert.type === 'error'
              ? 'bg-red-600 text-white'
              : alert.type === 'warning'
              ? 'bg-yellow-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span>
              {alert.type === 'error' ? '❌' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span>{alert.message}</span>
          </div>
          <div className="text-xs opacity-75 mt-1">
            {new Date(alert.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}