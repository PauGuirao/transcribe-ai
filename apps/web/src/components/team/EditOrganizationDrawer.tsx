"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Loader2, Save } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EditOrganizationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: {
    id: string;
    name: string;
    description?: string | null;
    image_url?: string | null;
  };
  onSaved?: () => void | Promise<void>;
}

const NAME_MAX = 100;
const DESC_MAX = 500;

export function EditOrganizationDrawer({
  open,
  onOpenChange,
  organization,
  onSaved,
}: EditOrganizationDrawerProps) {
  const t = useTranslations("dashboard.team.editDrawer");

  const [name, setName] = useState(organization.name ?? "");
  const [description, setDescription] = useState(organization.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(organization.image_url ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(organization.name ?? "");
      setDescription(organization.description ?? "");
      setImageUrl(organization.image_url ?? null);
      setError(null);
    }
  }, [open, organization.id, organization.name, organization.description, organization.image_url]);

  const handleImageSelect = async (file: File) => {
    setError(null);
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/organization/image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || t("errors.uploadFailed"));
      }
      setImageUrl(data.imageUrl ?? data.organization?.image_url ?? null);
      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.uploadFailed"));
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setError(null);
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError(t("errors.nameTooShort"));
      return;
    }
    if (trimmedName.length > NAME_MAX) {
      setError(t("errors.nameTooLong"));
      return;
    }
    if (description.trim().length > DESC_MAX) {
      setError(t("errors.descTooLong"));
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/organization/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || t("errors.saveFailed"));
      }

      await onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const initials = (name || organization.name || "O").charAt(0).toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {imageUrl ? <AvatarImage src={imageUrl} alt={name} /> : null}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("logoLabel")}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage || isSaving}
                  className="flex items-center gap-2"
                >
                  {isUploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {isUploadingImage ? t("uploading") : t("changeImage")}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageSelect(file);
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{t("imageHint")}</p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-org-name">{t("nameLabel")}</Label>
            <Input
              id="edit-org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              placeholder={t("namePlaceholder")}
              disabled={isSaving}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-org-description">{t("descriptionLabel")}</Label>
            <Textarea
              id="edit-org-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESC_MAX}
              rows={4}
              placeholder={t("descriptionPlaceholder")}
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/{DESC_MAX}
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving || isUploadingImage}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isUploadingImage || !name.trim()}
            className="flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? t("saving") : t("save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
