"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  LogOut,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Settings,
  Users,
  UserPlus,
  CreditCard,
  Building2,
  Check,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { AudioUploadResult } from "@/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { InviteModal } from "@/components/team/InviteModal";
import { SIDEBAR_MENU } from "@/config/sidebar-menu";
import { useUserTokens } from "@/hooks/useUserTokens";
import {
  SidebarUsageWidget,
  UsageProvider,
  useUsage,
} from "@/components/layout/SidebarUsageWidget";

interface AppSidebarProps {
  selectedAudioId?: string;
  onAudioSelect: (audioId: string) => void;
  onUploadComplete: (result: AudioUploadResult) => void;
}

export default function AppSidebar(props: AppSidebarProps) {
  return (
    <UsageProvider>
      <AppSidebarInner {...props} />
    </UsageProvider>
  );
}

function AppSidebarInner(_props: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("dashboard");
  const tNav = useTranslations("dashboard.navbar");
  const tRoles = useTranslations("team.roles");

  const translateRole = (role?: string) => {
    if (!role) return "";
    const key = role.toLowerCase();
    if (key === "owner" || key === "admin" || key === "member") {
      return tRoles(key);
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
  };
  const {
    user,
    planType,
    isSubscribed,
    checkingSubscription,
    organization,
    currentUserRole,
    signOut,
  } = useAuth();
  const { data: usage, refresh: refreshUsage } = useUsage();
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  // Warm the shared tokens cache; value is consumed by MobileSidebar / future UI.
  useUserTokens(user?.id);

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const userEmail = user?.email || "";
  const isOrgAdmin = currentUserRole === "admin" || currentUserRole === "owner";

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      router.push("/");
    }
  };

  const handleBillingPortal = async () => {
    if (!isOrgAdmin) {
      setIsPermissionDialogOpen(true);
      return;
    }
    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const { url } = await response.json();
        if (url) window.location.href = url;
      }
    } catch (error) {
      console.error("Error accessing billing portal:", error);
    }
  };

  const handleInvite = () => {
    if (!isOrgAdmin) {
      setIsPermissionDialogOpen(true);
      return;
    }
    setIsInviteModalOpen(true);
  };

  const menuItems = SIDEBAR_MENU.map((item) => ({
    title: t(`sidebar.${item.key}`),
    icon: item.icon,
    path: item.path,
  }));

  const planInfo = (() => {
    switch (planType) {
      case "group":
        return { label: t("plans.group"), color: "bg-emerald-500" };
      case "pro":
        return { label: t("plans.individual"), color: "bg-blue-500" };
      default:
        return { label: t("plans.free"), color: "bg-gray-400" };
    }
  })();

  const showUpgradeCTA =
    user && isSubscribed === false && currentUserRole === "owner";
  // Show the org switcher whenever the user belongs to 2+ orgs.
  // Data comes from the /api/usage endpoint (via useUsage()) which returns
  // the user's full org list, including the active one.
  const userOrganizations = usage?.organizations ?? [];
  const showOrgSelector = userOrganizations.length > 1;
  const currentOrgEntry =
    userOrganizations.find((o) => o.isCurrent) ?? null;

  const handleSwitchOrg = async (orgId: string) => {
    if (!orgId || switchingOrgId) return;
    if (currentOrgEntry?.id === orgId) return;
    setSwitchingOrgId(orgId);
    try {
      const res = await fetch("/api/user/current-org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgId }),
      });
      if (!res.ok) {
        console.error("Failed to switch organization:", await res.text());
        return;
      }
      await refreshUsage();
      router.refresh();
    } catch (error) {
      console.error("Error switching organization:", error);
    } finally {
      setSwitchingOrgId(null);
    }
  };

  return (
    <>
      <Sidebar className="border-r border-gray-200 bg-slate-100">
        {/* Header: always shows the active org. Dropdown adapts to the
            number of memberships — switcher list appears only when 2+. */}
        <SidebarHeader className="flex h-14 flex-row items-center gap-2 border-b border-gray-200 bg-slate-100 px-3 py-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 transition-colors hover:bg-gray-50">
                {currentOrgEntry?.imageUrl ? (
                  <Avatar className="h-6 w-6 rounded">
                    <AvatarImage
                      src={currentOrgEntry.imageUrl}
                      alt={currentOrgEntry.name}
                    />
                    <AvatarFallback className="rounded bg-gradient-to-br from-emerald-400 to-emerald-600 text-[10px] font-medium text-white">
                      {(currentOrgEntry?.name || organization?.name || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-emerald-400 to-emerald-600">
                    <Building2 className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col items-start">
                  <span className="max-w-full truncate text-[13px] font-medium leading-tight text-gray-900">
                    {currentOrgEntry?.name || organization?.name || "Carregant..."}
                  </span>
                  <span className="text-[10px] leading-tight text-gray-500">
                    {showOrgSelector
                      ? `${userOrganizations.length} organitzacions`
                      : translateRole(currentOrgEntry?.role)}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-lg border border-gray-200 p-1.5 shadow-lg"
            >
              <div className="px-2 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  {tNav("organization")}
                </p>
              </div>
              {showOrgSelector && (
                <>
                  {userOrganizations.map((org) => {
                    const isActive = org.isCurrent;
                    const isSwitching = switchingOrgId === org.id;
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        disabled={isActive || isSwitching}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px]"
                        onSelect={(e) => {
                          e.preventDefault();
                          if (!isActive) handleSwitchOrg(org.id);
                        }}
                      >
                        <Avatar className="h-5 w-5 rounded">
                          {org.imageUrl ? (
                            <AvatarImage src={org.imageUrl} alt={org.name} />
                          ) : null}
                          <AvatarFallback className="rounded bg-gradient-to-br from-emerald-400 to-emerald-600 text-[9px] font-medium text-white">
                            {(org.name || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[13px] leading-tight text-gray-900">
                            {org.name}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-gray-400">
                            {translateRole(org.role)}
                          </span>
                        </div>
                        {isActive && (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild className="cursor-pointer rounded-md text-[13px]">
                <Link href="/team" className="flex items-center gap-2 px-2 py-1.5">
                  <Users className="h-3.5 w-3.5 text-gray-500" />
                  <span>{tNav("viewTeam")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px]"
                onSelect={(e) => {
                  e.preventDefault();
                  handleInvite();
                }}
              >
                <UserPlus className="h-3.5 w-3.5 text-gray-500" />
                <span>{tNav("inviteMembers")}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px]"
                onSelect={(e) => {
                  e.preventDefault();
                  handleBillingPortal();
                }}
              >
                <CreditCard className="h-3.5 w-3.5 text-gray-500" />
                <span>{tNav("manageBilling")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent className="flex-1 overflow-y-auto py-3">
          <SidebarGroup className="px-2">
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.path ||
                  pathname.startsWith(item.path + "/");
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => router.push(item.path)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                        active
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-blue-500" />
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

        {/* Usage widget: monthly minutes used / allowance */}
        <SidebarUsageWidget />

        {/* Footer: upgrade CTA + user dropdown */}
        <SidebarFooter className="gap-2 border-t border-gray-200 bg-slate-100 p-2">
          {showUpgradeCTA && (
            <Link
              href="/payment"
              className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1.5 text-[12px] font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{checkingSubscription ? tNav("loading") : tNav("upgradePlan")}</span>
            </Link>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="group h-auto w-full items-center justify-start gap-2.5 rounded-lg px-2 py-2 transition-all hover:bg-white/80"
              >
                <Avatar className="size-8">
                  <AvatarImage src={avatarUrl || ""} alt={userName} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-medium text-white">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                  <span className="w-full truncate text-[13px] font-medium leading-tight text-gray-900">
                    {userName}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", planInfo.color)}
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
              <div className="border-b border-gray-100 px-3 py-2.5">
                <p className="truncate text-sm font-medium text-gray-900">
                  {userName}
                </p>
                <p className="truncate text-xs text-gray-500">{userEmail}</p>
              </div>
              {planType === "free" && (
                <>
                  <div className="p-1.5">
                    <Link
                      href="/payment"
                      className="flex items-center gap-2 rounded-md bg-blue-50 px-2.5 py-2 text-[13px] font-medium text-blue-600 transition-colors hover:bg-blue-100"
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
                  className="cursor-pointer rounded-md px-2.5 py-2 text-[13px] text-gray-700"
                  onSelect={(e) => {
                    e.preventDefault();
                    setIsSettingsOpen(true);
                  }}
                >
                  <Settings className="h-3.5 w-3.5 text-gray-400" />
                  {t("sidebar.settings")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer rounded-md px-2.5 py-2 text-[13px] text-gray-700"
                  asChild
                >
                  <Link href="/help">
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                    {t("sidebar.help")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer rounded-md px-2.5 py-2 text-[13px] text-red-600"
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
        </SidebarFooter>
      </Sidebar>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      <Dialog
        open={isPermissionDialogOpen}
        onOpenChange={setIsPermissionDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {tNav("restrictedAccess")}
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              {tNav("restrictedAccessDesc")}
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
