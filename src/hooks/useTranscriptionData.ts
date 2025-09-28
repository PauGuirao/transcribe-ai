"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase"; // 👈 Import your Supabase client
import { createAudioStatusSubscription, realtimeManager } from "@/lib/supabase-realtime";
import { Audio, Transcription, TranscriptionSegment, Speaker } from "@/types";

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

  // The fetchData function remains exactly the same
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
      const response = await fetch(`/api/audio/${audioId}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch audio data");
      const data = await response.json();
      setAudio(data.audio);
      setTranscription(data.transcription);
      setEditedSegments(data.transcription?.segments || []);
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

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!audioId) return;

    console.log(`[REALTIME] Setting up optimized subscription for audioId: ${audioId}`);

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
      realtimeManager.unsubscribe(`audios:${audioId}`);
    };
  }, [audioId, fetchData]);

  // ... (the rest of your hook's functions like handleSegmentsChange, saveTranscription, etc. remain the same)
  const handleSegmentsChange = (segments: TranscriptionSegment[]) => {
    setEditedSegments(segments);
    setHasUnsavedChanges(true);
  };

  const handleSpeakersChange = (newSpeakers: Speaker[]) => {
    setSpeakers(newSpeakers);
    setHasUnsavedChanges(true);
  };

  const saveTranscription = async () => {
    if (!transcription || !hasUnsavedChanges) return;

    setSaving(true);
    setError(null);

    try {
      // Generate the full edited text by joining all segment texts
      const generatedEditedText = editedSegments
        .map((segment) => segment.text)
        .join(" ");

      const response = await fetch(`/api/transcription/${transcription.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          editedText: generatedEditedText,
          editedSegments: editedSegments,
          speakers: speakers,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save transcription");
      }

      setHasUnsavedChanges(false);
      await fetchData(); // Refresh data from the server to be in sync
      console.log("Transcription saved successfully!");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      console.error("Failed to save transcription:", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const saveTitle = async (newTitle: string) => {
    if (!audio || !newTitle) return;

    try {
      const response = await fetch(`/api/audio/${audio.id}/title`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customName: newTitle }),
      });

      if (!response.ok) {
        throw new Error("Failed to update title");
      }

      await fetchData(); // Refresh data to get the updated title
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update title";
      setError(errorMessage);
      console.error("Failed to save title:", errorMessage);
      throw err; // Re-throw to handle in the component
    }
  };

  return {
    audio,
    transcription,
    editedSegments,
    speakers,
    loading,
    saving,
    error,
    hasUnsavedChanges,
    fetchData,
    handleSegmentsChange,
    handleSpeakersChange,
    saveTranscription,
    saveTitle,
  };
}
