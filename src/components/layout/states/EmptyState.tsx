// components/layout/states/EmptyState.tsx
"use client";

import React, { useState } from "react";
import {
  AudioUpload,
  AudioUploadResult,
} from "@/components/audio-upload/AudioUpload";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, AlertCircle, ArrowRight, CreditCard, Check, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface EmptyStateProps {
  onUploadComplete: (result: AudioUploadResult) => void;
  onAudioSelect: (audioId: string) => void;
}

export function EmptyState({
  onUploadComplete,
  onAudioSelect,
}: EmptyStateProps) {
  const [pendingUpload, setPendingUpload] = useState<AudioUploadResult | null>(
    null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [manualTranscribeLoading, setManualTranscribeLoading] = useState(false);
  const [manualTranscribeError, setManualTranscribeError] = useState<
    string | null
  >(null);
  const { tokens } = useAuth();
  const router = useRouter();

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
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 👇 CORRECTED THIS PART
        body: JSON.stringify({
          audioId: pendingUpload.audioId,
          filename: pendingUpload.filename, // Added this line
          originalName: pendingUpload.originalName, // Added this line
          filePath: pendingUpload.filePath,
          provider: "replicate",
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "No se pudo iniciar la transcripción");
      }

      // Notify parent to switch views
      onUploadComplete(pendingUpload);
      onAudioSelect(pendingUpload.audioId);
      setPendingUpload(null);
    } catch (err) {
      setManualTranscribeError(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar la transcripción"
      );
    } finally {
      setManualTranscribeLoading(false);
    }
  };

  const handleGoToPayment = () => {
    router.push("/payment");
  };

  // If user has no tokens, show subscription message
  if (tokens === 0 || tokens === null) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center">
          <div className="mb-3 rounded-full bg-gradient-to-br from-blue-100 to-blue-100 p-4">
            <CreditCard className="h-4 w-4 text-blue-400" />
          </div>
          
          <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            No et queden tokens
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl">
            Has esgotat les transcripciones gratuites. Suscriute per continuar transcribint audios 
          </p>

          {/* Pricing Card */}
          <div className="w-full max-w-md mb-8">
            <div className="relative rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6 shadow-lg">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Más Popular
                </span>
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">Plan Pro</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold">10€</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Cancela cuando quieras</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Transcripcions il·limitades</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Models avançats amb diarització</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Exportacions il·limitades (PDF, DOCX, TXT)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Editor col·laboratiu avançat</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Suport prioritari</span>
                </div>
              </div>

              <Button 
                onClick={handleGoToPayment}
                className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                size="lg"
              >
                <CreditCard className="h-4 w-4" />
                Suscribirse ahora
              </Button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              ¿Necessites més transcripcions?
            </p>
            <p className="text-xs text-muted-foreground">
              Comença amb el pla gratuït de 5 transcripcions o actualitza al Pro per transcripcions il·limitades
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">
          Puja un audio per començar
        </h2>
        <p className="text-muted-foreground text-md">
          Arrossega el teu fitxer o selecciona des del teu ordinador. Podràs
          revisar i netejar la transcripció un cop el procés hagi acabat.
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
                    <p className="text-sm font-medium text-foreground">
                      {pendingUpload.originalName}
                    </p>
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
                        <span>Transcriure ara</span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1" />
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
                  <p className="text-xs text-destructive">
                    {manualTranscribeError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
