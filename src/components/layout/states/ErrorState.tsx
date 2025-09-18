// components/layout/states/ErrorState.tsx
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Card className="border-destructive max-w-md">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p className="text-sm text-muted-foreground mb-4">{message}</p>
          <Button onClick={onRetry} variant="outline">
            Intentar de nuevo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}