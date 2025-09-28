"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { MainLayout } from "@/components/layout/MainLayout";
import { AudioUploadResult } from "@/types";

export default function TranscribeClient() {
  const searchParams = useSearchParams();
  const [selectedAudioId, setSelectedAudioId] = useState<string | undefined>();

  useEffect(() => {
    const audioId = searchParams.get("audioId");
    if (audioId) {
      setSelectedAudioId(audioId);
    }
  }, [searchParams]);

  const handleAudioSelect = (audioId: string) => {
    setSelectedAudioId(audioId);
  };

  const handleUploadComplete = (result: AudioUploadResult) => {
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
