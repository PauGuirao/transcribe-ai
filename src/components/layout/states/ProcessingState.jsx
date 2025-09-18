// components/layout/states/ProcessingState.tsx
"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export function ProcessingState() {
  return (
    <div className="flex flex-1 items-center justify-center h-full">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-semibold mb-2">Procesando Audio</h2>
        <p className="text-muted-foreground">
          Tu audio está siendo transcrito. Esto puede tomar unos minutos.
        </p>
      </div>
    </div>
  );
}
