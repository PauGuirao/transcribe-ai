'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { TranscriptionExample } from "./TranscriptionExample";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from 'next-intl';
import Image from "next/image";

export function Hero({
  title,
  description,
}: { title?: string; description?: string } = {}) {
  const t = useTranslations('hero');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePrimaryAction = async () => {
    if (user) {
      router.push("/dashboard");
    } else {
      setLoading(true);
      router.push("/auth/signin");
    }
  };

  const handleTrustElements = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-2">
      <div className="max-w-7xl mx-auto md:px-6">
        {/* White Card Container */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 md:p-10 p-6 pb-10">
          {/* Main Content Grid */}
          <div className="grid md:grid-cols-2 gap-12 mb-12">
            {/* Left Section - Website Title */}
            <div className="space-y-5">
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-gray-900 leading-tight text-left">
                {title || t('title')}
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed text-left">
                {description || t('description')}
              </p>

              {/* Sign up with Google Button - moved here */}
              <div className="max-w-md pt-3">
                <Button
                  onClick={handlePrimaryAction}
                  disabled={authLoading || loading}
                  size="lg"
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-lg font-semibold text-base transition-colors flex items-center justify-center gap-2"
                >
                  {authLoading || loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t('preparing')}
                    </>
                  ) : user ? (
                    t('goToDashboard')
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
                      {t('signInWithEmail')}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right Section - Transcription Example */}
            <TranscriptionExample />
          </div>

          {/* Bottom Trust Elements - Centered */}
          <div className="flex justify-center">
            <div className="flex flex-col sm:flex-row gap-4 items-center text-center sm:text-left">
              {/* Trust Signal 1 - Users */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl px-6 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">👥</div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">1.200+</span>
                    <span className="text-xs text-gray-600">{t('trustSignals.professionals')}</span>
                  </div>
                </div>
              </div>

              {/* Trust Signal 2 - Accuracy */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl px-6 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🎯</div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">98%</span>
                    <span className="text-xs text-gray-600">{t('trustSignals.accuracy')}</span>
                  </div>
                </div>
              </div>

              {/* Trust Signal 3 - Time Saved */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl px-6 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">⏱️</div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">5h</span>
                    <span className="text-xs text-gray-600">{t('trustSignals.timeSaved')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}