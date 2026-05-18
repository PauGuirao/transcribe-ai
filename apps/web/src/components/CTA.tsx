'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from '@/i18n/navigation';

export function CTA() {
  const t = useTranslations('cta');
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handlePrimaryAction = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      setLoading(true);
      router.push('/auth/signin');
    }
  };

  const handleGoogleSignUp = async () => {
    if (user) {
      router.push('/dashboard');
      return;
    }
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google sign-up failed:', err);
      setGoogleLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="relative isolate overflow-hidden rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center sm:px-12 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-grid-lines bg-grid-fade"
          aria-hidden="true"
        />

        <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
          <span className="inline-flex size-1.5 rounded-full bg-indigo-500" />
          {t('badge')}
        </span>

        <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl md:text-5xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg">
          {t('description')}
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
            ) : (
              <>
                {user ? t('goToDashboard') : t('primary')}
                <ArrowRight className="size-4" />
              </>
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
                {t('secondary')}
              </>
            )}
          </button>
        </div>

        <p className="mt-6 text-xs text-neutral-500">{t('caption')}</p>
      </div>
    </section>
  );
}
