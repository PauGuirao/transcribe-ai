// components/layout/TranscriptionHeader.tsx
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Loader2, Edit, Check, CloudOff } from "lucide-react";
import { Audio } from "@/types";

interface TranscriptionHeaderProps {
  audio: Audio | null;
  onSaveTitle: (newTitle: string) => Promise<void>;
  /** Reserved for manual save (Cmd+S) — auto-save handles the common case. */
  onSaveTranscription: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  /** Unix-ms timestamp of last successful save, null if never. */
  lastSavedAt?: number | null;
  error?: string | null;
}

export function TranscriptionHeader({
  audio,
  onSaveTitle,
  onSaveTranscription,
  hasUnsavedChanges,
  isSaving,
  lastSavedAt,
  error,
}: TranscriptionHeaderProps) {
  const t = useTranslations("dashboard.transcription");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Re-render once a minute so the "Saved Xs ago" label stays fresh without
  // user interaction.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Cmd/Ctrl+S still triggers an explicit save in case the user wants to.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSaveTranscription();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSaveTranscription]);

  useEffect(() => {
    if (audio) {
      setEditedTitle(audio.customName || audio.originalName || "");
    }
  }, [audio]);

  const handleSaveTitle = async () => {
    if (
      !audio ||
      !editedTitle.trim() ||
      editedTitle.trim() === (audio.customName || audio.originalName)
    ) {
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
    setEditedTitle(audio?.customName || audio?.originalName || "");
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveTitle();
    if (e.key === "Escape") handleCancelEditingTitle();
  };

  // Friendlier title for files saved with a raw UUID name.
  const rawTitle = audio?.customName || audio?.originalName || '';
  const looksLikeUuid = /^[0-9a-f-]{8,}\./i.test(rawTitle) || /^[0-9a-f-]{20,}$/i.test(rawTitle);
  const displayTitle = looksLikeUuid ? t("untitled") : rawTitle || t("untitled");

  return (
    <div className="flex h-14 items-center justify-between gap-3 border-b border-neutral-200 bg-white/80 px-5 backdrop-blur-sm">
      {/* Title */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isEditingTitle ? (
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={handleTitleKeyPress}
            onBlur={handleSaveTitle}
            className="h-9 max-w-md rounded-none border-0 border-b border-neutral-300 bg-transparent px-0 text-base font-semibold focus-visible:border-blue-400 focus-visible:ring-0"
            autoFocus
            placeholder={t("titlePlaceholder")}
          />
        ) : (
          <button
            onClick={handleStartEditingTitle}
            className="group flex min-w-0 items-center gap-2"
            title={rawTitle || undefined}
          >
            <h1 className="max-w-xl truncate text-base font-semibold text-neutral-900">
              {displayTitle}
            </h1>
            <Edit className="h-3.5 w-3.5 shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
      </div>

      {/* Save status (auto-save handles the writing; this just shows state) */}
      <SaveStatus
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        lastSavedAt={lastSavedAt ?? null}
        error={error ?? null}
        t={t}
      />
    </div>
  );
}

function SaveStatus({
  isSaving,
  hasUnsavedChanges,
  lastSavedAt,
  error,
  t,
}: {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: number | null;
  error: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  if (error) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-rose-600">
        <CloudOff className="h-3.5 w-3.5" />
        {t("saveError", { default: "Save failed — will retry" } as any) ||
          "Save failed"}
      </span>
    );
  }
  if (isSaving) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t("saving")}
      </span>
    );
  }
  if (hasUnsavedChanges) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-700">
        <span className="size-1.5 rounded-full bg-amber-500" />
        {t("unsavedChanges")}
      </span>
    );
  }
  if (lastSavedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-500">
        <Check className="h-3.5 w-3.5 text-emerald-500" />
        {savedAgoLabel(lastSavedAt)}
      </span>
    );
  }
  return null;
}

function savedAgoLabel(ts: number): string {
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 5) return 'Saved just now';
  if (secs < 60) return `Saved ${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `Saved ${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `Saved ${hrs}h ago`;
}
