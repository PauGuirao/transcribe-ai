'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileAudio, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UploadProgress } from '@/types';

interface AudioUploadProps {
  onUploadComplete: (audioId: string) => void;
  onUploadError: (error: string) => void;
}

const ACCEPTED_AUDIO_TYPES = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/mp4': ['.m4a'],
  'audio/ogg': ['.ogg'],
  'audio/webm': ['.webm'],
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export function AudioUpload({ onUploadComplete, onUploadError }: AudioUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('audio', file);

    try {
      setUploadProgress({ progress: 0, status: 'uploading' });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      setUploadProgress({ progress: 100, status: 'completed' });
      onUploadComplete(result.audioId);
      
      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(null);
      }, 2000);
    } catch (error) {
      setUploadProgress({ progress: 0, status: 'error', message: 'Upload failed' });
      onUploadError(error instanceof Error ? error.message : 'Upload failed');
      
      setTimeout(() => {
        setUploadProgress(null);
      }, 3000);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFiles([file]);
      uploadFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_AUDIO_TYPES,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  });

  const removeFile = () => {
    setUploadedFiles([]);
    setUploadProgress(null);
  };

  return (
    <div className="space-y-3">
        <CardContent className="p-3">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${uploadProgress?.status === 'uploading' ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-2">
              <div className="p-2 rounded-full bg-muted">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {isDragActive ? 'Drop your audio file here' : 'Upload Audio File'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Drag & drop or click to select
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports MP3, WAV, M4A, OGG, WebM (max 25MB)
                </p>
              </div>
            </div>
          </div>
        </CardContent>

      {/* Upload Progress */}
      {uploadProgress && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {uploadProgress.status === 'uploading' && 'Uploading...'}
                  {uploadProgress.status === 'completed' && 'Upload Complete!'}
                  {uploadProgress.status === 'error' && 'Upload Failed'}
                </span>
                <Badge variant={uploadProgress.status === 'error' ? 'destructive' : 'default'}>
                  {uploadProgress.status}
                </Badge>
              </div>
              {uploadProgress.status !== 'error' && (
                <Progress value={uploadProgress.progress} className="w-full" />
              )}
              {uploadProgress.message && (
                <p className="text-sm text-muted-foreground">{uploadProgress.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Upload Error</p>
                {fileRejections.map(({ file, errors }) => (
                  <div key={file.name} className="text-sm text-muted-foreground">
                    <p className="font-medium">{file.name}</p>
                    {errors.map((error) => (
                      <p key={error.code} className="text-destructive">
                        {error.message}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && !uploadProgress && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Uploaded Files</p>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center space-x-2">
                    <FileAudio className="h-4 w-4" />
                    <span className="text-sm">{file.name}</span>
                    <Badge variant="secondary">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}