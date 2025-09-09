'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { MainLayout } from '@/components/layout/MainLayout';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [selectedAudioId, setSelectedAudioId] = useState<string | undefined>();

  useEffect(() => {
    const audioId = searchParams.get('audioId');
    if (audioId) {
      setSelectedAudioId(audioId);
    }
  }, [searchParams]);

  const handleAudioSelect = (audioId: string) => {
    setSelectedAudioId(audioId);
  };

  const handleUploadComplete = (audioId: string) => {
    setSelectedAudioId(audioId);
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