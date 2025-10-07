'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Download, Settings, Info, Users, GraduationCap, Loader2, Copy } from 'lucide-react';
import { FaGoogleDrive, FaFilePdf, FaFileWord } from 'react-icons/fa';
import { SiGmail } from 'react-icons/si';
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

  interface AlumneOption {
    id: string
    name: string
    age: number | null
  }

  const [alumnes, setAlumnes] = useState<AlumneOption[]>([])
  const [alumnesLoading, setAlumnesLoading] = useState(false)
  const [alumnesError, setAlumnesError] = useState<string | null>(null)
  const [selectedAlumne, setSelectedAlumne] = useState<string>('none')
  const [assigningAlumne, setAssigningAlumne] = useState(false)

  // Helper function to format time in MM:SS format
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Function to copy entire transcription to clipboard with proper formatting
  const handleCopyTranscription = async () => {
    if (!transcription) return;

    let textToCopy = '';
    
    try {
      // If we have segments, format them with speaker and indices
      if (transcription.segments && transcription.segments.length > 0) {
        const formattedSegments = transcription.segments.map((segment, index) => {
          const segmentNumber = (index + 1).toString().padStart(1, '0');
          
          // Find speaker name if speakerId exists, otherwise use 'persona'
          let speakerName = 'persona';
          if (segment.speakerId && speakers && speakers.length > 0) {
            const speaker = speakers.find(s => s.id === segment.speakerId);
            speakerName = speaker ? speaker.name : 'persona';
          }
          
          return `${segmentNumber}. [${speakerName}]\n${segment.text.trim()}\n`;
        });
        
        textToCopy = formattedSegments.join('\n');
      } 
      // Fallback to editedText if available
      else if (transcription.editedText && transcription.editedText.trim()) {
        textToCopy = transcription.editedText;
      } 
      // Final fallback to originalText
      else if (transcription.originalText) {
        textToCopy = transcription.originalText;
      }

      if (textToCopy) {
        await navigator.clipboard.writeText(textToCopy);
        // You could add a toast notification here if you have a toast system
        console.log('Transcription copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to copy transcription:', error);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('Transcription copied to clipboard (fallback)');
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
      }
    }
  };

  // Function to share transcription via email
  const handleEmailShare = () => {
    if (!transcription) return;

    let textToShare = '';
    
    // Use the same formatting logic as copy function
    if (transcription.segments && transcription.segments.length > 0) {
      const formattedSegments = transcription.segments.map((segment, index) => {
        const segmentNumber = (index + 1).toString().padStart(1, '0');
        
        // Find speaker name if speakerId exists, otherwise use 'persona'
        let speakerName = 'persona';
        if (segment.speakerId && speakers && speakers.length > 0) {
          const speaker = speakers.find(s => s.id === segment.speakerId);
          speakerName = speaker ? speaker.name : 'persona';
        }
        
        return `${segmentNumber}. [${speakerName}]\n${segment.text.trim()}\n`;
      });
      
      textToShare = formattedSegments.join('\n');
    } 
    else if (transcription.editedText && transcription.editedText.trim()) {
      textToShare = transcription.editedText;
    } 
    else if (transcription.originalText) {
      textToShare = transcription.originalText;
    }

    const subject = encodeURIComponent('Transcripció compartida');
    const body = encodeURIComponent(textToShare);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    
    window.open(mailtoUrl, '_blank');
  };

  // Function to share transcription via Google Drive (Google Docs)
  const handleGoogleDriveShare = () => {
    if (!transcription) return;

    let textToShare = '';
    
    // Use the same formatting logic as copy function
    if (transcription.segments && transcription.segments.length > 0) {
      const formattedSegments = transcription.segments.map((segment, index) => {
        const segmentNumber = (index + 1).toString().padStart(1, '0');
        
        // Find speaker name if speakerId exists, otherwise use 'persona'
        let speakerName = 'persona';
        if (segment.speakerId && speakers && speakers.length > 0) {
          const speaker = speakers.find(s => s.id === segment.speakerId);
          speakerName = speaker ? speaker.name : 'persona';
        }
        
        return `${segmentNumber}. [${speakerName}]\n${segment.text.trim()}\n`;
      });
      
      textToShare = formattedSegments.join('\n');
    } 
    else if (transcription.editedText && transcription.editedText.trim()) {
      textToShare = transcription.editedText;
    } 
    else if (transcription.originalText) {
      textToShare = transcription.originalText;
    }

    // Create a Google Docs URL with the transcription content
    const encodedText = encodeURIComponent(textToShare);
    const googleDocsUrl = `https://docs.google.com/document/create?title=Transcripció&body=${encodedText}`;
    
    window.open(googleDocsUrl, '_blank');
  };

  useEffect(() => {
    if (transcription) {
      setSelectedAlumne(transcription.alumneId ?? 'none')
    }
  }, [transcription?.alumneId])

  useEffect(() => {
    const loadAlumnes = async () => {
      try {
        setAlumnesLoading(true)
        const res = await fetch('/api/alumne')
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || 'No s\'han pogut carregar els alumnes')
        }
        const data = await res.json()
        setAlumnes(data.profiles || [])
        setAlumnesError(null)
      } catch (error) {
        setAlumnesError(error instanceof Error ? error.message : 'No s\'han pogut carregar els alumnes')
      } finally {
        setAlumnesLoading(false)
      }
    }

    if (audio && transcription) {
      loadAlumnes();
    }
  }, [audio, transcription])

  const handleAssignAlumne = async (value: string) => {
    setSelectedAlumne(value)
    if (!transcription?.id) return
    setAssigningAlumne(true)
    setAlumnesError(null)

    try {
      const res = await fetch(`/api/transcription/${transcription.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumneId: value === 'none' ? null : value }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'No s\'ha pogut assignar l\'alumne')
      }
    } catch (error) {
      setAlumnesError(error instanceof Error ? error.message : 'No s\'ha pogut assignar l\'alumne')
    } finally {
      setAssigningAlumne(false)
    }
  }

  if (!audio || !transcription) {
    return null; // O un component de càrrega si ho prefereixes
  }

  return (
    <div className="fixed top-[73px] right-0 bottom-0 w-80 bg-background border-l flex flex-col z-40">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Opcions</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Export Section */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Download className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-medium">Exportar</h3>
          </div>
          <div className="space-y-3">
            {/* PDF and DOCX buttons side by side */}
            <div className="flex gap-2">
              <Button 
                onClick={() => onExport('pdf')} 
                className="flex-1 justify-start bg-gray-100 hover:bg-gray-200 border-gray-300"
                variant="outline"
              >
                <FaFilePdf className="h-4 w-4 mr-2 text-red-600" />
                PDF
              </Button>
              <Button 
                onClick={() => onExport('docx')} 
                className="flex-1 justify-start bg-gray-100 hover:bg-gray-200 border-gray-300"
                variant="outline"
              >
                <FaFileWord className="h-4 w-4 mr-2 text-blue-600" />
                 WORD
              </Button>
            </div>
            
            {/* Copy, Email, and Google Drive buttons in the same row */}
            <div className="flex gap-2">
              <Button 
                onClick={handleCopyTranscription} 
                className="flex-1 justify-center bg-gray-100 hover:bg-gray-200 border-gray-300"
                variant="outline"
                disabled={!transcription}
                size="sm"
              >
                Copiar
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                onClick={handleEmailShare} 
                className="flex-1 justify-center bg-gray-100 hover:bg-gray-200 border-gray-300"
                variant="outline"
                disabled={!transcription}
                size="sm"
              >
                Mail
                <SiGmail className="h-4 w-4 text-red-500" />
              </Button>
              <Button 
                onClick={handleGoogleDriveShare} 
                className="flex-1 justify-center bg-gray-100 hover:bg-gray-200 border-gray-300"
                variant="outline"
                disabled={!transcription}
                size="sm"
              >
                Drive
                <FaGoogleDrive className="h-4 w-4 text-blue-500" />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Speakers Section */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-medium">Persones</h3>
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
                No hi ha speakers configurats
              </p>
            )}
          </div>
        </div>
        <Separator />

        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-base font-medium">Alumne</h3>
            </div>
            {assigningAlumne && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Select
            value={selectedAlumne}
            onValueChange={handleAssignAlumne}
            disabled={alumnesLoading || assigningAlumne}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={alumnesLoading ? 'Carregant alumnes...' : 'Selecciona un alumne'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sense assignar</SelectItem>
              {alumnes.map((alumne) => (
                <SelectItem key={alumne.id} value={alumne.id}>
                  {alumne.name}{' '}
                  {alumne.age !== null ? `· ${alumne.age} años` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {alumnesError && (
            <p className="mt-2 text-xs text-destructive">{alumnesError}</p>
          )}
        </div>
        <Separator />

      </div>
      
      {/* Unsaved changes notification */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-1.5 rounded-md shadow-md flex items-center gap-1.5 z-50 max-w-60">
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <div className="text-sm font-medium leading-tight">
            <div>Tens canvis sense guardar,</div>
            <div>guarda els canvis!</div>
          </div>
        </div>
      )}
    </div>
  );
}
