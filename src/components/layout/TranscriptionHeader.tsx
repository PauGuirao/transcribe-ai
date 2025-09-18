// components/layout/TranscriptionHeader.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Edit, Check, X } from 'lucide-react';
import { Audio } from '@/types';

interface TranscriptionHeaderProps {
  audio: Audio | null;
  onSaveTitle: (newTitle: string) => Promise<void>;
  onSaveTranscription: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
}

export function TranscriptionHeader({ audio, onSaveTitle, onSaveTranscription, hasUnsavedChanges, isSaving }: TranscriptionHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  useEffect(() => {
    if (audio) {
      setEditedTitle(audio.customName || audio.originalName || '');
    }
  }, [audio]);

  const handleSaveTitle = async () => {
    if (!audio || !editedTitle.trim() || editedTitle.trim() === (audio.customName || audio.originalName)) {
      setIsEditingTitle(false);
      return;
    }
    setIsSavingTitle(true);
    try {
      await onSaveTitle(editedTitle);
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Failed to save title", error);
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleStartEditingTitle = () => {
    setIsEditingTitle(true);
  };

  const handleCancelEditingTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle(audio?.customName || audio?.originalName || '');
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveTitle();
    if (e.key === 'Escape') handleCancelEditingTitle();
  };
  
  return (
    <div className="p-2 md:p-5 bg-gray-50 md:pb-1">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        
        {/* 👇 THIS ENTIRE BLOCK WAS MISSING */}
        <div className="flex items-center space-x-4">
          {isEditingTitle ? (
            <div className="flex items-center space-x-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleTitleKeyPress}
                className="text-2xl font-bold border-none p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={handleSaveTitle} disabled={isSavingTitle}>
                {isSavingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={handleCancelEditingTitle} disabled={isSavingTitle}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            // We replace 'space-x-80' with 'w-full' and 'justify-between'
<div className="flex w-full items-center justify-between group">
  <h1 className="text-xl font-bold">
    {audio?.customName || audio?.originalName || 'Untitled'}
  </h1>
  <Button size="icon" variant="ghost" onClick={handleStartEditingTitle} className="opacity-0 group-hover:opacity-100 transition-opacity">
    <Edit className="h-4 w-4" />
  </Button>
</div>
          )}
        {/* Save button */}
        <Button onClick={onSaveTranscription} disabled={!hasUnsavedChanges || isSaving} size="sm">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="ml-2">{isSaving ? 'Guardando...' : 'Guardar'}</span>
        </Button>
        </div>
        {/* END OF MISSING BLOCK */}

      </div>
    </div>
  );
}