'use client';

import React, { useState, useEffect } from 'react';
import { AudioUpload } from '@/components/audio-upload/AudioUpload';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileAudio, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Audio } from '@/types';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  selectedAudioId?: string;
  onAudioSelect: (audioId: string) => void;
  onUploadComplete: (audioId: string) => void;
}

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

const getStatusColor = (status: Audio['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function AppSidebar({ selectedAudioId, onAudioSelect, onUploadComplete }: AppSidebarProps) {
  const [audioFiles, setAudioFiles] = useState<Audio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAudioFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/audio');
      if (!response.ok) {
        throw new Error('Failed to fetch audio files');
      }
      const data = await response.json();
      setAudioFiles(data.audioFiles || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audio files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudioFiles();
  }, []);

  const handleUploadComplete = (audioId: string) => {
    onUploadComplete(audioId);
    fetchAudioFiles(); // Refresh the list
  };

  const handleUploadError = (error: string) => {
    setError(error);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-80 h-screen bg-background border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-foreground">TranscribeAI</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Upload and transcribe audio files
        </p>
      </div>

      {/* Upload Section */}
      <div className="p-3">
        <AudioUpload
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
        />
      </div>

      <Separator />

      {/* Audio Files List */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-3 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Audio Files</h2>
            <p className="text-xs text-muted-foreground">
              {audioFiles.length} file{audioFiles.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : error ? (
            <div className="border border-destructive rounded-md p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAudioFiles}
                className="mt-3 w-full"
              >
                Retry
              </Button>
            </div>
          ) : audioFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileAudio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No audio files yet.
                <br />
                Upload your first file to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-1 pt-1">
              {audioFiles.map((audio) => (
                <div
                  key={audio.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-accent/50 p-2 border rounded-md',
                    selectedAudioId === audio.id && 'ring-1 ring-primary bg-accent/50'
                  )}
                  onClick={() => onAudioSelect(audio.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <FileAudio className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate" title={audio.customName || audio.originalName}>
                          {audio.customName || audio.originalName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(audio.uploadDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <Badge
                        variant={audio.status === 'completed' ? 'default' : audio.status === 'processing' ? 'secondary' : 'destructive'}
                        className="text-xs px-1 py-0 h-4"
                      >
                        {audio.status}
                      </Badge>
                      {getStatusIcon(audio.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAudioFiles}
          className="w-full h-8 text-xs"
        >
          Refresh
        </Button>
      </div>
    </div>
  );
}