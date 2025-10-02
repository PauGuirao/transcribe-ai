'use client';

import React from 'react';
import Navbar from './Navbar';
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
      {/* Mobile Sidebar */}
      <MobileSidebar />
      
      {/* Top Navbar - Full Width */}
      <Navbar />
      
      {/* Desktop Layout with Sidebar */}
      <div className="hidden md:flex flex-1 pt-[65px]">
        <SidebarProvider>
          <AppSidebar 
            selectedAudioId={selectedAudioId}
            onAudioSelect={handleAudioSelect}
            onUploadComplete={handleUploadComplete}
          />
          <SidebarInset>
            <div className="flex-1 h-full overflow-hidden">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
      
      {/* Mobile Layout - Full width content */}
      <div className="md:hidden flex-1 pt-[65px] overflow-auto">
        {children}
      </div>
    </div>
  );
}
