'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { BookOpen, Home, Mic, Clock, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { AudioUpload } from '@/components/audio-upload/AudioUpload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Audio } from '@/types';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  selectedAudioId?: string;
  onAudioSelect: (audioId: string) => void;
  onUploadComplete: (audioId: string) => void;
}

const getStatusIcon = (status: Audio['status']) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusColor = (status: Audio['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function AppSidebar({ selectedAudioId, onAudioSelect, onUploadComplete }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [audioFiles, setAudioFiles] = useState<Audio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isTranscribePage = pathname === '/transcribe';

  const menuItems = [
    {
      title: 'Home',
      icon: Home,
      path: '/dashboard',
    },
    {
      title: 'Transcribe',
      icon: Mic,
      path: '/transcribe',
    },
    {
      title: 'Library',
      icon: BookOpen,
      path: '/library',
    },
  ];

  const fetchAudioFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/audio');
      if (!response.ok) {
        throw new Error('Failed to fetch audio files');
      }
      const data = await response.json();
      setAudioFiles(data.audioFiles || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audio files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isTranscribePage) {
      fetchAudioFiles();
    }
  }, [isTranscribePage]);

  const handleUploadComplete = (audioId: string) => {
    onUploadComplete(audioId);
    fetchAudioFiles(); // Refresh the list
  };

  const handleUploadError = (error: string) => {
    setError(error);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Sidebar className="h-[calc(100vh)]">
      <SidebarContent className="pt-18">
        <SidebarGroup>
          <SidebarMenu>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    onClick={() => router.push(item.path)}
                    className={isActive ? 'bg-gray-100' : ''}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
        
        {isTranscribePage && (
          <>
            <Separator className="my-4" />
            
            {/* Upload Section */}
            <SidebarGroup>
              <div className="px-2">
                <h3 className="text-sm font-semibold mb-2">Upload Audio</h3>
                <AudioUpload
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                />
              </div>
            </SidebarGroup>
            
            <Separator className="my-4" />
            
            {/* Audio Files List */}
            <SidebarGroup>
              <div className="px-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Audio Files</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchAudioFiles}
                    disabled={loading}
                  >
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  ) : error ? (
                    <div className="text-sm text-red-600 p-2 bg-red-50 rounded">
                      {error}
                    </div>
                  ) : audioFiles.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No audio files yet
                    </div>
                  ) : (
                    audioFiles.map((audio) => (
                      <div
                        key={audio.id}
                        className={cn(
                          "p-2 rounded-lg border cursor-pointer transition-colors",
                          selectedAudioId === audio.id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted"
                        )}
                        onClick={() => onAudioSelect(audio.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {audio.customName || audio.originalName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(audio.uploadDate)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", getStatusColor(audio.status))}
                            >
                              {audio.status}
                            </Badge>
                            {getStatusIcon(audio.status)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}