"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TranscriptionStatus {
  audioId: string;
  status: 'pending' | 'processing' | 'transcribing' | 'completed' | 'error';
  progress: number;
  message?: string;
  updatedAt: string;
}

interface UseTranscriptionStatusOptions {
  onStatusChange?: (status: TranscriptionStatus) => void;
  onComplete?: (status: TranscriptionStatus) => void;
  onError?: (error: Error) => void;
  fallbackToPolling?: boolean;
  pollingInterval?: number;
}

/**
 * Hook for real-time transcription status updates via WebSocket
 * Falls back to polling if WebSocket is unavailable
 */
export function useTranscriptionStatus(
  audioId: string | null,
  options: UseTranscriptionStatusOptions = {}
) {
  const {
    onStatusChange,
    onComplete,
    onError,
    fallbackToPolling = true,
    pollingInterval = 3000,
  } = options;

  const [status, setStatus] = useState<TranscriptionStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'websocket' | 'polling' | 'none'>('none');

  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const { session } = useAuth();
  const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || 'https://transcribe-worker.guiraocastells.workers.dev';
  const wsUrl = workerUrl.replace('https://', 'wss://').replace('http://', 'ws://');

  // Clean up function
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsConnected(false);
    setConnectionType('none');
  }, []);

  // Connect via WebSocket
  const connectWebSocket = useCallback(() => {
    if (!audioId) return;
    const token = session?.access_token;
    if (!token) {
      console.log('[WS] No auth token yet, skipping connect');
      return;
    }

    try {
      const ws = new WebSocket(`${wsUrl}/ws/status/${audioId}?token=${encodeURIComponent(token)}`);

      ws.onopen = () => {
        console.log('[WS] Connected for', audioId);
        setIsConnected(true);
        setConnectionType('websocket');
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'status' && message.data) {
            const newStatus = message.data as TranscriptionStatus;
            setStatus(newStatus);
            onStatusChange?.(newStatus);

            if (newStatus.status === 'completed') {
              onComplete?.(newStatus);
            }
          }
        } catch {
          // Ignore invalid messages
        }
      };

      ws.onerror = (error) => {
        console.warn('[WS] Error:', error);
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          setTimeout(connectWebSocket, delay);
        } else if (fallbackToPolling) {
          console.log('[WS] Max reconnect attempts reached, falling back to polling');
          startPolling();
        }
      };

      wsRef.current = ws;

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);

      // Clean up ping interval when WebSocket closes
      ws.addEventListener('close', () => clearInterval(pingInterval));

    } catch (e) {
      console.warn('[WS] Failed to connect:', e);
      if (fallbackToPolling) {
        startPolling();
      } else {
        onError?.(e as Error);
      }
    }
  }, [audioId, wsUrl, fallbackToPolling, onStatusChange, onComplete, onError, session?.access_token]);

  // Fallback: Poll for status
  const startPolling = useCallback(() => {
    if (!audioId || pollingRef.current) return;

    console.log('[POLL] Starting polling for', audioId);
    setConnectionType('polling');

    const poll = async () => {
      try {
        const response = await fetch(`${workerUrl}/ws/status/${audioId}`, {
          method: 'GET',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status) {
            setStatus(data.status);
            setIsConnected(true);
            onStatusChange?.(data.status);

            if (data.status.status === 'completed') {
              onComplete?.(data.status);
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
            }
          }
        }
      } catch (e) {
        console.warn('[POLL] Error:', e);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    pollingRef.current = setInterval(poll, pollingInterval);
  }, [audioId, workerUrl, pollingInterval, onStatusChange, onComplete]);

  // Connect when audioId changes
  useEffect(() => {
    if (!audioId) {
      cleanup();
      setStatus(null);
      return;
    }

    // Try WebSocket first
    connectWebSocket();

    return cleanup;
  }, [audioId, connectWebSocket, cleanup]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    cleanup();
    reconnectAttempts.current = 0;
    if (audioId) {
      connectWebSocket();
    }
  }, [audioId, cleanup, connectWebSocket]);

  return {
    status,
    isConnected,
    connectionType,
    reconnect,
    cleanup,
  };
}
