// components/layout/MainLayout.tsx
'use client';

import React, { useState } from 'react';
import { useTranscriptionData } from '@/hooks/useTranscriptionData';
import { RightSidebar } from '@/components/sidebar/RightSidebar';
import { AudioPlayer } from '@/components/transcription/AudioPlayer';
import { EditableTranscriptionSegments } from '@/components/transcription/EditableTranscriptionSegments';
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
  const [audioPlayerRef, setAudioPlayerRef] = useState<AudioPlayerRef | null>(null);
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
    fetchData,
    handleSegmentsChange,
    handleSpeakersChange,
    saveTranscription,
    saveTitle,
  } = useTranscriptionData(selectedAudioId);
  
  // Reset audio player ref when audio changes to prevent stale references
  React.useEffect(() => {
    setAudioPlayerRef(null);
  }, [selectedAudioId]);
  
  const wordCount = editedSegments.reduce((count, segment) => {
    return count + segment.text.trim().split(/\s+/).filter(Boolean).length;
  }, 0);

  const handleSegmentClick = (segment: TranscriptionSegment) => {
    if (audioPlayerRef) {
      audioPlayerRef.seekTo(segment.start);
    }
  };

  const handleSegmentDoubleClick = (segment: TranscriptionSegment) => {
    if (audioPlayerRef) {
      audioPlayerRef.seekTo(segment.start);
      audioPlayerRef.play();
    }
  };
  
  const handleExport = async (format: 'pdf' | 'txt' | 'docx') => {
    if (!transcription) {
      console.error("No transcription available to export.");
      // Optionally, show an error message to the user
      return;
    }

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionId: transcription.id,
          format,
          // Use a custom name if available, otherwise the original, or a default
          filename: audio?.customName || audio?.originalName || 'transcription',
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed. The server responded with an error.');
      }

      // Get the file data from the response
      const blob = await response.blob();

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element to trigger the download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${audio?.customName || audio?.originalName || 'transcription'}.${format}`;

      // Add the link to the page, click it, and then remove it
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      console.error("Export error:", err);
      // Optionally, show an error message to the user
    }
  };


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
    
    // Handle all non-completed statuses as processing/loading states
    if (audio?.status === 'processing' || audio?.status === 'pending' || audio?.status === 'uploaded') {
      return <ProcessingState />;
    }
    
    if (audio?.status === 'error') {
      return <TranscriptionErrorState />;
    }

    if (transcription) {
      return (
        <div className="flex-1 flex flex-col bg-gray-50 h-full">
          <TranscriptionHeader
            audio={audio}
            onSaveTitle={saveTitle}
            onSaveTranscription={saveTranscription}
            hasUnsavedChanges={hasUnsavedChanges}
            isSaving={saving}
          />
          <div className="flex-1 overflow-hidden pb-40">
            <EditableTranscriptionSegments
              segments={editedSegments}
              speakers={speakers}
              onSegmentClick={handleSegmentClick}
              onSegmentDoubleClick={handleSegmentDoubleClick}
              onSegmentsChange={handleSegmentsChange}
              audioPlayerRef={audioPlayerRef}
              currentTime={currentTime}
            />
          </div>
          {/* Mobile Edit Warning Popup */}
          <MobileEditWarning show={isMobile} />
        </div>
      );
    }
    
    // If audio is completed but no transcription yet, show loading state
    // This handles the case where the Worker just finished but the transcription file isn't available yet
    if (audio?.status === 'completed' && !transcription) {
      return <LoadingState />;
    }
    
    // Fallback for when there's an audio but no transcription or other state
    return <div className="flex-1 flex items-center justify-center">No transcription available.</div>
  };
  
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        {renderContent()}
      </div>
      
      <RightSidebar
        audio={audio}
        transcription={transcription}
        onExport={handleExport}
        wordCount={wordCount}
        hasUnsavedChanges={hasUnsavedChanges}
        speakers={speakers}
        onSpeakersChange={handleSpeakersChange}
      />
      
      {audio?.status === 'completed' && (
        <div className="fixed bottom-0 left-80 right-80 bg-gray-100 border-t z-30">
          <div className="max-w-4xl mx-auto p-2">
            <AudioPlayer 
              audioId={audio.id} 
              onRef={setAudioPlayerRef} 
              onTimeUpdate={setCurrentTime}
            />
          </div>
        </div>
      )}
    </div>
  );
}