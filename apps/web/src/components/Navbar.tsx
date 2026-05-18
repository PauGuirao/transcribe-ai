"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from 'next-intl';
import { ArrowRight, Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onContactClick?: () => void;
}

export function Navbar({ onContactClick }: NavbarProps) {
  const t = useTranslations('navbar');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handlePrimary = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      setLoading(true);
      router.push("/auth/signin");
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  };

  const navLinks = [
    { label: t('features'), kind: 'link' as const, href: '/features' },
    { label: t('pricing'), kind: 'scroll' as const, target: 'pricing' },
    { label: t('blog'), kind: 'link' as const, href: '/blog' },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-colors",
          "border-b bg-white/90 backdrop-blur",
          scrolled ? "border-neutral-200" : "border-transparent"
        )}
      >
        <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo3.png" alt="Transcriu" width={24} height={24} />
            <span className="text-sm font-semibold tracking-tight text-neutral-900">transcriu</span>
          </Link>

          {/* Absolute-centered so the nav stays in the page center regardless
              of the logo or right-cluster widths. */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex">
            {navLinks.map((link) =>
              link.kind === 'link' ? (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  {link.label}
                </Link>
              ) : (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.target)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  {link.label}
                </button>
              )
            )}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSwitcher />
            {user ? (() => {
              const displayName =
                (user.user_metadata?.full_name as string | undefined) ||
                user.email?.split('@')[0] ||
                'User';
              return (
                <Link
                  href="/dashboard"
                  className="group flex h-9 items-center gap-2 rounded-md border border-neutral-200 bg-white pl-1 pr-3 transition-colors hover:bg-neutral-50"
                  title={displayName}
                >
                  <Avatar className="size-7">
                    <AvatarImage
                      src={(user.user_metadata?.avatar_url as string | undefined) || ""}
                      alt={displayName}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-[11px] font-medium text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[140px] truncate text-xs font-medium text-neutral-700">
                    {displayName}
                  </span>
                  <ArrowRight className="size-3.5 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-700" />
                </Link>
              );
            })() : (
              <>
                <Link
                  href="/auth/signin"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900"
                >
                  {t('signIn')}
                </Link>
                <button
                  onClick={handlePrimary}
                  disabled={authLoading || loading}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                >
                  {t('start')}
                  <ArrowRight className="size-3.5" />
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className="p-2 -mr-2 text-neutral-700 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div className="absolute inset-0 bg-neutral-900/20" onClick={() => setOpen(false)} />
        <div
          className={cn(
            "absolute right-0 top-0 h-full w-full max-w-sm border-l border-neutral-200 bg-white shadow-xl transition-transform",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-neutral-100 px-5">
            <span className="text-sm font-semibold text-neutral-900">{t('menu')}</span>
            <button onClick={() => setOpen(false)} className="text-neutral-500">
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 p-4">
            {navLinks.map((link) =>
              link.kind === 'link' ? (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                >
                  {link.label}
                </Link>
              ) : (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.target)}
                  className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                >
                  {link.label}
                </button>
              )
            )}
            <div className="mt-2 border-t border-neutral-100 pt-4">
              <LanguageSwitcher />
            </div>
          </nav>
          <div className="border-t border-neutral-100 p-4">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { handlePrimary(); setOpen(false); }}
                disabled={authLoading || loading}
                className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {user ? t('openTranscriu') : t('start')} <ArrowRight className="size-4" />
              </button>
              {!user && (
                <Link
                  href="/auth/signin"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md border border-neutral-200 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                >
                  {t('signIn')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-14" />
    </>
  );
}
