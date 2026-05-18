"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { MainLayout } from "@/components/layout/MainLayout";
import { AudioUploadResult } from "@/types";
import { useRouter } from "next/navigation";

export default function TranscribeClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedAudioId, setSelectedAudioId] = useState<string | undefined>();

  useEffect(() => {
    const audioId = searchParams.get("audioId");
    if (audioId) {
      setSelectedAudioId(audioId);
    }
  }, [searchParams]);

  // Keep URL in sync when selectedAudioId changes and URL is missing or different
  useEffect(() => {
    if (selectedAudioId) {
      const current = searchParams.get("audioId");
      if (current !== selectedAudioId) {
        router.replace(`/transcribe?audioId=${selectedAudioId}`);
      }
    }
  }, [selectedAudioId]);

  const handleAudioSelect = (audioId: string) => {
    router.push(`/transcribe?audioId=${audioId}`);
    setSelectedAudioId(audioId);
  };

  const handleUploadComplete = (result: AudioUploadResult) => {
    router.push(`/transcribe?audioId=${result.audioId}`);
    setSelectedAudioId(result.audioId);
  };

  return (
    <AppLayout
      selectedAudioId={selectedAudioId}
      onAudioSelect={handleAudioSelect}
      onUploadComplete={handleUploadComplete}
    >
      <MainLayout
        selectedAudioId={selectedAudioId}
        onAudioSelect={handleAudioSelect}
        onUploadComplete={handleUploadComplete}
      />
    </AppLayout>
  );
}
