"use client";

// Dedupe token fetch under React Strict Mode to avoid double requests on mount
let mobileTokensFetchInFlight = false;

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  BookOpen,
  Home,
  Mic,
  Menu,
  User,
  HelpCircle,
  Loader2,
  FileText,
  LogOut,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [tokens, setTokens] = useState<number | null>(null);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokensError, setTokensError] = useState<string | null>(null);
  const { user, planType, signOut } = useAuth();

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
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
    { title: "Inici", href: "/dashboard", icon: Home },
    { title: "Transcriure", href: "/transcribe", icon: Mic },
    { title: "Biblioteca", href: "/library", icon: BookOpen },
    { title: "Blog", href: "/blog", icon: FileText },
    { title: "Alumnes", href: "/profiles", icon: User },
    { title: "Tutorials", href: "/tutorials", icon: GraduationCap },
  ];

  const getPlanInfo = () => {
    switch (planType) {
      case 'group':
        return { label: 'Grupal', color: 'bg-emerald-500' };
      case 'pro':
        return { label: 'Individual', color: 'bg-blue-500' };
      default:
        return { label: 'Gratuït', color: 'bg-gray-400' };
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

    // Prevent duplicate requests under Strict Mode double-mount
    if (mobileTokensFetchInFlight) {
      return;
    }
    mobileTokensFetchInFlight = true;

    // Shared cache key (same as desktop sidebar) so both sidebars reuse the cached value
    const cacheKey = `tokens_cache_${userId}`;
    const cachedRaw = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;
    let cached: { tokens: number; ts: number } | null = null;
    if (cachedRaw) {
      try {
        cached = JSON.parse(cachedRaw);
      } catch {}
    }

    // TTL: 120s
    if (cached && Date.now() - cached.ts < 120_000) {
      setTokens(cached.tokens);
      setTokensError(null);
      setTokensLoading(false);
      mobileTokensFetchInFlight = false;
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
      mobileTokensFetchInFlight = false;
      setTokensLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUserTokens();
  }, [fetchUserTokens]);

  return (
    <>
      {/* Mobile Sidebar Trigger Button - Fixed Bottom Left */}
      <div className="md:hidden fixed bottom-6 left-6 z-99">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="h-12 w-12 rounded-full shadow-lg bg-gray-900 hover:bg-gray-800"
            >
              <Menu className="h-5 w-5 text-white" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-slate-100">
            {/* Header with user info and plan */}
            <div className="p-3 bg-white border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <Avatar className="size-8">
                  <AvatarImage src={avatarUrl || ""} alt={userName} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-medium">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 truncate leading-tight">{userName}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full", planInfo.color)} />
                    <span className="text-[11px] text-gray-500">{planInfo.label}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col h-[calc(100%-60px)]">
              {/* Navigation Menu */}
              <div className="p-2 flex-1 overflow-y-auto">
                <div>
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <button
                        key={item.href}
                        className={cn(
                          "group relative w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                          isActive
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                        )}
                        onClick={() => {
                          router.push(item.href);
                          setIsOpen(false);
                        }}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-500 rounded-r-full" />
                        )}
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-blue-600" : "text-gray-500 group-hover:text-blue-600"
                          )}
                        />
                        <span className="truncate">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom section */}
              <div className="p-2 space-y-1 border-t border-gray-200">
                {planType === 'free' && (
                  <Link
                    href="/payment"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 text-[13px] font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors w-full"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Millora el teu pla
                  </Link>
                )}

                <button
                  onClick={() => {
                    router.push("/help");
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-[13px] font-medium text-gray-600 rounded-md hover:bg-white/80 hover:text-gray-900 transition-all w-full"
                >
                  <HelpCircle className="h-4 w-4 text-gray-400" />
                  Ajuda
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-[13px] font-medium text-red-600 rounded-md hover:bg-red-50 transition-all w-full"
                >
                  <LogOut className="h-4 w-4" />
                  Tancar Sessió
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}