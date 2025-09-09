'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Edit3, Save, X, Check, Trash2, User, Plus, Merge } from 'lucide-react';
import type { TranscriptionSegment, Speaker } from '@/types';
import { cn } from '@/lib/utils';

interface EditableTranscriptionSegmentsProps {
  segments: TranscriptionSegment[];
  speakers: Speaker[];
  onSegmentClick?: (segment: TranscriptionSegment) => void;
  onSegmentDoubleClick?: (segment: TranscriptionSegment) => void;
  onSegmentsChange?: (segments: TranscriptionSegment[]) => void;
  className?: string;
}

export function EditableTranscriptionSegments({ 
  segments, 
  speakers,
  onSegmentClick, 
  onSegmentDoubleClick,
  onSegmentsChange,
  className 
}: EditableTranscriptionSegmentsProps) {
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);
  const [editedSegments, setEditedSegments] = useState<TranscriptionSegment[]>(segments);
  const [editText, setEditText] = useState('');
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [hoveredSegmentId, setHoveredSegmentId] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditedSegments(segments);
  }, [segments]);

  useEffect(() => {
    if (editingSegmentId !== null && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [editingSegmentId, cursorPosition]);

  // Keyboard event listener for L and N keys when hovering
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (hoveredSegmentId !== null && editingSegmentId === null) {
        if (e.key.toLowerCase() === 'l') {
          e.preventDefault();
          updateSegmentSpeaker(hoveredSegmentId, 'Logopeda');
        } else if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          updateSegmentSpeaker(hoveredSegmentId, 'Alumne');
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [hoveredSegmentId, editingSegmentId]);

  const updateSegmentSpeaker = (segmentId: number, speakerName: string) => {
    // Find the speaker by name to get their ID
    const speaker = speakers.find(s => s.name === speakerName);
    const speakerId = speaker?.id;
    
    const updatedSegments = editedSegments.map(segment => {
      if (segment.id === segmentId) {
        return { ...segment, speakerId: speakerId };
      }
      return segment;
    });
    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);
  };



  const handleSegmentClick = (segment: TranscriptionSegment) => {
    onSegmentClick?.(segment);
  };

  const startEditing = (segment: TranscriptionSegment, clickPosition?: number) => {
    setEditingSegmentId(segment.id);
    setEditText(segment.text.trim());
    setCursorPosition(clickPosition ?? segment.text.trim().length);
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

  const saveEditAndMoveToNext = () => {
    if (editingSegmentId === null) return;

    const updatedSegments = editedSegments.map(segment => 
      segment.id === editingSegmentId 
        ? { ...segment, text: editText }
        : segment
    );
    
    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);
    
    // Find the next segment to edit
    const currentIndex = editedSegments.findIndex(segment => segment.id === editingSegmentId);
    const nextSegment = editedSegments[currentIndex + 1];
    
    if (nextSegment) {
       // Start editing the next segment
       setEditingSegmentId(nextSegment.id);
       setEditText(nextSegment.text.trim());
       setCursorPosition(nextSegment.text.trim().length); // Start at the end of the next segment
       
       // Scroll to center the next segment
       setTimeout(() => {
         const nextSegmentElement = document.querySelector(`[data-segment-id="${nextSegment.id}"]`);
         if (nextSegmentElement) {
           nextSegmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
         }
       }, 100);
     } else {
      // No next segment, just finish editing
      setEditingSegmentId(null);
      setEditText('');
    }
  };

  const saveEditAndMoveToPrevious = () => {
    if (editingSegmentId === null) return;

    const updatedSegments = editedSegments.map(segment => 
      segment.id === editingSegmentId 
        ? { ...segment, text: editText }
        : segment
    );
    
    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);
    
    // Find the previous segment to edit
    const currentIndex = editedSegments.findIndex(segment => segment.id === editingSegmentId);
    const previousSegment = editedSegments[currentIndex - 1];
    
    if (previousSegment) {
       // Start editing the previous segment
       setEditingSegmentId(previousSegment.id);
       setEditText(previousSegment.text.trim());
       setCursorPosition(previousSegment.text.trim().length); // Start at the end of the previous segment
       
       // Scroll to center the previous segment
       setTimeout(() => {
         const previousSegmentElement = document.querySelector(`[data-segment-id="${previousSegment.id}"]`);
         if (previousSegmentElement) {
           previousSegmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
         }
       }, 100);
     } else {
      // No previous segment, just finish editing
      setEditingSegmentId(null);
      setEditText('');
    }
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

  const insertEmptySegment = (afterSegmentId: number) => {
    const segmentIndex = editedSegments.findIndex(seg => seg.id === afterSegmentId);
    if (segmentIndex === -1) return;

    const currentSegment = editedSegments[segmentIndex];
    const nextSegment = editedSegments[segmentIndex + 1];
    
    // Calculate time for the new segment (halfway between current and next, or 5 seconds after current)
    const newStart = currentSegment.end;
    const newEnd = nextSegment ? (currentSegment.end + nextSegment.start) / 2 : currentSegment.end + 5;
    
    const newSegment: TranscriptionSegment = {
      id: Math.max(...editedSegments.map(s => s.id)) + 1,
      seek: Math.floor(newStart * 100),
      start: newStart,
      end: newEnd,
      text: '',
      tokens: [],
      temperature: 0.0,
      avg_logprob: 0.0,
      compression_ratio: 0.0,
      no_speech_prob: 0.0,
      speakerId: currentSegment.speakerId
    };

    const updatedSegments = [
      ...editedSegments.slice(0, segmentIndex + 1),
      newSegment,
      ...editedSegments.slice(segmentIndex + 1)
    ];
    
    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);
    
    // Start editing the new segment immediately
    setEditingSegmentId(newSegment.id);
    setEditText('');
  };

  const combineWithPreviousSegment = (segmentId: number) => {
    const segmentIndex = editedSegments.findIndex(seg => seg.id === segmentId);
    if (segmentIndex <= 0) return; // Can't combine if it's the first segment

    const currentSegment = editedSegments[segmentIndex];
    const previousSegment = editedSegments[segmentIndex - 1];
    
    // Combine the text: previous text + space + current text
    const combinedText = previousSegment.text.trim() + ' ' + currentSegment.text.trim();
    
    // Update the previous segment with combined text and extended end time
    const updatedPreviousSegment = {
      ...previousSegment,
      text: combinedText,
      end: currentSegment.end
    };
    
    // Remove the current segment and update the previous one
    const updatedSegments = [
      ...editedSegments.slice(0, segmentIndex - 1),
      updatedPreviousSegment,
      ...editedSegments.slice(segmentIndex + 1)
    ];
    
    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);
    
    // Cancel editing if we're combining the segment being edited
    if (editingSegmentId === segmentId) {
      setEditingSegmentId(null);
      setEditText('');
    }
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
    <div className={cn("h-full flex flex-col bg-gray-50", className)}>
      <div className="flex-1 space-y-2 p-4 overflow-y-auto">
        {editedSegments.map((segment, index) => (
          <div 
            key={segment.id} 
            data-segment-id={segment.id}
            className={cn(
              "relative group p-3 border rounded-xl bg-white transition-all duration-300 ease-in-out hover:shadow-md hover:border-blue-200 cursor-pointer",
              editingSegmentId === segment.id 
                ? "ring-2 ring-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg border-blue-300" 
                : "border-gray-200 hover:bg-gray-50"
            )}
            onMouseEnter={() => setHoveredSegmentId(segment.id)}
            onMouseLeave={() => setHoveredSegmentId(null)}
            onClick={(e) => {
              // Only trigger selection if not clicking on interactive elements
              const target = e.target as HTMLElement;
              const isInteractiveElement = target.closest('button, select, textarea, input, [role="combobox"], [data-radix-select-trigger]');
              if (!isInteractiveElement) {
                onSegmentClick?.(segment);
              }
            }}
            onDoubleClick={(e) => {
              // Only trigger audio playback if not clicking on interactive elements
              const target = e.target as HTMLElement;
              const isInteractiveElement = target.closest('button, select, textarea, input, [role="combobox"], [data-radix-select-trigger]');
              if (!isInteractiveElement) {
                onSegmentDoubleClick?.(segment);
              }
            }}
          >
            {/* Combine with Previous Segment Button - Only show on hover and not on first segment */}
            {index > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-3 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-6 w-6 p-0 bg-white border border-gray-300 hover:bg-orange-50 hover:border-orange-400 shadow-sm z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  combineWithPreviousSegment(segment.id);
                }}
                title="Combine with previous segment"
              >
                <Merge className="h-3 w-3 text-gray-600" />
              </Button>
            )}
            {/* Add Empty Segment Button - Only show on hover and not on last segment */}
            {index < editedSegments.length - 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-6 w-6 p-0 bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-400 shadow-sm z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  insertEmptySegment(segment.id);
                }}
                title="Add empty segment after this one"
              >
                <Plus className="h-3 w-3 text-gray-600" />
              </Button>
            )}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1">
                  #{(index + 1).toString().padStart(3, '0')}
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
                    ref={textareaRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        // Enter: move to next segment
                        saveEditAndMoveToNext();
                      } else if (e.key === 'Shift') {
                        e.preventDefault();
                        // Shift: move to previous segment
                        saveEditAndMoveToPrevious();
                      }
                    }}
                    className="min-h-[50px] text-sm leading-relaxed p-2 border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg transition-all duration-200 resize-none"
                    placeholder="Editar texto del segmento..."
                  />
                </div>
              ) : (
                <div className="animate-in fade-in-0 duration-200">
                  <p 
                    className="text-sm leading-relaxed cursor-text p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 border-2 border-transparent hover:border-blue-100" 
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const text = segment.text.trim();
                      
                      // Create a temporary span to measure text width
                      const span = document.createElement('span');
                      span.style.font = window.getComputedStyle(e.currentTarget).font;
                      span.style.visibility = 'hidden';
                      span.style.position = 'absolute';
                      document.body.appendChild(span);
                      
                      let clickPosition = text.length;
                      for (let i = 0; i <= text.length; i++) {
                        span.textContent = text.substring(0, i);
                        if (span.offsetWidth > x - 8) { // 8px for padding
                          clickPosition = Math.max(0, i - 1);
                          break;
                        }
                      }
                      
                      document.body.removeChild(span);
                      startEditing(segment, clickPosition);
                    }}
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