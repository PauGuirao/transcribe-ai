'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Circle, Highlighter, Save, Download, Trash2 } from 'lucide-react';

interface Annotation {
  id: string;
  type: 'circle' | 'highlight';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  segmentId?: string;
  text?: string;
}

interface ToolsSidePanelProps {
  selectedTool: 'circle' | 'highlight';
  onToolSelect: (tool: 'circle' | 'highlight') => void;
  annotations: Annotation[];
  onClearAnnotations: () => void;
  onSaveAnnotations: () => void;
  onExportAnnotations: () => void;
  onRemoveAnnotation: (id: string) => void;
}

export function ToolsSidePanel({
  selectedTool,
  onToolSelect,
  annotations,
  onClearAnnotations,
  onSaveAnnotations,
  onExportAnnotations,
  onRemoveAnnotation,
}: ToolsSidePanelProps) {
  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col h-full">
      {/* Tools Section */}
      <div className="p-4 pb-2">
        <h3 className="text-lg font-semibold mb-3">Annotation Tools</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={selectedTool === 'circle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToolSelect('circle')}
              className="flex flex-col items-center p-3 h-auto"
            >
              <Circle className="h-5 w-5 mb-1" />
              <span className="text-xs">Circle</span>
            </Button>
            <Button
              variant={selectedTool === 'highlight' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToolSelect('highlight')}
              className="flex flex-col items-center p-3 h-auto"
            >
              <Highlighter className="h-5 w-5 mb-1" />
              <span className="text-xs">Highlight</span>
            </Button>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClearAnnotations}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSaveAnnotations}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExportAnnotations}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Annotations List */}
      <div className="p-4 pt-2 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold mb-3">
          Annotations ({annotations.length})
        </h3>
        <div className="flex-1 overflow-y-auto">
          {annotations.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No annotations yet</p>
              <p className="text-xs mt-1">Start drawing on the transcription</p>
            </div>
          ) : (
            <div className="space-y-2">
              {annotations.map((annotation, index) => (
                <div 
                  key={annotation.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {annotation.type === 'circle' ? (
                        <Circle 
                          className="h-4 w-4" 
                          style={{ color: annotation.color }} 
                        />
                      ) : (
                        <Highlighter 
                          className="h-4 w-4" 
                          style={{ color: annotation.color }} 
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {annotation.type === 'circle' ? 'Circle' : 'Highlight'} #{index + 1}
                        {annotation.text && (
                          <span className="ml-2 text-xs font-normal text-gray-600">
                            "{annotation.text}"
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {annotation.type === 'circle' 
                          ? `Radius: ${Math.round(annotation.radius || 0)}px`
                          : `${Math.round(annotation.width || 0)}×${Math.round(annotation.height || 0)}px`
                        }
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveAnnotation(annotation.id)}
                    className="flex-shrink-0 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}