// components/layout/states/ProcessingState.tsx
// Note: You can keep this in the same file as ProcessingState or create a new one.

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function TranscriptionErrorState() {
  return (
    <div className="flex flex-1 items-center justify-center h-full">
      <Card className="border-destructive max-w-md">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Error en la Transcripción</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Hubo un error procesando tu archivo de audio. Por favor, intenta subirlo de nuevo.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Actualizar Página
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}