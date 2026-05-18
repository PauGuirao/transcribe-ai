"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, HelpCircle, LogOut, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { SIDEBAR_MENU } from "@/config/sidebar-menu";
import { useUserTokens } from "@/hooks/useUserTokens";

export default function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("dashboard");
  const { user, planType, signOut } = useAuth();
  // Side-effect only: share the tokens cache with AppSidebar.
  useUserTokens(user?.id);

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      router.push("/");
    }
  };

  const menuItems = SIDEBAR_MENU.map((item) => ({
    title: t(`sidebar.${item.key}`),
    href: item.path,
    icon: item.icon,
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

  return (
    <div className="z-99 fixed bottom-6 left-6 md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            aria-label="Open menu"
            className="h-12 w-12 rounded-full bg-gray-900 shadow-lg hover:bg-gray-800"
          >
            <Menu className="h-5 w-5 text-white" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-slate-100 p-0">
          {/* Header */}
          <div className="border-b border-gray-100 bg-white p-3">
            <div className="flex items-center gap-2.5">
              <Avatar className="size-8">
                <AvatarImage src={avatarUrl || ""} alt={userName} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-medium text-white">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium leading-tight text-gray-900">
                  {userName}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", planInfo.color)} />
                  <span className="text-[11px] text-gray-500">{planInfo.label}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-[calc(100%-60px)] flex-col">
            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <button
                    key={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                      isActive
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                    )}
                    onClick={() => {
                      router.push(item.href);
                      setIsOpen(false);
                    }}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-blue-500" />
                    )}
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive
                          ? "text-blue-600"
                          : "text-gray-500 group-hover:text-blue-600",
                      )}
                    />
                    <span className="truncate">{item.title}</span>
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="space-y-1 border-t border-gray-200 p-2">
              {planType === "free" && (
                <Link
                  href="/payment"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center gap-2 rounded-md bg-blue-50 px-2.5 py-2 text-[13px] font-medium text-blue-600 transition-colors hover:bg-blue-100"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("sidebar.upgradePlan")}
                </Link>
              )}

              <button
                onClick={() => {
                  router.push("/help");
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-gray-600 transition-all hover:bg-white/80 hover:text-gray-900"
              >
                <HelpCircle className="h-4 w-4 text-gray-400" />
                {t("sidebar.help")}
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  handleSignOut();
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-red-600 transition-all hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                {t("sidebar.signOut")}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
