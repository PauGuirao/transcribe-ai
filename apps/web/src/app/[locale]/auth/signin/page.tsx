"use client";

import React, { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, LogIn } from "lucide-react";
import { WelcomePopup } from "@/components/WelcomePopup";

const SignInContent = React.memo(function SignInContent() {
  const [loading, setLoading] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [welcomeData, setWelcomeData] = useState<{ organizationName: string; userName: string }>({ organizationName: "", userName: "" });
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signInWithGoogle } = useAuth();
  const returnUrl = searchParams.get("returnUrl");

  useEffect(() => {
    if (user) {
      // Check for group invitation first (higher priority)
      const groupInviteParam = searchParams.get("group_invite");
      const groupInviteTokenMatch = document.cookie.match(/group_invite_token=([^;]+)/);
      const groupInviteToken = groupInviteTokenMatch ? groupInviteTokenMatch[1] : null;
      
      if (groupInviteParam === "true" && groupInviteToken) {
        console.log(`Found group invitation token during signin: ${groupInviteToken}`);
        
        // Process the group invitation by calling the API directly
        const processGroupInvitation = async () => {
          try {
            const response = await fetch("/api/group-invite/join", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ token: groupInviteToken }),
            });

            // Clear the group invite token cookie after processing (success or failure)
            document.cookie = `group_invite_token=; path=/; max-age=0; SameSite=Lax`;

            if (response.ok) {
              console.log("Group invitation processed successfully from signin page");
              // Redirect to organization setup
              router.push("/organization?group_setup=true");
            } else {
              console.error("Failed to process group invitation from signin page");
              // On error, redirect to dashboard as fallback
              router.push("/dashboard");
            }
          } catch (error) {
            console.error("Error processing group invitation from signin page:", error);
            // Clear cookie and redirect to dashboard on error
            document.cookie = `group_invite_token=; path=/; max-age=0; SameSite=Lax`;
            router.push("/dashboard");
          }
        };

        processGroupInvitation();
        return;
      }

      // Check if there's a regular invitation token cookie
      const inviteTokenMatch = document.cookie.match(/invite_token=([^;]+)/);
      const inviteToken = inviteTokenMatch ? inviteTokenMatch[1] : null;
      
      if (inviteToken) {
        // If there's an invitation token, process it directly here to avoid infinite loop
        console.log(`Found invitation token during signin: ${inviteToken}`);
        
        // Process the invitation by calling the API directly
        const processInvitation = async () => {
          try {
            const response = await fetch("/api/organization/invite/join", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ token: inviteToken }),
            });

            // Clear the invite token cookie after processing (success or failure)
            document.cookie = `invite_token=; path=/; max-age=0; SameSite=Lax`;

            if (response.ok) {
              console.log("Invitation processed successfully from signin page");
              const data = await response.json();
              
              // Set welcome popup data
              setWelcomeData({
                organizationName: data.organization?.name || "the organization",
                userName: user?.user_metadata?.full_name || user?.email || ""
              });
              
              // Show welcome popup instead of immediate redirect
              setShowWelcomePopup(true);
            } else {
              console.error("Failed to process invitation from signin page");
              // On error, redirect to dashboard as fallback
              router.push("/dashboard");
            }
          } catch (error) {
            console.error("Error processing invitation from signin page:", error);
            // Clear cookie and redirect to dashboard on error
            document.cookie = `invite_token=; path=/; max-age=0; SameSite=Lax`;
            router.push("/dashboard");
          }
        };

        processInvitation();
        return;
      }
      
      // If there's a returnUrl, redirect there, otherwise go to dashboard
      const redirectTo = returnUrl || "/dashboard";
      router.push(redirectTo);
    }
  }, [user, router, returnUrl, searchParams]);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle(returnUrl || undefined);
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      <div className="relative flex flex-col justify-between bg-primary text-primary-foreground px-10 py-12 lg:px-16">
        <div>
          <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-wide text-primary-foreground/70">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/10">
              <LogIn className="h-5 w-5" />
            </div>
            Transcriu
          </div>
          {/* Text actualitzat per a logopedes */}
          <h1 className="mt-14 text-4xl font-semibold leading-tight text-balance lg:text-5xl">
            L&apos;eina essencial per a les teves transcripcions de logopèdia.
          </h1>
        </div>
        <div className="space-y-3">
          {/* Text actualitzat per a logopedes */}
          <p className="text-sm text-primary-foreground/80">
            Dedica més temps als teus nens i menys a la documentació.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-secondary/30 px-6 py-12">
        <Card className="w-full max-w-md rounded-3xl border border-border/60 shadow-xl">
          <CardContent className="space-y-8 p-8">
            <div className="space-y-2 text-center">
              <p className="text-sm font-medium text-primary">
                Benvingut/da de nou!
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Inicia sessió per continuar
              </h2>
              <p className="text-sm text-muted-foreground">
                Accedeix a la teva biblioteca de transcripcions i segueix on ho
                vas deixar.
              </p>
            </div>

            <Button
              onClick={handleSignIn}
              disabled={loading}
              size="lg"
              className="w-full justify-center gap-3 rounded-xl bg-black text-primary-foreground hover:bg-black/80 cursor-pointer h-12"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connectant amb Google...
                </>
              ) : (
                <>
                  <Image
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    width={20}
                    height={20}
                    className="rounded-full"
                    unoptimized
                  />
                  Continuar amb Google
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              En iniciar sessió acceptes els nostres termes i polítiques de
              privacitat.
            </p>
          </CardContent>
        </Card>
        
        {/* Welcome Popup */}
        <WelcomePopup
          isOpen={showWelcomePopup}
          onClose={() => {
            setShowWelcomePopup(false);
            router.push("/team");
          }}
          organizationName={welcomeData.organizationName}
          userName={welcomeData.userName}
        />
      </div>
    </div>
  );
});

const SignInPage = React.memo(function SignInPage() {
  return (
    <Suspense fallback={
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        <div className="relative flex flex-col justify-between bg-primary text-primary-foreground px-10 py-12 lg:px-16">
          <div>
            <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-wide text-primary-foreground/70">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/10">
                <LogIn className="h-5 w-5" />
              </div>
              Transcriu
            </div>
            <h1 className="mt-14 text-4xl font-semibold leading-tight text-balance lg:text-5xl">
              L&apos;eina essencial per a les teves transcripcions de logopèdia.
            </h1>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-primary-foreground/80">
              Dedica més temps als teus nens i menys a la documentació.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center bg-secondary/30 px-6 py-12">
          <Card className="w-full max-w-md rounded-3xl border border-border/60 shadow-xl">
            <CardContent className="space-y-8 p-8">
              <div className="space-y-2 text-center">
                <p className="text-sm font-medium text-primary">
                  Benvingut/da de nou!
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                  Inicia sessió per continuar
                </h2>
                <p className="text-sm text-muted-foreground">
                  Carregant...
                </p>
              </div>
              <div className="w-full h-12 bg-gray-200 rounded-xl animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
});

export default SignInPage;
