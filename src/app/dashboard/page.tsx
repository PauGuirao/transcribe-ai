'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';

export default function DashboardPage() {
  const [selectedAudioId, setSelectedAudioId] = useState<string | undefined>();

  const handleAudioSelect = (audioId: string) => {
    setSelectedAudioId(audioId);
  };

  const handleUploadComplete = (audioId: string) => {
    setSelectedAudioId(audioId);
  };

  return (
    <MainLayout 
      selectedAudioId={selectedAudioId}
      onAudioSelect={handleAudioSelect}
      onUploadComplete={handleUploadComplete}
    />
  );
}