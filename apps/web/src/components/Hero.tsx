'use client';

import { useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { TranscriptionExample } from "./TranscriptionExample";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from 'next-intl';

export function Hero({
  title,
  description,
}: { title?: string; description?: string } = {}) {
  const t = useTranslations('hero');
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handlePrimaryAction = async () => {
    if (user) {
      router.push("/dashboard");
    } else {
      setLoading(true);
      router.push("/auth/signin");
    }
  };

  const handleGoogleSignUp = async () => {
    if (user) {
      router.push("/dashboard");
      return;
    }
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Google sign-up failed:", err);
      setGoogleLoading(false);
    }
  };

  const heroTitle = title || t('title');
  const heroDescription = description || t('description');

  return (
    <section id="hero" className="relative isolate overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-lines bg-grid-fade"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-4xl px-6 pt-20 pb-12 text-center sm:pt-28">
        <h1 className="text-4xl font-normal tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
          {heroTitle}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg">
          {heroDescription}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={handlePrimaryAction}
            disabled={authLoading || loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-60 sm:w-auto"
          >
            {authLoading || loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('preparing')}
              </>
            ) : user ? (
              t('goToDashboard')
            ) : (
              t('signInWithEmail')
            )}
          </button>
          <button
            onClick={handleGoogleSignUp}
            disabled={googleLoading || authLoading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-6 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 disabled:opacity-60 sm:w-auto"
          >
            {googleLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('preparing')}
              </>
            ) : (
              <>
                <Image
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt=""
                  width={18}
                  height={18}
                  unoptimized
                />
                {t('signUpWithGoogle')}
              </>
            )}
          </button>
        </div>

        <p className="mt-4 text-xs text-neutral-500">{t('caption')}</p>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/5">
          <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-neutral-50 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-neutral-300" />
            <span className="size-2.5 rounded-full bg-neutral-300" />
            <span className="size-2.5 rounded-full bg-neutral-300" />
            <span className="ml-3 font-mono text-xs text-neutral-400">transcriu.com / new-session</span>
          </div>
          <div className="p-6 sm:p-8">
            <TranscriptionExample />
          </div>
        </div>
      </div>
    </section>
  );
}
