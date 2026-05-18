"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { TranscriptionSegment } from "@/types";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  FileText,
  Download,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  GraduationCap,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  FolderOpen,
  Mic,
  CheckCircle2,
  XCircle,
  Hourglass,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

const LibraryPage = React.memo(function LibraryPage() {
  const t = useTranslations("dashboard.library");
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<AudioFile | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [filterType, setFilterType] = useState<"default" | "day">("day");

  const [alumnes, setAlumnes] = useState<{id: string, name: string, age: number | null}[]>([]);
  const [alumnesLoading, setAlumnesLoading] = useState(false);
  const [alumnesError, setAlumnesError] = useState<string | null>(null);
  const [selectedAlumne, setSelectedAlumne] = useState<string>('none');
  const [assigningAlumne, setAssigningAlumne] = useState(false);

  const router = useRouter();

  const STATUS_CONFIG = {
    completed: {
      label: t("status.completed"),
      icon: CheckCircle2,
      dotColor: "bg-emerald-500",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50"
    },
    processing: {
      label: t("status.processing"),
      icon: Hourglass,
      dotColor: "bg-amber-500",
      textColor: "text-amber-700",
      bgColor: "bg-amber-50"
    },
    failed: {
      label: t("status.failed"),
      icon: XCircle,
      dotColor: "bg-red-500",
      textColor: "text-red-700",
      bgColor: "bg-red-50"
    },
    uploaded: {
      label: t("status.uploaded"),
      icon: Upload,
      dotColor: "bg-blue-500",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50"
    },
    pending: {
      label: t("status.pending"),
      icon: Clock,
      dotColor: "bg-gray-400",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50"
    },
  } as const;

  const fetchFiles = async () => {
    try {
      setError(null);
      const cacheKey = "library_audio_cache";
      const cachedRaw = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;
      let cached: { etag: string; data: AudioFile[]; ts: number } | null = null;
      if (cachedRaw) {
        try { cached = JSON.parse(cachedRaw); } catch {}
      }

      if (cached && Date.now() - cached.ts < 30_000) {
        setFiles(cached.data);
        setLoading(false);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/audio", {
        headers: cached?.etag ? { "If-None-Match": cached.etag } : undefined,
      });

      if (response.status === 304 && cached) {
        setFiles(cached.data);
        return;
      }

      if (!response.ok) throw new Error("Failed to fetch audio files");

      const data = await response.json();
      if (data.success) {
        const etag = response.headers.get("ETag") || "";
        const audioFiles: AudioFile[] = data.audioFiles || [];
        if (typeof window !== "undefined") {
          sessionStorage.setItem(cacheKey, JSON.stringify({ etag, data: audioFiles, ts: Date.now() }));
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

  const getStatusBadge = (status: string) => {
    const rawStatus = String(status ?? "").toLowerCase() as keyof typeof STATUS_CONFIG;
    const config = STATUS_CONFIG[rawStatus] ?? {
      label: status ?? "—",
      dotColor: "bg-gray-400",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50"
    };
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium", config.bgColor, config.textColor)}>
        <span className={cn("w-1.5 h-1.5 rounded-full", config.dotColor)} />
        {config.label}
      </span>
    );
  };

  const renderMobileCards = (files: AudioFile[]) => (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="rounded-xl bg-white border border-gray-200/60 p-4 cursor-pointer hover:shadow-sm transition-all"
          onClick={() => router.push(`/transcribe?audioId=${file.id}`)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-gray-900 truncate">
                  {file.customName || file.originalName}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {getStatusBadge(file.status)}
                  <span className="text-[11px] text-gray-500">
                    {new Date(file.uploadDate).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 p-1">
                {file.status === "uploaded" ? (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTranscribe(file.id); }} className="text-[13px] rounded-md">
                    <Mic className="h-3.5 w-3.5 mr-2 text-gray-500" />
                    {t("actions.transcribe")}
                  </DropdownMenuItem>
                ) : (
                  <>
                    {file.status === "completed" && (
                      <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadPDF(file.transcription!.id); }} className="text-[13px] rounded-md">
                          <Download className="h-3.5 w-3.5 mr-2 text-gray-500" />
                          {t("actions.exportPdf")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadDOCX(file.transcription!.id); }} className="text-[13px] rounded-md">
                          <Download className="h-3.5 w-3.5 mr-2 text-gray-500" />
                          {t("actions.exportWord")}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(file); }} className="text-[13px] rounded-md">
                      <Edit3 className="h-3.5 w-3.5 mr-2 text-gray-500" />
                      {t("actions.edit")}
                    </DropdownMenuItem>
                  </>
                )}
                <div className="h-px bg-gray-100 my-1" />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }} className="text-[13px] rounded-md text-red-600 focus:text-red-600 focus:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  {t("actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );

  useEffect(() => {
    fetchFiles();
    loadAlumnes();
  }, []);

  const handleDownload = async (fileId: string, format: "pdf" | "docx" | "txt") => {
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptionId: fileId, format }),
      });
      if (!response.ok) throw new Error("Failed to export file");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `transcription.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/i);
        if (filenameMatch) filename = filenameMatch[1];
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleDownloadPDF = (fileId: string) => handleDownload(fileId, "pdf");
  const handleDownloadDOCX = (fileId: string) => handleDownload(fileId, "docx");

  const handleDelete = async (fileId: string) => {
    try {
      const response = await fetch(`/api/audio/${fileId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete file");
      const result = await response.json();
      if (result.success) {
        setFiles(files.filter((file) => file.id !== fileId));
        if (typeof window !== "undefined") sessionStorage.removeItem("library_audio_cache");
      } else {
        throw new Error(result.error || "Failed to delete file");
      }
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  const handleEdit = (file: AudioFile) => {
    setEditingFile(file);
    setNewFileName(file.customName || file.originalName);
    setIsEditModalOpen(true);
    const assignedAlumneId = file.alumneId || file.transcription?.alumneId;
    setSelectedAlumne(assignedAlumneId || 'none');
    loadAlumnes();
  };

  const loadAlumnes = async () => {
    try {
      setAlumnesLoading(true);
      setAlumnesError(null);
      const res = await fetch('/api/alumne');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || t("errors.loadStudents"));
      }
      const data = await res.json();
      setAlumnes(data.profiles || []);
    } catch (error) {
      setAlumnesError(error instanceof Error ? error.message : t("errors.loadStudents"));
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
        throw new Error(data?.error || t("errors.assignStudent"));
      }
      setFiles(files.map(file =>
        file.id === editingFile.id
          ? { ...file, alumneId: value === 'none' ? null : value, transcription: file.transcription ? { ...file.transcription, alumneId: value === 'none' ? null : value } : file.transcription }
          : file
      ));
      if (typeof window !== "undefined") sessionStorage.removeItem("library_audio_cache");
    } catch (error) {
      setAlumnesError(error instanceof Error ? error.message : t("errors.assignStudent"));
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customName: newFileName.trim() }),
      });
      if (!response.ok) throw new Error("Failed to update filename");
      const result = await response.json();
      if (result.success) {
        setFiles(files.map((file) => file.id === editingFile.id ? { ...file, customName: newFileName.trim() } : file));
        setIsEditModalOpen(false);
        setEditingFile(null);
        setNewFileName("");
        if (typeof window !== "undefined") sessionStorage.removeItem("library_audio_cache");
      } else {
        throw new Error(result.error || "Failed to update filename");
      }
    } catch (err) {
      console.error("Failed to update filename:", err);
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
    if (!dateString) return t("unknownDate");
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return t("unknownDate");
    return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const groupFilesByDay = (files: AudioFile[]) => {
    const grouped = files.reduce((acc, file) => {
      const dateKey = formatDateKey(file.uploadDate);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(file);
      return acc;
    }, {} as Record<string, AudioFile[]>);
    return Object.entries(grouped).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  };

  const renderFileTable = (files: AudioFile[]) => (
    <div className="rounded-xl bg-white border border-gray-200/60 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-100">
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t("table.name")}</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">{t("table.status")}</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[140px]">{t("table.student")}</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">{t("table.date")}</th>
            <th className="w-[50px]"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {files.map((file) => (
            <tr key={file.id} className="cursor-pointer hover:bg-blue-50/50 transition-colors group" onClick={() => router.push(`/transcribe?audioId=${file.id}`)}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-[13px] font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {file.customName || file.originalName}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">{getStatusBadge(file.status)}</td>
              <td className="px-4 py-3 text-[12px] text-gray-500">
                {(() => {
                  const alumneId = file.alumneId || file.transcription?.alumneId;
                  if (!alumneId) return <span className="text-gray-400">—</span>;
                  if (alumnesLoading) return <span className="text-gray-400">...</span>;
                  const alumne = alumnes.find(a => a.id === alumneId);
                  return alumne ? (
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="h-3 w-3 text-gray-400" />
                      {alumne.name}
                    </span>
                  ) : <span className="text-gray-400">—</span>;
                })()}
              </td>
              <td className="px-4 py-3 text-[12px] text-gray-500">
                {new Date(file.uploadDate).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              </td>
              <td className="px-4 py-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 p-1">
                    {file.status === "uploaded" ? (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTranscribe(file.id); }} className="text-[13px] rounded-md">
                        <Mic className="h-3.5 w-3.5 mr-2 text-gray-500" />
                        {t("actions.transcribe")}
                      </DropdownMenuItem>
                    ) : (
                      <>
                        {file.status === "completed" && (
                          <>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadPDF(file.transcription!.id); }} className="text-[13px] rounded-md">
                              <Download className="h-3.5 w-3.5 mr-2 text-gray-500" />
                              {t("actions.exportPdf")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadDOCX(file.transcription!.id); }} className="text-[13px] rounded-md">
                              <Download className="h-3.5 w-3.5 mr-2 text-gray-500" />
                              {t("actions.exportWord")}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(file); }} className="text-[13px] rounded-md">
                          <Edit3 className="h-3.5 w-3.5 mr-2 text-gray-500" />
                          {t("actions.edit")}
                        </DropdownMenuItem>
                      </>
                    )}
                    <div className="h-px bg-gray-100 my-1" />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }} className="text-[13px] rounded-md text-red-600 focus:text-red-600 focus:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      {t("actions.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const handleAudioSelect = (audioId: string) => {};
  const handleTranscribe = async (audioId: string) => {};
  const handleUploadComplete = (_result: AudioUploadResult) => { fetchFiles(); };

  if (loading) {
    return (
      <AppLayout onAudioSelect={handleAudioSelect} onUploadComplete={handleUploadComplete}>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-[13px] text-gray-500">{t("loadingLibrary")}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout onAudioSelect={handleAudioSelect} onUploadComplete={handleUploadComplete}>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-[15px] font-medium text-gray-900 mb-1">{t("errorLoading")}</h3>
            <p className="text-[13px] text-gray-500 mb-4 max-w-xs">{error}</p>
            <button onClick={fetchFiles} className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              {t("retry")}
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout onAudioSelect={handleAudioSelect} onUploadComplete={handleUploadComplete}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{t("title")}</h1>
              <p className="text-[13px] text-gray-500 mt-1">
                {files.length === 1 ? t("filesCount", { count: files.length }) : t("filesCountPlural", { count: files.length })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white rounded-lg border border-gray-200/60 p-0.5">
                <button
                  onClick={() => setFilterType("default")}
                  className={cn("px-3 py-1.5 text-[12px] font-medium rounded-md transition-all", filterType === "default" ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:text-gray-900")}
                >
                  {t("viewAll")}
                </button>
                <button
                  onClick={() => setFilterType("day")}
                  className={cn("px-3 py-1.5 text-[12px] font-medium rounded-md transition-all", filterType === "day" ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:text-gray-900")}
                >
                  {t("viewByDay")}
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {files.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <FolderOpen className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-[15px] font-medium text-gray-900 mb-1">{t("emptyTitle")}</h3>
              <p className="text-[13px] text-gray-500 mb-6 max-w-xs mx-auto">{t("emptyDesc")}</p>
              <button onClick={() => (window.location.href = "/dashboard")} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
                <Mic className="h-3.5 w-3.5" />
                {t("uploadAudio")}
              </button>
            </div>
          ) : (
            <div>
              {filterType === "default" ? (
                <>
                  <div className="hidden md:block">{renderFileTable(files)}</div>
                  <div className="block md:hidden">{renderMobileCards(files)}</div>
                </>
              ) : (
                <div className="space-y-6">
                  {groupFilesByDay(files).map(([dateKey, dayFiles]) => (
                    <div key={dateKey}>
                      <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">{dateKey}</h3>
                      <div className="hidden md:block">{renderFileTable(dayFiles)}</div>
                      <div className="block md:hidden">{renderMobileCards(dayFiles)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Panel */}
      <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <SheetContent className="w-full sm:max-w-md border-l border-gray-200/60 bg-gradient-to-b from-white to-gray-50/50 p-0">
          <div className="px-6 pt-6 pb-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                <Edit3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <SheetTitle className="text-[15px] font-semibold text-gray-900">{t("edit.title")}</SheetTitle>
                <p className="text-[12px] text-gray-500">{t("edit.subtitle")}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{t("edit.info")}</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-500">{t("edit.originalName")}</span>
                  <span className="text-[12px] font-medium text-gray-900 max-w-[180px] truncate" title={editingFile?.originalName}>
                    {editingFile?.originalName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-500 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {t("edit.date")}
                  </span>
                  <span className="text-[12px] font-medium text-gray-900">
                    {editingFile ? new Date(editingFile.uploadDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-500 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {t("edit.status")}
                  </span>
                  {editingFile && getStatusBadge(editingFile.status)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filename" className="text-[12px] font-semibold text-gray-600 uppercase tracking-wide">
                {t("edit.customName")}
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <FileText className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  id="filename"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder={t("edit.customNamePlaceholder")}
                  onKeyPress={(e) => e.key === "Enter" && handleSaveEdit()}
                  className="h-11 pl-10 text-[13px] bg-white border-gray-200 rounded-lg shadow-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[12px] font-semibold text-gray-600 uppercase tracking-wide">
                  {t("edit.assignStudent")}
                </Label>
                {assigningAlumne && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
              </div>
              <Select value={selectedAlumne} onValueChange={handleAssignAlumne} disabled={alumnesLoading || assigningAlumne || !editingFile?.transcription?.id}>
                <SelectTrigger className="h-11 text-[13px] bg-white border-gray-200 rounded-lg shadow-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-gray-400" />
                    <SelectValue placeholder={alumnesLoading ? t("edit.loading") : t("edit.selectStudent")} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-[13px]">{t("edit.unassigned")}</SelectItem>
                  {alumnes.map((alumne) => (
                    <SelectItem key={alumne.id} value={alumne.id} className="text-[13px]">
                      {alumne.name}{alumne.age !== null ? ` · ${alumne.age} ${t("edit.years")}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!editingFile?.transcription?.id && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t("edit.onlyTranscribed")}
                </p>
              )}
              {alumnesError && (
                <p className="text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {alumnesError}
                </p>
              )}
            </div>

            <div className="pt-3 space-y-2">
              <button
                onClick={handleSaveEdit}
                disabled={!newFileName.trim() || updating}
                className={cn(
                  "w-full h-11 text-[13px] font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2",
                  !newFileName.trim() || updating ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm hover:shadow-md hover:from-blue-600 hover:to-blue-700"
                )}
              >
                {updating ? <><Loader2 className="h-4 w-4 animate-spin" />{t("edit.saving")}</> : t("edit.save")}
              </button>
              <button onClick={handleCancelEdit} disabled={updating} className="w-full h-11 text-[13px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                {t("edit.cancel")}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
});

export default LibraryPage;
