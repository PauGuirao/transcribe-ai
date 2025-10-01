"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Building2, Loader2, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const OrganizationPageContent = React.memo(function OrganizationPageContent() {
  const [organizationName, setOrganizationName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isGroupSetup, setIsGroupSetup] = useState(false);
  const [groupInvitationData, setGroupInvitationData] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshTokens, organization } = useAuth();

  // Check if user should have access to this page
  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Check if this is a group setup flow
        const groupSetup = searchParams.get('group_setup') === 'true';
        setIsGroupSetup(groupSetup);

        if (groupSetup) {
          // For group setup, validate the group invitation token
          try {
            // Get the token from cookies
            const groupInviteToken = document.cookie
              .split('; ')
              .find(row => row.startsWith('group_invite_token='))
              ?.split('=')[1];

            if (!groupInviteToken) {
              console.error('No group invitation token found in cookies');
              router.push('/dashboard');
              return;
            }

            const response = await fetch(`/api/group-invite/validate/${groupInviteToken}`, {
              method: 'GET',
              credentials: 'include'
            });

            if (response.ok) {
              const data = await response.json();
              setGroupInvitationData(data.invitation);
              setOrganizationName(data.invitation.organization_name);
              setIsCheckingAccess(false);
              return;
            } else {
              // Invalid token, redirect to dashboard
              router.push('/dashboard');
              return;
            }
          } catch (error) {
            console.error('Error validating group invitation token:', error);
            router.push('/dashboard');
            return;
          }
        }

        // If user has an organization with free or pro plan, redirect to dashboard
        if (organization && (organization.plan_type === 'free' || organization.plan_type === 'pro')) {
          router.push('/dashboard');
          return;
        }
        
        // If user has an organization that's not named "test", redirect to dashboard
        if (organization && organization.name && organization.name !== 'test') {
          router.push('/dashboard');
          return;
        }
        
        setIsCheckingAccess(false);
      } catch (error) {
        console.error('Error checking organization access:', error);
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [organization, router, searchParams]);

  // Show loading while checking access
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Verificant accés...</span>
        </div>
      </div>
    );
  }

  const validateName = (name: string) => {
    if (!name.trim()) {
      setNameError("El nom de l'organització és obligatori");
      return false;
    }
    if (name.trim().length < 2) {
      setNameError("El nom ha de tenir almenys 2 caràcters");
      return false;
    }
    if (name.trim().length > 50) {
      setNameError("El nom no pot tenir més de 50 caràcters");
      return false;
    }
    // Check for special characters that might cause issues
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name.trim())) {
      setNameError("El nom no pot contenir caràcters especials com < > : \" / \\ | ? *");
      return false;
    }
    setNameError(null);
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOrganizationName(value);
    // Clear error when user starts typing
    if (nameError && value.trim()) {
      setNameError(null);
    }
    // Real-time validation for length
    if (value.length > 50) {
      setNameError("El nom no pot tenir més de 50 caràcters");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateName(organizationName)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/organization/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: organizationName.trim(),
          isGroupSetup: isGroupSetup,
          groupInvitationData: groupInvitationData, // Include the group invitation data
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Error en configurar l'organització");
      }

      // Refresh organization data in AuthContext to update navbar
      await refreshTokens();
      
      // Redirect to dashboard after successful setup
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperat");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Left side - Branding */}
      <div className="relative flex flex-col justify-between bg-primary text-primary-foreground px-10 py-12 lg:px-16">
        <div>
          <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-wide text-primary-foreground/70">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/10">
              <Building2 className="h-5 w-5" />
            </div>
            Transcriu
          </div>
          <h1 className="mt-14 text-4xl font-semibold leading-tight text-balance lg:text-5xl">
            Configura la teva organització per començar.
          </h1>
          <p className="mt-6 text-lg text-primary-foreground/80 leading-relaxed">
            Crea un espai de treball per al teu equip i comença a transcriure sessions de logopèdia amb IA.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-primary-foreground/80">
            Un pas més per optimitzar les teves sessions logopèdiques.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex items-center justify-center bg-secondary/30 px-6 py-12">
        <Card className="w-full max-w-md rounded-3xl border border-border/60 shadow-xl">
          <CardContent className="space-y-8 p-8">
            <div className="space-y-2 text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                {isGroupSetup ? (
                  <Crown className="w-8 h-8 text-primary" />
                ) : (
                  <Building2 className="w-8 h-8 text-primary" />
                )}
              </div>
              <p className="text-sm font-medium text-primary">
                {isGroupSetup ? "Configuració del Pla Grup" : "Últim pas!"}
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                {isGroupSetup ? "Configura la teva organització" : "Nom de l'organització"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isGroupSetup 
                  ? "Finalitza la configuració de la teva organització amb el pla grup."
                  : "Dona un nom a la teva organització per començar a col·laborar amb el teu equip."
                }
              </p>
              {isGroupSetup && groupInvitationData && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                    <Crown className="w-4 h-4" />
                    <span className="font-medium">Pla Grup Activat</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Fins a 10 membres • Funcions avançades incloses
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="organizationName" className="text-sm font-medium text-foreground">
                  Nom de l'organització
                </Label>
                <div className="relative">
                  <Input
                    id="organizationName"
                    type="text"
                    placeholder="Ex: La Meva Clínica, Centre de Teràpia..."
                    value={organizationName}
                    onChange={handleNameChange}
                    className={`h-12 rounded-xl border-border/60 pr-12 ${nameError ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`}
                    disabled={isLoading}
                    autoFocus
                    maxLength={60}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {organizationName.length}/50
                  </div>
                </div>
                {nameError && (
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {nameError}
                  </div>
                )}
                {organizationName.trim() && !nameError && (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <div className="h-3 w-3 rounded-full bg-green-600 flex items-center justify-center">
                      <div className="h-1 w-1 bg-white rounded-full" />
                    </div>
                    Nom vàlid
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Error</p>
                    <p className="text-sm text-destructive/80">{error}</p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full justify-center gap-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-12"
                disabled={isLoading || !organizationName.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Configurant...
                  </>
                ) : (
                  "Continuar al Dashboard"
                )}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground">
              Podràs convidar membres del teu equip des del dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

const OrganizationPage = () => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <OrganizationPageContent />
    </Suspense>
  );
};

export default OrganizationPage;