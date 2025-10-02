"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  BookOpen,
  Home,
  Mic,
  Menu,
  Settings,
  Users,
  HelpCircle,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [tokens, setTokens] = useState<number | null>(null);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokensError, setTokensError] = useState<string | null>(null);
  const { user, planType } = useAuth();

  const menuItems = [
    { title: "Home", href: "/dashboard", icon: Home },
    { title: "Biblioteca", href: "/library", icon: BookOpen },
    { title: "Transcripció", href: "/transcribe", icon: Mic },
    { title: "Equip", href: "/team", icon: Users },
    { title: "Ajuda", href: "/help", icon: HelpCircle },
  ];

  const fetchUserTokens = useCallback(async () => {
    if (!user?.id) return;

    try {
      setTokensLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("tokens")
        .eq("id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          setTokens(0);
          setTokensError(null);
          return;
        }
        throw error;
      }

      setTokens(typeof data?.tokens === "number" ? data.tokens : 0);
      setTokensError(null);
    } catch (err) {
      console.error("Failed to load tokens:", err);
      setTokensError("No pudimos cargar tus tokens");
    } finally {
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
              className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-6 pb-4">
              <SheetTitle className="text-left">Menu</SheetTitle>
            </SheetHeader>
            
            <div className="flex flex-col h-full">
              {/* Navigation Menu */}
              <div className="px-6 pb-4 flex-1">
                <div className="space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Button
                        key={item.href}
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 h-10",
                          isActive && "bg-secondary"
                        )}
                        onClick={() => {
                          router.push(item.href);
                          setIsOpen(false);
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Plan and Tokens blocks at the bottom */}
              <div className="mt-auto px-6 pb-6 flex flex-col gap-3">
                <div className="rounded-lg border bg-white p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                      Pla actual
                    </p>
                    <div className="mt-1">
                      <Badge variant="secondary" className="text-sm uppercase bg-blue-500 text-white">
                        {planType || "Gratuït"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border bg-white p-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                      Transcripcions disponibles
                    </p>
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
                  {tokensError && (
                    <p className="mt-2 text-xs text-destructive">{tokensError}</p>
                  )}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}