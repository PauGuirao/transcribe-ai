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

import { Download, Settings, Info, Users, GraduationCap, Loader2 } from 'lucide-react';
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
          throw new Error(data?.error || 'No se pudieron cargar los alumnos')
        }
        const data = await res.json()
        setAlumnes(data.profiles || [])
        setAlumnesError(null)
      } catch (error) {
        setAlumnesError(error instanceof Error ? error.message : 'No se pudieron cargar los alumnos')
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
        throw new Error(data?.error || 'No se pudo asignar el alumno')
      }
    } catch (error) {
      setAlumnesError(error instanceof Error ? error.message : 'No se pudo asignar el alumno')
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
        <h2 className="text-lg font-semibold mb-2">Opciones</h2>
        <p className="text-sm text-muted-foreground">
          Exportar y configurar transcripción
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
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
              Exportar com PDF
            </Button>
            <Button 
              onClick={() => onExport('docx')} 
              className="w-full justify-start"
              variant="outline"
            >
              Exportar com DOCX
            </Button>
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
                No hay speakers configurados
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
              <SelectValue placeholder={alumnesLoading ? 'Cargando alumnos...' : 'Selecciona un alumno'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sense asignar</SelectItem>
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
    </div>
  );
}
