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
  Users,
  HelpCircle,
  UserPlus,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { InviteModal } from "@/components/team/InviteModal";

export default function Navbar() {
  const router = useRouter();
  const { user, signOut, isSubscribed, checkingSubscription, organization, organizationMembers, currentUserRole } = useAuth();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);

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
        <h1 className="hidden md:block text-xl font-semibold text-gray-900">transcriu</h1>
      </div>
      <div className="flex items-center gap-3">
        {user && isSubscribed === false && currentUserRole === 'owner' && (
          <Button
            asChild
            size="sm"
            className="gap-2 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/payment">
              <Sparkles className="h-4 w-4" />
              {checkingSubscription ? "Carregant..." : "Millorar el pla"}
            </Link>
          </Button>
        )}
        
        {/* Organization display - only show for group plan and hide on mobile */}
        {organization && organization.plan_type === 'group' && (
          <div className="hidden md:block">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 px-4 py-1 bg-white rounded-md border-2 border-border shadow-md hover:bg-gray-50 transition-colors cursor-pointer">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground truncate max-w-32">
                    {organization.name}
                  </span>
                  {organizationMembers && (
                    <span className="text-xs text-muted-foreground">
                      {organizationMembers.length} {organizationMembers.length === 1 ? 'membre' : 'membres'}
                    </span>
                  )}
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 rounded-sm border border-border/70 p-0 shadow-xl">
              <div className="space-y-1 rounded-t-3xl bg-muted/60 p-4">
                <DropdownMenuLabel className="p-0 text-base font-semibold">
                  {organization?.name}
                </DropdownMenuLabel>
                <p className="truncate text-sm text-muted-foreground">
                  {organizationMembers?.length || 0} {organizationMembers?.length === 1 ? 'membre' : 'membres'}
                </p>
              </div>
              <DropdownMenuSeparator className="my-0" />
              <div className="py-2">
                <DropdownMenuItem className="px-4" asChild>
                  <Link href="/team">
                    <Users className="h-4 w-4 text-black" />
                    Equip
                  </Link>
                </DropdownMenuItem>
                {/* Show invite option for all users, but check permissions on click */}
                <DropdownMenuItem 
                  className="px-4"
                  onSelect={(event) => {
                    event.preventDefault();
                    if (currentUserRole && (currentUserRole === 'admin' || currentUserRole === 'owner')) {
                      setIsInviteModalOpen(true);
                    } else {
                      setIsPermissionDialogOpen(true);
                    }
                  }}
                >
                  <UserPlus className="h-4 w-4 text-black" />
                  Convidar membres
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="px-4"
                  onSelect={async (event) => {
                    event.preventDefault();
                    if (currentUserRole && (currentUserRole === 'admin' || currentUserRole === 'owner')) {
                      try {
                        const response = await fetch('/api/stripe/customer-portal', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                        });
                        
                        if (response.ok) {
                          const { url } = await response.json();
                          if (url) {
                            window.location.href = url;
                          }
                        } else {
                          console.error('Error accessing billing portal');
                        }
                      } catch (error) {
                        console.error('Error accessing billing portal:', error);
                      }
                    } else {
                      setIsPermissionDialogOpen(true);
                    }
                  }}
                >
                  <BadgeCheck className="h-4 w-4 text-black" />
                  Gestionar suscripció
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="group flex items-center gap-3 rounded-sm border border-border bg-muted/40 px-3 py-6 shadow-sm hover:bg-muted"
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
              <DropdownMenuItem className="px-4" asChild>
                <Link href="/help">
                  <HelpCircle className="h-4 w-4 text-black" />
                  Ajuda
                </Link>
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
              Tancar Sessió
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <InviteModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
      
      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accés restringit</DialogTitle>
            <DialogDescription>
              Aquesta funcionalitat només està disponible per a administradors i propietaris de l'organització.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsPermissionDialogOpen(false)}>
              D'acord
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
