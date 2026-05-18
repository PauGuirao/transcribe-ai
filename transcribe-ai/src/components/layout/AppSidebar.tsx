"use client";

// Dedupe token fetch under React Strict Mode to avoid double requests on mount
let tokensFetchInFlight = false;

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  Home,
  Mic,
  Loader2,
  User,
  GraduationCap,
  FileText,
  Sparkles,
  LogOut,
  HelpCircle,
  ChevronUp,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AudioUploadResult } from "@/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { SettingsDialog } from "@/components/settings/SettingsDialog";

interface AppSidebarProps {
  selectedAudioId?: string;
  onAudioSelect: (audioId: string) => void;
  onUploadComplete: (result: AudioUploadResult) => void;
}

export default function AppSidebar({
  selectedAudioId,
  onAudioSelect,
  onUploadComplete,
}: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokensError, setTokensError] = useState<string | null>(null);
  const { user, planType, signOut, refreshTokens } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const userEmail = user?.email || "";

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      router.push("/");
    }
  };

  const menuItems = [
    { title: t("sidebar.home"), icon: Home, path: "/dashboard" },
    { title: t("sidebar.transcribe"), icon: Mic, path: "/transcribe" },
    { title: t("sidebar.library"), icon: BookOpen, path: "/library" },
    { title: t("sidebar.blog"), icon: FileText, path: "/blog" },
    { title: t("sidebar.students"), icon: User, path: "/profiles" },
    { title: t("sidebar.tutorials"), icon: GraduationCap, path: "/tutorials" },
  ];

  const getPlanInfo = () => {
    switch (planType) {
      case "group":
        return { label: t("plans.group"), color: "bg-emerald-500" };
      case "pro":
        return { label: t("plans.individual"), color: "bg-blue-500" };
      default:
        return { label: t("plans.free"), color: "bg-gray-400" };
    }
  };

  const planInfo = getPlanInfo();

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
    const cachedRaw =
      typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;
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
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({ tokens: 0, ts: Date.now() }),
            );
          }
          return;
        }
        throw error;
      }

      const tokensVal = typeof data?.tokens === "number" ? data.tokens : 0;
      setTokens(tokensVal);
      setTokensError(null);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({ tokens: tokensVal, ts: Date.now() }),
        );
      }
    } catch (err) {
      console.error("Failed to load tokens:", err);
      setTokensError(t("sidebar.tokenError"));
    } finally {
      tokensFetchInFlight = false;
      setTokensLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUserTokens();
  }, [fetchUserTokens]);
  return (
    <>
    <Sidebar className="h-[calc(100vh)] flex flex-col border-r border-gray-200 bg-slate-100">
      <SidebarContent className="flex-1 overflow-y-auto pt-14 pb-4">
        <SidebarGroup className="px-2">
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
                      "group relative w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                      active
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-500 rounded-r-full" />
                    )}
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active
                          ? "text-blue-600"
                          : "text-gray-500 group-hover:text-blue-600",
                      )}
                    />
                    <span className="truncate">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Bottom section - User with integrated plan */}
      <div className="mt-auto p-2 border-t border-gray-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="group w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/80 justify-start transition-all h-auto"
            >
              <Avatar className="size-8">
                <AvatarImage src={avatarUrl || ""} alt={userName} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-medium">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-[13px] font-medium text-gray-900 truncate w-full leading-tight">
                  {userName}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn("w-1.5 h-1.5 rounded-full", planInfo.color)}
                  />
                  <span className="text-[11px] text-gray-500">
                    {planInfo.label}
                  </span>
                </div>
              </div>
              <ChevronUp className="h-3.5 w-3.5 text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-lg border border-gray-200 p-0 shadow-lg"
            side="top"
            align="start"
            sideOffset={4}
          >
            <div className="px-3 py-2.5 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userName}
              </p>
              <p className="text-xs text-gray-500 truncate">{userEmail}</p>
            </div>
            {planType === "free" && (
              <>
                <div className="p-1.5">
                  <Link
                    href="/payment"
                    className="flex items-center gap-2 px-2.5 py-2 text-[13px] font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {t("sidebar.upgradePlan")}
                  </Link>
                </div>
                <DropdownMenuSeparator className="my-0" />
              </>
            )}
            <div className="p-1.5">
              <DropdownMenuItem
                className="px-2.5 py-2 text-[13px] text-gray-700 rounded-md cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  setIsSettingsOpen(true);
                }}
              >
                <Settings className="h-3.5 w-3.5 text-gray-400" />
                {t("sidebar.settings")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="px-2.5 py-2 text-[13px] text-gray-700 rounded-md cursor-pointer"
                asChild
              >
                <Link href="/help">
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                  {t("sidebar.help")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="px-2.5 py-2 text-[13px] text-red-600 rounded-md cursor-pointer"
                onSelect={(event) => {
                  event.preventDefault();
                  handleSignOut();
                }}
                variant="destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t("sidebar.signOut")}
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Sidebar>

    {/* Settings Dialog */}
    <SettingsDialog
      isOpen={isSettingsOpen}
      onClose={() => setIsSettingsOpen(false)}
    />
    </>
  );
}
