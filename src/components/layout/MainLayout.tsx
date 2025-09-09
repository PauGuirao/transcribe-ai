'use client';

import React, { useState, useCallback, useEffect } from 'react';

import { RightSidebar } from '@/components/sidebar/RightSidebar';
import { AudioPlayer, AudioPlayerRef } from '@/components/transcription/AudioPlayer';
import { EditableTranscriptionSegments } from '@/components/transcription/EditableTranscriptionSegments';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Loader2, 
  AlertCircle, 
  Save,
  Edit,
  Check,
  X
} from 'lucide-react';
import { Audio, Transcription, TranscriptionSegment, Speaker } from '@/types';

interface MainLayoutProps {
  selectedAudioId?: string;
  onAudioSelect: (audioId: string) => void;
  onUploadComplete: (audioId: string) => void;
}

export function MainLayout({ 
  selectedAudioId, 
  onAudioSelect, 
  onUploadComplete 
}: MainLayoutProps) {
  const [audio, setAudio] = useState<Audio | null>(null);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [editedText, setEditedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [editedSegments, setEditedSegments] = useState<TranscriptionSegment[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [audioPlayerRef, setAudioPlayerRef] = useState<AudioPlayerRef | null>(null);
  
  // Title editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  // Fetch audio and transcription data
  const fetchData = useCallback(async () => {
    if (!selectedAudioId) {
      setAudio(null);
      setTranscription(null);
      setEditedText('');
      setEditedSegments([]);
      setSpeakers([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/audio/${selectedAudioId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audio data');
      }

      const data = await response.json();
      setAudio(data.audio);
      setTranscription(data.transcription);
      setEditedText(data.transcription?.editedText || '');
      setEditedSegments(data.transcription?.segments || []);
      // Set speakers with defaults if none exist
      const existingSpeakers = data.transcription?.speakers || [];
      if (existingSpeakers.length === 0) {
        const defaultSpeakers: Speaker[] = [
          {
            id: 'speaker-logopeda',
            name: 'Logopeda',
            color: '#3B82F6'
          },
          {
            id: 'speaker-alumne',
            name: 'Alumne',
            color: '#EF4444'
          }
        ];
        setSpeakers(defaultSpeakers);
      } else {
        setSpeakers(existingSpeakers);
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [selectedAudioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Track changes in speakers
  useEffect(() => {
    if (transcription && speakers !== transcription.speakers) {
      setHasUnsavedChanges(true);
    }
  }, [speakers, transcription]);

  // Update word count when segments change
  useEffect(() => {
    const totalWords = editedSegments.reduce((count, segment) => {
      const words = segment.text.trim().split(/\s+/).filter(word => word.length > 0);
      return count + words.length;
    }, 0);
    setWordCount(totalWords);
  }, [editedSegments]);

  // Handle segment changes
  const handleSegmentsChange = (segments: TranscriptionSegment[]) => {
    setEditedSegments(segments);
    setHasUnsavedChanges(true);
  };

  // Handle segment click for selection only
  const handleSegmentClick = (segment: TranscriptionSegment) => {
    // Only handle selection, no audio playback
    console.log('Segment selected:', segment);
  };

  // Handle segment double click for audio seeking
  const handleSegmentDoubleClick = (segment: TranscriptionSegment) => {
    if (audioPlayerRef) {
      audioPlayerRef.seekTo(segment.start);
      audioPlayerRef.play();
    }
  };

  // Save transcription
  const handleSave = async () => {
    if (!transcription || !hasUnsavedChanges) return;

    setSaving(true);
    try {
      // Generate edited text from segments
      const generatedEditedText = editedSegments.map(segment => segment.text).join(' ');
      
      const requestBody: any = {
        editedText: generatedEditedText || editedText || transcription.editedText || '',
        editedSegments: editedSegments,
        speakers: speakers
      };

      const response = await fetch(`/api/transcription/${transcription.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to save transcription');
      }

      setHasUnsavedChanges(false);
      await fetchData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transcription');
    } finally {
      setSaving(false);
    }
  };

  // Save custom title
  const handleSaveTitle = async () => {
    if (!audio || !editedTitle.trim() || editedTitle.trim() === (audio.customName || audio.originalName)) {
      setIsEditingTitle(false);
      return;
    }

    setSavingTitle(true);
    try {
      const response = await fetch(`/api/audio/${audio.id}/title`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customName: editedTitle.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to save title');
      }

      // Update local audio state
      setAudio(prev => prev ? { ...prev, customName: editedTitle.trim() } : null);
      setIsEditingTitle(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save title');
    } finally {
      setSavingTitle(false);
    }
  };

  // Handle title editing
  const handleStartEditingTitle = () => {
    if (audio) {
      setEditedTitle(audio.customName || audio.originalName);
      setIsEditingTitle(true);
    }
  };

  const handleCancelEditingTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle('');
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditingTitle();
    }
  };

  // Handle export
  const handleExport = async (format: 'pdf' | 'txt' | 'docx') => {
    if (!transcription) return;

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionId: transcription.id,
          format,
          filename: audio?.customName || audio?.originalName,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
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
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const hasSegments = transcription?.segments && transcription.segments.length > 0;

  return (
    <div className="flex h-full bg-background mr-80">
      {/* Left Sidebar */}
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20">
        {!selectedAudioId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No hay audio seleccionado</h2>
              <p className="text-muted-foreground">
                Selecciona un archivo de audio desde la barra lateral para ver su transcripción.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando transcripción...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <Card className="border-destructive max-w-md">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">Error</h2>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchData} variant="outline">
                  Intentar de nuevo
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-2 md:p-5 bg-gray-50 md:pb-1">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="flex items-center space-x-4">
                  <div>
                    {isEditingTitle ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          onKeyDown={handleTitleKeyPress}
                          className="text-2xl font-bold border-none p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSaveTitle}
                          disabled={savingTitle}
                        >
                          {savingTitle ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEditingTitle}
                          disabled={savingTitle}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 group">
                        <h1 className="text-2xl font-bold">
                          {audio?.customName || audio?.originalName}
                        </h1>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleStartEditingTitle}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Toolbar */}
                {audio?.status === 'completed' && transcription && (
                  <div className="flex items-center space-x-2">
                    {/* Save Button */}
                    <Button
                      onClick={handleSave}
                      disabled={!hasUnsavedChanges || saving}
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Transcription Content */}
            <div className="flex-1 overflow-auto">
              {audio?.status === 'processing' ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Procesando Audio</h2>
                    <p className="text-muted-foreground">
                      Tu audio está siendo transcrito. Esto puede tomar unos minutos.
                    </p>
                  </div>
                </div>
              ) : audio?.status === 'error' ? (
                <div className="flex items-center justify-center h-full">
                  <Card className="border-destructive max-w-md">
                    <CardContent className="p-6 text-center">
                      <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                      <h2 className="text-lg font-semibold mb-2">Error en la Transcripción</h2>
                      <p className="text-sm text-muted-foreground mb-4">
                        Hubo un error procesando tu archivo de audio. Por favor, intenta subirlo de nuevo.
                      </p>
                      <Button onClick={() => window.location.reload()} variant="outline">
                        Actualizar Página
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : transcription ? (
                <div className="min-h-0 flex-1 bg-gray-50">
                  <EditableTranscriptionSegments
                    segments={editedSegments}
                    speakers={speakers}
                    onSegmentClick={handleSegmentClick}
                    onSegmentDoubleClick={handleSegmentDoubleClick}
                    onSegmentsChange={handleSegmentsChange}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay transcripción disponible</p>
                  </div>
                </div>
              )}
            </div>


          </>
        )}
      </div>

      {/* Right Sidebar */}
      <RightSidebar
        audio={audio}
        transcription={transcription}
        onExport={handleExport}
        wordCount={wordCount}
        hasUnsavedChanges={hasUnsavedChanges}
        speakers={speakers}
        onSpeakersChange={setSpeakers}
      />
      
      {/* Fixed Audio Player at bottom */}
      {audio?.status === 'completed' && (
        <div className="fixed bottom-0 left-80 right-80 bg-gray-100 border-t z-30">
          <div className="max-w-4xl mx-auto p-2">
            <AudioPlayer
              audioId={audio.id}
              onRef={setAudioPlayerRef}
            />
          </div>
        </div>
      )}
    </div>
  );
}