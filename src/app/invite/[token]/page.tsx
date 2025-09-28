"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, CheckCircle, XCircle, Building2, UserPlus, ArrowRight, Shield } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface OrganizationInfo {
  id: string;
  name: string;
  description?: string;
}

interface InviteValidation {
  valid: boolean;
  organization?: OrganizationInfo;
  error?: string;
}

const InvitePage = React.memo(function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [validation, setValidation] = useState<InviteValidation | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinResult, setJoinResult] = useState<{ success: boolean; message: string } | null>(null);
  const [user, setUser] = useState<any>(null);
  
  const supabase = createClientComponentClient();

  const checkUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }, [supabase]);

  const validateInvite = useCallback(async () => {
    try {
      const response = await fetch(`/api/organization/invite/validate?token=${token}`);
      const data = await response.json();
      setValidation(data);
    } catch (error) {
      setValidation({ valid: false, error: "No s'ha pogut validar la invitació" });
    }
  }, [token]);

  useEffect(() => {
    // Combine both validation and user check in a single effect to prevent multiple calls
    const initializePage = async () => {
      await validateInvite();
      await checkUser();
    };
    
    initializePage();
  }, [validateInvite, checkUser]);

  const handleJoinOrganization = useCallback(async () => {
    if (!user) {
      // Store the invite token in a cookie and redirect to signin
      // The auth callback will handle the actual joining process
      document.cookie = `invite_token=${token}; path=/; max-age=3600; SameSite=Lax`;
      router.push(`/auth/signin`);
      return;
    }

    // If user is already authenticated, call the join API directly
    setIsJoining(true);
    try {
      const response = await fetch("/api/organization/invite/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setJoinResult({ success: true, message: "T'has unit correctament a l'organització!" });
        // Redirect to team page after a short delay
        setTimeout(() => {
          router.push("/team");
        }, 2000);
      } else {
        setJoinResult({ success: false, message: data.error || "No s'ha pogut unir a l'organització" });
      }
    } catch (error) {
      setJoinResult({ success: false, message: "S'ha produït un error en unir-se" });
    } finally {
      setIsJoining(false);
    }
  }, [user, token, router]);

  if (!validation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <Card className="w-full max-w-md rounded-3xl border border-border/60 shadow-xl">
          <CardContent className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Validant la invitació...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validation.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-background to-red-50/30">
        <Card className="w-full max-w-md rounded-3xl border border-red-200/60 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-red-900">Invitació no vàlida</CardTitle>
            <CardDescription className="text-red-700/80 mt-2">
              {validation.error || "Aquest enllaç d'invitació no és vàlid o ha caducat."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button 
              onClick={() => router.push("/")} 
              className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white"
              size="lg"
            >
              Tornar a l'inici
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (joinResult) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        joinResult.success 
          ? "bg-gradient-to-br from-green-50 via-background to-green-50/30" 
          : "bg-gradient-to-br from-red-50 via-background to-red-50/30"
      }`}>
        <Card className={`w-full max-w-md rounded-3xl shadow-xl ${
          joinResult.success 
            ? "border border-green-200/60" 
            : "border border-red-200/60"
        }`}>
          <CardHeader className="text-center pb-4">
            <div className={`mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center ${
              joinResult.success 
                ? "bg-green-100" 
                : "bg-red-100"
            }`}>
              {joinResult.success ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <CardTitle className={`text-xl font-semibold ${
              joinResult.success ? "text-green-900" : "text-red-900"
            }`}>
              {joinResult.success ? "Benvingut/da!" : "Error"}
            </CardTitle>
            <CardDescription className={`mt-2 ${
              joinResult.success ? "text-green-700/80" : "text-red-700/80"
            }`}>
              {joinResult.message}
            </CardDescription>
          </CardHeader>
          {joinResult.success && (
            <CardContent className="text-center pt-0">
              <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Redirigint al teu equip...</span>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-lg rounded-3xl border border-border/60 shadow-xl overflow-hidden">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
            <UserPlus className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">T'han convidat!</h1>
          <p className="text-primary-foreground/90 text-sm">
            Uneix-te a l'equip i comença a col·laborar
          </p>
        </div>

        <CardContent className="p-8 space-y-6">
          {/* Organization info */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3 p-4 bg-primary/10 border border-primary/20 rounded-2xl">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <h2 className="font-semibold text-lg text-foreground">
                  {validation.organization?.name}
                </h2>
                <p className="text-sm text-muted-foreground">Organització</p>
              </div>
            </div>
            
            {validation.organization?.description && (
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground text-center">
                  {validation.organization.description}
                </p>
              </div>
            )}
          </div>

          {/* Benefits section */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Què obtindràs:
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-primary"></div>
                <span>Accés a les transcripcions de l'equip</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-primary"></div>
                <span>Col·laboració en temps real</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-primary"></div>
                <span>Gestió compartida de perfils</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {!user ? (
              <>
                <Button 
                  onClick={handleJoinOrganization}
                  className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base font-medium"
                  size="lg"
                >
                  <span>Iniciar sessió per unir-se</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>Necessites iniciar sessió per unir-te a aquesta organització</span>
                </div>
              </>
            ) : (
              <Button 
                onClick={handleJoinOrganization}
                disabled={isJoining}
                className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base font-medium"
                size="lg"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Unint-se...
                  </>
                ) : (
                  <>
                    <span>Unir-se a l'organització</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default InvitePage;