"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Mail, Crown, User, Loader2, AlertCircle, UserPlus, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import AppLayout from "@/components/layout/AppLayout";
import { InviteModal } from "@/components/team/InviteModal";
import UpgradeModal from "@/components/UpgradeModal";
import { WelcomePopup } from "@/components/WelcomePopup";

interface OrganizationMember {
  id: string;
  role: string;
  joined_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

interface ApiResponse {
  organization: {
    id: string;
    name: string;
  };
  members: OrganizationMember[];
  currentUserRole: string | null;
}

const TeamPage = React.memo(function TeamPage() {
  const { 
    user, 
    loading: authLoading, 
    organization, 
    organizationMembers, 
    currentUserRole,
    planType,
    refreshOrganizationData 
  } = useAuth();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  const handleInviteClick = () => {
    // Check if user has free plan
    if (planType === 'free') {
      setIsUpgradeModalOpen(true);
    } else {
      setIsInviteModalOpen(true);
    }
  };

  const handleRemoveClick = (member: OrganizationMember) => {
    setMemberToRemove(member);
    setIsRemoveDialogOpen(true);
  };

  const handleRemoveConfirm = async () => {
    if (!memberToRemove) return;
    
    setIsRemoving(true);
    try {
      const response = await fetch('/api/organization/members/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: memberToRemove.profiles.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove member');
      }

      // Update local state immediately to reflect the change without causing UI flicker
      if (data) {
        const updatedMembers = data.members.filter(
          member => member.profiles.id !== memberToRemove.profiles.id
        );
        setData({
          ...data,
          members: updatedMembers
        });
      }

      // Refresh organization data in the background
      refreshOrganizationData();
      
      // Close dialog and reset state
      setIsRemoveDialogOpen(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Error removing member:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRemoveCancel = () => {
    setIsRemoveDialogOpen(false);
    setMemberToRemove(null);
  };

  useEffect(() => {
    // Check for welcome popup trigger from auth callback
    const urlParams = new URLSearchParams(window.location.search);
    const showWelcome = urlParams.get('welcome');
    const orgName = urlParams.get('org');
    
    if (showWelcome === 'true' && orgName && organization) {
      setShowWelcomePopup(true);
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [organization]);

  useEffect(() => {
    // While AuthContext is loading, show loading state
    if (authLoading) {
      setLoading(true);
      return;
    }

    // If no user, we're done
    if (!user) {
      setHasInitialized(true);
      setLoading(false);
      return;
    }

    // If user exists but no organization data yet, keep loading
    if (!organization) {
      setLoading(true);
      return;
    }

    // Use cached data from AuthContext immediately
    if (organizationMembers && currentUserRole !== undefined) {
      setData({
        organization,
        members: organizationMembers,
        currentUserRole
      });
      setHasInitialized(true);
      setLoading(false);
      return;
    }

    // If we have organization but no members data yet, only show loading if we haven't initialized yet
    // This prevents the UI from flickering when data is being refreshed
    if (!hasInitialized) {
      setLoading(true);
    }
  }, [user, authLoading, organization, organizationMembers, currentUserRole, hasInitialized]);

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "owner":
        return "Propietari";
      case "admin":
        return "Administrador";
      case "member":
        return "Membre";
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      case "member":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4" />;
      case "admin":
        return <User className="h-4 w-4" />;
      case "member":
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso requerido</h2>
            <p className="text-muted-foreground">
              Debes iniciar sesión para ver esta página.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show loading only if we're still fetching and don't have any data
  if (loading && !data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Intentar de nuevo
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Only show "Sin organización" if we've confirmed user has no organization after loading is complete
  if (!authLoading && user && !organization && hasInitialized) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sin organización</h2>
            <p className="text-muted-foreground mb-4">
              No perteneces a ninguna organización actualmente.
            </p>
            <Button asChild>
              <a href="/organization">Configurar organización</a>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show loading spinner while data is being loaded
  if (loading || authLoading || !hasInitialized) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando equipo...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Final safety check for data
  if (!data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando equipo...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4 pt-12 max-w-5xl">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Error</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Reintentar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Header section */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">
                  {data.organization.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Membres del equip • {data.members.length} membres
                </p>
              </div>
              {/* Only show invite button for admin/owner roles */}
              {data.currentUserRole && (data.currentUserRole === 'admin' || data.currentUserRole === 'owner') && (
                <Button 
                  onClick={handleInviteClick}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Convidar
                </Button>
              )}
            </div>

            {/* Members table */}
            {data.members.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No hay miembros</h3>
                <p className="text-muted-foreground">
                  No hay miembros en esta organización.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Rols</TableHead>
                        <TableHead>Data de unió</TableHead>
                        {data.currentUserRole && (data.currentUserRole === 'admin' || data.currentUserRole === 'owner') && (
                          <TableHead className="w-[50px]"></TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.members.map((member, index) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                                  <AvatarFallback className="bg-primary/15 text-primary font-semibold border border-primary/20">
                                    {(member.profiles.full_name || member.profiles.email)
                                      .charAt(0)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {(member.role === 'admin' || member.role === 'owner') && (
                                  <div className="absolute -top-1 -right-1 p-1 bg-primary rounded-full shadow-sm">
                                    <Crown className="h-3 w-3 text-primary-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-foreground truncate">
                                  {member.profiles.full_name || "Usuario"}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5" />
                                  <span className="truncate">{member.profiles.email}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getRoleBadgeVariant(member.role)}
                              className="flex items-center gap-1 text-xs px-2 py-1 shadow-sm w-fit"
                            >
                              {getRoleIcon(member.role)}
                              {getRoleDisplayName(member.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {new Date(member.joined_at).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          </TableCell>
                          {data.currentUserRole && (data.currentUserRole === 'admin' || data.currentUserRole === 'owner') && (
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleRemoveClick(member)}
                                  >
                                    Elimina del equip
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {data.members.map((member) => (
                    <Card key={member.id} className="p-4">
                      <CardContent className="p-0">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative">
                              <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                                <AvatarFallback className="bg-primary/15 text-primary font-semibold border border-primary/20">
                                  {(member.profiles.full_name || member.profiles.email)
                                    .charAt(0)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {(member.role === 'admin' || member.role === 'owner') && (
                                <div className="absolute -top-1 -right-1 p-1 bg-primary rounded-full shadow-sm">
                                  <Crown className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-foreground truncate">
                                {member.profiles.full_name || "Usuario"}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Mail className="h-3.5 w-3.5" />
                                <span className="truncate">{member.profiles.email}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <Badge
                                  variant={getRoleBadgeVariant(member.role)}
                                  className="flex items-center gap-1 text-xs px-2 py-1 shadow-sm w-fit"
                                >
                                  {getRoleIcon(member.role)}
                                  {getRoleDisplayName(member.role)}
                                </Badge>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(member.joined_at).toLocaleDateString("es-ES", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                          {data.currentUserRole && (data.currentUserRole === 'admin' || data.currentUserRole === 'owner') && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleRemoveClick(member)}
                                >
                                  Elimina del equip
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      <InviteModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
      
      <UpgradeModal 
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {memberToRemove?.profiles.full_name || memberToRemove?.profiles.email} from the team? 
              They will be moved to their own free organization and will lose access to this team's resources.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleRemoveCancel}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemoveConfirm}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Member'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Welcome Popup */}
      <WelcomePopup
        isOpen={showWelcomePopup}
        onClose={() => setShowWelcomePopup(false)}
        organizationName={organization?.name || ""}
        userName={user?.user_metadata?.full_name || user?.email || ""}
      />
    </AppLayout>
  );
});

export default TeamPage;