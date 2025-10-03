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
    <>
      {/* Background overlay with cutout for sidebar button */}
      <div className="fixed inset-0 z-[9999] pointer-events-none">
        {/* Top area */}
        <div className="absolute inset-x-0 top-0 bottom-24 bg-black/80 pointer-events-auto" />
        {/* Bottom area excluding button area */}
        <div className="absolute bottom-0 left-24 right-0 h-24 bg-black/80 pointer-events-auto" />
        {/* Left area excluding button area */}
        <div className="absolute bottom-0 left-0 w-24 h-16 bg-black/80 pointer-events-auto" />
      </div>
      
      {/* Content card */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <Card className="w-full max-w-md mx-auto pointer-events-auto">
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
    </>
  );
}