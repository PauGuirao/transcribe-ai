"use client";

import React, { useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { MainLayout } from "@/components/layout/MainLayout";
import { AudioUploadResult } from "@/types";

export default function TranscribeClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedAudioId = searchParams.get("audioId") ?? undefined;

  const handleAudioSelect = useCallback(
    (audioId: string) => {
      router.push(`/transcribe?audioId=${audioId}`);
    },
    [router],
  );

  const handleUploadComplete = useCallback(
    (result: AudioUploadResult) => {
      router.push(`/transcribe?audioId=${result.audioId}`);
    },
    [router],
  );

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
