"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Globe, Loader2, Check, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const languages = [
  { code: "ca", name: "Català", flag: "🇦🇩" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "en", name: "English", flag: "🇬🇧" },
];

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const t = useTranslations("dashboard.settings");
  const { user, refreshTokens } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const [fullName, setFullName] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(locale);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || "");
    }
    setSelectedLanguage(locale);
  }, [user, locale, isOpen]);

  const handleSave = async () => {
    setIsUpdating(true);
    setShowSuccess(false);

    try {
      // Update user name if changed
      const currentName = user?.user_metadata?.full_name || "";
      if (fullName.trim() && fullName.trim() !== currentName) {
        const response = await fetch("/api/user/update", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ full_name: fullName.trim() }),
        });

        if (response.ok) {
          await refreshTokens();
        } else {
          console.error("Failed to update user name");
        }
      }

      // Change language if different
      if (selectedLanguage !== locale) {
        router.replace(pathname, { locale: selectedLanguage });
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (selectedLanguage === locale) {
          onClose();
        }
      }, 1000);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const userEmail = user?.email || "";

  const currentLanguage = languages.find((lang) => lang.code === locale);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
            <div className="p-1.5 bg-gray-100 rounded-lg">
              <Settings className="h-4 w-4 text-gray-600" />
            </div>
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <Separator />

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          {/* Profile Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[13px] font-medium text-gray-500">
              <User className="h-3.5 w-3.5" />
              {t("user.title")}
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                <AvatarImage src={avatarUrl || ""} alt={userName} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-medium">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900 truncate">
                  {userName}
                </p>
                <p className="text-[12px] text-gray-500 truncate">{userEmail}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="fullName"
                className="text-[13px] font-medium text-gray-700"
              >
                {t("user.fullName")}
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("user.fullNamePlaceholder")}
                className="h-9 text-[13px] border-gray-200 focus:border-blue-300 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Language Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[13px] font-medium text-gray-500">
              <Globe className="h-3.5 w-3.5" />
              {t("preferences.appLanguage")}
            </div>

            <Select
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
            >
              <SelectTrigger className="h-9 text-[13px] border-gray-200">
                <SelectValue>
                  {currentLanguage && (
                    <span className="flex items-center gap-2">
                      <span>{languages.find(l => l.code === selectedLanguage)?.flag}</span>
                      <span>{languages.find(l => l.code === selectedLanguage)?.name}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem
                    key={lang.code}
                    value={lang.code}
                    className="text-[13px]"
                  >
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-8 px-3 text-[13px] text-gray-600 hover:text-gray-900"
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isUpdating}
            className={cn(
              "h-8 px-4 text-[13px] font-medium transition-all",
              showSuccess
                ? "bg-emerald-500 hover:bg-emerald-500"
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                {t("user.updating")}
              </>
            ) : showSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                {t("saved")}
              </>
            ) : (
              t("user.saveChanges")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
