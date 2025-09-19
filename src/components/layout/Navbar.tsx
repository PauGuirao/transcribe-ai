"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  List,
  CreditCard,
  Settings,
  BadgeCheck,
  LogOut,
  ChevronDown,
  Sparkles,
} from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const router = useRouter();
  const { user, signOut, isSubscribed, checkingSubscription } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      router.push("/");
    }
  };

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const userEmail = user?.email || "";

  return (
    <div className="fixed top-0 left-0 right-0 w-full bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-50">
      <div className="flex items-center space-x-2">
        <Link href="/">
          <img src="/logo3.png" alt="TranscribeAI Logo" className="h-10" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">transcriu</h1>
      </div>
      <div className="flex items-center gap-3">
        {user && isSubscribed === false && (
          <Button
            asChild
            size="sm"
            className="gap-2 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/payment">
              <Sparkles className="h-4 w-4" />
              {checkingSubscription ? "Cargant..." : "Millorar el pla"}
            </Link>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="group flex items-center gap-3 rounded-sm border border-border bg-muted/40 px-3 py-2 shadow-sm hover:bg-muted"
            >
              <Avatar className="size-6">
                <AvatarImage src={avatarUrl || ""} alt={userName} />
                <AvatarFallback>
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span>{userName}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 rounded-sm border border-border/70 p-0 shadow-xl">
            <div className="space-y-1 rounded-t-3xl bg-muted/60 p-4">
              <DropdownMenuLabel className="p-0 text-base font-semibold">
                {userName}
              </DropdownMenuLabel>
              <p className="truncate text-sm text-muted-foreground">
                {userEmail}
              </p>
            </div>
            <DropdownMenuSeparator className="my-0" />
            <div className="py-2">
              <DropdownMenuItem className="px-4">
                <BadgeCheck className="h-4 w-4 text-orange-500" />
                Gestionar suscripción
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator className="my-0" />
            <DropdownMenuItem
              className="px-4 py-3 text-destructive"
              onSelect={(event) => {
                event.preventDefault();
                handleSignOut();
              }}
              variant="destructive"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
