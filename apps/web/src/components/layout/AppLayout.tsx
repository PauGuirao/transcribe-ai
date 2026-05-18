'use client';

import React from 'react';
import AppSidebar from './AppSidebar';
import MobileSidebar from './MobileSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AudioUploadResult } from '@/types';

interface AppLayoutProps {
  children: React.ReactNode;
  selectedAudioId?: string;
  onAudioSelect?: (audioId: string) => void;
  onUploadComplete?: (result: AudioUploadResult) => void;
}

export default function AppLayout({ children, selectedAudioId, onAudioSelect, onUploadComplete }: AppLayoutProps) {
  const noopSelect: (audioId: string) => void = () => {};
  const noopUpload: (result: AudioUploadResult) => void = () => {};
  const handleAudioSelect = onAudioSelect ?? noopSelect;
  const handleUploadComplete = onUploadComplete ?? noopUpload;

  return (
    <div className="h-screen flex flex-col">
      {/* Mobile: floating menu FAB + Sheet */}
      <MobileSidebar />

      {/* Desktop: full-height sidebar + content (no top navbar) */}
      <div className="hidden md:flex flex-1 min-h-0">
        <SidebarProvider>
          <AppSidebar
            selectedAudioId={selectedAudioId}
            onAudioSelect={handleAudioSelect}
            onUploadComplete={handleUploadComplete}
          />
          <SidebarInset className="bg-white">
            <div className="flex-1 h-full overflow-hidden">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>

      {/* Mobile content */}
      <div className="md:hidden flex-1 overflow-auto bg-white">
        {children}
      </div>
    </div>
  );
}
