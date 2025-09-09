'use client';

import React from 'react';
import Navbar from './Navbar';
import AppSidebar from './AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  selectedAudioId?: string;
  onAudioSelect: (audioId: string) => void;
  onUploadComplete: (audioId: string) => void;
}

export default function AppLayout({ children, selectedAudioId, onAudioSelect, onUploadComplete }: AppLayoutProps) {
  return (
    <div className="h-screen flex flex-col">
      {/* Top Navbar - Full Width */}
      <Navbar />
      
      {/* Sidebar and Main Content */}
      <div className="flex-1 flex pt-[65px]">
        <SidebarProvider>
          <AppSidebar 
            selectedAudioId={selectedAudioId}
            onAudioSelect={onAudioSelect}
            onUploadComplete={onUploadComplete}
          />
          <SidebarInset>
            <div className="flex-1 h-full overflow-hidden">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
}