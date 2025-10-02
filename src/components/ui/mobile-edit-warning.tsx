'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Monitor, Smartphone } from 'lucide-react';

interface MobileEditWarningProps {
  show: boolean;
}

export function MobileEditWarning({ show }: MobileEditWarningProps) {
  if (!show){
    return null;
  }
  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex justify-center space-x-4 mb-4">
            <Smartphone className="h-8 w-8 text-muted-foreground" />
            <div className="text-2xl">→</div>
            <Monitor className="h-8 w-8 text-primary" />
          </div>
          
          <h2 className="text-lg font-semibold text-foreground">
            Edició no disponible en mòbil
          </h2>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            Per editar transcripcions correctament has d'utilitzar el teu ordinador.
          </p>
          
          <div className="pt-4">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
              Utilitza un ordinador per continuar
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}