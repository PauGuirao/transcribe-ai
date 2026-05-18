'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
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
  onCurrentTimeChange?: (time: number) => void;
}

// Interface for undo history entries
interface UndoHistoryEntry {
  segments: TranscriptionSegment[];
  action: string;
  timestamp: number;
}

export function EditableTranscriptionSegments({
  segments,
  speakers,
  onSegmentClick,
  onSegmentDoubleClick,
  onSegmentsChange,
  className,
  audioPlayerRef,
  currentTime = 0,
  onCurrentTimeChange
}: EditableTranscriptionSegmentsProps) {
  const t = useTranslations("dashboard.transcription.segments");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedSegments, setEditedSegments] = useState<TranscriptionSegment[]>(segments);
  const [editText, setEditText] = useState('');
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Undo functionality state
  const [undoHistory, setUndoHistory] = useState<UndoHistoryEntry[]>([]);
  const maxUndoHistory = 50; // Limit history to prevent memory issues

  // Function to save current state to undo history
  const saveToUndoHistory = (action: string) => {
    const newEntry: UndoHistoryEntry = {
      segments: [...editedSegments],
      action,
      timestamp: Date.now()
    };

    setUndoHistory(prev => {
      const newHistory = [...prev, newEntry];
      // Keep only the last maxUndoHistory entries
      return newHistory.slice(-maxUndoHistory);
    });
  };

  // Function to perform undo
  const performUndo = () => {
    if (undoHistory.length === 0) return;

    const lastEntry = undoHistory[undoHistory.length - 1];
    
    // Remove the last entry from history
    setUndoHistory(prev => prev.slice(0, -1));
    
    // Restore the segments state
    setEditedSegments(lastEntry.segments);
    onSegmentsChange?.(lastEntry.segments);
    
    // Cancel any current editing
    setEditingIndex(null);
    setEditText('');
  };

  // Function to determine which segment is currently playing
  const getCurrentSegmentIndex = (): number | null => {
    // Use a small epsilon for floating point comparison
    const epsilon = 0.001; // 1ms tolerance for floating point precision
    
    // Find the last segment that starts before or at the current time
    let bestMatch = -1;
    for (let i = 0; i < editedSegments.length; i++) {
      const segment = editedSegments[i];
      
      // Use epsilon for floating point comparison
      if (currentTime >= (segment.start - epsilon)) {
        // If current time is within this segment's range, return it
        if (currentTime <= (segment.end + epsilon)) {
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

  // Keyboard event listener for L and N keys when hovering, ESC when editing, and Ctrl+Z for undo
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Z (Cmd+Z on Mac) for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        performUndo();
        return;
      }
      
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
  }, [hoveredIndex, editingIndex, undoHistory]);

  const updateSegmentSpeaker = (index: number, speakerName: string) => {
    // Save current state to undo history before making changes
    saveToUndoHistory(`Update speaker for segment ${index + 1}`);
    
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
    // Set currentTime to the middle of the segment to ensure proper highlighting
    // This avoids boundary issues where segment.start might equal previous segment.end
    const middleTime = segment.start + (segment.end - segment.start) / 2;
    
    console.log(middleTime)
    // Update the parent's currentTime state
    onCurrentTimeChange?.(middleTime);
    
    // If there's an audio player, seek to the middle of the segment
    if (audioPlayerRef?.seekTo) {
      audioPlayerRef.seekTo(middleTime);
    }
    
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

    // Only save to undo history if the text actually changed
    const current = editedSegments[editingIndex];
    if (current && current.text.trim() !== editText.trim()) {
      saveToUndoHistory(`Edit segment ${editingIndex + 1}`);
    }

    const updatedSegments = [...editedSegments];
    if (!current) return;
    updatedSegments[editingIndex] = { ...current, text: editText };

    setEditedSegments(updatedSegments);
    onSegmentsChange?.(updatedSegments);
    setEditingIndex(null);
    setEditText('');
  };

  const saveEditAndMoveToNext = () => {
    if (editingIndex === null) return;

    // Only save to undo history if the text actually changed
    const current = editedSegments[editingIndex];
    if (current && current.text.trim() !== editText.trim()) {
      saveToUndoHistory(`Edit segment ${editingIndex + 1}`);
    }

    const updatedSegments = [...editedSegments];
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

    // Only save to undo history if the text actually changed
    const current = editedSegments[editingIndex];
    if (current && current.text.trim() !== editText.trim()) {
      saveToUndoHistory(`Edit segment ${editingIndex + 1}`);
    }

    const updatedSegments = [...editedSegments];
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
    // Save current state to undo history before deleting
    saveToUndoHistory(`Delete segment ${index + 1}`);
    
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
    // Save current state to undo history before making changes
    saveToUndoHistory(`Change speaker for segment ${index + 1}`);
    
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
    // Save current state to undo history before inserting
    saveToUndoHistory(`Insert empty segment after ${afterIndex + 1}`);
    
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

    // Save current state to undo history before combining
    saveToUndoHistory(`Combine segment ${index + 1} with previous`);

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
          <p className="text-muted-foreground">{t("noSegments")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col bg-gradient-to-b from-gray-50 to-gray-100/50", className)}>
      <div className="h-full overflow-y-auto p-4 pr-64 space-y-1.5">
        {editedSegments.map((segment, index) => {
          const speaker = getSpeakerById(segment.speakerId);
          const isEditing = editingIndex === index;
          const isPlaying = currentSegmentIndex === index;

          return (
            <div
              key={`${segment.id}-${index}`}
              data-segment-id={segment.id}
              data-segment-index={index}
              className={cn(
                "group relative rounded-lg transition-all duration-200 cursor-pointer",
                isEditing
                  ? "bg-white shadow-md ring-1 ring-blue-200"
                  : isPlaying
                  ? "bg-white shadow-sm ring-1 ring-emerald-200"
                  : "bg-white/60 hover:bg-white hover:shadow-sm"
              )}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                const isInteractiveElement = target.closest('button, select, textarea, input, [role="combobox"], [data-radix-select-trigger]');
                if (!isInteractiveElement) {
                  handleSegmentClick(segment);
                }
              }}
              onDoubleClick={(e) => {
                const target = e.target as HTMLElement;
                const isInteractiveElement = target.closest('button, select, textarea, input, [role="combobox"], [data-radix-select-trigger]');
                if (!isInteractiveElement) {
                  onSegmentDoubleClick?.(segment);
                }
              }}
            >
              {/* Left accent bar for playing state */}
              {isPlaying && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-full" />
              )}

              <div className="px-3 py-2">
                {/* Header row */}
                <div className="flex items-center gap-2 mb-1.5">
                  {/* Segment number */}
                  <span className="text-[10px] font-medium text-gray-400 tabular-nums w-4">
                    {index + 1}
                  </span>

                  {/* Speaker pill */}
                  <Select
                    value={segment.speakerId || 'none'}
                    onValueChange={(value) => handleSpeakerChange(index, value)}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-6 px-2 text-[11px] font-medium border-0 bg-gray-100 hover:bg-gray-200 focus:ring-0 w-auto gap-1.5 rounded-full",
                        speaker && "text-gray-700"
                      )}
                    >
                      {speaker ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: speaker.color }}
                          />
                          <span>{speaker.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">{t("noPerson")}</span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-[12px]">
                        {t("noPerson")}
                      </SelectItem>
                      {speakers.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-[12px]">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Action buttons - visible on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {index > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              combineWithPreviousSegment(index);
                            }}
                          >
                            <Merge className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[11px]">
                          {t("combineWithPrevious")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {index < editedSegments.length - 1 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              insertEmptySegment(index);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[11px]">
                          {t("addSegment")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSegment(index);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[11px]">
                        {t("delete")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Text content */}
                {isEditing ? (
                  <Textarea
                    ref={textareaRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => saveEdit()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveEditAndMoveToNext();
                      }
                    }}
                    className="min-h-[40px] text-[13px] leading-relaxed p-2 border border-gray-200 focus:border-blue-300 focus:ring-1 focus:ring-blue-100 rounded-md resize-none bg-gray-50/50"
                    placeholder={t("placeholder")}
                  />
                ) : (
                  <p
                    className="text-[13px] leading-relaxed text-gray-700 pl-6 cursor-text hover:text-gray-900 transition-colors"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const text = segment.text.trim();

                      const span = document.createElement('span');
                      span.style.font = window.getComputedStyle(e.currentTarget).font;
                      span.style.visibility = 'hidden';
                      span.style.position = 'absolute';
                      document.body.appendChild(span);

                      let clickPosition = text.length;
                      for (let i = 0; i <= text.length; i++) {
                        span.textContent = text.substring(0, i);
                        if (span.offsetWidth > x - 24) {
                          clickPosition = Math.max(0, i - 1);
                          break;
                        }
                      }

                      document.body.removeChild(span);
                      startEditing(index, clickPosition);
                    }}
                  >
                    {segment.text.trim() || <span className="text-gray-400 italic">{t("emptySegment")}</span>}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}