"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { PageSkeleton } from "@/components/layout/states/PageSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  User,
  Users,
  Cog,
  Save,
  Building2,
  Crown,
  Bell,
  Lock,
  Palette,
  Camera,
  Loader2
} from "lucide-react";

export default function SettingsPage() {
  const t = useTranslations("dashboard.settings");
  const { user, organization, currentUserRole, loading, refreshTokens, refreshOrganizationData } = useAuth();
  const [activeTab, setActiveTab] = useState("user");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (user && organization) {
      setIsLoading(false);
    }
  }, [user, organization]);

  const handleUserNameUpdate = async (formData: FormData) => {
    const fullName = formData.get('fullName') as string;
    if (!fullName?.trim()) return;

    setIsUpdatingUser(true);
    try {
      const response = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ full_name: fullName.trim() }),
      });

      if (response.ok) {
        await refreshTokens();
      } else {
        const error = await response.json();
        console.error('Failed to update user name:', error.error);
      }
    } catch (error) {
      console.error('Error updating user name:', error);
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleOrganizationUpdate = async (formData: FormData) => {
    const orgName = formData.get('orgName') as string;
    const orgDescription = formData.get('orgDescription') as string;

    if (!orgName?.trim()) return;

    setIsUpdatingOrg(true);
    try {
      const response = await fetch('/api/organization/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: orgName.trim(),
          description: orgDescription?.trim() || ''
        }),
      });

      if (response.ok) {
        await refreshOrganizationData();
      } else {
        const error = await response.json();
        console.error('Failed to update organization:', error.error);
      }
    } catch (error) {
      console.error('Error updating organization:', error);
    } finally {
      setIsUpdatingOrg(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/organization/image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await refreshOrganizationData();
      } else {
        const error = await response.json();
        console.error('Failed to upload image:', error.error);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const isAdmin = currentUserRole === "admin" || currentUserRole === "owner";

  if (loading) {
    return (
      <AppLayout>
        <PageSkeleton variant="form" count={3} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="w-full px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
          </div>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="user" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("tabs.user")}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("tabs.team")}
              </TabsTrigger>
            )}
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Cog className="h-4 w-4" />
              {t("tabs.preferences")}
            </TabsTrigger>
          </TabsList>

          {/* User Settings Tab */}
          <TabsContent value="user" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("user.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <form action={handleUserNameUpdate} className="space-y-6">
                  {/* Profile Picture - Display Only */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="text-lg">
                        {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="font-medium">{t("user.profilePhoto")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("user.photoManaged")}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">{t("user.fullName")}</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        defaultValue={user?.user_metadata?.full_name || ""}
                        placeholder={t("user.fullNamePlaceholder")}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("user.email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        defaultValue={user?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="flex items-center gap-2"
                      disabled={isUpdatingUser}
                    >
                      {isUpdatingUser ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isUpdatingUser ? t("user.updating") : t("user.saveChanges")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {t("user.notifications")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("user.emailNotifications")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("user.emailNotificationsDesc")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t("user.enable")}
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("user.teamNotifications")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("user.teamNotificationsDesc")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t("user.enable")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Settings Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="team" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {t("teamSettings.title")}
                    <Badge variant="secondary" className="ml-2">
                      <Crown className="h-3 w-3 mr-1" />
                      {t("teamSettings.adminBadge")}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form action={handleOrganizationUpdate} className="space-y-6">
                    {/* Organization Image */}
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={organization?.image_url} />
                        <AvatarFallback className="text-lg">
                          {organization?.name?.charAt(0) || "O"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <p className="font-medium">{t("teamSettings.orgLogo")}</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('org-image-upload')?.click()}
                            disabled={isUploadingImage}
                            className="flex items-center gap-2"
                          >
                            {isUploadingImage ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Camera className="h-4 w-4" />
                            )}
                            {isUploadingImage ? t("teamSettings.uploading") : t("teamSettings.changeImage")}
                          </Button>
                          <input
                            id="org-image-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file);
                            }}
                            className="hidden"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("teamSettings.imageHint")}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Organization Information */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="orgName">{t("teamSettings.orgName")}</Label>
                        <Input
                          id="orgName"
                          name="orgName"
                          defaultValue={organization?.name || ""}
                          placeholder={t("teamSettings.orgName")}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="orgDescription">{t("teamSettings.description")}</Label>
                        <Textarea
                          id="orgDescription"
                          name="orgDescription"
                          defaultValue={organization?.description || ""}
                          placeholder={t("teamSettings.descriptionPlaceholder")}
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        className="flex items-center gap-2"
                        disabled={isUpdatingOrg}
                      >
                        {isUpdatingOrg ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {isUpdatingOrg ? t("user.updating") : t("user.saveChanges")}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t("teamSettings.memberManagement")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{t("teamSettings.activeMembers")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("teamSettings.manageMembersDesc")}
                      </p>
                    </div>
                    <Button variant="outline">
                      {t("teamSettings.viewTeam")}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{t("teamSettings.inviteMembers")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("teamSettings.inviteMembersDesc")}
                      </p>
                    </div>
                    <Button>
                      {t("teamSettings.invite")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog className="h-5 w-5" />
                  {t("preferences.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">{t("preferences.defaultLanguage")}</Label>
                  <select
                    id="language"
                    className="w-full p-2 border rounded-md bg-background"
                    defaultValue="ca"
                  >
                    <option value="ca">{t("preferences.languages.catalan")}</option>
                    <option value="es">{t("preferences.languages.spanish")}</option>
                    <option value="en">{t("preferences.languages.english")}</option>
                    <option value="fr">{t("preferences.languages.french")}</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("preferences.autoDetect")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("preferences.autoDetectDesc")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t("user.enable")}
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("preferences.speakerIdentification")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("preferences.speakerIdentificationDesc")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t("user.enable")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  {t("preferences.appearance")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("preferences.appearance")}</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      {t("preferences.themes.light")}
                    </Button>
                    <Button variant="outline" size="sm">
                      {t("preferences.themes.dark")}
                    </Button>
                    <Button variant="outline" size="sm">
                      {t("preferences.themes.system")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  {t("preferences.privacy")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("preferences.autoDelete")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("preferences.autoDeleteDesc")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t("preferences.configure")}
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("preferences.exportData")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("preferences.exportDataDesc")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t("preferences.exportBtn")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
