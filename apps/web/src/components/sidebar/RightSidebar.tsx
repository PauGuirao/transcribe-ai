'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Loader2,
  Copy,
  Check,
  FileText,
  Mail,
  Cloud,
  Download,
  Users,
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import {
  MAX_SPEAKERS,
  SPEAKER_COLOR_PALETTE,
  createSpeaker,
} from '@/lib/speakers';
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

declare global {
  interface Window { google?: any }
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
  const t = useTranslations("dashboard.transcription");

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
  const [isDriveExporting, setIsDriveExporting] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

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

        // Show success animation
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);

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

        // Show success animation even for fallback
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);

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

    const subject = encodeURIComponent('Transcription');
    const body = encodeURIComponent(textToShare);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;

    window.open(mailtoUrl, '_blank');
  };

  // Funció per crear un Google Doc al Drive via API (OAuth + Google Docs API)
  const handleGoogleDriveShare = async () => {
    if (!transcription) return;

    const baseName = audio?.customName || audio?.filename || 'Transcription';
    const docTitle = `Transcription - ${baseName}`;

    // Formata el text de la transcripció
    let textToShare = '';
    if (transcription.segments && transcription.segments.length > 0) {
      textToShare = transcription.segments.map((segment, index) => {
        const speaker = segment.speakerId && speakers?.length
          ? speakers.find((s) => s.id === segment.speakerId)
          : undefined;
        const speakerName = speaker?.name ?? 'persona';
        const segmentNumber = (index + 1).toString();
        return `${segmentNumber}. [${speakerName}]\n${segment.text.trim()}\n`;
      }).join('\n');
    } else if (transcription.editedText && transcription.editedText.trim()) {
      textToShare = transcription.editedText;
    } else if (transcription.originalText) {
      textToShare = transcription.originalText;
    }

    // Assegura que GIS estigui carregat
    const ensureGisLoaded = async () => {
      if (window.google?.accounts?.oauth2) return;
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(t("errors.googleServices")));
        document.head.appendChild(script);
      });
    };

    // Obté un token d'accés amb l'abast de Google Docs
    const getAccessToken = async () => {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) throw new Error(t("errors.missingClientId"));

      await ensureGisLoaded();

      const token: string = await new Promise((resolve, reject) => {
        try {
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/documents',
            prompt: '',
            callback: (response: any) => {
              if (response?.access_token) resolve(response.access_token);
              else reject(new Error(t("errors.noAccessToken")));
            },
          });
          tokenClient.requestAccessToken();
        } catch (err) {
          reject(err);
        }
      });
      return token;
    };

    // Crea el document i insereix el contingut
    const createDocAndInsert = async (accessToken: string, title: string, content: string) => {
      // Crea el document
      const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });
      if (!createRes.ok) {
        const errText = await createRes.text().catch(() => '');
        throw new Error(`${t("errors.createDocError")}: ${createRes.status} ${errText}`);
      }
      const created = await createRes.json();
      const docId = created.documentId;
      if (!docId) throw new Error(t("errors.createDocError"));

      // Insereix el text al començament del document
      const requests = [
        {
          insertText: {
            location: { index: 1 },
            text: content || '',
          },
        },
      ];

      const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
      if (!updateRes.ok) {
        const errText = await updateRes.text().catch(() => '');
        throw new Error(`${t("errors.writeDocError")}: ${updateRes.status} ${errText}`);
      }

      return docId;
    };

    try {
      setIsDriveExporting(true);
      const accessToken = await getAccessToken();
      const docId = await createDocAndInsert(accessToken, docTitle, textToShare);
      const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
      window.open(docUrl, '_blank');
      console.log('Document created successfully:', docId);
    } catch (error) {
      console.error("Could not create Google Doc:", error);
      alert(error instanceof Error ? error.message : t("errors.googleDocError"));
    } finally {
      setIsDriveExporting(false);
    }
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
          throw new Error(data?.error || t("student.loadError"))
        }
        const data = await res.json()
        setAlumnes(data.profiles || [])
        setAlumnesError(null)
      } catch (error) {
        setAlumnesError(error instanceof Error ? error.message : t("student.loadError"))
      } finally {
        setAlumnesLoading(false)
      }
    }

    if (audio && transcription) {
      loadAlumnes();
    }
  }, [audio, transcription, t])

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
        throw new Error(data?.error || t("student.assignError"))
      }
    } catch (error) {
      setAlumnesError(error instanceof Error ? error.message : t("student.assignError"))
    } finally {
      setAssigningAlumne(false)
    }
  }

  if (!audio || !transcription) {
    return null;
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-neutral-200 bg-neutral-50/60">
      {/* Title bar */}
      <div className="sticky top-0 z-10 flex h-14 items-center border-b border-neutral-200 bg-white/80 px-4 backdrop-blur-sm">
        <h2 className="text-[13px] font-semibold tracking-tight text-neutral-900">
          {t('sidebar.title')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Export */}
        <Section
          icon={<Download className="h-3.5 w-3.5 text-neutral-500" />}
          title={t("export.title")}
        >
          <div className="grid grid-cols-2 gap-1.5">
            <SidebarButton onClick={() => onExport('pdf')}>
              <FileText className="h-3.5 w-3.5 text-rose-500" />
              {t("export.pdf")}
            </SidebarButton>
            <SidebarButton onClick={() => onExport('docx')}>
              <FileText className="h-3.5 w-3.5 text-sky-500" />
              {t("export.word")}
            </SidebarButton>
            <SidebarButton
              onClick={handleCopyTranscription}
              disabled={!transcription}
              variant={isCopied ? 'success' : 'default'}
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {isCopied ? t("export.copied") : t("export.copy")}
            </SidebarButton>
            <SidebarButton onClick={handleEmailShare} disabled={!transcription}>
              <Mail className="h-3.5 w-3.5 text-neutral-500" />
              {t("export.mail")}
            </SidebarButton>
          </div>
          <SidebarButton
            full
            onClick={handleGoogleDriveShare}
            disabled={!transcription || isDriveExporting}
            className="mt-1.5"
          >
            {isDriveExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Cloud className="h-3.5 w-3.5 text-emerald-500" />
            )}
            {isDriveExporting ? t("export.exporting") : t("export.drive")}
          </SidebarButton>
        </Section>

        {/* Speakers — add / rename / recolor / delete (cap MAX_SPEAKERS) */}
        <Section
          icon={<Users className="h-3.5 w-3.5 text-neutral-500" />}
          title={t("speakers.title")}
          trailing={
            <span className="text-[10px] font-medium text-neutral-400">
              {speakers.length}/{MAX_SPEAKERS}
            </span>
          }
        >
          <SpeakersManager
            speakers={speakers}
            onChange={onSpeakersChange}
            emptyLabel={t("speakers.noSpeakers")}
          />
        </Section>

        {/* Student assignment */}
        <Section
          icon={<GraduationCap className="h-3.5 w-3.5 text-neutral-500" />}
          title={t("student.title")}
          trailing={
            assigningAlumne ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
            ) : null
          }
        >
          <Select
            value={selectedAlumne}
            onValueChange={handleAssignAlumne}
            disabled={alumnesLoading || assigningAlumne}
          >
            <SelectTrigger className="h-9 w-full bg-white text-[13px] focus:ring-1 focus:ring-neutral-300">
              <SelectValue
                placeholder={
                  alumnesLoading
                    ? t("export.exporting").replace("...", "") + "..."
                    : t("student.notAssigned")
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-[13px]">
                {t("student.notAssigned")}
              </SelectItem>
              {alumnes.map((alumne) => (
                <SelectItem
                  key={alumne.id}
                  value={alumne.id}
                  className="text-[13px]"
                >
                  {alumne.name}
                  {alumne.age !== null ? ` · ${alumne.age}a` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {alumnesError && (
            <p className="mt-1.5 text-[11px] text-rose-500">{alumnesError}</p>
          )}
        </Section>
      </div>

      {hasUnsavedChanges && (
        <div className="m-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <div className="size-1.5 animate-pulse rounded-full bg-amber-500" />
          <p className="text-[12px] font-medium text-amber-800">
            {t("unsavedChanges")}
          </p>
        </div>
      )}
    </aside>
  );
}

/* ----------------------------- Subcomponents ----------------------------- */

function Section({
  icon,
  title,
  trailing,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-neutral-200/70 p-3 last:border-b-0">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            {title}
          </p>
        </div>
        {trailing}
      </div>
      {children}
    </div>
  );
}

function SpeakersManager({
  speakers,
  onChange,
  emptyLabel,
}: {
  speakers: Speaker[];
  onChange: (next: Speaker[]) => void;
  emptyLabel: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the rename input when entering edit mode.
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startRename = (s: Speaker) => {
    setEditingId(s.id);
    setDraftName(s.name);
  };

  const commitRename = (id: string) => {
    const name = draftName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    onChange(speakers.map((s) => (s.id === id ? { ...s, name } : s)));
    setEditingId(null);
  };

  const removeSpeaker = (id: string) => {
    onChange(speakers.filter((s) => s.id !== id));
    if (editingId === id) setEditingId(null);
    if (colorPickerId === id) setColorPickerId(null);
  };

  const setColor = (id: string, color: string) => {
    onChange(speakers.map((s) => (s.id === id ? { ...s, color } : s)));
    setColorPickerId(null);
  };

  const addSpeaker = () => {
    if (speakers.length >= MAX_SPEAKERS) return;
    const fresh = createSpeaker(speakers);
    onChange([...speakers, fresh]);
    // Drop straight into rename mode for the new entry.
    setEditingId(fresh.id);
    setDraftName(fresh.name);
  };

  const canAddMore = speakers.length < MAX_SPEAKERS;

  return (
    <div className="space-y-1">
      {speakers.map((s) => {
        const isEditing = editingId === s.id;
        const showingPicker = colorPickerId === s.id;
        return (
          <div
            key={s.id}
            className="group/sp relative flex items-center gap-2 rounded-md border border-neutral-200/70 bg-white px-2 py-1.5 transition-colors hover:border-neutral-300"
          >
            {/* Color swatch — click to open inline palette */}
            <button
              type="button"
              onClick={() => setColorPickerId((cur) => (cur === s.id ? null : s.id))}
              aria-label="Change color"
              className="size-3.5 shrink-0 rounded-full ring-1 ring-inset ring-black/5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              style={{ backgroundColor: s.color }}
            />

            {/* Name (or rename input) */}
            {isEditing ? (
              <input
                ref={inputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={() => commitRename(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(s.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                maxLength={32}
                className="min-w-0 flex-1 rounded-sm bg-neutral-50 px-1 py-0.5 text-[13px] font-medium text-neutral-900 outline-none ring-1 ring-neutral-300 focus:ring-neutral-500"
              />
            ) : (
              <button
                type="button"
                onDoubleClick={() => startRename(s)}
                className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-neutral-800"
                title="Double-click to rename"
              >
                {s.name}
              </button>
            )}

            {/* Hover actions */}
            {!isEditing && (
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/sp:opacity-100">
                <button
                  type="button"
                  onClick={() => startRename(s)}
                  aria-label="Rename speaker"
                  title="Rename"
                  className="rounded-sm p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => removeSpeaker(s.id)}
                  aria-label="Delete speaker"
                  title="Delete"
                  className="rounded-sm p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            )}

            {/* Inline color picker */}
            {showingPicker && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-neutral-200 bg-white p-2 shadow-lg">
                <div className="grid grid-cols-5 gap-1.5">
                  {SPEAKER_COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(s.id, c)}
                      aria-label={`Pick ${c}`}
                      className={`size-5 rounded-full ring-1 ring-inset ring-black/10 transition-transform hover:scale-110 ${
                        s.color === c
                          ? 'outline outline-2 outline-offset-2 outline-neutral-700'
                          : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setColorPickerId(null)}
                  className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-sm py-1 text-[11px] text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
                >
                  <X className="size-3" />
                  Close
                </button>
              </div>
            )}
          </div>
        );
      })}

      {speakers.length === 0 && (
        <p className="py-2 text-center text-[11px] text-neutral-400">
          {emptyLabel}
        </p>
      )}

      {/* Add speaker */}
      <button
        type="button"
        onClick={addSpeaker}
        disabled={!canAddMore}
        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2.5 py-1.5 text-[12px] font-medium text-neutral-500 transition-colors hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
      >
        <Plus className="size-3.5" />
        {canAddMore ? 'Add speaker' : `Max ${MAX_SPEAKERS} speakers`}
      </button>
    </div>
  );
}

function SidebarButton({
  children,
  onClick,
  disabled,
  full,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  full?: boolean;
  variant?: 'default' | 'success';
  className?: string;
}) {
  const base =
    'flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50';
  const tones =
    variant === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[base, tones, full ? 'w-full' : '', className ?? ''].join(' ')}
    >
      {children}
    </button>
  );
}
