'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause } from 'lucide-react';
import type { TranscriptionSegment } from '@/types';
import { cn } from '@/lib/utils';

interface TranscriptionSegmentsProps {
  segments: TranscriptionSegment[];
  onSegmentClick?: (segment: TranscriptionSegment) => void;
  className?: string;
}

export function TranscriptionSegments({ 
  segments, 
  onSegmentClick, 
  className 
}: TranscriptionSegmentsProps) {
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSegmentClick = (segment: TranscriptionSegment) => {
    setSelectedSegmentId(segment.id === selectedSegmentId ? null : segment.id);
    onSegmentClick?.(segment);
  };



  if (!segments || segments.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">No transcription segments available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 p-4", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Transcription Segments</h3>
        <p className="text-sm text-muted-foreground">
          Click on any segment to view details and jump to that timestamp.
        </p>
      </div>
      
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {segments.map((segment) => (
          <Card 
            key={segment.id} 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedSegmentId === segment.id && "ring-2 ring-primary"
            )}
            onClick={() => handleSegmentClick(segment)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  {formatTime(segment.start)} - {formatTime(segment.end)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSegmentClick?.(segment);
                  }}
                  title="Reproducir desde este punto"
                >
                  <Play className="h-3 w-3" />
                </Button>
              </div>
              
              <p className="text-sm leading-relaxed">
                {segment.text.trim()}
              </p>
              

            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}