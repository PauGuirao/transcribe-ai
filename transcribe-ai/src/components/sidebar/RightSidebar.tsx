'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Info, Loader2, Copy, Check, FileText, Mail, Cloud, ChevronDown } from 'lucide-react';
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
    <div className="fixed top-[73px] right-0 bottom-0 w-60 bg-gray-50/80 backdrop-blur-sm border-l border-gray-200/60 flex flex-col z-40 max-md:relative max-md:top-0 max-md:w-full max-md:border-l-0 max-md:border-t">
      <div className="flex-1 overflow-y-auto">
        {/* Export Section */}
        <div className="p-3 border-b border-gray-200/60">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("export.title")}</p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onExport('pdf')}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-gray-700 bg-white rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <FileText className="h-3 w-3 text-red-500" />
              {t("export.pdf")}
            </button>
            <button
              onClick={() => onExport('docx')}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-gray-700 bg-white rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <FileText className="h-3 w-3 text-blue-500" />
              {t("export.word")}
            </button>
            <button
              onClick={handleCopyTranscription}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium rounded-md border transition-all ${
                isCopied
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-gray-700 bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              disabled={!transcription}
            >
              {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {isCopied ? t("export.copied") : t("export.copy")}
            </button>
            <button
              onClick={handleEmailShare}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-gray-700 bg-white rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              disabled={!transcription}
            >
              <Mail className="h-3 w-3" />
              {t("export.mail")}
            </button>
          </div>
          <button
            onClick={handleGoogleDriveShare}
            className="w-full mt-1.5 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-gray-700 bg-white rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50"
            disabled={!transcription || isDriveExporting}
          >
            {isDriveExporting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Cloud className="h-3 w-3" />
            )}
            {isDriveExporting ? t("export.exporting") : t("export.drive")}
          </button>
        </div>

        {/* Speakers Section */}
        <div className="p-3 border-b border-gray-200/60">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("speakers.title")}</p>
          <div className="space-y-1">
            {speakers.map((speaker) => (
              <div key={speaker.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white border border-gray-100">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: speaker.color }}
                />
                <span className="text-[12px] font-medium text-gray-700">{speaker.name}</span>
              </div>
            ))}
            {speakers.length === 0 && (
              <p className="text-[11px] text-gray-400 text-center py-2">
                {t("speakers.noSpeakers")}
              </p>
            )}
          </div>
        </div>

        {/* Student Assignment Section */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t("student.title")}</p>
            {assigningAlumne && (
              <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
            )}
          </div>
          <Select
            value={selectedAlumne}
            onValueChange={handleAssignAlumne}
            disabled={alumnesLoading || assigningAlumne}
          >
            <SelectTrigger className="w-full h-8 text-[12px] bg-white border-gray-200 focus:ring-1 focus:ring-gray-300">
              <SelectValue placeholder={alumnesLoading ? t("export.exporting").replace("...", "") + "..." : t("student.notAssigned")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-[12px]">{t("student.notAssigned")}</SelectItem>
              {alumnes.map((alumne) => (
                <SelectItem key={alumne.id} value={alumne.id} className="text-[12px]">
                  {alumne.name}{alumne.age !== null ? ` · ${alumne.age}a` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {alumnesError && (
            <p className="mt-1.5 text-[10px] text-red-500">{alumnesError}</p>
          )}
        </div>
      </div>

      {/* Unsaved changes notification */}
      {hasUnsavedChanges && (
        <div className="m-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-[11px] font-medium text-amber-700">{t("unsavedChanges")}</p>
        </div>
      )}
    </div>
  );
}
