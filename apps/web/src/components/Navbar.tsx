"use client";

import { useState, useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from 'next-intl';
import { ChevronDown, ArrowRight, Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import featuresData from "@/app/[locale]/features/features.json";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onContactClick?: () => void;
}

const features = Object.entries(featuresData as Record<string, any>).map(([slug, data]) => ({
  slug,
  icon: data.icon || "📄",
  title: data.heroTitle,
  description: data.heroDescription,
}));

export function Navbar({ onContactClick }: NavbarProps) {
  const t = useTranslations('navbar');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [isMobileFeaturesOpen, setIsMobileFeaturesOpen] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close features dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (featuresRef.current && !featuresRef.current.contains(event.target as Node)) {
        setIsFeaturesOpen(false);
      }
    };

    if (isFeaturesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFeaturesOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsFeaturesOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsFeaturesOpen(false);
    }, 150);
  };

  const handlePrimaryAction = async () => {
    if (user) {
      router.push("/dashboard");
    } else {
      setLoading(true);
      router.push("/auth/signin");
    }
  };

  const handleContactClick = () => {
    if (onContactClick) {
      onContactClick();
    }
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsMobileFeaturesOpen(false);
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
          "bg-white/95 backdrop-blur-xl border-b",
          isScrolled
            ? "border-gray-200/60 shadow-sm"
            : "border-gray-100/60"
        )}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/logo3.png"
                alt="Transcriu Logo"
                width={30}
                height={30}
                className="transition-transform duration-300 group-hover:scale-105"
              />
              <span className="text-[17px] font-semibold tracking-tight text-gray-900">
                transcriu
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {/* Features Dropdown */}
              <div
                ref={featuresRef}
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => setIsFeaturesOpen(!isFeaturesOpen)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 text-[14px] font-medium rounded-lg transition-all duration-200",
                    isFeaturesOpen
                      ? "text-gray-900 bg-gray-100/80"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  {t('features')}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      isFeaturesOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* Dropdown */}
                <div
                  className={cn(
                    "absolute top-full left-0 mt-2 w-[340px] origin-top-left transition-all duration-200 ease-out",
                    isFeaturesOpen
                      ? "opacity-100 scale-100 translate-y-0"
                      : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                  )}
                >
                  <div className="bg-white rounded-xl border border-gray-200/80 shadow-xl shadow-gray-200/50 overflow-hidden">
                    <div className="p-2 max-h-[320px] overflow-y-auto">
                      {features.slice(0, 6).map((feature, index) => (
                        <Link
                          key={feature.slug}
                          href={`/features/${feature.slug}`}
                          onClick={() => setIsFeaturesOpen(false)}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group/item"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <span className="text-xl flex-shrink-0 mt-0.5">
                            {feature.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-900 group-hover/item:text-blue-600 transition-colors">
                              {feature.title.split(' per a ')[0].split(' amb ')[0].substring(0, 35)}
                            </p>
                            <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-1">
                              {feature.description.substring(0, 60)}...
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 p-2 bg-gray-50/50">
                      <Link
                        href="/features"
                        onClick={() => setIsFeaturesOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-white hover:text-blue-600 transition-colors group/all"
                      >
                        <span>{t('seeAllFeatures')}</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/all:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                href="/blog"
                className="px-3 py-2 text-[14px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
              >
                {t('blog')}
              </Link>

              <button
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-3 py-2 text-[14px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
              >
                {t('pricing')}
              </button>

              <button
                onClick={handleContactClick}
                className="px-3 py-2 text-[14px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
              >
                {t('contact')}
              </button>
            </nav>

            {/* Desktop Right Section */}
            <div className="hidden lg:flex items-center gap-3">
              <LanguageSwitcher />

              {user ? (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-3.5 py-2 text-[13px] font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {t('goToDashboard')}
                </button>
              ) : (
                <Link
                  href="/auth/signin"
                  className="px-3.5 py-2 text-[13px] font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {t('signIn')}
                </Link>
              )}

              <button
                onClick={handlePrimaryAction}
                disabled={authLoading || loading}
                className={cn(
                  "relative px-4 py-2 text-[13px] font-medium rounded-lg transition-all duration-200",
                  "bg-gray-900 text-white hover:bg-gray-800",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "shadow-sm hover:shadow-md"
                )}
              >
                {authLoading || loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('preparing')}
                  </span>
                ) : user ? (
                  t('openTranscriu')
                ) : (
                  <span className="flex items-center gap-1.5">
                    {t('start')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 -mr-2 text-gray-700 hover:text-gray-900 transition-colors"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <div className="relative w-5 h-5">
                <span
                  className={cn(
                    "absolute left-0 w-5 h-0.5 bg-current transition-all duration-300 ease-out",
                    isMobileMenuOpen
                      ? "top-[9px] rotate-45"
                      : "top-[4px] rotate-0"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-[9px] w-5 h-0.5 bg-current transition-all duration-300 ease-out",
                    isMobileMenuOpen ? "opacity-0 scale-0" : "opacity-100 scale-100"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 w-5 h-0.5 bg-current transition-all duration-300 ease-out",
                    isMobileMenuOpen
                      ? "top-[9px] -rotate-45"
                      : "top-[14px] rotate-0"
                  )}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden transition-all duration-300 ease-out",
          isMobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity duration-300",
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={closeMobileMenu}
        />

        {/* Menu Panel */}
        <div
          className={cn(
            "absolute top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-out",
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Mobile Header */}
          <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100">
            <span className="text-[15px] font-semibold text-gray-900">{t('menu')}</span>
            <button
              onClick={closeMobileMenu}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Nav Content */}
          <div className="flex flex-col h-[calc(100%-64px)] overflow-y-auto">
            <nav className="flex-1 px-4 py-4">
              {/* Features Accordion */}
              <div className="border-b border-gray-100 pb-2 mb-2">
                <button
                  onClick={() => setIsMobileFeaturesOpen(!isMobileFeaturesOpen)}
                  className="flex items-center justify-between w-full py-3 px-2 text-[15px] font-medium text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span>{t('features')}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-gray-400 transition-transform duration-200",
                      isMobileFeaturesOpen && "rotate-180"
                    )}
                  />
                </button>

                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    isMobileFeaturesOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="py-2 space-y-1">
                    {features.slice(0, 5).map((feature) => (
                      <Link
                        key={feature.slug}
                        href={`/features/${feature.slug}`}
                        onClick={closeMobileMenu}
                        className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-lg">{feature.icon}</span>
                        <span className="text-[14px] text-gray-700">
                          {feature.title.split(' per a ')[0].substring(0, 30)}
                        </span>
                      </Link>
                    ))}
                    <Link
                      href="/features"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-2 py-2.5 px-3 text-[14px] font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <span>{t('seeAll')}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Other Links */}
              <Link
                href="/blog"
                onClick={closeMobileMenu}
                className="flex items-center py-3 px-2 text-[15px] font-medium text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('blog')}
              </Link>

              <button
                onClick={() => {
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                  closeMobileMenu();
                }}
                className="flex items-center w-full py-3 px-2 text-[15px] font-medium text-gray-900 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                {t('pricing')}
              </button>

              <button
                onClick={handleContactClick}
                className="flex items-center w-full py-3 px-2 text-[15px] font-medium text-gray-900 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                {t('contact')}
              </button>

              {/* Language Switcher */}
              <div className="py-3 px-2 border-t border-gray-100 mt-2">
                <LanguageSwitcher />
              </div>
            </nav>

            {/* Mobile CTA Section */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              {user ? (
                <button
                  onClick={() => {
                    router.push("/dashboard");
                    closeMobileMenu();
                  }}
                  className="w-full py-3 px-4 text-[14px] font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  {t('goToDashboard')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      handlePrimaryAction();
                      closeMobileMenu();
                    }}
                    disabled={loading || authLoading}
                    className="w-full py-3 px-4 text-[14px] font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {t('start')}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      router.push("/auth/signin");
                      closeMobileMenu();
                    }}
                    className="w-full py-3 px-4 text-[14px] font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {t('signIn')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-16" />
    </>
  );
}
