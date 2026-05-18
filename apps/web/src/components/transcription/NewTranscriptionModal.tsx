'use client';

import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AudioUpload } from '@/components/audio-upload/AudioUpload';
import { AudioUploadResult } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called once the upload is enqueued. Drawer closes automatically before this
   * is invoked — parent can use it to optimistically add a Processing row.
   */
  onSubmitted?: (result: AudioUploadResult) => void;
  onError?: (error: string) => void;
}

export function NewTranscriptionModal({ open, onOpenChange, onSubmitted, onError }: Props) {
  const t = useTranslations('dashboard.upload');

  const handleUploadComplete = (result: AudioUploadResult) => {
    // Close immediately — transcription continues in the background.
    onOpenChange(false);
    onSubmitted?.(result);
  };

  const handleUploadError = (msg: string) => {
    onError?.(msg);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-neutral-200 px-6 py-5">
          <SheetTitle className="text-lg font-semibold text-neutral-900">
            {t('drawerTitle')}
          </SheetTitle>
          <SheetDescription className="text-sm text-neutral-600">
            {t('drawerDescription')}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AudioUpload
            variant="minimal"
            showUploadedFiles={false}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
