'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Edit3, Save, Trash2, User, Plus, Merge } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { TranscriptionSegment, Speaker, AudioPlayerRef } from '@/types';
import { cn } from '@/lib/utils';

interface EditableTranscriptionSegmentsProps {
  segments: TranscriptionSegment[];
  speakers: Speaker[];
  onSegmentClick?: (segment: TranscriptionSegment) => void;
  onSegmentDoubleClick?: (segment: TranscriptionSegment) => void;
  onSegmentsChange?: (segments: TranscriptionSegment[]) => void;
  className?: string;
  audioPlayerRef?: AudioPlayerRef | null;
  currentTime?: number;
}

export function EditableTranscriptionSegments({ 
  segments, 
  speakers,
  onSegmentClick, 
  onSegmentDoubleClick,
  onSegmentsChange,
  className,
  audioPlayerRef,
  currentTime = 0
}: EditableTranscriptionSegmentsProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedSegments, setEditedSegments] = useState<TranscriptionSegment[]>(segments);
  const [editText, setEditText] = useState('');
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Function to determine which segment is currently playing
  const getCurrentSegmentIndex = (): number | null => {
    // Find the last segment that starts before or at the current time
    let bestMatch = -1;
    for (let i = 0; i < editedSegments.length; i++) {
      const segment = editedSegments[i];
      if (currentTime >= segment.start) {
        // If current time is within this segment's range, return it
        if (currentTime <= segment.end) {
          return i;
        }
        // Otherwise, keep track of the latest segment that has started
        bestMatch = i;
      } else {
        // We've passed the current time, stop searching
        break;
      }
    }
    
    // If no exact match found but we have a segment that started before current time,
    // check if we're close to its end (within 0.1 seconds tolerance)
    if (bestMatch >= 0) {
      const segment = editedSegments[bestMatch];
      if (currentTime <= segment.end + 0.1) {
        return bestMatch;
      }
    }
    
    return null;
  };

  const currentSegmentIndex = getCurrentSegmentIndex();

  useEffect(() => {
    setEditedSegments(segments);
  }, [segments]);

  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [editingIndex, cursorPosition]);

  // Auto-scroll to current segment
  useEffect(() => {
    if (currentSegmentIndex !== null) {
      const segmentElement = document.querySelector(`[data-segment-index="${currentSegmentIndex}"]`);
      if (segmentElement) {
        segmentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [currentSegmentIndex]);

  // Keyboard event listener for L and N keys when hovering, and ESC when editing
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // ESC key to cancel editing
      if (e.key === 'Escape' && editingIndex !== null) {
        e.preventDefault();
        cancelEditing();
        return;
      }
      
      // L and N keys for speaker assignment when hovering
      if (hoveredIndex !== null && editingIndex === null) {
        if (e.key.toLowerCase() === 'l') {
          e.preventDefault();
          updateSegmentSpeaker(hoveredIndex, 'Logopeda');
        } else if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          updateSegmentSpeaker(hoveredIndex, 'Alumne');
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [hoveredIndex, editingIndex]);

  const updateSegmentSpeaker = (index: number, speakerName: string) => {
    // Find the speaker by name to get their ID
    const speaker = speakers.find(s => s.name === speakerName);
    const speakerId = speaker?.id;

    const updatedSegments = [...editedSegments];
    const current = updatedSegments[index];
    if (!current) return;
    updatedSegments[index] = { ...current, speakerId: speakerId };

    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);
  };

  const handleSegmentClick = (segment: TranscriptionSegment) => {
    onSegmentClick?.(segment);
  };

  const startEditing = (index: number, clickPosition?: number) => {
    // Save current edit before starting a new one
    if (editingIndex !== null && editingIndex !== index) {
      saveEdit();
    }

    setEditingIndex(index);
    const seg = editedSegments[index];
    const text = seg?.text?.trim() ?? '';
    setEditText(text);
    setCursorPosition(clickPosition ?? text.length);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const saveEdit = () => {
    if (editingIndex === null) return;

    const updatedSegments = [...editedSegments];
    const current = updatedSegments[editingIndex];
    if (!current) return;
    updatedSegments[editingIndex] = { ...current, text: editText };

    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);
    setEditingIndex(null);
    setEditText('');
  };

  const saveEditAndMoveToNext = () => {
    if (editingIndex === null) return;

    const updatedSegments = [...editedSegments];
    const current = updatedSegments[editingIndex];
    if (!current) return;
    updatedSegments[editingIndex] = { ...current, text: editText };

    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);

    const nextIndex = editingIndex + 1;
    const nextSegment = editedSegments[nextIndex];

    if (nextSegment) {
      setEditingIndex(nextIndex);
      const nextText = nextSegment.text.trim();
      setEditText(nextText);
      setCursorPosition(nextText.length);

      setTimeout(() => {
        const nextSegmentElement = document.querySelector(`[data-segment-index="${nextIndex}"]`);
        if (nextSegmentElement) {
          nextSegmentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } else {
      setEditingIndex(null);
      setEditText('');
    }
  };

  const saveEditAndMoveToPrevious = () => {
    if (editingIndex === null) return;

    const updatedSegments = [...editedSegments];
    const current = updatedSegments[editingIndex];
    if (!current) return;
    updatedSegments[editingIndex] = { ...current, text: editText };

    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);

    const previousIndex = editingIndex - 1;
    const previousSegment = editedSegments[previousIndex];

    if (previousSegment) {
      setEditingIndex(previousIndex);
      const prevText = previousSegment.text.trim();
      setEditText(prevText);
      setCursorPosition(prevText.length);

      setTimeout(() => {
        const previousSegmentElement = document.querySelector(`[data-segment-index="${previousIndex}"]`);
        if (previousSegmentElement) {
          previousSegmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      setEditingIndex(null);
      setEditText('');
    }
  };

  const deleteSegment = (index: number) => {
    const updatedSegments = [...editedSegments];
    updatedSegments.splice(index, 1);
    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);
    // Cancel editing if we're deleting the segment being edited
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditText('');
    }
  };

  const handleSpeakerChange = (index: number, speakerId: string) => {
    const updatedSegments = [...editedSegments];
    const current = updatedSegments[index];
    if (!current) return;
    updatedSegments[index] = { ...current, speakerId: speakerId === 'none' ? undefined : speakerId };

    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);
  };

  const getSpeakerById = (speakerId?: string) => {
    if (!speakerId) return null;
    return speakers.find(speaker => speaker.id === speakerId) || null;
  };

  const insertEmptySegment = (afterIndex: number) => {
    const currentSegment = editedSegments[afterIndex];
    const nextSegment = editedSegments[afterIndex + 1];
    if (!currentSegment) return;

    // Calculate time for the new segment (halfway between current and next, or 5 seconds after current)
    const newStart = currentSegment.end;
    const newEnd = nextSegment ? (currentSegment.end + nextSegment.start) / 2 : currentSegment.end + 5;

    const newSegment: TranscriptionSegment = {
      id: Math.max(...editedSegments.map(s => s.id)) + 1,
      seek: Math.floor(newStart * 100),
      start: newStart,
      end: newEnd,
      text: '',
      speakerId: currentSegment.speakerId
    };

    const updatedSegments = [
      ...editedSegments.slice(0, afterIndex + 1),
      newSegment,
      ...editedSegments.slice(afterIndex + 1)
    ];

    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);
    
    // Start editing the new segment immediately
    setEditingIndex(afterIndex + 1);
    setEditText('');
  };

  const combineWithPreviousSegment = (index: number) => {
    if (index <= 0) return; // Can't combine if it's the first segment

    const currentSegment = editedSegments[index];
    const previousSegment = editedSegments[index - 1];
    if (!currentSegment || !previousSegment) return;

    // Combine the text: previous text + space + current text
    const combinedText = previousSegment.text.trim() + ' ' + currentSegment.text.trim();

    // Update the previous segment with combined text and extended end time
    const updatedPreviousSegment = {
      ...previousSegment,
      text: combinedText,
      end: currentSegment.end
    };

    const updatedSegments = [
      ...editedSegments.slice(0, index - 1),
      updatedPreviousSegment,
      ...editedSegments.slice(index + 1)
    ];

    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);

    // Adjust editing index if needed
    if (editingIndex !== null) {
      if (editingIndex === index) {
        // moved into previous
        setEditingIndex(index - 1);
        setEditText(updatedPreviousSegment.text.trim());
        setCursorPosition(updatedPreviousSegment.text.trim().length);
      } else if (editingIndex > index) {
        setEditingIndex(editingIndex - 1);
      }
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
      <div className="h-full overflow-y-auto space-y-2 p-4 mr-80">
        {editedSegments.map((segment, index) => (
          <div 
            key={`${segment.id}-${index}`}
            data-segment-id={segment.id}
            data-segment-index={index}
            className={cn(
              "relative group p-3 border rounded-xl bg-white transition-all duration-300 ease-in-out hover:shadow-md hover:border-blue-200 cursor-pointer",
              editingIndex === index 
                ? "ring-2 ring-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg border-blue-300" 
                : currentSegmentIndex === index
                ? "ring-2 ring-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg border-green-300"
                : "border-gray-200 hover:bg-gray-50"
            )}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
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
            {/* Combined Action Buttons - Show at bottom on hover */}
            {(index > 0 || index < editedSegments.length - 1) && (
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 z-10">
                {/* Combine with Previous Segment Button */}
                {index > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 bg-white border border-gray-300 hover:bg-orange-50 hover:border-orange-400 shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          combineWithPreviousSegment(index);
                        }}
                      >
                        <Merge className="h-4 w-4 text-gray-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Combina amb el segment anterior</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {/* Add Empty Segment Button */}
                {index < editedSegments.length - 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-400 shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          insertEmptySegment(index);
                        }}
                      >
                        <Plus className="h-4 w-4 text-gray-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Afegeix un segment buit després d'aquest</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1">
                  {(index + 1).toString().padStart(1, '0')}
                </Badge>

                {/* Speaker Selection */}
                <Select
                  value={segment.speakerId || 'none'}
                  onValueChange={(value) => handleSpeakerChange(index, value)}
                >
                  <SelectTrigger className="h-7 text-xs w-auto min-w-[120px]">
                    <SelectValue 
                      placeholder="Sense persona"
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
                        "Sense persona"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sense persona</SelectItem>
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
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSegment(index);
                }}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                title="Eliminar segmento"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="relative">
              {editingIndex === index ? (
                <div className="animate-in fade-in-0 duration-200">
                  <Textarea
                    ref={textareaRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => {
                      // Save changes when focus is lost
                      saveEdit();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        // Enter: move to next segment
                        saveEditAndMoveToNext();
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
                      startEditing(index, clickPosition);
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