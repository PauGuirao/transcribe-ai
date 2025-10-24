"use client";

// Dedupe token fetch under React Strict Mode to avoid double requests on mount
let tokensFetchInFlight = false;

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { BookOpen, Home, Mic, Clock, Loader2, CheckCircle, AlertCircle, User, GraduationCap, FileText } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { AudioUploadResult } from "@/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface AppSidebarProps {
  selectedAudioId?: string;
  onAudioSelect: (audioId: string) => void;
  onUploadComplete: (result: AudioUploadResult) => void;
}

export default function AppSidebar({ selectedAudioId, onAudioSelect, onUploadComplete }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokensError, setTokensError] = useState<string | null>(null);
  const { user, planType } = useAuth();

  const menuItems = [
    { title: "Inici", icon: Home, path: "/dashboard" },
    { title: "Transcriure", icon: Mic, path: "/transcribe" },
    { title: "Biblioteca", icon: BookOpen, path: "/library" },
    { title: "Blog", icon: FileText, path: "/blog" },
    { title: "Alumnes", icon: User, path: "/profiles" },
    { title: "Tutorials", icon: GraduationCap, path: "/tutorials" },
  ];

  const fetchUserTokens = useCallback(async () => {
    const userId = user?.id;
    if (!userId) {
      setTokens(null);
      setTokensError(null);
      return;
    }

    if (tokensFetchInFlight) {
      return;
    }
    tokensFetchInFlight = true;

    const cacheKey = `tokens_cache_${userId}`;
    const cachedRaw = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;
    let cached: { tokens: number; ts: number } | null = null;
    if (cachedRaw) {
      try {
        cached = JSON.parse(cachedRaw);
      } catch {}
    }

    if (cached && Date.now() - cached.ts < 120_000) {
      setTokens(cached.tokens);
      setTokensError(null);
      setTokensLoading(false);
      tokensFetchInFlight = false;
      return;
    }

    try {
      setTokensLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("tokens")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          setTokens(0);
          setTokensError(null);
          if (typeof window !== "undefined") {
            sessionStorage.setItem(cacheKey, JSON.stringify({ tokens: 0, ts: Date.now() }));
          }
          return;
        }
        throw error;
      }

      const tokensVal = typeof data?.tokens === "number" ? data.tokens : 0;
      setTokens(tokensVal);
      setTokensError(null);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(cacheKey, JSON.stringify({ tokens: tokensVal, ts: Date.now() }));
      }
    } catch (err) {
      console.error("Failed to load tokens:", err);
      setTokensError("No pudimos cargar tus tokens");
    } finally {
      tokensFetchInFlight = false;
      setTokensLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUserTokens();
  }, [fetchUserTokens]);
  return (
    <Sidebar className="h-[calc(100vh)] flex flex-col">
      <SidebarContent className="flex-1 overflow-y-auto pt-20 pb-24">
        <SidebarGroup>
          <SidebarMenu>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.path || pathname.startsWith(item.path + "/");

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
                    <span className={cn("truncate", active && "font-semibold")}>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto px-2 pb-4 flex flex-col gap-3">
        <div className="rounded-lg border bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wide text-foreground">Pla actual</p>
            <div className="mt-1">
              <Badge variant="secondary" className="text-sm uppercase bg-blue-500 text-white">
                {planType === 'group' ? 'Grupal' : planType === 'pro' ? 'Individual' : 'gratis'}
              </Badge>
            </div>
          </div>
          </div>
          {/* Upgrade prompt for free plan */}
          {planType === 'free' && (
            <p className="mt-2 text-sm text-gray-700 text-center">
              Vols millorar el teu pla?{' '}
              <Link href="/payment" className="text-blue-600 hover:text-blue-700 underline">
                Millora aquí
              </Link>
            </p>
          )}
        <div className="rounded-lg border bg-white p-3 hidden">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-foreground">Transcripcions disponibles</p>
            <div className="mt-1 text-2xl font-semibold">
              {tokensLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando
                </div>
              ) : (
                tokens ?? "—"
              )}
            </div>
          </div>
          {tokensError && <p className="mt-2 text-xs text-destructive">{tokensError}</p>}
        </div>
      </div>
    </Sidebar>
  );
}
