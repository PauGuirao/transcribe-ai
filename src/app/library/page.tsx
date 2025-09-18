'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { FileText, Download, Trash2, Edit, ChevronDown, PenTool } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { AudioUploadResult } from '@/components/audio-upload/AudioUpload';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AudioFile {
  id: string;
  filename: string;
  originalName: string;
  customName?: string;
  fileId: string;
  uploadDate: string;
  status: 'completed' | 'processing' | 'failed' | 'pending';
  transcription?: {
    id: string;
    audioId: string;
    originalText: string;
    editedText: string;
    segments: any[];
    createdAt: string;
    updatedAt: string;
  } | null;
}

const STATUS_MAP = {
  completed: { label: "Transcrit", classes: "bg-green-100 text-green-800" },
  processing: { label: "Processant", classes: "bg-yellow-100 text-yellow-800" },
  failed:    { label: "Fallit",     classes: "bg-red-100 text-red-800" },
  uploaded:  { label: "Pujat",      classes: "bg-blue-100 text-gray-800" }, // keep gray like your default
} as const;

export default function LibraryPage() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<AudioFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [updating, setUpdating] = useState(false);
  const [filterType, setFilterType] = useState<'default' | 'day'>('day');
  const router = useRouter();

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/audio');
      
      if (!response.ok) {
        throw new Error('Failed to fetch audio files');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.audioFiles || []);
      } else {
        throw new Error(data.error || 'Failed to fetch files');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDownload = async (fileId: string, format: 'pdf' | 'docx' | 'txt') => {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionId: fileId,
          format: format,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Get the filename from the response headers or use a default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `transcription.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      // You could add a toast notification here
    }
  };

  const handleDownloadPDF = (fileId: string) => {
    handleDownload(fileId, 'pdf');
  };

  const handleDownloadDOCX = (fileId: string) => {
    handleDownload(fileId, 'docx');
  };

  const handleDelete = async (fileId: string) => {
    try {
      // TODO: Implement actual delete API call
      console.log('Delete file:', fileId);
      // For now, just remove from local state
      setFiles(files.filter(file => file.id !== fileId));
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  const handleEdit = (file: AudioFile) => {
    setEditingFile(file);
    setNewFileName(file.customName || file.originalName);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingFile || !newFileName.trim()) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/audio/${editingFile.id}/title`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customName: newFileName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to update filename');
      }

      const result = await response.json();
      if (result.success) {
        // Update the file in the local state
        setFiles(files.map(file => 
          file.id === editingFile.id 
            ? { ...file, customName: newFileName.trim() }
            : file
        ));
        setIsEditModalOpen(false);
        setEditingFile(null);
        setNewFileName('');
      } else {
        throw new Error(result.error || 'Failed to update filename');
      }
    } catch (err) {
      console.error('Failed to update filename:', err);
      alert('Failed to update filename. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setEditingFile(null);
    setNewFileName('');
  };

  const handleDoubleClick = (fileId: string) => {
    // Navigate to transcribe page
    router.push(`/transcribe?audioId=${fileId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'processing':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateKey = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const groupFilesByDay = (files: AudioFile[]) => {
    const grouped = files.reduce((acc, file) => {
      const dateKey = formatDateKey(file.uploadDate);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(file);
      return acc;
    }, {} as Record<string, AudioFile[]>);
    
    // Sort groups by date (newest first)
    const sortedEntries = Object.entries(grouped).sort(([a], [b]) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });
    
    return sortedEntries;
  };

  const getDisplayFiles = () => {
    if (filterType === 'day') {
      return groupFilesByDay(files);
    }
    return files;
  };

 
  const renderFileCard = (file: AudioFile) => {
  const getStatusBadge = () => {
    const rawStatus = String(file.status ?? "").toLowerCase() as keyof typeof STATUS_MAP;
    const meta = STATUS_MAP[rawStatus] ?? { label: file.status ?? "—", classes: "bg-gray-100 text-gray-800" };
    return (
      <div
        className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${meta.classes}`}
        title={String(file.status ?? "")}
      >
        {meta.label}
      </div>
    );
  };

  return (
    <div 
      key={file.id} 
      className="bg-white border border-gray-200 rounded-md overflow-hidden flex flex-col justify-between transition-all hover:shadow-lg hover:border-gray-300 h-40"
      onDoubleClick={() => handleDoubleClick(file.id)}
    >
      {/* --- SECCIÓN SUPERIOR: Título y Estado --- */}
      <div className="p-4 flex flex-col justify-start flex-grow">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {file.customName || file.originalName}
              </p>
              {file.customName && (
                <p className="text-xs text-gray-500 truncate">
                  {file.originalName}
                </p>
              )}
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      {/* --- SECCIÓN INFERIOR: Barra de Acciones a Ancho Completo --- */}
      <div className="flex w-full bg-gray-50 border-t border-gray-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex-1 text-xs h-12 rounded-none gap-2 text-gray-600 hover:bg-blue-100 hover:text-blue-700">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDownloadPDF(file.transcription!.id)}>
              Descargar PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownloadDOCX(file.transcription!.id)}>
              Descargar Word
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 👇 BOTÓN "ANOTAR" AÑADIDO DE NUEVO */}
        {file.status === 'completed' && (
          <Button
            variant="ghost"
            className="flex-1 text-xs h-12 rounded-none gap-2 text-primary hover:bg-primary/10"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/annotate?audioId=${file.id}`);
            }}
            title="Abrir en modo anotación"
          >
            <PenTool className="h-4 w-4" />
            <span>Anotar</span>
          </Button>
        )}
        
        <Button 
          variant="ghost" 
          className="flex-1 text-xs h-12 rounded-none gap-2 text-gray-600 hover:bg-gray-200"
          onClick={(e) => { e.stopPropagation(); handleEdit(file); }}
        >
          <Edit className="h-4 w-4" />
          <span>Editar</span>
        </Button>
        
        <Button 
          variant="ghost" 
          className="flex-1 text-xs h-12 rounded-none gap-2 text-red-600 hover:bg-red-100 hover:text-red-700"
          onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

  const handleAudioSelect = (audioId: string) => {
    // Handle audio selection if needed
  };

  const handleUploadComplete = (_result: AudioUploadResult) => {
    fetchFiles(); // Refresh the files list
  };

  if (loading) {
    return (
      <AppLayout onAudioSelect={handleAudioSelect} onUploadComplete={handleUploadComplete}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your files...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout onAudioSelect={handleAudioSelect} onUploadComplete={handleUploadComplete}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <FileText className="h-12 w-12 mx-auto mb-2" />
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchFiles} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout onAudioSelect={handleAudioSelect} onUploadComplete={handleUploadComplete}>
      <div className="space-y-6 p-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Biblioteca</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Vista:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  {filterType === 'default' ? 'Default' : 'By Day'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setFilterType('default')}
                  className={filterType === 'default' ? 'bg-gray-100' : ''}
                >
                  Default
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilterType('day')}
                  className={filterType === 'day' ? 'bg-gray-100' : ''}
                >
                  By Day
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg text-center py-12">
            <div className="mx-auto max-w-sm">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No audio files yet
              </h3>
              <p className="text-gray-600 mb-4">
                Upload your first audio file to get started with transcription.
              </p>
              <Button onClick={() => window.location.href = '/transcribe'}>
                Start Transcribing
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {filterType === 'default' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {files.map((file) => renderFileCard(file))}
              </div>
            ) : (
              <div className="space-y-6">
                {groupFilesByDay(files).map(([dateKey, dayFiles]) => (
                  <div key={dateKey} className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                      {dateKey}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                       {dayFiles.map((file) => renderFileCard(file))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Filename Modal */}
      <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <SheetContent>
          <SheetHeader className="mt-4 p-4">
            <SheetTitle>Edita el nom del fitxer</SheetTitle>
            <SheetDescription>
              Canvia el nom de visualització d'aquest fitxer d'àudio.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-0 space-y-1 p-4 pt-0">
            <div>
              <Input
                id="filename"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Enter new filename"
                onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
              />
            </div>
            <div className="flex space-x-2 pt-4">
              <Button
                onClick={handleSaveEdit}
                disabled={!newFileName.trim() || updating}
                className="flex-1"
              >
                {updating ? 'Guardant...' : 'Confirmar'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={updating}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
