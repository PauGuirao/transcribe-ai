'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { BookOpen, Home, Mic, Clock, Loader2, CheckCircle, AlertCircle, RefreshCw, PenTool } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { AudioUpload, AudioUploadResult } from '@/components/audio-upload/AudioUpload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Audio } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AppSidebarProps {
  selectedAudioId?: string;
  onAudioSelect: (audioId: string) => void;
  onUploadComplete: (result: AudioUploadResult) => void;
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
  const [tokens, setTokens] = useState<number | null>(null);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokensError, setTokensError] = useState<string | null>(null);
  const { user } = useAuth();
  
  const isTranscribePage = pathname === '/transcribe';

  const menuItems = [
    {
      title: 'Inici',
      icon: Home,
      path: '/dashboard',
    },
    {
      title: 'Transcriure',
      icon: Mic,
      path: '/transcribe',
    },
    {
      title: 'Anotar',
      icon: PenTool,
      path: '/annotate',
    },
    {
      title: 'Biblioteca',
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

  const fetchUserTokens = useCallback(async () => {
    if (!user?.id) {
      setTokens(null);
      setTokensError(null);
      return;
    }

    try {
      setTokensLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('tokens')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setTokens(0);
          setTokensError(null);
          return;
        }
        throw error;
      }

      setTokens(typeof data?.tokens === 'number' ? data.tokens : 0);
      setTokensError(null);
    } catch (err) {
      console.error('Failed to load tokens:', err);
      setTokensError('No pudimos cargar tus tokens');
    } finally {
      setTokensLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUserTokens();
  }, [fetchUserTokens]);

  const handleUploadComplete = (result: AudioUploadResult) => {
    onUploadComplete(result);
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
    <Sidebar className="h-[calc(100vh)] flex flex-col">
      <SidebarContent className="flex-1 overflow-y-auto pt-18 pb-24">
        <SidebarGroup>
          <SidebarMenu>
  {menuItems.map((item) => {
    const Icon = item.icon;
    const active =
      pathname === item.path || pathname.startsWith(item.path + "/");

    return (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton
          onClick={() => router.push(item.path)}
          aria-current={active ? "page" : undefined}
          className={cn(
            "group w-full flex items-center gap-2 rounded-sm px-3 py-2 text-sm transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30",
            active
              ? "bg-black/80 text-white shadow-sm hover:bg-black"
              : "text-gray-900 hover:bg-gray-100 hover:text-black hover:translate-x-[2px]"
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4 transition-colors",
              active ? "text-white" : "text-gray-800 group-hover:text-black"
            )}
          />
          <span className={cn("truncate", active && "font-semibold")}>
            {item.title}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  })}
</SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto px-3 pb-4">
        <div className="rounded-lg border bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Transcripcions disponibles
              </p>
              <div className="mt-1 text-2xl font-semibold">
                {tokensLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando
                  </div>
                ) : (
                  tokens ?? '—'
                )}
              </div>
            </div>
          </div>
          {tokensError && (
            <p className="mt-2 text-xs text-destructive">{tokensError}</p>
          )}
        </div>
      </div>
    </Sidebar>
  );
}
