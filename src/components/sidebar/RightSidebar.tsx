'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { Download, Settings, Info, Users } from 'lucide-react';
import { Audio, Transcription, Speaker } from '@/types';

interface RightSidebarProps {
  audio: Audio | null;
  transcription: Transcription | null;
  onExport: (format: 'pdf' | 'txt' | 'docx') => void;
  wordCount: number;
  hasUnsavedChanges: boolean;
  speakers: Speaker[];
  onSpeakersChange: (speakers: Speaker[]) => void;
}

export function RightSidebar({ 
  audio, 
  transcription, 
  onExport, 
  wordCount, 
  hasUnsavedChanges,
  speakers,
  onSpeakersChange
}: RightSidebarProps) {

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };



  if (!audio || !transcription) {
    return null;
  }

  return (
    <div className="fixed top-[73px] right-0 bottom-0 w-80 bg-background border-l flex flex-col z-40">
      {/* Header */}
      <div className="p-3 border-b">
        <h2 className="text-lg font-semibold mb-2">Opciones</h2>
        <p className="text-sm text-muted-foreground">
          Exportar y configurar transcripción
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Export Section */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Download className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-medium">Exportar</h3>
          </div>
          <div className="space-y-3">
            <Button 
              onClick={() => onExport('pdf')} 
              className="w-full justify-start"
              variant="outline"
            >
              Exportar como PDF
            </Button>
            <Button 
              onClick={() => onExport('txt')} 
              className="w-full justify-start"
              variant="outline"
            >
              Exportar como TXT
            </Button>
            <Button 
              onClick={() => onExport('docx')} 
              className="w-full justify-start"
              variant="outline"
            >
              Exportar como DOCX
            </Button>
          </div>
        </div>

        <Separator />

        {/* Speakers Section */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-medium">Speakers</h3>
          </div>
          

          
          {/* Speakers List */}
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {speakers.map((speaker) => (
              <div key={speaker.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 flex-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: speaker.color }}
                  />
                  <span className="text-sm font-medium flex-1">{speaker.name}</span>
                </div>
              </div>
            ))}
            {speakers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay speakers configurados
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* File Info */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Info className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-medium">Información del archivo</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nombre:</span>
              <span className="font-medium truncate ml-2">{audio.originalName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estado:</span>
              <Badge variant="secondary">{audio.status}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Palabras:</span>
              <span className="font-medium">{wordCount.toLocaleString()}</span>
            </div>
            {hasUnsavedChanges && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant="destructive">Cambios sin guardar</Badge>
              </div>
            )}
          </div>
        </div>

        <Separator />
      </div>
    </div>
  );
}