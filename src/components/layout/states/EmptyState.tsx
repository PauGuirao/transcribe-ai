// components/layout/states/EmptyState.tsx
'use client';

import React, { useState } from 'react';
import { AudioUpload, AudioUploadResult } from '@/components/audio-upload/AudioUpload';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  onUploadComplete: (result: AudioUploadResult) => void;
  onAudioSelect: (audioId: string) => void;
}

export function EmptyState({ onUploadComplete, onAudioSelect }: EmptyStateProps) {
  const [pendingUpload, setPendingUpload] = useState<AudioUploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [manualTranscribeLoading, setManualTranscribeLoading] = useState(false);
  const [manualTranscribeError, setManualTranscribeError] = useState<string | null>(null);

  const handleManualUploadComplete = (result: AudioUploadResult) => {
    setPendingUpload(result);
    setUploadError(null);
    setManualTranscribeError(null);
  };

  const handleManualUploadError = (message: string) => {
    setUploadError(message);
    setPendingUpload(null);
  };

  const handleManualTranscribe = async () => {
    if (!pendingUpload) return;

    setManualTranscribeLoading(true);
    setManualTranscribeError(null);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 👇 CORRECTED THIS PART
        body: JSON.stringify({
          audioId: pendingUpload.audioId,
          filename: pendingUpload.filename,       // Added this line
          originalName: pendingUpload.originalName, // Added this line
          filePath: pendingUpload.filePath,
          provider: 'replicate',
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || 'No se pudo iniciar la transcripción');
      }

      // Notify parent to switch views
      onUploadComplete(pendingUpload);
      onAudioSelect(pendingUpload.audioId);
      setPendingUpload(null);
    } catch (err) {
      setManualTranscribeError(
        err instanceof Error ? err.message : 'No se pudo iniciar la transcripción'
      );
    } finally {
      setManualTranscribeLoading(false);
    }
};
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Sube un audio para empezar</h2>
        <p className="text-muted-foreground text-md">
          Arrastra tu archivo o selecciónalo desde tu ordenador. Podrás revisar y limpiar la
          transcripción una vez que el proceso termine.
        </p>

        {uploadError && (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-destructive/60 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{uploadError}</span>
          </div>
        )}

        <div className="mt-6 w-full rounded-3xl border border-dashed border-muted-foreground/40 bg-background/60 p-4 text-left shadow-sm">
          <div className="space-y-4">   
            <AudioUpload
              autoTranscribe={false}
              variant="minimal"
              showUploadedFiles={false}
              onUploadComplete={handleManualUploadComplete}
              onUploadError={handleManualUploadError}
            />

            {pendingUpload && (
              <div className="space-y-4 rounded-2xl border border-muted-foreground/20 bg-muted/30 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{pendingUpload.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      Archivo listo. Inicia la transcripción cuando quieras.
                    </p>
                  </div>
                  <Button
  className="relative gap-2 group overflow-hidden"
  onClick={handleManualTranscribe}
  disabled={manualTranscribeLoading}
>
  {manualTranscribeLoading ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      Transcribiendo...
    </>
  ) : (
    <>
      <span>Transcribir ahora</span>
      <ArrowRight
        className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1"
      />
      {/* underline grows in on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-current/40 transition-transform duration-300 ease-out group-hover:scale-x-100"
      />
    </>
  )}
</Button>
                </div>
                {manualTranscribeError && (
                  <p className="text-xs text-destructive">{manualTranscribeError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
