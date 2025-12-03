"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
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
  Mail, 
  Building2,
  Crown,
  Shield,
  Bell,
  Lock,
  Palette,
  Globe,
  Upload,
  Camera,
  Loader2
} from "lucide-react";

export default function SettingsPage() {
  const { user, organization, currentUserRole, loading, refreshTokens, refreshOrganizationData } = useAuth();
  const [activeTab, setActiveTab] = useState("usuari");
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
        // Refresh user data
        await refreshTokens();
        // Show success message (you can add a toast here)
        console.log('User name updated successfully');
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
        // Refresh organization data
        await refreshOrganizationData();
        console.log('Organization updated successfully');
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
        // Refresh organization data to get new image URL
        await refreshOrganizationData();
        console.log('Organization image updated successfully');
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
  
  // Check if user is admin or owner
  const isAdmin = currentUserRole === "admin" || currentUserRole === "owner";

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregant configuració...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Configuració</h1>
          </div>
          <p className="text-muted-foreground">
            Gestiona la teva configuració personal i de l'organització
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="usuari" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Usuari
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="equip" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Equip
              </TabsTrigger>
            )}
            <TabsTrigger value="funcion" className="flex items-center gap-2">
              <Cog className="h-4 w-4" />
              Funció
            </TabsTrigger>
          </TabsList>

          {/* User Settings Tab */}
          <TabsContent value="usuari" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Perfil d'usuari
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
                      <p className="font-medium">Foto de perfil</p>
                      <p className="text-sm text-muted-foreground">
                        La foto de perfil es gestiona automàticament
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nom complet</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        defaultValue={user?.user_metadata?.full_name || ""}
                        placeholder="El teu nom complet"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correu electrònic</Label>
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
                      {isUpdatingUser ? "Actualitzant..." : "Desar canvis"}
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
                  Notificacions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificacions per correu</p>
                    <p className="text-sm text-muted-foreground">
                      Rebre notificacions sobre transcripcions completades
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Activar
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificacions de l'equip</p>
                    <p className="text-sm text-muted-foreground">
                      Rebre notificacions sobre activitat de l'equip
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Activar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Settings Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="equip" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Informació de l'organització
                    <Badge variant="secondary" className="ml-2">
                      <Crown className="h-3 w-3 mr-1" />
                      Admin
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
                        <p className="font-medium">Logo de l'organització</p>
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
                            {isUploadingImage ? "Pujant..." : "Canviar imatge"}
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
                          JPEG, PNG, WebP o GIF. Màxim 5MB.
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Organization Information */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="orgName">Nom de l'organització</Label>
                        <Input
                          id="orgName"
                          name="orgName"
                          defaultValue={organization?.name || ""}
                          placeholder="Nom de la teva organització"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="orgDescription">Descripció</Label>
                        <Textarea
                          id="orgDescription"
                          name="orgDescription"
                          defaultValue={organization?.description || ""}
                          placeholder="Descripció de l'organització (opcional)"
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
                        {isUpdatingOrg ? "Actualitzant..." : "Desar canvis"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Gestió de membres
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Membres actius</p>
                      <p className="text-sm text-muted-foreground">
                        Gestiona els membres del teu equip
                      </p>
                    </div>
                    <Button variant="outline">
                      Veure equip
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Convidar membres</p>
                      <p className="text-sm text-muted-foreground">
                        Envia invitacions a nous membres
                      </p>
                    </div>
                    <Button>
                      Convidar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Function Settings Tab */}
          <TabsContent value="funcion" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog className="h-5 w-5" />
                  Preferències de transcripció
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma per defecte</Label>
                  <select
                    id="language"
                    className="w-full p-2 border rounded-md bg-background"
                    defaultValue="ca"
                  >
                    <option value="ca">Català</option>
                    <option value="es">Espanyol</option>
                    <option value="en">Anglès</option>
                    <option value="fr">Francès</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Detecció automàtica d'idioma</p>
                    <p className="text-sm text-muted-foreground">
                      Detectar automàticament l'idioma de l'àudio
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Activar
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Identificació d'interlocutors</p>
                    <p className="text-sm text-muted-foreground">
                      Identificar diferents persones en l'àudio
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Activar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Aparença
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Clar
                    </Button>
                    <Button variant="outline" size="sm">
                      Fosc
                    </Button>
                    <Button variant="outline" size="sm">
                      Sistema
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Privacitat i seguretat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Eliminació automàtica</p>
                    <p className="text-sm text-muted-foreground">
                      Eliminar transcripcions després de 30 dies
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configurar
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Exportar dades</p>
                    <p className="text-sm text-muted-foreground">
                      Descarregar totes les teves dades
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Exportar
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