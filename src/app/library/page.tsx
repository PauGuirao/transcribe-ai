"use client";


import React, { useState, useEffect } from "react";
import type { TranscriptionSegment } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  FileText,
  Download,
  Trash2,
  Edit,
  ChevronDown,
  PenTool,
  Calendar,
  Clock,
  User,
  GraduationCap,
  Loader2,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { AudioUploadResult } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AudioFile {
  id: string;
  filename: string;
  originalName: string;
  customName?: string;
  fileId: string;
  uploadDate: string;
  status: "completed" | "processing" | "failed" | "pending" | "uploaded";
  alumneId?: string | null;
  transcription?: {
    id: string;
    audioId: string;
    originalText: string;
    editedText: string;
    segments: TranscriptionSegment[];
    createdAt: string;
    updatedAt: string;
    alumneId?: string | null;
  } | null;
}

const STATUS_MAP = {
  completed: { label: "Transcrit", classes: "bg-green-100 text-green-800" },
  processing: { label: "Processant", classes: "bg-yellow-100 text-yellow-800" },
  failed: { label: "Fallit", classes: "bg-red-100 text-red-800" },
  uploaded: { label: "Pujat", classes: "bg-blue-100 text-gray-800" }, // keep gray like your default
} as const;

const LibraryPage = React.memo(function LibraryPage() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<AudioFile | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [filterType, setFilterType] = useState<"default" | "day">("day");
  
  // Alumne assignment state
  const [alumnes, setAlumnes] = useState<{id: string, name: string, age: number | null}[]>([]);
  const [alumnesLoading, setAlumnesLoading] = useState(false);
  const [alumnesError, setAlumnesError] = useState<string | null>(null);
  const [selectedAlumne, setSelectedAlumne] = useState<string>('none');
  const [assigningAlumne, setAssigningAlumne] = useState(false);
  
  const router = useRouter();

  const fetchFiles = async () => {
    try {
      // setLoading(true); // Avoid flicker: only set loading if cache is stale/missing
      setError(null);

      // Read cached data (ETag + payload) from sessionStorage with short TTL
      const cacheKey = "library_audio_cache";
      const cachedRaw = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;
      let cached: { etag: string; data: AudioFile[]; ts: number } | null = null;
      if (cachedRaw) {
        try {
          cached = JSON.parse(cachedRaw);
        } catch {}
      }

      // If cached and fresh (<30s), show immediately while we validate in background
      if (cached && Date.now() - cached.ts < 30_000) {
        setFiles(cached.data);
        setLoading(false);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/audio", {
        headers: cached?.etag ? { "If-None-Match": cached.etag } : undefined,
      });

      // If nothing changed on the server, reuse cached data without re-downloading JSON
      if (response.status === 304 && cached) {
        console.log("Library: 304 Not Modified, using cached audio list");
        setFiles(cached.data);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch audio files");
      }

      const data = await response.json();

      if (data.success) {
        const etag = response.headers.get("ETag") || "";
        const audioFiles: AudioFile[] = data.audioFiles || [];
        // Persist cache for quick subsequent entries
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({ etag, data: audioFiles, ts: Date.now() })
          );
        }
        setFiles(audioFiles);
      } else {
        throw new Error(data.error || "Failed to fetch files");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const renderMobileCards = (files: AudioFile[]) => {
    return (
      <div className="space-y-4">
        {files.map((file) => (
          <Card 
            key={file.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/transcribe?audioId=${file.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">
                      {file.customName || file.originalName}
                    </CardTitle>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {file.status === "uploaded" ? (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTranscribe(file.id);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Transcriure
                      </DropdownMenuItem>
                    ) : (
                      <>
                        {file.status === "completed" && (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPDF(file.transcription!.id);
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Descargar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadDOCX(file.transcription!.id);
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Descargar Word
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(file);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar nom
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file.id);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Estat:</span>
                  {getStatusBadge(file.status)}
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(file.uploadDate).toLocaleDateString("ca-ES", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  useEffect(() => {
    fetchFiles();
    loadAlumnes();
  }, []);

  const handleDownload = async (
    fileId: string,
    format: "pdf" | "docx" | "txt"
  ) => {
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcriptionId: fileId,
          format: format,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to export file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;

      // Get the filename from the response headers or use a default
      const contentDisposition = response.headers.get("content-disposition");
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
      console.error("Download failed:", error);
      // You could add a toast notification here
    }
  };

  const handleDownloadPDF = (fileId: string) => {
    handleDownload(fileId, "pdf");
  };

  const handleDownloadDOCX = (fileId: string) => {
    handleDownload(fileId, "docx");
  };

  const handleDelete = async (fileId: string) => {
    try {
      const response = await fetch(`/api/audio/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      const result = await response.json();
      if (result.success) {
        // Remove the file from local state after successful deletion
        setFiles(files.filter((file) => file.id !== fileId));
        // Invalidate library cache so next entry revalidates
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("library_audio_cache");
        }
      } else {
        throw new Error(result.error || "Failed to delete file");
      }
    } catch (err) {
      console.error("Failed to delete file:", err);
      // You might want to show an error message to the user here
    }
  };

  const handleEdit = (file: AudioFile) => {
    setEditingFile(file);
    setNewFileName(file.customName || file.originalName);
    setIsEditModalOpen(true);
    
    // Set the currently assigned alumne
    const assignedAlumneId = file.alumneId || file.transcription?.alumneId;
    setSelectedAlumne(assignedAlumneId || 'none');
    loadAlumnes();
  };

  const loadAlumnes = async () => {
    try {
      setAlumnesLoading(true);
      setAlumnesError(null);
      console.log('Loading alumnes...');
      const res = await fetch('/api/alumne');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudieron cargar los alumnos');
      }
      const data = await res.json();
      console.log('Loaded alumnes:', data.profiles);
      setAlumnes(data.profiles || []);
    } catch (error) {
      console.error('Error loading alumnes:', error);
      setAlumnesError(error instanceof Error ? error.message : 'No se pudieron cargar los alumnos');
    } finally {
      setAlumnesLoading(false);
    }
  };

  const handleAssignAlumne = async (value: string) => {
    if (!editingFile?.transcription?.id) return;
    
    setSelectedAlumne(value);
    setAssigningAlumne(true);
    setAlumnesError(null);

    try {
      const res = await fetch(`/api/transcription/${editingFile.transcription.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumneId: value === 'none' ? null : value }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo asignar el alumno');
      }

      // Update the file in local state
      setFiles(files.map(file => 
        file.id === editingFile.id 
          ? { 
              ...file, 
              alumneId: value === 'none' ? null : value,
              transcription: file.transcription ? {
                ...file.transcription,
                alumneId: value === 'none' ? null : value
              } : file.transcription
            }
          : file
      ));
      // Invalidate library cache to ensure fresh data on next visit
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("library_audio_cache");
      }
    } catch (error) {
      setAlumnesError(error instanceof Error ? error.message : 'No se pudo asignar el alumno');
      // Revert selection on error
      setSelectedAlumne(editingFile.transcription?.alumneId || editingFile.alumneId || 'none');
    } finally {
      setAssigningAlumne(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingFile || !newFileName.trim()) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/audio/${editingFile.id}/title`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customName: newFileName.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to update filename");
      }

      const result = await response.json();
      if (result.success) {
        // Update the file in the local state
        setFiles(
          files.map((file) =>
            file.id === editingFile.id
              ? { ...file, customName: newFileName.trim() }
              : file
          )
        );
        setIsEditModalOpen(false);
        setEditingFile(null);
        setNewFileName("");
        // Invalidate cache since metadata changed
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("library_audio_cache");
        }
      } else {
        throw new Error(result.error || "Failed to update filename");
      }
    } catch (err) {
      console.error("Failed to update filename:", err);
      alert("Failed to update filename. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setEditingFile(null);
    setNewFileName("");
    setSelectedAlumne('none');
    setAlumnesError(null);
  };

  const formatDateKey = (dateString: string) => {
    if (!dateString) return "Data desconeguda";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Data desconeguda";
    }
    
    return date.toLocaleDateString("ca-ES", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
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

  const getStatusBadge = (status: string) => {
    const rawStatus = String(status ?? "").toLowerCase() as keyof typeof STATUS_MAP;
    const meta = STATUS_MAP[rawStatus] ?? {
      label: status ?? "—",
      classes: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge variant="secondary" className={meta.classes}>
        {meta.label}
      </Badge>
    );
  };

  const renderFileTable = (files: AudioFile[]) => {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nom</TableHead>
              <TableHead>Estat</TableHead>
              <TableHead>Alumne</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-[50px]">Accions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow 
                key={file.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/transcribe?audioId=${file.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">
                        {file.customName || file.originalName}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(file.status)}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {(() => {
                      const alumneId = file.alumneId || file.transcription?.alumneId;
                      console.log('File:', file.id, 'AlumneId:', alumneId, 'Available alumnes:', alumnes.length);
                      
                      if (!alumneId) {
                        return "Sense assignar";
                      }
                      
                      // If we're still loading alumnes, show loading state
                      if (alumnesLoading) {
                        return "Carregant...";
                      }
                      
                      // If alumnes are loaded but empty, and we have an alumneId, there might be an issue
                      if (alumnes.length === 0 && alumneId) {
                        return "Error carregant alumne";
                      }
                      
                      const alumne = alumnes.find(a => a.id === alumneId);
                      console.log('Found alumne:', alumne);
                      return alumne ? alumne.name : "Alumne no trobat";
                    })()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {new Date(file.uploadDate).toLocaleDateString("ca-ES", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {file.status === "uploaded" ? (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTranscribe(file.id);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Transcriure
                        </DropdownMenuItem>
                      ) : (
                        <>
                          {file.status === "completed" && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPDF(file.transcription!.id);
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadDOCX(file.transcription!.id);
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Descargar Word
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(file);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file.id);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderFileCard = (file: AudioFile) => {
    const getStatusBadge = () => {
      const rawStatus = String(
        file.status ?? ""
      ).toLowerCase() as keyof typeof STATUS_MAP;
      const meta = STATUS_MAP[rawStatus] ?? {
        label: file.status ?? "—",
        classes: "bg-gray-100 text-gray-800",
      };
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
        className="bg-gray-100 border border-gray-200 rounded-md overflow-hidden flex flex-col justify-between transition-all hover:shadow-lg hover:border-gray-300 hover:bg-gray-50/50 cursor-pointer h-40"
        onClick={() => router.push(`/transcribe?audioId=${file.id}`)}
      >
        {/* --- SECCIÓN SUPERIOR: Título y Estado --- */}
        <div className="p-4 flex flex-col justify-start flex-grow">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {file.customName || file.originalName}
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </div>

        {/* --- SECCIÓN INFERIOR: Barra de Acciones a Ancho Completo --- */}
        <div className="flex w-full bg-gray-50 border-t border-gray-200">
          {file.status === "uploaded" ? (
            <>
              <Button
                variant="ghost"
                className="flex-4 text-xs h-12 rounded-none gap-2 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTranscribe(file.id);
                }}
              >
                <FileText className="h-4 w-4" />
                <span>Transcriure</span>
              </Button>
              <Button
                variant="ghost"
                className="flex-1 text-xs h-12 rounded-none gap-2 text-red-600 hover:bg-red-100 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(file.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex-1 text-xs h-12 rounded-none gap-2 text-gray-600 hover:bg-blue-100 hover:text-blue-700"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDownloadPDF(file.transcription!.id)}
                  >
                    Descargar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDownloadDOCX(file.transcription!.id)}
                  >
                    Descargar Word
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>


              <Button
                variant="ghost"
                className="flex-1 text-xs h-12 rounded-none gap-2 text-gray-600 hover:bg-gray-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(file);
                }}
              >
                <Edit className="h-4 w-4" />
                <span>Editar</span>
              </Button>

              <Button
                variant="ghost"
                className="flex-1 text-xs h-12 rounded-none gap-2 text-red-600 hover:bg-red-100 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(file.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  const handleAudioSelect = (audioId: string) => {
    // Handle audio selection if needed
  };

  const handleTranscribe = async (audioId: string) => {
    // Redirect to transcription page
  };

  const handleUploadComplete = (_result: AudioUploadResult) => {
    fetchFiles(); // Refresh the files list
  };

  if (loading) {
    return (
      <AppLayout
        onAudioSelect={handleAudioSelect}
        onUploadComplete={handleUploadComplete}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregant el teus arxius...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout
        onAudioSelect={handleAudioSelect}
        onUploadComplete={handleUploadComplete}
      >
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
    <AppLayout
      onAudioSelect={handleAudioSelect}
      onUploadComplete={handleUploadComplete}
    >
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
                  {filterType === "default" ? "Normal" : "Per dia"}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setFilterType("default")}
                  className={filterType === "default" ? "bg-gray-100" : ""}
                >
                  Normal
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilterType("day")}
                  className={filterType === "day" ? "bg-gray-100" : ""}
                >
                  Per dia
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
                Encara no hi ha transcripcions
              </h3>
              <p className="text-gray-600 mb-4">
                Puja el teu primer fitxer d&apos;àudio per començar a transcriure.
              </p>
              <Button onClick={() => (window.location.href = "/transcribe")}>
                Comença a transcriure
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {filterType === "default" ? (
              <>
                {/* Desktop table view */}
                <div className="hidden md:block">
                  {renderFileTable(files)}
                </div>
                {/* Mobile card view */}
                <div className="block md:hidden">
                  {renderMobileCards(files)}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                {groupFilesByDay(files).map(([dateKey, dayFiles]) => (
                  <div key={dateKey} className="space-y-3">
                    <h3 className="text-md font-semibold text-gray-800 border-b border-gray-200 pb-2">
                      {dateKey}
                    </h3>
                    {/* Desktop table view */}
                    <div className="hidden md:block">
                      {renderFileTable(dayFiles)}
                    </div>
                    {/* Mobile card view */}
                    <div className="block md:hidden">
                      {renderMobileCards(dayFiles)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Edit Panel Modal */}
      <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader className="space-y-4 pt-6 pb-1 px-5">
            <div className="flex items-center gap-3">
              <div>
                <SheetTitle className="text-xl">Editar transcripció</SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  Personalitza el nom i assigna un alumne a aquesta transcripció
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6 p-5">
            {/* File Information Section */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Informació del fitxer
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Nom original:</span>
                  <span className="font-medium text-right max-w-[200px] truncate" title={editingFile?.originalName}>
                    {editingFile?.originalName}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Data de pujada:
                  </span>
                  <span className="font-medium">
                    {editingFile ? new Date(editingFile.uploadDate).toLocaleDateString('ca-ES') : '—'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Estat:
                  </span>
                  <div className="flex items-center gap-2">
                    {editingFile && (() => {
                      const rawStatus = String(editingFile.status ?? "").toLowerCase() as keyof typeof STATUS_MAP;
                      const meta = STATUS_MAP[rawStatus] ?? {
                        label: editingFile.status ?? "—",
                        classes: "bg-gray-100 text-gray-800",
                      };
                      return (
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${meta.classes}`}>
                          {meta.label}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* File Name Edit Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-muted-foreground" />
                Nom personalitzat
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="filename" className="text-sm text-muted-foreground">
                  Canvia el nom de visualització d&apos;aquest fitxer
                </Label>
                <Input
                  id="filename"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Introdueix un nou nom..."
                  onKeyPress={(e) => e.key === "Enter" && handleSaveEdit()}
                  className="h-11"
                />
              </div>
            </div>

            <Separator />

            {/* Alumne Assignment Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Assignar alumne
                </div>
                {assigningAlumne && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Vincula aquesta transcripció amb un alumne
                </Label>
                <Select
                  value={selectedAlumne}
                  onValueChange={handleAssignAlumne}
                  disabled={alumnesLoading || assigningAlumne || !editingFile?.transcription?.id}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={alumnesLoading ? 'Carregant alumnes...' : 'Selecciona un alumne'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sense assignar</SelectItem>
                    {alumnes.map((alumne) => (
                      <SelectItem key={alumne.id} value={alumne.id}>
                        {alumne.name}
                        {alumne.age !== null ? ` · ${alumne.age} anys` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {!editingFile?.transcription?.id && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    L&apos;assignació d&apos;alumnes només està disponible per fitxers transcrits
                  </p>
                )}
                
                {alumnesError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {alumnesError}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSaveEdit}
                disabled={!newFileName.trim() || updating}
                className="flex-1 h-11"
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardant...
                  </>
                ) : (
                  'Guardar canvis'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={updating}
                className="flex-1 h-11"
              >
                Cancel·lar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
});

export default LibraryPage;
