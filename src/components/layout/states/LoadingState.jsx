// components/layout/states/LoadingState.tsx
import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="flex-1 flex items-center justify-center mr-80">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Cargant transcripció...</p>
      </div>
    </div>
  );
}
