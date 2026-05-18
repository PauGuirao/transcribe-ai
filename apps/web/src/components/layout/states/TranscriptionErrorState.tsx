// components/layout/states/TranscriptionErrorState.tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function TranscriptionErrorState() {
  const t = useTranslations("dashboard.transcription.errorState");

  return (
    <div className="flex flex-1 items-center justify-center h-full">
      <Card className="border-destructive max-w-md">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">{t("title")}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("description")}
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            {t("refreshPage")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
