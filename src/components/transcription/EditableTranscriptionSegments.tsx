'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Edit3, Save, X, Check, Trash2, User } from 'lucide-react';
import type { TranscriptionSegment, Speaker } from '@/types';
import { cn } from '@/lib/utils';

interface EditableTranscriptionSegmentsProps {
  segments: TranscriptionSegment[];
  speakers: Speaker[];
  onSegmentClick?: (segment: TranscriptionSegment) => void;
  onSegmentsChange?: (segments: TranscriptionSegment[]) => void;
  className?: string;
}

export function EditableTranscriptionSegments({ 
  segments, 
  speakers,
  onSegmentClick, 
  onSegmentsChange,
  className 
}: EditableTranscriptionSegmentsProps) {
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);
  const [editedSegments, setEditedSegments] = useState<TranscriptionSegment[]>(segments);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    setEditedSegments(segments);
  }, [segments]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSegmentClick = (segment: TranscriptionSegment) => {
    onSegmentClick?.(segment);
  };

  const startEditing = (segment: TranscriptionSegment) => {
    setEditingSegmentId(segment.id);
    setEditText(segment.text.trim());
  };

  const cancelEditing = () => {
    setEditingSegmentId(null);
    setEditText('');
  };

  const saveEdit = () => {
    if (editingSegmentId === null) return;

    const updatedSegments = editedSegments.map(segment => 
      segment.id === editingSegmentId 
        ? { ...segment, text: editText }
        : segment
    );
    
    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);
    setEditingSegmentId(null);
    setEditText('');
  };

  const deleteSegment = (segmentId: number) => {
    const updatedSegments = editedSegments.filter(segment => segment.id !== segmentId);
    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);
    // Cancel editing if we're deleting the segment being edited
    if (editingSegmentId === segmentId) {
      setEditingSegmentId(null);
      setEditText('');
    }
  };

  const handleSpeakerChange = (segmentId: number, speakerId: string) => {
    const updatedSegments = editedSegments.map(segment => 
      segment.id === segmentId 
        ? { ...segment, speakerId: speakerId === 'none' ? undefined : speakerId }
        : segment
    );
    
    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);
  };

  const getSpeakerById = (speakerId?: string) => {
    if (!speakerId) return null;
    return speakers.find(speaker => speaker.id === speakerId) || null;
  };



  if (!editedSegments || editedSegments.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">No transcription segments available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 p-4 bg-gray-50", className)}>
      <div className="space-y-2  p-2 overflow-y-auto max-h-[calc(100vh-240px)]">
        {editedSegments.map((segment, index) => (
          <div 
            key={segment.id} 
            className={cn(
              "p-3 border rounded-xl bg-white transition-all duration-300 ease-in-out hover:shadow-md hover:border-blue-200 cursor-pointer",
              editingSegmentId === segment.id 
                ? "ring-2 ring-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg border-blue-300" 
                : "border-gray-200 hover:bg-gray-50"
            )}
            onClick={(e) => {
              // Only trigger play if not clicking on interactive elements
              const target = e.target as HTMLElement;
              const isInteractiveElement = target.closest('button, select, textarea, input, [role="combobox"], [data-radix-select-trigger]');
              if (!isInteractiveElement) {
                handleSegmentClick(segment);
              }
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1">
                  #{(index + 1).toString().padStart(3, '0')}
                </Badge>
                <Badge variant="outline" className="text-xs font-medium border-blue-200 text-blue-700">
                  {formatTime(segment.start)} - {formatTime(segment.end)}
                </Badge>
                {/* Speaker Selection */}
                <Select
                  value={segment.speakerId || 'none'}
                  onValueChange={(value) => handleSpeakerChange(segment.id, value)}
                >
                  <SelectTrigger className="h-7 text-xs w-auto min-w-[120px]">
                    <SelectValue 
                      placeholder="Sin speaker"
                    >
                      {segment.speakerId ? (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: getSpeakerById(segment.speakerId)?.color }}
                          />
                          {getSpeakerById(segment.speakerId)?.name}
                        </div>
                      ) : (
                        "Sin speaker"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin speaker</SelectItem>
                    {speakers.map((speaker) => (
                      <SelectItem key={speaker.id} value={speaker.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: speaker.color }}
                          />
                          {speaker.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {editingSegmentId === segment.id && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={saveEdit}
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                       variant="ghost"
                       size="sm"
                       onClick={cancelEditing}
                       className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                     >
                       <X className="h-3 w-3" />
                     </Button>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSegment(segment.id);
                }}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                title="Eliminar segmento"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="relative">
              {editingSegmentId === segment.id ? (
                <div className="animate-in fade-in-0 duration-200">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[50px] text-sm leading-relaxed border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg transition-all duration-200 resize-none"
                    placeholder="Editar texto del segmento..."
                    autoFocus
                  />
                </div>
              ) : (
                <div className="animate-in fade-in-0 duration-200">
                  <p 
                    className="text-sm leading-relaxed cursor-text p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 border-2 border-transparent hover:border-blue-100" 
                    onClick={() => startEditing(segment)}
                  >
                    {segment.text.trim()}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}