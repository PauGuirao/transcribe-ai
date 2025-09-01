'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Download, FileText, FileType, Settings, Info, Users, Plus, Edit3, Trash2, Check, X } from 'lucide-react';
import { Audio, Transcription, Speaker } from '@/types';

interface RightSidebarProps {
  audio: Audio | null;
  transcription: Transcription | null;
  onExport: (format: 'pdf' | 'txt') => void;
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
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [editSpeakerName, setEditSpeakerName] = useState('');
  const [newSpeakerName, setNewSpeakerName] = useState('');
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

  const generateSpeakerColor = () => {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const addSpeaker = () => {
    if (!newSpeakerName.trim()) return;
    
    const newSpeaker: Speaker = {
      id: `speaker-${Date.now()}`,
      name: newSpeakerName.trim(),
      color: generateSpeakerColor()
    };
    
    onSpeakersChange([...speakers, newSpeaker]);
    setNewSpeakerName('');
  };

  const startEditingSpeaker = (speaker: Speaker) => {
    setEditingSpeakerId(speaker.id);
    setEditSpeakerName(speaker.name);
  };

  const saveEditSpeaker = () => {
    if (!editSpeakerName.trim() || !editingSpeakerId) return;
    
    const updatedSpeakers = speakers.map(speaker => 
      speaker.id === editingSpeakerId 
        ? { ...speaker, name: editSpeakerName.trim() }
        : speaker
    );
    
    onSpeakersChange(updatedSpeakers);
    setEditingSpeakerId(null);
    setEditSpeakerName('');
  };

  const cancelEditSpeaker = () => {
    setEditingSpeakerId(null);
    setEditSpeakerName('');
  };

  const deleteSpeaker = (speakerId: string) => {
    const updatedSpeakers = speakers.filter(speaker => speaker.id !== speakerId);
    onSpeakersChange(updatedSpeakers);
    
    if (editingSpeakerId === speakerId) {
      setEditingSpeakerId(null);
      setEditSpeakerName('');
    }
  };

  if (!audio || !transcription) {
    return (
      <div className="w-80 bg-background border-l p-6">
        <div className="text-center text-muted-foreground">
          <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecciona un archivo de audio para ver las opciones</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-background border-l flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
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
              <FileText className="h-4 w-4 mr-2" />
              Exportar como PDF
            </Button>
            <Button 
              onClick={() => onExport('txt')} 
              className="w-full justify-start"
              variant="outline"
            >
              <FileType className="h-4 w-4 mr-2" />
              Exportar como TXT
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
          
          {/* Add New Speaker */}
          <div className="space-y-3 mb-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Nombre del speaker"
                value={newSpeakerName}
                onChange={(e) => setNewSpeakerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSpeaker()}
                className="flex-1"
              />
              <Button
                onClick={addSpeaker}
                size="sm"
                disabled={!newSpeakerName.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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
                  {editingSpeakerId === speaker.id ? (
                    <div className="flex space-x-1 flex-1">
                      <Input
                        value={editSpeakerName}
                        onChange={(e) => setEditSpeakerName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveEditSpeaker()}
                        className="h-6 text-xs flex-1"
                        autoFocus
                      />
                      <Button
                        onClick={saveEditSpeaker}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-green-600"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={cancelEditSpeaker}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium flex-1">{speaker.name}</span>
                      <div className="flex space-x-1">
                        <Button
                          onClick={() => startEditingSpeaker(speaker)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-gray-600"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => deleteSpeaker(speaker.id)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
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

        {/* Transcription Stats */}
        {transcription.segments && (
          <div>
            <h3 className="text-base font-medium mb-4">Estadísticas</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Segmentos:</span>
                <span className="font-medium">{transcription.segments.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Creado:</span>
                <span className="font-medium">
                  {new Date(transcription.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Actualizado:</span>
                <span className="font-medium">
                  {new Date(transcription.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}