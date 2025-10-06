"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Upload, ArrowRight, Mic } from "lucide-react";

function SharedAudioHandlerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showSharedMessage, setShowSharedMessage] = useState(false);
  const [uploadedAudioId, setUploadedAudioId] = useState<string | null>(null);

  useEffect(() => {
    const uploaded = searchParams.get('uploaded');
    const message = searchParams.get('message');

    if (uploaded && message) {
      setUploadedAudioId(uploaded);
      setShowSharedMessage(true);

      // Clean up URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('uploaded');
      newUrl.searchParams.delete('message');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  const handleViewTranscription = () => {
    if (uploadedAudioId) {
      router.push(`/transcribe?audio=${uploadedAudioId}`);
    }
    setShowSharedMessage(false);
  };

  const handleStartTranscription = async () => {
    if (!uploadedAudioId) return;

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioId: uploadedAudioId,
        }),
      });

      if (response.ok) {
        router.push(`/transcribe?audio=${uploadedAudioId}`);
      } else {
        console.error("Error starting transcription");
      }
    } catch (error) {
      console.error('Error starting transcription:', error);
    }
    
    setShowSharedMessage(false);
  };

  const handleDismiss = () => {
    setShowSharedMessage(false);
  };

  if (!showSharedMessage || !uploadedAudioId) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">Fitxer Pujat Correctament!</CardTitle>
          <CardDescription>
            El teu fitxer d'àudio s'ha pujat des de l'aplicació compartida. Què vols fer ara?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={handleStartTranscription} 
            className="w-full"
            size="lg"
          >
            <Mic className="h-4 w-4 mr-2" />
            Començar Transcripció
          </Button>
          
          <Button 
            onClick={handleViewTranscription} 
            variant="outline" 
            className="w-full"
            size="lg"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Veure Fitxer
          </Button>
          
          <Button 
            onClick={handleDismiss} 
            variant="ghost" 
            className="w-full"
            size="sm"
          >
            Tancar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SharedAudioHandler() {
  return (
    <Suspense fallback={null}>
      <SharedAudioHandlerContent />
    </Suspense>
  );
}