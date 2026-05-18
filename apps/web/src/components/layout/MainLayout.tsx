// components/layout/MainLayout.tsx
'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranscriptionData } from '@/hooks/useTranscriptionData';
import { RightSidebar } from '@/components/sidebar/RightSidebar';
import { AudioPlayer } from '@/components/transcription/AudioPlayer';
import { TranscriptEditor } from '@/components/transcription/TranscriptEditor';
import { EmptyState } from './states/EmptyState';
import { LoadingState } from './states/LoadingState';
import { ErrorState } from './states/ErrorState';
import { ProcessingState } from './states/ProcessingState';
import { TranscriptionErrorState } from './states/TranscriptionErrorState';
import { TranscriptionHeader } from './TranscriptionHeader';
import { MobileEditWarning } from '@/components/ui/mobile-edit-warning';
import { useIsMobile } from '@/hooks/use-mobile';
import { AudioUploadResult, TranscriptionSegment, AudioPlayerRef } from '@/types';

interface MainLayoutProps {
  selectedAudioId?: string;
  onAudioSelect: (audioId: string) => void;
  onUploadComplete: (result: AudioUploadResult) => void;
}

export function MainLayout({ selectedAudioId, onAudioSelect, onUploadComplete }: MainLayoutProps) {
  const audioPlayerRef = useRef<AudioPlayerRef | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const isMobile = useIsMobile();

  const {
    audio,
    transcription,
    editedSegments,
    speakers,
    loading,
    saving,
    error,
    hasUnsavedChanges,
    lastSavedAt,
    fetchData,
    handleSegmentsChange,
    handleSpeakersChange,
    saveTranscription,
    saveTitle,
  } = useTranscriptionData(selectedAudioId);

  // Stable ref setter — never changes identity, so AudioPlayer's onRef effect
  // doesn't keep re-firing on every parent render.
  const setAudioPlayerRef = useCallback((ref: AudioPlayerRef | null) => {
    audioPlayerRef.current = ref;
  }, []);

  const wordCount = useMemo(
    () =>
      editedSegments.reduce(
        (count, segment) =>
          count + segment.text.trim().split(/\s+/).filter(Boolean).length,
        0,
      ),
    [editedSegments],
  );

  const handleSegmentClick = useCallback(
    (segment: TranscriptionSegment) => {
      const middleTime = segment.start + (segment.end - segment.start) / 2;
      setCurrentTime(middleTime);
      audioPlayerRef.current?.seekTo(segment.start);
    },
    [],
  );

  const handleSegmentDoubleClick = useCallback(
    (segment: TranscriptionSegment) => {
      const player = audioPlayerRef.current;
      if (!player) return;
      player.seekTo(segment.start);
      player.play();
    },
    [],
  );

  const handleExport = useCallback(
    async (format: 'pdf' | 'txt' | 'docx') => {
      if (!transcription) {
        console.error('No transcription available to export.');
        return;
      }

      try {
        const response = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcriptionId: transcription.id,
            format,
            filename: audio?.customName || audio?.originalName || 'transcription',
          }),
        });

        if (!response.ok) {
          throw new Error('Export failed. The server responded with an error.');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${audio?.customName || audio?.originalName || 'transcription'}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        console.error('Export error:', err);
      }
    },
    [transcription, audio?.customName, audio?.originalName, audio?.id],
  );

  const renderContent = () => {
    if (!selectedAudioId) {
      return (
        <EmptyState
          onUploadComplete={onUploadComplete}
          onAudioSelect={onAudioSelect}
        />
      );
    }
    if (loading) return <LoadingState />;
    if (error) return <ErrorState message={error} onRetry={fetchData} />;

    if (
      audio?.status === 'processing' ||
      audio?.status === 'pending' ||
      audio?.status === 'uploaded'
    ) {
      return <ProcessingState />;
    }

    if (audio?.status === 'error') {
      return <TranscriptionErrorState />;
    }

    if (transcription) {
      return (
        <div className="flex h-full min-h-0 flex-1 flex-col bg-gray-50">
          <TranscriptionHeader
            audio={audio}
            onSaveTitle={saveTitle}
            onSaveTranscription={saveTranscription}
            hasUnsavedChanges={hasUnsavedChanges}
            isSaving={saving}
            lastSavedAt={lastSavedAt}
            error={error}
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            <TranscriptEditor
              segments={editedSegments}
              speakers={speakers}
              onSegmentsChange={handleSegmentsChange}
              onSpeakersChange={handleSpeakersChange}
              audioPlayerRef={audioPlayerRef.current}
              currentTime={currentTime}
            />
          </div>
          <MobileEditWarning show={isMobile} />
        </div>
      );
    }

    if (audio?.status === 'completed' && !transcription) {
      return <LoadingState />;
    }

    return (
      <div className="flex flex-1 items-center justify-center">
        No transcription available.
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-background">
      {/* Main column: content + player stacked vertically */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-hidden">
          {renderContent()}
        </div>

        {/* Sticky player at bottom of the content column.
            No hardcoded sidebar offsets — flexbox handles it. */}
        {audio?.status === 'completed' && (
          <div className="border-t bg-gray-100">
            <div className="mx-auto max-w-4xl p-2">
              <AudioPlayer
                audioId={audio.id}
                onRef={setAudioPlayerRef}
                onTimeUpdate={setCurrentTime}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right sidebar — hidden on mobile to free horizontal space */}
      <div className="hidden md:flex">
        <RightSidebar
          audio={audio}
          transcription={transcription}
          onExport={handleExport}
          wordCount={wordCount}
          hasUnsavedChanges={hasUnsavedChanges}
          speakers={speakers}
          onSpeakersChange={handleSpeakersChange}
        />
      </div>
    </div>
  );
}
