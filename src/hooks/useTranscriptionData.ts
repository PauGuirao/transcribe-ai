"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase"; // 👈 Import your Supabase client
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

    console.log(`[REALTIME] Setting up subscription for audioId: ${audioId}`);

    const channel = supabase.channel(`audios:${audioId}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "audios",
          filter: `id=eq.${audioId}`,
        },
        (payload) => {
          // This log fires when a message is received
          console.log("[REALTIME] Received payload:", payload);
          const newStatus = payload.new.status;
          if (newStatus === "completed" || newStatus === "error") {
            console.log(
              `[REALTIME] Status changed to '${newStatus}'. Fetching data...`
            );
            fetchData();
          }
        }
      )
      .subscribe((status, err) => {
        // This callback tracks the subscription's connection status
        if (status === "SUBSCRIBED") {
          console.log(
            `[REALTIME] Successfully subscribed to channel: audios:${audioId}`
          );
        }
        if (status === "CLOSED") {
          console.log("[REALTIME] Channel closed.");
        }
      });

    // Cleanup function
    return () => {
      console.log(`[REALTIME] Unsubscribing from channel: audios:${audioId}`);
      supabase.removeChannel(channel);
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
    // ...
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
