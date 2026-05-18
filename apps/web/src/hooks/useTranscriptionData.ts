"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { createAudioStatusSubscription, realtimeManager } from "@/lib/supabase-realtime";
import { Audio, Transcription, TranscriptionSegment, Speaker } from "@/types";
import { useTranscriptionStatus } from "./useTranscriptionStatus";

interface TranscriptionProgress {
  status: 'idle' | 'pending' | 'processing' | 'transcribing' | 'completed' | 'error';
  progress: number;
  message?: string;
}

/**
 * Custom hook to manage fetching and state for transcription data.
 * @param audioId - The ID of the audio to fetch.
 * @returns An object with state and handler functions.
 */
export function useTranscriptionData(audioId?: string) {
  // ... (all your existing useState hooks remain the same)
  const [audio, setAudio] = useState<Audio | null>(null);
  const [transcription, setTranscription] = useState<Transcription | null>(
    null
  );
  const [editedSegments, setEditedSegments] = useState<TranscriptionSegment[]>(
    []
  );
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptionProgress>({
    status: 'idle',
    progress: 0,
  });
  // Guard against duplicate subscription setup (e.g., React Strict Mode)
  const subscriptionAudioIdRef = useRef<string | null>(null);
  // Track if we should listen for WebSocket updates (only during active transcription)
  const [isTranscribing, setIsTranscribing] = useState(false);
  // Ref to hold fetchData for use in callbacks (avoids circular reference)
  const fetchDataRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const fetchData = useCallback(async () => {
    if (!audioId) {
      setAudio(null);
      setTranscription(null);
      setEditedSegments([]);
      setSpeakers([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 Fetching data for audioId: ${audioId}`);
      const response = await fetch(`/api/audio/${audioId}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch audio data");
      const data = await response.json();
      console.log(`📥 Received API response:`, {
        success: data.success,
        hasAudio: !!data.audio,
        hasTranscription: !!data.transcription,
        audioStatus: data.audio?.status,
        transcriptionSegments: data.transcription?.segments?.length || 0
      });
      
      setAudio(data.audio);
      setTranscription(data.transcription);
      setEditedSegments(data.transcription?.segments || []);

      // Check if audio is in an active transcription state
      const audioStatus = data.audio?.status;
      if (audioStatus === 'pending' || audioStatus === 'processing' || audioStatus === 'transcribing') {
        setIsTranscribing(true);
        setTranscriptionProgress({
          status: audioStatus,
          progress: audioStatus === 'pending' ? 5 : audioStatus === 'processing' ? 20 : 50,
          message: audioStatus === 'pending' ? 'En cua...' : audioStatus === 'processing' ? 'Processant...' : 'Transcrivint...',
        });
      } else if (audioStatus === 'completed') {
        setIsTranscribing(false);
        setTranscriptionProgress({ status: 'completed', progress: 100 });
      } else if (audioStatus === 'error') {
        setIsTranscribing(false);
        setTranscriptionProgress({ status: 'error', progress: 0 });
      }

      console.log(`🎯 Updated frontend state:`, {
        audioSet: !!data.audio,
        transcriptionSet: !!data.transcription,
        segmentsCount: data.transcription?.segments?.length || 0,
        editedSegmentsCount: (data.transcription?.segments || []).length
      });
      
      const existingSpeakers = data.transcription?.speakers || [];
      if (existingSpeakers.length === 0) {
        setSpeakers([
          { id: "speaker-logopeda", name: "Logopeda", color: "#3B82F6" },
          { id: "speaker-alumne", name: "Alumne", color: "#EF4444" },
        ]);
      } else {
        setSpeakers(existingSpeakers);
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [audioId]);

  // Keep fetchDataRef updated
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  // WebSocket-based real-time status updates (only active during transcription)
  const { isConnected: wsConnected } = useTranscriptionStatus(
    isTranscribing ? audioId ?? null : null,
    {
      onStatusChange: (status) => {
        console.log('[WS] Status update:', status);
        setTranscriptionProgress({
          status: status.status,
          progress: status.progress,
          message: status.message,
        });
      },
      onComplete: () => {
        console.log('[WS] Transcription completed, fetching data...');
        setIsTranscribing(false);
        setTranscriptionProgress({ status: 'completed', progress: 100, message: 'Transcripció completada!' });
        // Fetch the completed transcription data
        fetchDataRef.current?.();
      },
      onError: (error) => {
        console.error('[WS] Transcription error:', error);
        setTranscriptionProgress({ status: 'error', progress: 0, message: error.message });
        setIsTranscribing(false);
      },
    }
  );

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!audioId) return;

    // Prevent duplicate setup for the same audioId
    if (subscriptionAudioIdRef.current === audioId) {
      console.log(`[REALTIME] Subscription already active for audioId: ${audioId}, skipping duplicate setup`);
      return;
    }

    console.log(`[REALTIME] Setting up optimized subscription for audioId: ${audioId}`);

    subscriptionAudioIdRef.current = audioId;

    // Use the optimized realtime subscription
    const channel = createAudioStatusSubscription(
      supabase,
      audioId,
      (payload) => {
        console.log("[REALTIME] Received optimized payload:", payload);
        fetchData();
      },
      (error) => {
        console.error("[REALTIME] Subscription error:", error);
      }
    );

    // Cleanup function
    return () => {
      console.log(`[REALTIME] Cleaning up optimized subscription for audioId: ${audioId}`);
      // Ensure we unsubscribe the correct channel name
      realtimeManager.unsubscribe(`audio-status-${audioId}`);
      if (subscriptionAudioIdRef.current === audioId) {
        subscriptionAudioIdRef.current = null;
      }
    };
  }, [audioId, fetchData]);

  const handleSegmentsChange = useCallback((segments: TranscriptionSegment[]) => {
    setEditedSegments(segments);
    setHasUnsavedChanges(true);
  }, []);

  const handleSpeakersChange = useCallback((newSpeakers: Speaker[]) => {
    setSpeakers(newSpeakers);
    setHasUnsavedChanges(true);
  }, []);

  // Tracks the timestamp of the most recent successful save — drives the
  // header's "Saved 3s ago" status indicator.
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Refs so the debounced auto-save closure reads the latest values without
  // re-creating the timer every keystroke.
  const editedSegmentsRef = useRef<TranscriptionSegment[]>(editedSegments);
  const speakersRef = useRef<Speaker[]>(speakers);
  const transcriptionRef = useRef<Transcription | null>(transcription);
  editedSegmentsRef.current = editedSegments;
  speakersRef.current = speakers;
  transcriptionRef.current = transcription;

  /**
   * PATCH the transcription. Critically: we do NOT call fetchData() afterward —
   * the local state is already the source of truth for what we just wrote, and
   * a re-fetch would force the editor to re-mount and lose cursor/selection.
   */
  const saveTranscription = useCallback(async () => {
    const t = transcriptionRef.current;
    if (!t) return;

    setSaving(true);
    setError(null);

    try {
      const segs = editedSegmentsRef.current;
      const generatedEditedText = segs.map((segment) => segment.text).join(" ");

      const response = await fetch(`/api/transcription/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editedText: generatedEditedText,
          editedSegments: segs,
          speakers: speakersRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save transcription");
      }

      setHasUnsavedChanges(false);
      setLastSavedAt(Date.now());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      console.error("Failed to save transcription:", errorMessage);
    } finally {
      setSaving(false);
    }
  }, []);

  /**
   * Debounced auto-save: whenever the user pauses for 1.5s, persist current
   * state. Restarts on every change so we don't fire mid-edit. Skipped while
   * an earlier save is still in flight (the next change will reschedule).
   */
  useEffect(() => {
    if (!hasUnsavedChanges || !transcription) return;
    if (saving) return;
    const id = window.setTimeout(() => {
      saveTranscription();
    }, 1500);
    return () => window.clearTimeout(id);
  }, [hasUnsavedChanges, editedSegments, speakers, transcription, saving, saveTranscription]);

  const saveTitle = async (newTitle: string) => {
    if (!audio || !newTitle) return;

    try {
      const response = await fetch(`/api/audio/${audio.id}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customName: newTitle }),
      });

      if (!response.ok) {
        throw new Error("Failed to update title");
      }

      // Optimistic local update — avoids a full fetchData() that would remount
      // the editor.
      setAudio((prev) => (prev ? { ...prev, customName: newTitle } : prev));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update title";
      setError(errorMessage);
      console.error("Failed to save title:", errorMessage);
      throw err;
    }
  };

  /**
   * Start monitoring transcription progress for a specific audioId.
   * Call this after uploading a file to track its transcription status via WebSocket.
   */
  const startTranscriptionMonitoring = useCallback((newAudioId?: string) => {
    console.log('[MONITOR] Starting transcription monitoring for:', newAudioId || audioId);
    setIsTranscribing(true);
    setTranscriptionProgress({
      status: 'pending',
      progress: 0,
      message: 'Iniciant transcripció...',
    });
  }, [audioId]);

  /**
   * Stop monitoring transcription progress.
   */
  const stopTranscriptionMonitoring = useCallback(() => {
    setIsTranscribing(false);
  }, []);

  return {
    audio,
    transcription,
    editedSegments,
    speakers,
    loading,
    saving,
    error,
    hasUnsavedChanges,
    lastSavedAt,
    // Transcription progress (WebSocket-based)
    transcriptionProgress,
    isTranscribing,
    wsConnected,
    // Functions
    fetchData,
    handleSegmentsChange,
    handleSpeakersChange,
    saveTranscription,
    saveTitle,
    startTranscriptionMonitoring,
    stopTranscriptionMonitoring,
  };
}
