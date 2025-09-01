'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  Download, 
  FileText, 
  Clock, 
  Edit3, 
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import type { Audio, Transcription, TranscriptionSegment } from '@/types';
import { cn } from '@/lib/utils';
import { AudioPlayer } from './AudioPlayer';
import { TranscriptionSegments } from './TranscriptionSegments';
import { EditableTranscriptionSegments } from './EditableTranscriptionSegments';

interface TranscriptionEditorProps {
  selectedAudioId?: string;
}

export function TranscriptionEditor({ selectedAudioId }: TranscriptionEditorProps) {
  const [audio, setAudio] = useState<Audio | null>(null);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [editedText, setEditedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [viewMode, setViewMode] = useState<'segments' | 'editable-segments' | 'text'>('segments');
  const [editedSegments, setEditedSegments] = useState<TranscriptionSegment[]>([]);

  // Fetch audio and transcription data
  const fetchData = useCallback(async () => {
    if (!selectedAudioId) {
      setAudio(null);
      setTranscription(null);
      setEditedText('');
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
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedAudioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update word count when text changes
  useEffect(() => {
    const words = editedText.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [editedText]);

  // Handle text changes
  const handleTextChange = (value: string) => {
    setEditedText(value);
    setHasUnsavedChanges(value !== (transcription?.editedText || ''));
  };

  // Handle segment click (for future audio seeking functionality)
  const handleSegmentClick = (segment: TranscriptionSegment) => {
    console.log('Segment clicked:', segment);
    // TODO: Implement audio seeking to segment.start time
  };

  // Handle segment changes
  const handleSegmentsChange = (updatedSegments: TranscriptionSegment[]) => {
    setEditedSegments(updatedSegments);
    setHasUnsavedChanges(true);
  };

  // Determine if we should show segments view
  const hasSegments = transcription?.segments && transcription.segments.length > 0;
  const shouldShowSegments = hasSegments && viewMode === 'segments';
  const shouldShowEditableSegments = hasSegments && viewMode === 'editable-segments';

  // Save transcription
  const handleSave = async () => {
    if (!transcription || !hasUnsavedChanges) return;

    setSaving(true);
    try {
      const requestBody: any = { editedText };
      
      // If we have edited segments, include them in the save request
      if (shouldShowEditableSegments && editedSegments.length > 0) {
        requestBody.editedSegments = editedSegments;
      }

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
      // Update the transcription object
      setTranscription(prev => prev ? { ...prev, editedText, updatedAt: new Date() } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Export functions
  const handleExport = async (format: 'pdf' | 'txt') => {
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
          filename: audio?.originalName?.replace(/\.[^/.]+$/, '') || 'transcription',
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${audio?.originalName?.replace(/\.[^/.]+$/, '') || 'transcription'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };



  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const getStatusIcon = (status: Audio['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!selectedAudioId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Audio Selected</h2>
          <p className="text-muted-foreground">
            Select an audio file from the sidebar to view its transcription.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading transcription...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="border-destructive max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error</h2>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold">{audio?.originalName}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  {audio && getStatusIcon(audio.status)}
                  <Badge variant="secondary">
                    {audio?.status}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  Uploaded {audio && formatDate(audio.uploadDate)}
                </span>
                {transcription && (
                  <span className="text-sm text-muted-foreground">
                    Last edited {formatDate(transcription.updatedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Audio Player */}
      {audio?.status === 'completed' && (
        <div className="border-b p-4">
          <AudioPlayer
            audioId={audio.id}
            className="max-w-md mx-auto"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {audio?.status === 'processing' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Processing Audio</h2>
              <p className="text-muted-foreground">
                Your audio is being transcribed. This may take a few minutes.
              </p>
            </div>
          </div>
        ) : audio?.status === 'error' ? (
          <div className="flex items-center justify-center h-full">
            <Card className="border-destructive max-w-md">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">Transcription Failed</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  There was an error processing your audio file. Please try uploading again.
                </p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Refresh Page
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : transcription ? (
          <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="border-b p-4">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {hasSegments ? (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={viewMode === 'segments' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode('segments')}
                        >
                          View
                        </Button>
                        <Button
                          variant={viewMode === 'editable-segments' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode('editable-segments')}
                        >
                          Edit Segments
                        </Button>
                        <Button
                          variant={viewMode === 'text' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode('text')}
                        >
                          Text Editor
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Edit3 className="h-4 w-4" />
                        <span className="text-sm font-medium">Edit Transcription</span>
                      </>
                    )}
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-sm text-muted-foreground">
                    {hasSegments && shouldShowSegments ? `${transcription.segments?.length} segments` : `${wordCount} words`}
                  </span>
                  {hasUnsavedChanges && (
                    <Badge variant="outline" className="text-xs">
                      Unsaved changes
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
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
                    <span className="hidden sm:inline">Save</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleExport('txt')}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">TXT</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleExport('pdf')}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
              {shouldShowSegments ? (
                <TranscriptionSegments
                  segments={transcription.segments!}
                  onSegmentClick={handleSegmentClick}
                  className="h-full"
                />
              ) : shouldShowEditableSegments ? (
                <EditableTranscriptionSegments
                  segments={editedSegments}
                  onSegmentClick={handleSegmentClick}
                  onSegmentsChange={handleSegmentsChange}
                  className="h-full"
                  speakers={transcription.speakers || []}
                />
              ) : (
                <div className="p-4 md:p-6 h-full">
                  <Textarea
                    value={editedText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Your transcription will appear here..."
                    className="min-h-full resize-none text-sm md:text-base leading-relaxed"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Transcription Available</h2>
              <p className="text-muted-foreground">
                This audio file hasn't been transcribed yet.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}