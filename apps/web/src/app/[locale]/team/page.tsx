"use client";

import React, { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { Users, User, Loader2, AlertCircle, UserPlus, MoreHorizontal, Pencil } from "lucide-react";
import { PageSkeleton } from "@/components/layout/states/PageSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import AppLayout from "@/components/layout/AppLayout";
import { InviteModal } from "@/components/team/InviteModal";
import { EditOrganizationDrawer } from "@/components/team/EditOrganizationDrawer";
import { apiCache } from "@/lib/cache";
import UpgradeModal from "@/components/UpgradeModal";
import { WelcomePopup } from "@/components/WelcomePopup";
import { PLANS } from "@/config/pricing";

interface OrganizationMember {
  id: string;
  user_id?: string;
  role: string;
  joined_at: string;
  /** Minutes used by this member during the current billing period. Server-computed. */
  minutes_used?: number;
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
    max_members?: number;
  };
  members: OrganizationMember[];
  currentUserRole: string | null;
}

const TeamPage = React.memo(function TeamPage() {
  const t = useTranslations("dashboard.team");
  const {
    user,
    loading: authLoading,
    organization,
    organizationMembers,
    currentUserRole,
    planType,
    refreshOrganizationData,
    refreshTokens,
  } = useAuth();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditOrgOpen, setIsEditOrgOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [isGroupPricingOpen, setIsGroupPricingOpen] = useState(false);
  const [isGroupUpgradeLoading, setIsGroupUpgradeLoading] = useState(false);
  const [selectedGroupUsers, setSelectedGroupUsers] = useState(10);

  const handleInviteClick = () => {
    if (planType === 'free') {
      setIsUpgradeModalOpen(true);
      return;
    }

    const maxMembers = data?.organization?.max_members ?? organization?.max_members;
    const currentMembers = data?.members?.length ?? organizationMembers?.length ?? 0;

    if (typeof maxMembers === 'number' && currentMembers >= maxMembers) {
      setIsLimitDialogOpen(true);
      return;
    }

    setIsInviteModalOpen(true);
  };

  const handleAddMembersClick = () => {
    const currentMembers = data?.members?.length ?? organizationMembers?.length ?? 0;
    setSelectedGroupUsers(Math.max(currentMembers || 10, 5));
    setIsGroupPricingOpen(true);
  };

  const handleSelectGroupUsers = async (users?: number) => {
    try {
      setIsGroupUpgradeLoading(true);
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'group', users }),
      });

      if (!response.ok) {
        throw new Error('Checkout failed');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Stripe checkout error:', error);
    } finally {
      setIsGroupUpgradeLoading(false);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberToRemove.profiles.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove member');
      }

      if (data) {
        const updatedMembers = data.members.filter(
          member => member.profiles.id !== memberToRemove.profiles.id
        );
        setData({ ...data, members: updatedMembers });
      }

      refreshOrganizationData();
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

  /** Promote/demote a member. Optimistically updates local state then refreshes. */
  const handleRoleChange = async (member: OrganizationMember, nextRole: 'admin' | 'member') => {
    const targetUserId = member.user_id ?? member.profiles.id;
    if (!targetUserId) return;
    const previousRole = member.role;

    // Optimistic update.
    if (data) {
      setData({
        ...data,
        members: data.members.map((m) =>
          m.id === member.id ? { ...m, role: nextRole } : m,
        ),
      });
    }

    try {
      const res = await fetch('/api/organization/members/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, role: nextRole }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error || 'Failed to update role');
      }
      // Pull fresh data so org context (e.g. AppSidebar) stays in sync.
      refreshOrganizationData();
    } catch (e) {
      console.error('Role change failed:', e);
      setError(e instanceof Error ? e.message : 'Failed to update role');
      // Roll back optimistic update.
      if (data) {
        setData({
          ...data,
          members: data.members.map((m) =>
            m.id === member.id ? { ...m, role: previousRole } : m,
          ),
        });
      }
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const showWelcome = urlParams.get('welcome');
    const orgName = urlParams.get('org');

    if (showWelcome === 'true' && orgName && organization) {
      setShowWelcomePopup(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [organization]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setHasInitialized(true);
      setLoading(false);
      return;
    }

    if (!organization) {
      setLoading(true);
      return;
    }

    if (organizationMembers && currentUserRole !== undefined) {
      setData({ organization, members: organizationMembers, currentUserRole });
      setHasInitialized(true);
      setLoading(false);
      return;
    }

    if (!hasInitialized) {
      setLoading(true);
    }
  }, [user, authLoading, organization, organizationMembers, currentUserRole, hasInitialized]);

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "owner": return t("roles.owner");
      case "admin": return t("roles.admin");
      case "member": return t("roles.member");
      default: return role;
    }
  };


  if (authLoading) {
    return (
      <AppLayout>
        <PageSkeleton variant="cards" count={6} />
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-[15px] font-medium text-foreground mb-1">{t("authRequired")}</h3>
            <p className="text-[13px] text-muted-foreground">{t("authRequiredDesc")}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading && !data) {
    return (
      <AppLayout>
        <PageSkeleton variant="cards" count={6} />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-[15px] font-medium text-foreground mb-1">{t("error")}</h3>
            <p className="text-[13px] text-muted-foreground mb-4 max-w-xs">{error}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              {t("retry")}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!authLoading && user && !organization && hasInitialized) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-[15px] font-medium text-foreground mb-1">{t("noOrganization")}</h3>
            <p className="text-[13px] text-muted-foreground mb-4 max-w-xs">{t("noOrganizationDesc")}</p>
            <Button asChild size="sm">
              <Link href="/organization">{t("setupOrganization")}</Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading || authLoading || !hasInitialized || !data) {
    return (
      <AppLayout>
        <PageSkeleton variant="cards" count={6} />
      </AppLayout>
    );
  }

  /** Compact minutes-used label: "—" / "0 min" / "8 min" / "2 h 35 min" / "12 h". */
  const formatMinutes = (mins: number | undefined | null) => {
    if (mins === undefined || mins === null) return '—';
    if (mins <= 0) return '0 min';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case "owner":
        return { dotColor: "bg-blue-500", textColor: "text-blue-700", bgColor: "bg-blue-50" };
      case "admin":
        return { dotColor: "bg-purple-500", textColor: "text-purple-700", bgColor: "bg-purple-50" };
      default:
        return { dotColor: "bg-gray-400", textColor: "text-gray-600", bgColor: "bg-gray-50" };
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        <div className="w-full px-8 py-6">
          {/* Header - Clean like Library */}
          <div className="flex items-start justify-between mb-6 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-12 w-12 shrink-0">
                {(organization as any)?.image_url ? (
                  <AvatarImage src={(organization as any).image_url} alt={data.organization.name} />
                ) : null}
                <AvatarFallback className="text-base">
                  {(data.organization.name || "O").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-gray-900 truncate">{data.organization.name}</h1>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  {data.members.length} {data.members.length === 1 ? 'membre' : 'membres'}
                </p>
              </div>
            </div>
            {data.currentUserRole && (data.currentUserRole === 'admin' || data.currentUserRole === 'owner') && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => setIsEditOrgOpen(true)}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  {t("editOrganization")}
                </Button>
                <Button onClick={handleInviteClick} size="sm" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t("inviteMember")}
                </Button>
              </div>
            )}
          </div>

          {/* Members Table - Clean like Library */}
          {data.members.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-[15px] font-medium text-gray-900 mb-1">{t("noMembers")}</h3>
              <p className="text-[13px] text-gray-500 mb-6 max-w-xs mx-auto">{t("noMembersDesc")}</p>
              {data.currentUserRole && (data.currentUserRole === 'admin' || data.currentUserRole === 'owner') && (
                <Button onClick={handleInviteClick} size="sm" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t("inviteFirstMember")}
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-xl bg-white border border-gray-200/60 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t("table.name")}</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[120px]">{t("table.role")}</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[140px]">
                        Minuts (mes)
                      </th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[120px]">{t("table.joinedDate")}</th>
                      {data.currentUserRole && (data.currentUserRole === 'admin' || data.currentUserRole === 'owner') && (
                        <th className="w-[50px]"></th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.members.map((member) => {
                      const roleStyle = getRoleStyle(member.role);
                      return (
                        <tr key={member.id} className="hover:bg-blue-50/50 transition-colors group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[13px] font-medium text-gray-900 truncate block">
                                  {member.profiles.full_name || t("user")}
                                </span>
                                <span className="text-[12px] text-gray-500 truncate block">
                                  {member.profiles.email}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${roleStyle.bgColor} ${roleStyle.textColor}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${roleStyle.dotColor}`} />
                              {getRoleDisplayName(member.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[13px] font-medium text-gray-700 tabular-nums">
                            {formatMinutes(member.minutes_used)}
                          </td>
                          <td className="px-4 py-3 text-[12px] text-gray-500">
                            {new Date(member.joined_at).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          {data.currentUserRole && (data.currentUserRole === 'admin' || data.currentUserRole === 'owner') && (
                            <td className="px-4 py-3">
                              {member.role === 'owner' || (member.user_id ?? member.profiles.id) === user?.id ? (
                                // Don't show actions for the owner row or the caller's own row.
                                <span className="block h-7 w-7" />
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 p-1">
                                    {member.role !== 'admin' && (
                                      <DropdownMenuItem
                                        onClick={() => handleRoleChange(member, 'admin')}
                                        className="text-[13px] rounded-md"
                                      >
                                        Fer administrador
                                      </DropdownMenuItem>
                                    )}
                                    {member.role === 'admin' && (
                                      <DropdownMenuItem
                                        onClick={() => handleRoleChange(member, 'member')}
                                        className="text-[13px] rounded-md"
                                      >
                                        Treure administrador
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => handleRemoveClick(member)}
                                      className="text-[13px] rounded-md text-red-600 focus:text-red-600 focus:bg-red-50"
                                    >
                                      {t("removeFromTeam")}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2">
                {data.members.map((member) => {
                  const roleStyle = getRoleStyle(member.role);
                  return (
                    <div
                      key={member.id}
                      className="rounded-xl bg-white border border-gray-200/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shrink-0">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-medium text-gray-900 truncate">
                              {member.profiles.full_name || t("user")}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${roleStyle.bgColor} ${roleStyle.textColor}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${roleStyle.dotColor}`} />
                                {getRoleDisplayName(member.role)}
                              </span>
                              <span className="text-[11px] text-gray-500">
                                {new Date(member.joined_at).toLocaleDateString(undefined, {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-gray-500">
                              <span className="font-medium text-gray-700">
                                {formatMinutes(member.minutes_used)}
                              </span>{' '}
                              aquest mes
                            </p>
                          </div>
                        </div>
                        {data.currentUserRole && (data.currentUserRole === 'admin' || data.currentUserRole === 'owner') &&
                          member.role !== 'owner' &&
                          (member.user_id ?? member.profiles.id) !== user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {member.role !== 'admin' && (
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(member, 'admin')}
                                  className="text-[13px]"
                                >
                                  Fer administrador
                                </DropdownMenuItem>
                              )}
                              {member.role === 'admin' && (
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(member, 'member')}
                                  className="text-[13px]"
                                >
                                  Treure administrador
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleRemoveClick(member)}
                                className="text-[13px] text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                {t("removeFromTeam")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />

      <Dialog open={isGroupPricingOpen} onOpenChange={setIsGroupPricingOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{t("upgradeDialog.title")}</DialogTitle>
            <DialogDescription className="text-lg">{t("upgradeDialog.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const maxMembers = data?.organization?.max_members ?? organization?.max_members ?? 1;
              const currentMembers = data?.members?.length ?? organizationMembers?.length ?? 0;
              const teamPlan = PLANS.pro;
              const orgPlan = PLANS.studio;

              return (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      {t("upgradeDialog.currentPlan")} <span className="font-semibold text-foreground">{t("upgradeDialog.membersLabel", { count: maxMembers })}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("upgradeDialog.currentMembers")} <span className="font-semibold text-foreground">{currentMembers}</span>
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="font-medium">{t("upgradeDialog.availablePlans")}</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>{t("upgradeDialog.teamPlan")}:</strong> {teamPlan.users.min}-{teamPlan.users.max} - {t("upgradeDialog.pricePerUser", { price: teamPlan.pricing.monthly })}</li>
                      <li>• <strong>{t("upgradeDialog.organizationPlan")}:</strong> {orgPlan.users.min}-{orgPlan.users.max} - {t("upgradeDialog.pricePerUser", { price: orgPlan.pricing.monthly })}</li>
                    </ul>
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsGroupPricingOpen(false)}>{t("upgradeDialog.close")}</Button>
            <Button onClick={() => { setIsGroupPricingOpen(false); window.location.href = '/payment'; }}>
              {t("viewPlans")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLimitDialogOpen} onOpenChange={setIsLimitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("capacityReached.title")}</DialogTitle>
            <DialogDescription>{t("capacityReached.desc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsLimitDialogOpen(false)}>{t("capacityReached.ok")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("removeDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("removeDialog.desc", { name: memberToRemove?.profiles.full_name || memberToRemove?.profiles.email || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleRemoveCancel} disabled={isRemoving}>
              {t("removeDialog.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleRemoveConfirm} disabled={isRemoving}>
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("removeDialog.removing")}
                </>
              ) : (
                t("removeDialog.confirm")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WelcomePopup
        isOpen={showWelcomePopup}
        onClose={() => setShowWelcomePopup(false)}
        organizationName={organization?.name || ""}
        userName={user?.user_metadata?.full_name || user?.email || ""}
      />

      {organization && (
        <EditOrganizationDrawer
          open={isEditOrgOpen}
          onOpenChange={setIsEditOrgOpen}
          organization={{
            id: (organization as any).id,
            name: (organization as any).name,
            description: (organization as any).description ?? null,
            image_url: (organization as any).image_url ?? null,
          }}
          onSaved={async () => {
            const orgId = (organization as any)?.id;
            if (orgId) apiCache.delete(`org:${orgId}`);
            await refreshTokens();
          }}
        />
      )}
    </AppLayout>
  );
});

export default TeamPage;
