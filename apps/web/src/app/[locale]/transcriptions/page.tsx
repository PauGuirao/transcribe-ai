"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { NewTranscriptionModal } from "@/components/transcription/NewTranscriptionModal";
import { PageSkeleton } from "@/components/layout/states/PageSkeleton";
import { Plus } from "lucide-react";
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
  ChevronLeft,
  ChevronRight,
  CalendarDays,
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
  durationSeconds?: number | null;
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

const TranscriptionsPage = React.memo(function TranscriptionsPage() {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const t = useTranslations("dashboard.library");
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<AudioFile | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [filterType, setFilterType] = useState<"default" | "day" | "calendar">("day");
  const locale = useLocale();

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
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      spin: false,
    },
    processing: {
      label: t("status.processing"),
      icon: Loader2,
      textColor: "text-indigo-700",
      bgColor: "bg-indigo-50",
      spin: true,
    },
    transcribing: {
      label: t("status.processing"),
      icon: Loader2,
      textColor: "text-indigo-700",
      bgColor: "bg-indigo-50",
      spin: true,
    },
    failed: {
      label: t("status.failed"),
      icon: AlertCircle,
      textColor: "text-rose-700",
      bgColor: "bg-rose-50",
      spin: false,
    },
    error: {
      label: t("status.failed"),
      icon: AlertCircle,
      textColor: "text-rose-700",
      bgColor: "bg-rose-50",
      spin: false,
    },
    uploaded: {
      label: t("status.uploaded"),
      icon: Clock,
      textColor: "text-neutral-700",
      bgColor: "bg-neutral-100",
      spin: false,
    },
    pending: {
      label: t("status.pending"),
      icon: Clock,
      textColor: "text-neutral-700",
      bgColor: "bg-neutral-100",
      spin: false,
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
      icon: Clock,
      textColor: "text-neutral-700",
      bgColor: "bg-neutral-100",
      spin: false,
    };
    const Icon = config.icon;
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", config.bgColor, config.textColor)}>
        <Icon className={cn("size-3", config.spin && "animate-spin")} />
        {config.label}
      </span>
    );
  };

  /** Compact duration: "0:42" / "5 min" / "1 h 23 min". */
  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds || seconds <= 0) return "—";
    if (seconds < 60) return `${Math.round(seconds)} s`;
    const totalMin = Math.round(seconds / 60);
    if (totalMin < 60) return `${totalMin} min`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  };

  /** Relative date for the past week, absolute otherwise. */
  const formatRelativeDate = (dateString: string) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const that  = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const days = Math.round((today.getTime() - that.getTime()) / 86400000);
    if (days === 0) return "Avui";
    if (days === 1) return "Ahir";
    if (days < 7) return `fa ${days} dies`;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
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
                  <span className="text-[11px] text-neutral-500 tabular-nums">{formatDuration(file.durationSeconds)}</span>
                  <span className="text-[11px] text-neutral-500">
                    {formatRelativeDate(file.uploadDate)}
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

  const tableHeaderRow = (
    <tr className="border-b border-neutral-200 bg-neutral-50/60">
      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700">{t("table.name")}</th>
      <th className="w-[110px] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700">{t("table.status")}</th>
      <th className="hidden md:table-cell w-[160px] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700">{t("table.student")}</th>
      <th className="w-[90px] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700">{t("table.duration")}</th>
      <th className="w-[90px] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700">{t("table.date")}</th>
      <th className="w-[44px]" />
    </tr>
  );

  const renderFileTable = (files: AudioFile[], opts?: { hideHeader?: boolean }) => (
    <div className={cn("overflow-hidden bg-white", !opts?.hideHeader && "rounded-md border border-neutral-200")}>
      <table className="w-full">
        {!opts?.hideHeader && <thead>{tableHeaderRow}</thead>}
        <tbody className="divide-y divide-neutral-100">{renderFileRows(files)}</tbody>
      </table>
    </div>
  );

  const renderFileRows = (files: AudioFile[]) => (
    <>
      {files.map((file) => (
        <tr
          key={file.id}
          className="group cursor-pointer border-b border-neutral-100 transition-colors last:border-b-0 hover:bg-neutral-50"
          onClick={() => router.push(`/transcribe?audioId=${file.id}`)}
        >
          <td className="px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
                <FileText className="size-3.5 text-neutral-600" />
              </div>
              <span className="truncate text-[13px] font-medium text-neutral-900">
                {file.customName || file.originalName}
              </span>
            </div>
          </td>
          <td className="px-4 py-3">{getStatusBadge(file.status)}</td>
          <td className="hidden md:table-cell px-4 py-3 text-[12px] text-neutral-600">
            {(() => {
              const alumneId = file.alumneId || file.transcription?.alumneId;
              if (!alumneId) return <span className="text-neutral-400">—</span>;
              if (alumnesLoading) return <span className="text-neutral-400">...</span>;
              const alumne = alumnes.find((a) => a.id === alumneId);
              return alumne ? (
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="size-3 text-neutral-400" />
                  {alumne.name}
                </span>
              ) : (
                <span className="text-neutral-400">—</span>
              );
            })()}
          </td>
          <td className="px-4 py-3 text-[12px] text-neutral-600 tabular-nums">{formatDuration(file.durationSeconds)}</td>
          <td className="px-4 py-3 text-[12px] text-neutral-500">{formatRelativeDate(file.uploadDate)}</td>
          <td className="px-4 py-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex size-7 items-center justify-center rounded-md text-neutral-400 opacity-0 transition-colors hover:bg-neutral-100 hover:text-neutral-700 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 p-1">
                {file.status === "uploaded" ? (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTranscribe(file.id);
                    }}
                    className="rounded-md text-[13px]"
                  >
                    <Mic className="mr-2 size-3.5 text-neutral-500" />
                    {t("actions.transcribe")}
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
                          className="rounded-md text-[13px]"
                        >
                          <Download className="mr-2 size-3.5 text-neutral-500" />
                          {t("actions.exportPdf")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadDOCX(file.transcription!.id);
                          }}
                          className="rounded-md text-[13px]"
                        >
                          <Download className="mr-2 size-3.5 text-neutral-500" />
                          {t("actions.exportWord")}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(file);
                      }}
                      className="rounded-md text-[13px]"
                    >
                      <Edit3 className="mr-2 size-3.5 text-neutral-500" />
                      {t("actions.edit")}
                    </DropdownMenuItem>
                  </>
                )}
                <div className="my-1 h-px bg-neutral-100" />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.id);
                  }}
                  className="rounded-md text-[13px] text-rose-600 focus:bg-rose-50 focus:text-rose-600"
                >
                  <Trash2 className="mr-2 size-3.5" />
                  {t("actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </tr>
      ))}
    </>
  );

  const handleAudioSelect = (audioId: string) => {};
  const handleTranscribe = async (audioId: string) => {};
  const handleUploadComplete = (_result: AudioUploadResult) => { fetchFiles(); };

  if (loading) {
    return (
      <AppLayout onAudioSelect={handleAudioSelect} onUploadComplete={handleUploadComplete}>
        <PageSkeleton variant="list" count={8} />
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
      <div className="min-h-screen bg-white">
        <div className="w-full px-8 py-6">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">{t("title")}</h1>
              <p className="mt-2 text-sm text-neutral-500">
                {files.length === 1 ? t("filesCount", { count: files.length }) : t("filesCountPlural", { count: files.length })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-full border border-neutral-200 bg-white p-0.5 text-xs">
                <button
                  onClick={() => setFilterType("default")}
                  className={cn("rounded-full px-3 py-1 font-medium transition-colors", filterType === "default" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-900")}
                >
                  {t("viewAll")}
                </button>
                <button
                  onClick={() => setFilterType("day")}
                  className={cn("rounded-full px-3 py-1 font-medium transition-colors", filterType === "day" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-900")}
                >
                  {t("viewByDay")}
                </button>
                <button
                  onClick={() => setFilterType("calendar")}
                  className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium transition-colors", filterType === "calendar" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-900")}
                >
                  <CalendarDays className="size-3.5" />
                  {t("viewCalendar")}
                </button>
              </div>
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
              >
                <Plus className="size-4" /> Nova transcripció
              </button>
            </div>
          </div>

          {/* Content */}
          {files.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-neutral-200 bg-white">
                <FolderOpen className="size-5 text-neutral-500" />
              </div>
              <h3 className="text-sm font-medium text-neutral-900">{t("emptyTitle")}</h3>
              <p className="mx-auto mt-1 max-w-xs text-xs text-neutral-500">{t("emptyDesc")}</p>
              <button onClick={() => setIsNewModalOpen(true)} className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800">
                <Plus className="size-4" />
                {t("uploadAudio")}
              </button>
            </div>
          ) : (
            <div>
              {filterType === "default" && (
                <>
                  <div className="hidden md:block">{renderFileTable(files)}</div>
                  <div className="block md:hidden">{renderMobileCards(files)}</div>
                </>
              )}

              {filterType === "day" && (
                <>
                  <div className="hidden md:block overflow-hidden rounded-md border border-neutral-200 bg-white">
                    <table className="w-full">
                      <thead>{tableHeaderRow}</thead>
                      <tbody>
                        {groupFilesByDay(files).map(([dateKey, dayFiles]) => (
                          <React.Fragment key={dateKey}>
                            <tr>
                              <td colSpan={6} className="border-b border-t border-neutral-100 bg-neutral-50/30 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-neutral-600">
                                {dateKey}
                              </td>
                            </tr>
                            {renderFileRows(dayFiles)}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="block md:hidden space-y-6">
                    {groupFilesByDay(files).map(([dateKey, dayFiles]) => (
                      <div key={dateKey}>
                        <h3 className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-neutral-500">{dateKey}</h3>
                        {renderMobileCards(dayFiles)}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {filterType === "calendar" && (
                <CalendarView
                  files={files}
                  locale={locale}
                  todayLabel={t("today")}
                  onSelectFile={(id) => router.push(`/transcribe?audioId=${id}`)}
                />
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

      <NewTranscriptionModal
        open={isNewModalOpen}
        onOpenChange={setIsNewModalOpen}
        onSubmitted={() => { fetchFiles(); }}
      />
    </AppLayout>
  );
});

export default TranscriptionsPage;

/* ----------------------------------------------------------------------- */
/* Calendar view                                                           */
/* ----------------------------------------------------------------------- */

interface CalendarViewProps {
  files: AudioFile[];
  locale: string;
  todayLabel: string;
  onSelectFile: (audioId: string) => void;
}

const MAX_CHIPS_PER_CELL = 3;

/** YYYY-MM-DD in local time — calendar grouping should respect the user's tz. */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function CalendarView({
  files,
  locale,
  todayLabel,
  onSelectFile,
}: CalendarViewProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Bucket files by local YYYY-MM-DD once.
  const filesByDay = useMemo(() => {
    const map = new Map<string, AudioFile[]>();
    for (const f of files) {
      const d = new Date(f.uploadDate);
      if (Number.isNaN(d.getTime())) continue;
      const k = dateKey(d);
      const bucket = map.get(k);
      if (bucket) bucket.push(f);
      else map.set(k, [f]);
    }
    // Newest first within a day.
    map.forEach((list) =>
      list.sort(
        (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime(),
      ),
    );
    return map;
  }, [files]);

  // 6-week grid starting Monday so any month always fits.
  const days = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const leading = (first.getDay() + 6) % 7; // 0=Sun..6=Sat → Monday=0
    return Array.from({ length: 42 }, (_, i) =>
      new Date(year, month, 1 - leading + i),
    );
  }, [viewMonth]);

  const today = new Date();
  const monthLabel = viewMonth.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
  const weekdays = useMemo(() => {
    // Use a known Monday (2024-01-01) to get the locale's weekday names in
    // Monday-first order.
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: 'short' });
    });
  }, [locale]);

  const prevMonth = () =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  const goToday = () => {
    const now = new Date();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  return (
    // h-[calc(...)] fills the viewport below the page header (chrome ≈ 200px).
    // min-h enforces a floor on small screens so cells never collapse to nothing.
    <div className="flex h-[calc(100vh-200px)] min-h-[560px] flex-col">
      {/* Header: month nav */}
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-lg font-medium capitalize text-neutral-900">
          {monthLabel}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={goToday}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
          >
            {todayLabel}
          </button>
          <div className="ml-1 inline-flex overflow-hidden rounded-md border border-neutral-200 bg-white">
            <button
              onClick={prevMonth}
              aria-label="Previous month"
              className="border-r border-neutral-200 p-1.5 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={nextMonth}
              aria-label="Next month"
              className="p-1.5 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid container — fills remaining vertical space. */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        {/* Weekday header strip */}
        <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50/70">
          {weekdays.map((w, i) => (
            <div
              key={w}
              className={cn(
                'py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-500',
                i < 6 && 'border-r border-neutral-200',
              )}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Day grid — equal-height rows fill remaining space */}
        <div className="grid flex-1 grid-cols-7 grid-rows-6">
          {days.map((d, i) => {
            const inMonth = d.getMonth() === viewMonth.getMonth();
            const dayFiles = filesByDay.get(dateKey(d)) ?? [];
            const isToday = isSameDay(d, today);
            const isRightEdge = (i + 1) % 7 === 0;
            const isBottomRow = i >= 35;
            const visibleChips = dayFiles.slice(0, MAX_CHIPS_PER_CELL);
            const overflow = Math.max(0, dayFiles.length - visibleChips.length);

            return (
              <div
                key={i}
                className={cn(
                  'group/cell flex min-h-0 flex-col gap-1 overflow-hidden p-1.5 transition-colors',
                  !isRightEdge && 'border-r border-neutral-100',
                  !isBottomRow && 'border-b border-neutral-100',
                  inMonth ? 'bg-white hover:bg-neutral-50/60' : 'bg-neutral-50/40',
                  isToday && inMonth && 'bg-amber-50/40',
                )}
              >
                {/* Day number */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex size-6 items-center justify-center rounded-full text-[12px] font-medium tabular-nums',
                      !inMonth && 'text-neutral-300',
                      inMonth && !isToday && 'text-neutral-700',
                      isToday && inMonth && 'bg-neutral-900 text-white',
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {dayFiles.length > 0 && inMonth && (
                    <span className="text-[10px] font-medium text-neutral-400 tabular-nums">
                      {dayFiles.length}
                    </span>
                  )}
                </div>

                {/* File chips */}
                {inMonth && visibleChips.length > 0 && (
                  <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden">
                    {visibleChips.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => onSelectFile(f.id)}
                        title={f.customName || f.originalName}
                        className={cn(
                          'group/chip flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-colors',
                          chipStyleForStatus(f.status),
                        )}
                      >
                        <span
                          className={cn(
                            'size-1.5 shrink-0 rounded-full',
                            chipDotForStatus(f.status),
                          )}
                        />
                        <span className="truncate">
                          {f.customName || f.originalName}
                        </span>
                      </button>
                    ))}
                    {overflow > 0 && (
                      <div className="px-1.5 text-[10px] font-medium text-neutral-500">
                        + {overflow} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Soft pill background per audio status, used inside calendar cells. */
function chipStyleForStatus(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100';
    case 'processing':
    case 'transcribing':
    case 'pending':
    case 'uploaded':
      return 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100';
    case 'failed':
    case 'error':
      return 'bg-rose-50 text-rose-800 hover:bg-rose-100';
    default:
      return 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200';
  }
}
function chipDotForStatus(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500';
    case 'processing':
    case 'transcribing':
    case 'pending':
    case 'uploaded':
      return 'bg-indigo-500';
    case 'failed':
    case 'error':
      return 'bg-rose-500';
    default:
      return 'bg-neutral-400';
  }
}
