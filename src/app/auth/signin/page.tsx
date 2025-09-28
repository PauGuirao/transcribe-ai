"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, LogIn } from "lucide-react";

const SignInPage = React.memo(function SignInPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signInWithGoogle } = useAuth();
  const returnUrl = searchParams.get("returnUrl");

  useEffect(() => {
    if (user) {
      // If there's a returnUrl, redirect there, otherwise go to dashboard
      const redirectTo = returnUrl || "/dashboard";
      router.push(redirectTo);
    }
  }, [user, router, returnUrl]);

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
              className="w-full justify-center gap-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
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
      </div>
    </div>
  );
});

export default SignInPage;
