"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  Sparkles,
  Users,
  UserPlus,
  CreditCard,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useAuth } from "@/contexts/AuthContext";
import { InviteModal } from "@/components/team/InviteModal";

export default function Navbar() {
  const t = useTranslations("dashboard.navbar");
  const { user, isSubscribed, checkingSubscription, organization, organizationMembers, currentUserRole } = useAuth();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);

  const handleBillingPortal = async () => {
    if (currentUserRole && (currentUserRole === 'admin' || currentUserRole === 'owner')) {
      try {
        const response = await fetch('/api/stripe/customer-portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const { url } = await response.json();
          if (url) window.location.href = url;
        }
      } catch (error) {
        console.error('Error accessing billing portal:', error);
      }
    } else {
      setIsPermissionDialogOpen(true);
    }
  };

  const handleInvite = () => {
    if (currentUserRole && (currentUserRole === 'admin' || currentUserRole === 'owner')) {
      setIsInviteModalOpen(true);
    } else {
      setIsPermissionDialogOpen(true);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md border-b border-gray-200/60 z-50">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left: Logo & Brand */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <Image
              src="/logo3.png"
              alt="Transcriu Logo"
              width={28}
              height={28}
              className="transition-transform group-hover:scale-105"
            />
            <span className="hidden sm:block text-[15px] font-semibold text-gray-900">
              transcriu
            </span>
          </Link>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Upgrade CTA - Only for non-subscribed owners */}
            {user && isSubscribed === false && currentUserRole === 'owner' && (
              <Link
                href="/payment"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-md hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {checkingSubscription ? t("loading") : t("upgradePlan")}
                </span>
              </Link>
            )}

            {/* Organization Selector - Right side */}
            {organization && organization.plan_type === 'group' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors group">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                      <Building2 className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[13px] font-medium text-gray-900 leading-tight max-w-[120px] truncate">
                        {organization.name}
                      </span>
                      <span className="text-[10px] text-gray-500 leading-tight">
                        {organizationMembers?.length || 0} {t("members")}
                      </span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 p-1.5 rounded-lg border border-gray-200 shadow-lg"
                >
                  {/* Team header */}
                  <div className="px-2 py-2 mb-1">
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t("organization")}</p>
                    <p className="text-[13px] font-semibold text-gray-900 truncate mt-0.5">{organization.name}</p>
                  </div>

                  <div className="h-px bg-gray-100 my-1" />

                  <DropdownMenuItem asChild className="rounded-md text-[13px] cursor-pointer">
                    <Link href="/team" className="flex items-center gap-2 px-2 py-1.5">
                      <Users className="h-3.5 w-3.5 text-gray-500" />
                      <span>{t("viewTeam")}</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="rounded-md text-[13px] cursor-pointer flex items-center gap-2 px-2 py-1.5"
                    onSelect={(e) => { e.preventDefault(); handleInvite(); }}
                  >
                    <UserPlus className="h-3.5 w-3.5 text-gray-500" />
                    <span>{t("inviteMembers")}</span>
                  </DropdownMenuItem>

                  <div className="h-px bg-gray-100 my-1" />

                  <DropdownMenuItem
                    className="rounded-md text-[13px] cursor-pointer flex items-center gap-2 px-2 py-1.5"
                    onSelect={(e) => { e.preventDefault(); handleBillingPortal(); }}
                  >
                    <CreditCard className="h-3.5 w-3.5 text-gray-500" />
                    <span>{t("manageBilling")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-14" />

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      {/* Permission Dialog */}
      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{t("restrictedAccess")}</DialogTitle>
            <DialogDescription className="text-[13px]">
              {t("restrictedAccessDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setIsPermissionDialogOpen(false)}
              size="sm"
              className="text-[13px]"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
