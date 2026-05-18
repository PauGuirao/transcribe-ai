// components/layout/TranscriptionHeader.tsx
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Edit, Check, X } from "lucide-react";
import { Audio } from "@/types";

interface TranscriptionHeaderProps {
  audio: Audio | null;
  onSaveTitle: (newTitle: string) => Promise<void>;
  onSaveTranscription: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
}

export function TranscriptionHeader({
  audio,
  onSaveTitle,
  onSaveTranscription,
  hasUnsavedChanges,
  isSaving,
}: TranscriptionHeaderProps) {
  const t = useTranslations("dashboard.transcription");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

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

  return (
    <div className="px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-200/60">
      <div className="flex items-center justify-between pr-64">
        {/* Title section */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isEditingTitle ? (
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleTitleKeyPress}
              onBlur={handleSaveTitle}
              className="text-base font-semibold border-0 border-b border-gray-300 rounded-none px-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:border-blue-400 max-w-md"
              autoFocus
              placeholder={t("titlePlaceholder")}
            />
          ) : (
            <button
              onClick={handleStartEditingTitle}
              className="group flex items-center gap-2 min-w-0"
            >
              <h1 className="text-base font-semibold text-gray-900 truncate max-w-md">
                {audio?.customName || audio?.originalName || t("untitled")}
              </h1>
              <Edit className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={onSaveTranscription}
          disabled={!hasUnsavedChanges || isSaving}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md transition-all ${
            hasUnsavedChanges && !isSaving
              ? "bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {isSaving ? t("saving") : t("save")}
        </button>
      </div>
    </div>
  );
}
